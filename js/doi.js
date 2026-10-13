/* ScholarFix — js/doi.js
 * Crossref DOI validation + bibliographic search, title-similarity scoring,
 * concurrency-limited batching, and shared reference-input parsing.
 * Exposed as window.ScholarFixDOI (classic script, no build step).
 *
 * NOTE on the Crossref polite pool: adding a `mailto` parameter places your
 * requests in Crossref's polite pool with more reliable rate limits.
 * Replace the placeholder below with your own contact email before
 * publishing a heavily-used deployment. See https://github.com/CrossRef/rest-api-doc
 */
(function (global) {
  'use strict';

  var CROSSREF_BASE = 'https://api.crossref.org';
  var MAILTO = 'you@example.com'; // Crossref polite pool — replace with your email
  var MAX_CONCURRENCY = 4;
  var SIMILARITY_THRESHOLD = 0.6;
  var REQUEST_TIMEOUT_MS = 20000;

  /* ---------- small helpers ---------- */

  function fetchJson(url, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs || REQUEST_TIMEOUT_MS);
    return fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(function (res) {
        clearTimeout(timer);
        return { status: res.status, ok: res.ok, json: function () { return res.json(); } };
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Retry on 429 (rate limited) and 5xx/network failures, with simple backoff.
   * 404 is returned to the caller (it means "broken DOI", not an error). */
  async function fetchJsonRetry(url, retries) {
    var attempts = (retries == null ? 2 : retries) + 1;
    var lastErr = null;
    for (var n = 0; n < attempts; n++) {
      if (n > 0) { await sleep(600 * n); }
      try {
        var res = await fetchJson(url);
        if (res.status === 404) { return res; }
        if ((res.status === 429 || res.status >= 500) && n < attempts - 1) { continue; }
        return res;
      } catch (err) {
        lastErr = err;
        if (err && err.name === 'AbortError') { lastErr = new Error('Request timed out'); }
      }
    }
    throw lastErr || new Error('Request failed after ' + attempts + ' attempts');
  }

  /* ---------- DOI extraction & validation ---------- */

  // Matches a DOI anywhere in a reference string, incl. doi.org URLs and "doi:" prefixes.
  var DOI_RE = /(?:doi\.org\/|doi\s*[:=]\s*|^|\s|[{"'(=])(10\.\d{4,9}\/[^\s"'}<>\]),;]+)/i;

  function extractDOI(text) {
    if (!text) return null;
    var m = text.match(DOI_RE);
    if (!m) return null;
    var doi = m[1].replace(/[.\])}]+$/, ''); // strip trailing punctuation
    return doi;
  }

  /* Validate a DOI against Crossref. Returns:
   *   { valid: true, meta } | { valid: false, reason: 'not-found' | 'error', error }
   */
  function validateDOI(doi) {
    var url = CROSSREF_BASE + '/works/' + encodeURIComponent(doi) + '?mailto=' + encodeURIComponent(MAILTO);
    return fetchJsonRetry(url).then(function (res) {
      if (res.status === 404) { return { valid: false, reason: 'not-found' }; }
      if (!res.ok) { return { valid: false, reason: 'error', error: 'HTTP ' + res.status }; }
      return res.json().then(function (body) {
        return { valid: true, meta: body && body.message ? body.message : null };
      });
    }).catch(function (err) {
      return { valid: false, reason: 'error', error: String((err && err.message) || err) };
    });
  }

  /* ---------- Title similarity (token overlap) ---------- */

  var STOPWORDS = {
    the: 1, a: 1, an: 1, of: 1, and: 1, or: 1, in: 1, on: 1, for: 1, to: 1,
    with: 1, by: 1, via: 1, from: 1, at: 1, as: 1, is: 1, are: 1, was: 1,
    were: 1, be: 1, been: 1, its: 1, it: 1, this: 1, that: 1, using: 1, based: 1
  };

  function tokenize(text) {
    var tokens = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (t) { return t.length > 2 && !STOPWORDS[t]; });
    var seen = {};
    var out = [];
    tokens.forEach(function (t) { if (!seen[t]) { seen[t] = 1; out.push(t); } });
    return out;
  }

  /* Token-overlap coefficient: |intersection| / min(|a|, |b|).
   * A short matched title fully contained in the reference text scores 1.0. */
  function titleSimilarity(textA, textB) {
    var a = tokenize(textA);
    var b = tokenize(textB);
    if (!a.length || !b.length) return 0;
    var setB = {};
    b.forEach(function (t) { setB[t] = 1; });
    var common = 0;
    a.forEach(function (t) { if (setB[t]) common++; });
    return common / Math.min(a.length, b.length);
  }

  /* ---------- Crossref bibliographic search ---------- */

  /* Search Crossref for a free-text reference. Returns:
   *   { hit: {doi, title, score, meta} | null, error? }
   */
  function searchCrossref(refText) {
    var q = String(refText || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!q) { return Promise.resolve({ hit: null, error: 'empty query' }); }
    var url = CROSSREF_BASE + '/works?query.bibliographic=' + encodeURIComponent(q) +
      '&rows=5&select=DOI,title,author,issued,container-title,volume,issue,page,type' +
      '&mailto=' + encodeURIComponent(MAILTO);
    return fetchJsonRetry(url).then(function (res) {
      if (!res.ok) { return { hit: null, error: 'HTTP ' + res.status }; }
      return res.json().then(function (body) {
        var items = body && body.message && body.message.items ? body.message.items : [];
        var best = null;
        items.forEach(function (item) {
          var title = item.title && item.title.length ? item.title[0] : '';
          if (!title || !item.DOI) return;
          var score = titleSimilarity(refText, title);
          if (!best || score > best.score) {
            best = { doi: item.DOI, title: title, score: score, meta: item };
          }
        });
        return { hit: best };
      });
    }).catch(function (err) {
      return { hit: null, error: String((err && err.message) || err) };
    });
  }

  /* ---------- Per-reference resolution ---------- */

  /* Resolve one reference string. Returns:
   * {
   *   original, status: 'valid'|'fixed'|'not found',
   *   doi, matchedTitle, confidence (0..1|null), meta (Crossref message|null), note?
   * }
   */
  function resolveReference(refText) {
    var original = String(refText || '').trim();
    var result = {
      original: original, status: 'not found', doi: null,
      matchedTitle: null, confidence: null, meta: null, note: null
    };
    if (!original) {
      result.note = 'empty reference';
      return Promise.resolve(result);
    }

    var doi = extractDOI(original);

    function searchFallback(brokenDOI) {
      return searchCrossref(original).then(function (r) {
        if (r.error) { result.note = 'search error: ' + r.error; }
        if (r.hit && r.hit.score >= SIMILARITY_THRESHOLD) {
          result.status = 'fixed';
          result.doi = r.hit.doi;
          result.matchedTitle = r.hit.title;
          result.confidence = r.hit.score;
          result.meta = r.hit.meta || null;
          if (brokenDOI) { result.note = 'original DOI ' + brokenDOI + ' was invalid; matched by title'; }
        } else if (r.hit) {
          result.note = 'best candidate "' + r.hit.title + '" scored only ' +
            r.hit.score.toFixed(2) + ' (below ' + SIMILARITY_THRESHOLD + ')';
          result.matchedTitle = r.hit.title;
          result.confidence = r.hit.score;
        } else if (!result.note) {
          result.note = 'no Crossref candidates';
        }
        return result;
      });
    }

    if (doi) {
      return validateDOI(doi).then(function (v) {
        if (v.valid) {
          result.status = 'valid';
          result.doi = doi;
          result.matchedTitle = v.meta && v.meta.title && v.meta.title.length ? v.meta.title[0] : null;
          result.confidence = 1;
          result.meta = v.meta;
          return result;
        }
        if (v.reason === 'not-found') {
          return searchFallback(doi);
        }
        // Network/other error: do not guess; report it.
        result.note = 'could not validate DOI ' + doi + ' (' + v.error + ')';
        result.doi = doi;
        return result;
      });
    }
    return searchFallback(null);
  }

  /* ---------- Concurrency-limited batching ---------- */

  /* Map items through async worker with at most `limit` in flight.
   * onProgress(done, total) is called after each item settles.
   * Never rejects: per-item errors are captured as { error }. */
  function mapWithConcurrency(items, worker, limit, onProgress) {
    var total = items.length;
    var results = new Array(total);
    var next = 0;
    var done = 0;
    limit = Math.max(1, limit || MAX_CONCURRENCY);

    function runOne() {
      if (next >= total) { return Promise.resolve(); }
      var i = next++;
      return Promise.resolve()
        .then(function () { return worker(items[i], i); })
        .then(function (r) { results[i] = r; })
        .catch(function (err) {
          results[i] = { error: String((err && err.message) || err) };
        })
        .then(function () {
          done++;
          if (onProgress) { onProgress(done, total); }
          return runOne();
        });
    }

    var lanes = [];
    for (var k = 0; k < Math.min(limit, total); k++) { lanes.push(runOne()); }
    return Promise.all(lanes).then(function () { return results; });
  }

  function batchResolve(refs, onProgress) {
    return mapWithConcurrency(refs, resolveReference, MAX_CONCURRENCY, onProgress);
  }

  /* ---------- Shared input parsing (used by all three tabs) ---------- */

  /* Split pasted text / file contents into a list of reference strings.
   * Supports: .bib (entries start with @), .ris (entries start with "TY  -"),
   * and plain text (one reference per line, ignoring blanks). */
  function parseReferenceInput(text, filename) {
    text = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!text) { return []; }
    var name = (filename || '').toLowerCase();
    var looksBib = name.endsWith('.bib') || /^\s*@\w+\s*\{/m.test(text);
    var looksRis = name.endsWith('.ris') || /^TY {2}-/m.test(text);

    if (looksBib) {
      return text.split(/(?=^\s*@\w+\s*\{)/m)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
    }
    if (looksRis) {
      return text.split(/(?=^TY {2}-)/m)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.indexOf('TY  -') === 0; });
    }
    return text.split('\n')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  /* ---------- Crossref metadata -> plain text / BibTeX ---------- */

  function authorsToString(meta) {
    var authors = meta && meta.author ? meta.author : [];
    if (!authors.length) { return ''; }
    var names = authors.map(function (a) {
      return [a.given, a.family].filter(Boolean).join(' ');
    });
    if (names.length <= 3) { return names.join(', '); }
    return names.slice(0, 3).join(', ') + ' et al.';
  }

  function yearOf(meta) {
    var parts = meta && meta.issued && meta.issued['date-parts'];
    return parts && parts[0] && parts[0][0] ? String(parts[0][0]) : '';
  }

  function metaToText(meta, fallbackRef) {
    if (!meta) { return fallbackRef || ''; }
    var authors = authorsToString(meta);
    var year = yearOf(meta);
    var title = meta.title && meta.title.length ? meta.title[0] : '';
    var container = meta['container-title'] && meta['container-title'].length ? meta['container-title'][0] : '';
    var vol = meta.volume || '';
    var issue = meta.issue ? '(' + meta.issue + ')' : '';
    var pages = meta.page || '';
    var doi = meta.DOI ? 'https://doi.org/' + meta.DOI : '';
    var s = '';
    if (authors) { s += authors + ' '; }
    if (year) { s += '(' + year + '). '; }
    s += title ? title + '. ' : '';
    if (container) { s += container + (vol ? ', ' + vol + issue : '') + (pages ? ', ' + pages : '') + '. '; }
    if (doi) { s += doi; }
    return s.trim();
  }

  function bibEscape(s) { return String(s == null ? '' : s).replace(/[{}]/g, ''); }

  function metaToBibtex(meta, fallbackRef) {
    if (!meta) {
      return '@misc{unresolved' + Math.abs(hashCode(fallbackRef || '')) +
        ',\n  note = {' + bibEscape(fallbackRef) + '}\n}';
    }
    var typeMap = {
      'journal-article': 'article', 'proceedings-article': 'inproceedings',
      'book-chapter': 'incollection', book: 'book', 'posted-content': 'misc',
      dataset: 'misc', preprint: 'misc'
    };
    var type = typeMap[meta.type] || 'article';
    var firstAuthor = meta.author && meta.author.length && meta.author[0].family
      ? meta.author[0].family.replace(/[^A-Za-z]/g, '') : 'ref';
    var key = firstAuthor + (yearOf(meta) || 'nd') +
      (meta.title && meta.title.length ? meta.title[0].split(/\s+/)[0].replace(/[^A-Za-z]/g, '') : '');
    var lines = [];
    lines.push('@' + type + '{' + key + ',');
    if (meta.title && meta.title.length) { lines.push('  title = {' + bibEscape(meta.title[0]) + '},'); }
    if (meta.author && meta.author.length) {
      var auth = meta.author.map(function (a) {
        return [a.family, a.given].filter(Boolean).join(', ');
      }).join(' and ');
      lines.push('  author = {' + bibEscape(auth) + '},');
    }
    if (yearOf(meta)) { lines.push('  year = {' + yearOf(meta) + '},'); }
    if (meta['container-title'] && meta['container-title'].length) {
      var field = type === 'article' ? 'journal' : 'booktitle';
      lines.push('  ' + field + ' = {' + bibEscape(meta['container-title'][0]) + '},');
    }
    if (meta.volume) { lines.push('  volume = {' + bibEscape(meta.volume) + '},'); }
    if (meta.issue) { lines.push('  number = {' + bibEscape(meta.issue) + '},'); }
    if (meta.page) { lines.push('  pages = {' + bibEscape(meta.page) + '},'); }
    if (meta.DOI) { lines.push('  doi = {' + meta.DOI + '},'); }
    if (lines.length > 1) { lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, ''); }
    lines.push('}');
    return lines.join('\n');
  }

  function hashCode(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return h;
  }

  /* ---------- export ---------- */
  global.ScholarFixDOI = {
    CROSSREF_BASE: CROSSREF_BASE,
    MAX_CONCURRENCY: MAX_CONCURRENCY,
    SIMILARITY_THRESHOLD: SIMILARITY_THRESHOLD,
    extractDOI: extractDOI,
    validateDOI: validateDOI,
    titleSimilarity: titleSimilarity,
    tokenize: tokenize,
    searchCrossref: searchCrossref,
    resolveReference: resolveReference,
    batchResolve: batchResolve,
    mapWithConcurrency: mapWithConcurrency,
    parseReferenceInput: parseReferenceInput,
    metaToText: metaToText,
    metaToBibtex: metaToBibtex,
    authorsToString: authorsToString,
    yearOf: yearOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
