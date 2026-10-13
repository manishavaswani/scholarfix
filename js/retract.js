/* ScholarFix — js/retract.js
 * Retraction screening: resolves each reference (via ScholarFixDOI), then checks
 *   1. OpenAlex  works/doi:{doi}  -> is_retracted flag
 *   2. Crossref  works/{doi}      -> relation field for retraction / update notices
 * Exposed as window.ScholarFixRetract.
 *
 * NOTE: like doi.js, add your own `mailto` contact email for the Crossref
 * polite pool and OpenAlex polite pool before a heavily-used deployment.
 */
(function (global) {
  'use strict';

  var DOILib = global.ScholarFixDOI;
  var OPENALEX_BASE = 'https://api.openalex.org';
  var MAILTO = 'you@example.com'; // OpenAlex/Crossref polite pool — replace with your email

  /* ---------- OpenAlex ---------- */

  /* Returns { found, isRetracted, openalexId, error? } */
  function checkOpenAlex(doi) {
    var url = OPENALEX_BASE + '/works/doi:' + encodeURIComponent(doi) +
      '?mailto=' + encodeURIComponent(MAILTO);
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (res.status === 404) { return { found: false }; }
        if (!res.ok) { return { found: false, error: 'HTTP ' + res.status }; }
        return res.json().then(function (w) {
          return {
            found: true,
            isRetracted: Boolean(w && w.is_retracted),
            openalexId: w && w.id ? w.id : null
          };
        });
      })
      .catch(function (err) {
        return { found: false, error: String((err && err.message) || err) };
      });
  }

  /* ---------- Crossref relations ---------- */

  /* Inspect the Crossref `relation` field for retraction / update signals.
   * Returns { retracted, updated, notices: [ {type, doi, url} ] } */
  function inspectRelations(meta) {
    var out = { retracted: false, updated: false, notices: [] };
    var rel = meta && meta.relation ? meta.relation : {};
    Object.keys(rel).forEach(function (kind) {
      var items = Array.isArray(rel[kind]) ? rel[kind] : [rel[kind]];
      items.forEach(function (item) {
        var doi = item && (item.doi || item.id);
        if (typeof doi !== 'string' || !doi) { doi = null; }
        var notice = {
          type: kind,
          doi: doi,
          url: doi ? 'https://doi.org/' + doi : null
        };
        if (kind === 'is-retraction-of' || kind === 'has-retraction') {
          // This work retracts another, or a retraction notice exists for it.
          out.retracted = true;
          out.notices.push(notice);
        } else if (
          kind === 'updated-by' || kind === 'has-correction' ||
          kind === 'is-update-to' || kind === 'has-expression-of-concern'
        ) {
          out.updated = true;
          out.notices.push(notice);
        }
      });
    });
    // Some publishers only put the notice in `update-to` / `relation.updated-by`
    // with a resource link rather than a DOI; those are still surfaced above
    // when a DOI is present.
    return out;
  }

  /* ---------- Verdict per DOI ---------- */

  /* checkDOI(doi) -> {
   *   verdict: 'retracted' | 'updated' | 'clean' | 'unknown',
   *   noticeLink: url|null, detail: string
   * } */
  function checkDOI(doi) {
    var result = { verdict: 'unknown', noticeLink: null, detail: '' };
    return checkOpenAlex(doi).then(function (oa) {
      return DOILib.validateDOI(doi).then(function (cr) {
        var rel = cr.valid ? inspectRelations(cr.meta) : { retracted: false, updated: false, notices: [] };

        var notice = rel.notices.filter(function (n) { return n.url; })[0] || null;
        if (notice) { result.noticeLink = notice.url; }

        if (oa.found && oa.isRetracted) {
          result.verdict = 'retracted';
          result.detail = 'Flagged as retracted by OpenAlex' +
            (rel.retracted ? ' and by a Crossref retraction relation.' : '.');
        } else if (rel.retracted) {
          result.verdict = 'retracted';
          result.detail = 'Crossref metadata links a retraction notice (' +
            rel.notices[0].type.replace(/-/g, ' ') + ').';
        } else if (rel.updated) {
          result.verdict = 'updated';
          result.detail = 'Crossref lists a correction or update notice for this work.';
        } else if (!oa.found && !cr.valid) {
          result.verdict = 'unknown';
          result.detail = 'Not found in OpenAlex or Crossref — check manually.';
        } else {
          result.verdict = 'clean';
          var src = oa.found && cr.valid ? 'OpenAlex and Crossref' : (oa.found ? 'OpenAlex' : 'Crossref');
          result.detail = 'No retraction or update notices in ' + src + '.';
        }
        return result;
      });
    });
  }

  /* ---------- Full pipeline per reference ---------- */

  /* checkReference(refText) -> {
   *   original, doi, verdict, noticeLink, detail, resolveStatus
   * } */
  function checkReference(refText) {
    return DOILib.resolveReference(refText).then(function (r) {
      var base = {
        original: r.original,
        doi: r.doi,
        verdict: 'unknown',
        noticeLink: null,
        detail: '',
        resolveStatus: r.status
      };
      if (!r.doi || r.status === 'not found') {
        base.detail = 'Could not resolve this reference to a DOI' +
          (r.note ? ' (' + r.note + ')' : '') + ' — check manually.';
        return base;
      }
      return checkDOI(r.doi).then(function (v) {
        base.verdict = v.verdict;
        base.noticeLink = v.noticeLink;
        base.detail = v.detail;
        return base;
      });
    });
  }

  function batchCheck(refs, onProgress) {
    return DOILib.mapWithConcurrency(refs, checkReference, DOILib.MAX_CONCURRENCY, onProgress);
  }

  global.ScholarFixRetract = {
    checkOpenAlex: checkOpenAlex,
    inspectRelations: inspectRelations,
    checkDOI: checkDOI,
    checkReference: checkReference,
    batchCheck: batchCheck
  };
})(typeof window !== 'undefined' ? window : globalThis);
