/* ScholarFix — app.js
 * UI wiring: tabs, input handling, progress, result rendering, exports.
 * Depends on: js/data/styleGuides.js, js/data/venues.js, js/doi.js,
 * js/retract.js, js/citations.js, js/formatter.js
 */
(function () {
  'use strict';

  var DOILib = window.ScholarFixDOI;
  var RetractLib = window.ScholarFixRetract;
  var CiteLib = window.ScholarFixCitations;
  var FmtLib = window.ScholarFixFormatter;
  var VenueData = window.VENUE_PROFILES;

  /* ---------- tiny DOM helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function setError(el, msg) {
    if (msg) { el.textContent = msg; show(el); } else { el.textContent = ''; hide(el); }
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('Could not read file')); };
      reader.readAsText(file);
    });
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyText(text, btn) {
    function done() {
      var old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = old; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else {
      legacyCopy(text);
      done();
    }
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  }

  /* ---------- progress bar ---------- */

  function makeProgress(prefix) {
    var wrap = $(prefix + '-progress-wrap');
    var fill = $(prefix + '-progress-fill');
    var label = $(prefix + '-progress-label');
    return {
      start: function (total) {
        fill.style.width = '0%';
        label.textContent = '0 / ' + total;
        show(wrap);
      },
      update: function (done, total) {
        var pct = total ? Math.round((done / total) * 100) : 0;
        fill.style.width = pct + '%';
        label.textContent = done + ' / ' + total;
      },
      finish: function () {
        fill.style.width = '100%';
        setTimeout(function () { hide(wrap); }, 600);
      }
    };
  }

  /* ---------- tabs ---------- */

  function initTabs() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
    function activate(name, updateHash) {
      buttons.forEach(function (btn) {
        var isActive = btn.dataset.tab === name;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        var panel = $(btn.getAttribute('aria-controls'));
        panel.classList.toggle('active', isActive);
      });
      if (updateHash !== false) {
        try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// quirks */ }
      }
    }
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { activate(btn.dataset.tab); });
    });
    var initial = (location.hash || '').replace('#', '');
    if (['doi', 'retract', 'cite', 'venue'].indexOf(initial) !== -1) { activate(initial, false); }
  }

  /* ---------- shared input loading ---------- */

  function wireFileInput(fileId, textareaId, countId) {
    $(fileId).addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) { return; }
      readFile(file).then(function (text) {
        $(textareaId).value = text;
        updateCount(textareaId, countId, file.name);
      }).catch(function (err) {
        $(countId).textContent = String(err.message || err);
      });
    });
  }

  function updateCount(textareaId, countId, filename) {
    var text = $(textareaId).value;
    var n = DOILib.parseReferenceInput(text, filename || '').length;
    $(countId).textContent = n
      ? n + ' reference' + (n === 1 ? '' : 's') + ' detected.'
      : '';
    return n;
  }

  /* ---------- confidence badge helpers ---------- */

  function confidenceHtml(conf) {
    if (conf == null) { return '<span class="confidence">—</span>'; }
    var pct = Math.round(conf * 100) + '%';
    var cls = conf >= 0.9 ? 'high' : (conf >= 0.6 ? 'mid' : 'low');
    return '<span class="confidence ' + cls + '">' + pct + '</span>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ================= TAB 1: DOI FIXER ================= */

  var doiLastResults = [];

  function initDoiTab() {
    wireFileInput('doi-file', 'doi-input', 'doi-count');
    $('doi-input').addEventListener('input', function () { updateCount('doi-input', 'doi-count'); });
    $('doi-clear').addEventListener('click', function () {
      $('doi-input').value = '';
      $('doi-file').value = '';
      $('doi-count').textContent = '';
      hide($('doi-results'));
      setError($('doi-error'), null);
    });
    $('doi-run').addEventListener('click', runDoiFix);
    $('doi-export-txt').addEventListener('click', function () {
      download('scholarfix-corrected.txt', buildTxtExport(doiLastResults));
    });
    $('doi-export-bib').addEventListener('click', function () {
      download('scholarfix-corrected.bib', buildBibExport(doiLastResults), 'application/x-bibtex;charset=utf-8');
    });
    $('doi-copy').addEventListener('click', function () {
      copyText(buildTxtExport(doiLastResults), $('doi-copy'));
    });
  }

  function runDoiFix() {
    var errEl = $('doi-error');
    setError(errEl, null);
    hide($('doi-results'));
    var refs = DOILib.parseReferenceInput($('doi-input').value, '');
    if (!refs.length) {
      setError(errEl, 'Paste at least one reference or upload a file first.');
      return;
    }
    if (!navigator.onLine) {
      setError(errEl, 'The DOI Fixer needs an internet connection (Crossref API) and you appear to be offline.');
      return;
    }
    var btn = $('doi-run');
    btn.disabled = true;
    btn.textContent = 'Working…';
    var progress = makeProgress('doi');
    progress.start(refs.length);

    DOILib.batchResolve(refs, progress.update).then(function (results) {
      doiLastResults = results;
      renderDoiResults(results);
      progress.finish();
    }).catch(function (err) {
      setError(errEl, 'Unexpected error: ' + String((err && err.message) || err));
      progress.finish();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Check & fix references';
    });
  }

  function statusBadge(status) {
    var map = {
      valid: ['valid', 'Valid'],
      fixed: ['fixed', 'Fixed'],
      'not found': ['notfound', 'Not found']
    };
    var m = map[status] || ['unknown', status];
    return '<span class="badge ' + m[0] + '">' + m[1] + '</span>';
  }

  function renderDoiResults(results) {
    var tbody = $('doi-tbody');
    tbody.innerHTML = '';
    var counts = { valid: 0, fixed: 0, 'not found': 0 };
    results.forEach(function (r) {
      if (r.error) { r = { original: '(entry failed)', status: 'not found', note: r.error }; }
      counts[r.status] = (counts[r.status] || 0) + 1;
      var tr = document.createElement('tr');
      var doiCell = r.doi
        ? '<a href="https://doi.org/' + encodeURIComponent(r.doi) + '" target="_blank" rel="noopener">' + escapeHtml(r.doi) + '</a>'
        : '—';
      var titleCell = escapeHtml(r.matchedTitle || '—') +
        (r.note ? '<br><span class="hint">' + escapeHtml(r.note) + '</span>' : '');
      tr.innerHTML =
        '<td class="ref-cell">' + escapeHtml(r.original) + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td>' + doiCell + '</td>' +
        '<td class="title-cell">' + titleCell + '</td>' +
        '<td>' + confidenceHtml(r.confidence) + '</td>';
      tbody.appendChild(tr);
    });
    var total = results.length;
    $('doi-summary').textContent =
      total + ' references processed: ' + (counts.valid || 0) + ' valid, ' +
      (counts.fixed || 0) + ' fixed, ' + (counts['not found'] || 0) + ' not found.';
    show($('doi-results'));
    $('doi-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function buildTxtExport(results) {
    var lines = results.map(function (r) {
      if (r.status === 'not found' || r.error) {
        return '[NOT FOUND] ' + (r.original || '');
      }
      var text = DOILib.metaToText(r.meta, r.original);
      if (r.doi && text.indexOf(r.doi) === -1) { text += ' https://doi.org/' + r.doi; }
      return text;
    });
    return lines.join('\n') + '\n';
  }

  function buildBibExport(results) {
    var entries = results.map(function (r) {
      return DOILib.metaToBibtex(r.meta || null, r.original);
    });
    return entries.join('\n\n') + '\n';
  }

  /* ================= TAB 2: RETRACTION CHECKER ================= */

  function initRetractTab() {
    wireFileInput('retract-file', 'retract-input', 'retract-count');
    $('retract-input').addEventListener('input', function () { updateCount('retract-input', 'retract-count'); });
    $('retract-clear').addEventListener('click', function () {
      $('retract-input').value = '';
      $('retract-file').value = '';
      $('retract-count').textContent = '';
      hide($('retract-results'));
      hide($('retract-banner'));
      setError($('retract-error'), null);
    });
    $('retract-run').addEventListener('click', runRetractCheck);
  }

  function runRetractCheck() {
    var errEl = $('retract-error');
    setError(errEl, null);
    hide($('retract-results'));
    hide($('retract-banner'));
    var refs = DOILib.parseReferenceInput($('retract-input').value, '');
    if (!refs.length) {
      setError(errEl, 'Paste at least one reference or upload a file first.');
      return;
    }
    if (!navigator.onLine) {
      setError(errEl, 'The Retraction Checker needs an internet connection (OpenAlex/Crossref) and you appear to be offline.');
      return;
    }
    var btn = $('retract-run');
    btn.disabled = true;
    btn.textContent = 'Checking…';
    var progress = makeProgress('retract');
    progress.start(refs.length);

    RetractLib.batchCheck(refs, progress.update).then(function (results) {
      renderRetractResults(results);
      progress.finish();
    }).catch(function (err) {
      setError(errEl, 'Unexpected error: ' + String((err && err.message) || err));
      progress.finish();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Check for retractions';
    });
  }

  var VERDICT_BADGES = {
    clean: ['clean', 'Clean'],
    updated: ['updated', 'Corrected / updated'],
    retracted: ['retracted', 'Retracted'],
    unknown: ['unknown', 'Unresolved']
  };

  function renderRetractResults(results) {
    var list = $('retract-list');
    list.innerHTML = '';
    var nRetracted = 0;
    var nUpdated = 0;
    var nUnknown = 0;

    results.forEach(function (r) {
      if (r.error) { r = { original: '(entry failed)', verdict: 'unknown', detail: r.error }; }
      if (r.verdict === 'retracted') { nRetracted++; }
      else if (r.verdict === 'updated') { nUpdated++; }
      else if (r.verdict === 'unknown') { nUnknown++; }

      var badge = VERDICT_BADGES[r.verdict] || VERDICT_BADGES.unknown;
      var li = document.createElement('li');
      var noticeHtml = r.noticeLink
        ? ' <a href="' + escapeHtml(r.noticeLink) + '" target="_blank" rel="noopener">View notice</a>'
        : '';
      var doiHtml = r.doi
        ? ' <a href="https://doi.org/' + encodeURIComponent(r.doi) + '" target="_blank" rel="noopener">' + escapeHtml(r.doi) + '</a>'
        : '';
      li.innerHTML =
        '<span class="badge ' + badge[0] + '">' + badge[1] + '</span>' + doiHtml + noticeHtml +
        '<span class="retract-ref">' + escapeHtml(r.original) + '</span>' +
        (r.detail ? '<span class="retract-detail">' + escapeHtml(r.detail) + '</span>' : '');
      list.appendChild(li);
    });

    var banner = $('retract-banner');
    var total = results.length;
    if (nRetracted > 0) {
      banner.className = 'banner';
      banner.textContent = nRetracted + ' of ' + total +
        ' reference' + (total === 1 ? ' is' : 's are') + ' retracted — replace before submission.';
    } else if (nUpdated > 0) {
      banner.className = 'banner warn';
      banner.textContent = 'No retractions found, but ' + nUpdated + ' of ' + total +
        ' reference' + (nUpdated === 1 ? ' has' : 's have') + ' corrections or updates — review before submission.';
    } else if (nUnknown === total) {
      banner.className = 'banner warn';
      banner.textContent = 'None of the ' + total + ' references could be resolved to a DOI — retraction status unknown.';
    } else {
      banner.className = 'banner ok';
      banner.textContent = 'No retracted references found among the ' + total + ' checked.' +
        (nUnknown ? ' (' + nUnknown + ' unresolved — check those manually.)' : '');
    }
    show(banner);
    show($('retract-results'));
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ================= TAB 3: CITATION STYLES ================= */

  var citeLast = { items: [], formatted: [], unparsed: [], style: 'apa' };

  function initCiteTab() {
    wireFileInput('cite-file', 'cite-input', 'cite-status');
    $('cite-clear').addEventListener('click', function () {
      $('cite-input').value = '';
      $('cite-file').value = '';
      $('cite-status').textContent = '';
      hide($('cite-results'));
      setError($('cite-error'), null);
    });
    $('cite-run').addEventListener('click', runConversion);
    $('cite-style').addEventListener('change', function () {
      if (citeLast.items.length) { runConversion(); }
    });
    $('cite-copy').addEventListener('click', function () {
      copyText(buildCiteText(), $('cite-copy'));
    });
    $('cite-export-txt').addEventListener('click', function () {
      download('scholarfix-' + citeLast.style + '.txt', buildCiteText());
    });
    initChecklist();
  }

  function runConversion() {
    var errEl = $('cite-error');
    setError(errEl, null);
    hide($('cite-results'));
    var text = $('cite-input').value.trim();
    if (!text) {
      setError(errEl, 'Paste references or BibTeX first.');
      return;
    }
    var styleKey = $('cite-style').value;
    var btn = $('cite-run');
    btn.disabled = true;
    btn.textContent = 'Converting…';
    var statusEl = $('cite-status');
    statusEl.textContent = 'Loading citation.js…';
    var progress = makeProgress('cite');
    var progressStarted = false;

    CiteLib.parseToItems(text, function (done, total) {
      if (!progressStarted && total > 1) { progress.start(total); progressStarted = true; }
      if (progressStarted) { progress.update(done, total); }
      statusEl.textContent = 'Resolving references… ' + done + '/' + total;
    }).then(function (parsed) {
      citeLast.items = parsed.items;
      citeLast.unparsed = parsed.unparsed;
      citeLast.style = styleKey;
      if (!parsed.items.length) {
        throw new Error('No references could be parsed. For free-text references an internet connection is required.');
      }
      statusEl.textContent = 'Formatting ' + parsed.items.length + ' references…';
      return CiteLib.formatAll(parsed.items, styleKey);
    }).then(function (formatted) {
      if (!formatted) { return; }
      citeLast.formatted = formatted;
      renderCiteResults();
      statusEl.textContent = '';
      progress.finish();
    }).catch(function (err) {
      setError(errEl, String((err && err.message) || err));
      statusEl.textContent = '';
      progress.finish();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Convert';
    });
  }

  function renderCiteResults() {
    var ol = $('cite-preview');
    ol.innerHTML = '';
    citeLast.formatted.forEach(function (f) {
      var li = document.createElement('li');
      li.innerHTML = f.html || escapeHtml(f.text);
      ol.appendChild(li);
    });
    citeLast.unparsed.forEach(function (line) {
      var li = document.createElement('li');
      li.className = 'unparsed';
      li.textContent = 'Could not parse: ' + line;
      ol.appendChild(li);
    });
    var def = CiteLib.STYLE_DEFS[citeLast.style];
    $('cite-summary').textContent =
      citeLast.formatted.length + ' references formatted in ' + def.label + '.' +
      (citeLast.unparsed.length ? ' ' + citeLast.unparsed.length + ' line(s) could not be parsed (shown in red).' : '');
    show($('cite-results'));
    $('cite-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function buildCiteText() {
    var parts = citeLast.formatted.map(function (f) { return f.text; });
    citeLast.unparsed.forEach(function (line) { parts.push('[UNPARSED] ' + line); });
    return parts.join('\n\n') + '\n';
  }

  /* ---------- checklist ---------- */

  function initChecklist() {
    var select = $('checklist-style');
    function render() {
      var guide = window.STYLE_GUIDES[select.value];
      var container = $('checklist-content');
      container.innerHTML = '';
      if (!guide) { return; }
      guide.groups.forEach(function (group) {
        var div = document.createElement('div');
        div.className = 'checklist-group';
        var h = document.createElement('h4');
        h.textContent = group.title;
        div.appendChild(h);
        var ul = document.createElement('ul');
        group.items.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        div.appendChild(ul);
        container.appendChild(div);
      });
    }
    select.addEventListener('change', render);
    render();
  }

  /* ================= TAB 4: VENUE FORMATTER ================= */

  /* Sample excerpt shown in the style preview. */
  var PREVIEW_SAMPLE = {
    title: 'Collaboration Routines and New Venture Performance',
    author: 'A. Scholar, B. Writer — Example University',
    abstract: 'Drawing on routine dynamics theory, we examine how collaboration routines ' +
      'shape the performance of new ventures. Using a longitudinal sample of early-stage ' +
      'firms, we find that stable partnering routines improve survival, whereas rigid ' +
      'routines constrain adaptation. The findings contribute to research on ' +
      'organizational routines and entrepreneurship.',
    body: 'This section develops the core argument. We first review prior work on ' +
      'collaboration routines, then derive hypotheses linking routine stability to ' +
      'venture outcomes, and finally describe the empirical setting and results.'
  };

  /* One illustrative reference entry per documented reference style. */
  function sampleReference(venue) {
    var style = (venue.references && venue.references.style) || '';
    if (/numbered|square brackets/i.test(style)) {
      return '[1] A. Scholar, B. Writer, Collaboration routines and new venture performance, J. Bus. Venturing 38 (2023) 105–121. https://doi.org/10.1016/j.example.2023.001';
    }
    if (/^SMJ/.test(style)) {
      return 'Scholar A, Writer B. 2023. Collaboration routines and new venture performance. Strategic Management Journal 44(5): 105–121.';
    }
    if (/Academy of Management/.test(style)) {
      return 'Scholar, A., & Writer, B. 2023. Collaboration routines and new venture performance. Academy of Management Journal, 66: 105–121.';
    }
    if (/Organization Science/.test(style)) {
      return 'Scholar A, Writer B. 2023. Collaboration routines and new venture performance. Organ. Sci. 34(3) 105–121.';
    }
    return 'Scholar, A. A., & Writer, B. B. (2023). Collaboration routines and new venture performance. Journal of Applied Psychology, 108(1), 105–121. https://doi.org/10.1037/apl0000000';
  }

  function venueLineHeight(v) {
    var s = v.pageSetup && v.pageSetup.lineSpacing;
    return s === 'double' ? 2.0 : (s === '1.5' ? 1.5 : (s === 'single' ? 1.35 : 1.7));
  }

  function venueFontFamily(v) {
    var f = v.pageSetup && v.pageSetup.fontFamily;
    if (f && /times new roman/i.test(f)) { return '"Times New Roman", Times, serif'; }
    if (f && /garamond/i.test(f)) { return 'Garamond, "Times New Roman", serif'; }
    return 'Georgia, "Times New Roman", serif';
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) { e.className = className; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function currentVenue() {
    return VenueData.byId($('venue-select').value) || VenueData.venues[0];
  }

  function renderVenueMeta(venue) {
    var meta = $('venue-meta');
    meta.innerHTML = '';
    meta.appendChild(el('span', 'badge ' + (venue.completeness === 'partial' ? 'updated' : 'valid'),
      venue.completeness === 'partial' ? 'Partial profile' : 'Full profile'));
    meta.appendChild(document.createTextNode(' ' +
      venue.venueType + ' · ' + venue.publisher + ' · guidelines checked ' + venue.lastChecked + ' · '));
    var a = document.createElement('a');
    a.href = venue.sourceUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Official guidelines';
    meta.appendChild(a);
    if (venue.completeness === 'partial') {
      meta.appendChild(el('span', 'hint-block',
        'Some details are not published in the official guidelines and are marked "not specified" below.'));
    }
  }

  /* ---------- style preview ---------- */

  function headingPreviewNode(h) {
    var wrap = el('div', 'ms-heading');
    var head = el('span');
    head.textContent = h.caps === 'all' ? h.example.toUpperCase() : h.example;
    if (h.align === 'center') { head.style.textAlign = 'center'; head.style.display = 'block'; }
    if (h.bold) { head.style.fontWeight = '700'; }
    if (h.italic) { head.style.fontStyle = 'italic'; }
    if (h.align === 'indent-runin') { head.style.paddingLeft = '2em'; }
    wrap.appendChild(head);
    if (h.runIn) {
      wrap.appendChild(document.createTextNode(' ' + PREVIEW_SAMPLE.body));
    } else {
      wrap.appendChild(el('p', 'ms-body', PREVIEW_SAMPLE.body));
    }
    var cap = el('div', 'ms-note', 'Level ' + h.level + (h.note ? ' — ' + h.note : ''));
    wrap.appendChild(cap);
    return wrap;
  }

  function renderVenuePreview(venue) {
    var box = $('venue-preview');
    box.innerHTML = '';
    var ps = venue.pageSetup || {};
    box.style.fontFamily = venueFontFamily(venue);
    box.style.fontSize = (ps.fontSizePt || 12) + 'pt';
    box.style.lineHeight = String(venueLineHeight(venue));

    var captionBits = [];
    captionBits.push(ps.fontFamily ? ps.fontFamily + (ps.fontSizePt ? ' ' + ps.fontSizePt + ' pt' : '') : 'font not specified');
    captionBits.push(ps.lineSpacing ? ps.lineSpacing + '-spaced' : 'spacing not specified');
    captionBits.push(ps.marginsInches != null ? ps.marginsInches + ' in margins' : 'margins not specified');
    box.appendChild(el('div', 'ms-caption', captionBits.join(' · ')));

    var title = el('div', 'ms-title', PREVIEW_SAMPLE.title);
    box.appendChild(title);
    if (venue.titlePage && venue.titlePage.anonymizedManuscript === true) {
      box.appendChild(el('div', 'ms-note', '[Anonymized manuscript — author information appears only on the separate title page]'));
    } else {
      box.appendChild(el('div', 'ms-author', PREVIEW_SAMPLE.author));
    }

    var absHeading = el('div', 'ms-abstract-heading', 'Abstract');
    if (venue.abstract && venue.abstract.heading) {
      box.appendChild(absHeading);
    } else {
      box.appendChild(absHeading);
      absHeading.appendChild(el('span', 'ms-note-inline', ' (heading style not specified)'));
    }
    var absText = PREVIEW_SAMPLE.abstract;
    box.appendChild(el('p', 'ms-abstract', absText));
    if (venue.abstract && venue.abstract.wordLimit != null) {
      box.appendChild(el('div', 'ms-note', 'Abstract limit: ' + venue.abstract.wordLimit + ' words (sample above is ~' + absText.split(/\s+/).length + ' words).'));
    }

    var kw = venue.keywords || {};
    if (kw.min != null || kw.max != null || kw.placement) {
      var n = kw.max || kw.min || 3;
      var kwLine = el('p', 'ms-keywords');
      var label = el('span', 'ms-keywords-label', 'Keywords: ');
      if (/italic/i.test(kw.placement || '')) { label.style.fontStyle = 'italic'; }
      kwLine.appendChild(label);
      var words = [];
      for (var i = 1; i <= n; i++) { words.push('keyword ' + i); }
      kwLine.appendChild(document.createTextNode(words.join('; ')));
      box.appendChild(kwLine);
    }

    if ((venue.headings || []).length) {
      venue.headings.forEach(function (h) { box.appendChild(headingPreviewNode(h)); });
      if (venue.headingNotes) { box.appendChild(el('div', 'ms-note', venue.headingNotes)); }
    } else {
      box.appendChild(el('div', 'ms-note', 'Heading hierarchy: not specified in the official guidelines. ' + (venue.headingNotes || '')));
      box.appendChild(el('p', 'ms-body', PREVIEW_SAMPLE.body));
    }

    box.appendChild(el('div', 'ms-refs-heading', 'References'));
    var ref = el('p', 'ms-ref-entry', sampleReference(venue));
    box.appendChild(ref);
    if (venue.references && venue.references.style) {
      box.appendChild(el('div', 'ms-note', 'Reference style: ' + venue.references.style + '.'));
    }
  }

  /* ---------- interactive checklist ---------- */

  var venueChecklistState = {}; /* venueId -> {itemId: true} */

  function updateVenueProgress(venue) {
    var groups = FmtLib.buildChecklist(venue);
    var total = 0;
    groups.forEach(function (g) { total += g.items.length; });
    var state = venueChecklistState[venue.id] || {};
    var done = Object.keys(state).filter(function (k) { return state[k]; }).length;
    $('venue-progress-fill').style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
    $('venue-progress-label').textContent = done + ' / ' + total;
  }

  function renderVenueChecklist(venue) {
    var container = $('venue-checklist');
    container.innerHTML = '';
    var state = venueChecklistState[venue.id] || (venueChecklistState[venue.id] = {});
    FmtLib.buildChecklist(venue).forEach(function (group) {
      var div = el('div', 'checklist-group');
      div.appendChild(el('h4', null, group.title));
      group.items.forEach(function (item) {
        var label = el('label', 'check-item');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!state[item.id];
        cb.addEventListener('change', function () {
          state[item.id] = cb.checked;
          updateVenueProgress(venue);
        });
        label.appendChild(cb);
        label.appendChild(el('span', null, item.text));
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    updateVenueProgress(venue);
  }

  /* ---------- compliance check ---------- */

  function renderVenueFindings(result) {
    var list = $('venue-check-results');
    list.innerHTML = '';
    result.findings.forEach(function (f) {
      var li = el('li', 'finding ' + f.severity);
      var badge = el('span', 'badge ' +
        (f.severity === 'ok' ? 'valid' : (f.severity === 'warn' ? 'updated' : 'notfound')),
        f.severity === 'ok' ? 'Pass' : (f.severity === 'warn' ? 'Check' : 'Flag'));
      li.appendChild(badge);
      li.appendChild(el('span', 'finding-text', f.message));
      list.appendChild(li);
    });
    show(list);
    list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- init ---------- */

  function initVenueTab() {
    var select = $('venue-select');
    VenueData.venues.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name + ' (' + v.publisher + ')';
      select.appendChild(opt);
    });

    function renderAll() {
      var venue = currentVenue();
      setError($('venue-error'), null);
      renderVenueMeta(venue);
      renderVenuePreview(venue);
      renderVenueChecklist(venue);
      $('venue-docx-status').textContent = '';
      hide($('venue-check-results'));
    }
    select.addEventListener('change', renderAll);
    renderAll();

    $('venue-docx').addEventListener('click', function () {
      var venue = currentVenue();
      var btn = $('venue-docx');
      var status = $('venue-docx-status');
      btn.disabled = true;
      btn.textContent = 'Building…';
      status.textContent = 'Loading docx.js…';
      FmtLib.generateDocxBlob(venue).then(function (blob) {
        downloadBlob('scholarfix-' + venue.id + '-template.docx', blob);
        status.textContent = 'Template for ' + venue.name + ' downloaded. Verify details against the official guidelines before submission.';
      }).catch(function (err) {
        setError($('venue-error'), String((err && err.message) || err));
        status.textContent = '';
      }).then(function () {
        btn.disabled = false;
        btn.textContent = 'Download .docx template';
      });
    });

    $('venue-check-run').addEventListener('click', function () {
      var venue = currentVenue();
      var text = $('venue-compliance-input').value;
      setError($('venue-error'), null);
      renderVenueFindings(FmtLib.quickCheck(venue, text));
    });
    $('venue-check-clear').addEventListener('click', function () {
      $('venue-compliance-input').value = '';
      hide($('venue-check-results'));
      setError($('venue-error'), null);
    });
  }

  /* ---------- boot ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initDoiTab();
    initRetractTab();
    initCiteTab();
    initVenueTab();
  });
})();
