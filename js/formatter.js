/* ScholarFix — js/formatter.js
 * Journal/Venue Formatter logic (Tab 4):
 *   - builds the interactive checklist model from a venue profile
 *   - quick compliance check on pasted text (abstract length, keyword count,
 *     anonymization red flags, heading-pattern hints)
 *   - client-side .docx template generation via docx.js (pinned CDN,
 *     lazy-loaded on first use)
 *
 * UI wiring lives in app.js; this module is DOM-free except for the lazy
 * script loader. Exposed as window.ScholarFixFormatter.
 */
(function (global) {
  'use strict';

  /* docx.js 9.8.1 IIFE build (exposes window.docx). Verified 2026-10-05. */
  var DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.iife.min.js';

  var docxLoadPromise = null;

  function loadDocx() {
    if (global.docx) { return Promise.resolve(global.docx); }
    if (docxLoadPromise) { return docxLoadPromise; }
    docxLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = DOCX_URL;
      s.onload = function () {
        if (global.docx) { resolve(global.docx); }
        else { reject(new Error('docx.js loaded but did not initialize')); }
      };
      s.onerror = function () {
        docxLoadPromise = null;
        reject(new Error('Could not load docx.js from the CDN — check your internet connection.'));
      };
      document.head.appendChild(s);
    });
    return docxLoadPromise;
  }

  /* ================= checklist model ================= */

  function pushItem(items, idPrefix, text) {
    if (text) { items.push({ id: idPrefix + '-' + items.length, text: text }); }
  }

  function fmtSpacing(v) {
    return v === 'double' ? 'Double-space' : (v === '1.5' ? 'Use 1.5 line spacing for' : 'Single-space');
  }

  /* Build checklist groups from the structured profile; undocumented (null)
     fields are simply omitted — the checklist only lists documented rules. */
  function buildChecklist(venue) {
    var groups = [];
    var ps = venue.pageSetup || {};
    var tp = venue.titlePage || {};
    var ab = venue.abstract || {};
    var kw = venue.keywords || {};
    var rf = venue.references || {};
    var lm = venue.limits || {};
    var an = venue.anonymization || {};

    var page = [];
    if (ps.marginsInches != null) { page.push(ps.marginsInches + ' in margins on all sides.'); }
    if (ps.fontFamily || ps.fontSizePt) {
      page.push('Font: ' + (ps.fontFamily || 'unspecified') + (ps.fontSizePt ? ', ' + ps.fontSizePt + ' pt' : '') + '.');
    }
    if (ps.lineSpacing) { page.push(fmtSpacing(ps.lineSpacing) + ' the body text' + (ps.referenceSpacing && ps.referenceSpacing !== ps.lineSpacing ? '; references may be ' + ps.referenceSpacing + '-spaced' : '') + '.'); }
    if (ps.pageSize === 'letter') { page.push('US Letter (8.5" x 11") page setting.'); }
    pushItem(page, 'x', ps.pageNumbering);
    pushItem(page, 'x', ps.notes);
    if (page.length) { groups.push({ id: 'page', title: 'Page setup', items: page.map(function (t, i) { return { id: 'page-' + i, text: t }; }) }); }

    var title = [];
    if (tp.separate === true) { title.push('Provide a separate title page with author details.'); }
    if (tp.anonymizedManuscript === true) { title.push('The manuscript file sent to reviewers must be fully anonymized.'); }
    (tp.includes || []).forEach(function (t) { title.push('Title page includes: ' + t); });
    pushItem(title, 'x', tp.notes);
    (an.rules || []).forEach(function (t) { title.push(t); });
    if (title.length) { groups.push({ id: 'title', title: 'Title page & anonymization', items: title.map(function (t, i) { return { id: 'title-' + i, text: t }; }) }); }

    var abs = [];
    if (ab.wordLimit != null) { abs.push('Abstract of no more than ' + ab.wordLimit + ' words' + (ab.format ? ' (' + ab.format + ')' : '') + '.'); }
    if (ab.heading) { abs.push('Abstract heading: ' + ab.heading + '.'); }
    pushItem(abs, 'x', ab.placement);
    pushItem(abs, 'x', ab.notes);
    if (kw.min != null || kw.max != null) {
      abs.push('Keywords: ' +
        (kw.min != null && kw.max != null && kw.min === kw.max ? 'exactly ' + kw.min :
         (kw.min != null && kw.max != null ? kw.min + '–' + kw.max :
          (kw.max != null ? 'up to ' + kw.max : 'at least ' + kw.min))) +
        (kw.placement ? ' — ' + kw.placement : ''));
    } else if (kw.placement) { abs.push('Keywords: ' + kw.placement); }
    pushItem(abs, 'x', kw.notes);
    if (abs.length) { groups.push({ id: 'abstract', title: 'Abstract & keywords', items: abs.map(function (t, i) { return { id: 'abstract-' + i, text: t }; }) }); }

    var heads = [];
    (venue.headings || []).forEach(function (h) { if (h.note) { heads.push('Level ' + h.level + ': ' + h.note); } });
    pushItem(heads, 'x', venue.headingNotes);
    if (heads.length) { groups.push({ id: 'headings', title: 'Headings', items: heads.map(function (t, i) { return { id: 'headings-' + i, text: t }; }) }); }

    var refs = [];
    if (rf.style) { refs.push('Reference style: ' + rf.style + '.'); }
    if (rf.inText) { refs.push('In-text citations: ' + rf.inText + '.'); }
    if (rf.ordering) { refs.push('Reference list: ' + rf.ordering + '.'); }
    pushItem(refs, 'x', rf.notes);
    if (refs.length) { groups.push({ id: 'refs', title: 'References', items: refs.map(function (t, i) { return { id: 'refs-' + i, text: t }; }) }); }

    var limits = [];
    if (lm.maxPages != null || lm.maxWords != null || lm.scope) {
      limits.push('Length limit: ' + (lm.scope || ((lm.maxPages != null ? lm.maxPages + ' pages' : '') + (lm.maxWords != null ? (lm.maxPages != null ? ' / ' : '') + lm.maxWords + ' words' : ''))));
    }
    pushItem(limits, 'x', lm.notes);
    if (limits.length) { groups.push({ id: 'limits', title: 'Length limits', items: limits.map(function (t, i) { return { id: 'limits-' + i, text: t }; }) }); }

    if ((venue.extra || []).length) {
      groups.push({
        id: 'extra', title: 'Venue-specific rules',
        items: venue.extra.map(function (t, i) { return { id: 'extra-' + i, text: t }; })
      });
    }
    return groups;
  }

  /* ================= quick compliance check ================= */

  function countWords(text) {
    var m = String(text || '').trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function anonymizationRequired(venue) {
    var an = venue.anonymization || {};
    var tp = venue.titlePage || {};
    return an.reviewType === 'double-anonymized' || an.reviewType === 'masked' || tp.anonymizedManuscript === true;
  }

  /* Extract a keywords line ("Keywords: a, b, c" / "Key words: ..."). */
  function extractKeywords(text) {
    var m = String(text).match(/key\s?words?\s*[:\-–]\s*([^\n]+)/i);
    if (!m) { return null; }
    return m[1].split(/[;,]/).map(function (s) { return s.trim().replace(/\.$/, ''); })
      .filter(function (s) { return s.length > 0; });
  }

  /* Lines that look like headings: short, no terminal period, mostly words. */
  function candidateHeadings(text) {
    return String(text).split(/\n+/).map(function (l) { return l.trim(); }).filter(function (l) {
      if (!l || l.length > 70) { return false; }
      if (/[.!?]$/.test(l)) { return false; }
      var words = l.split(/\s+/);
      return words.length >= 1 && words.length <= 10;
    });
  }

  /*
   * quickCheck(venue, text) -> { wordCount, findings: [{severity, message}] }
   * severity: 'ok' | 'warn' | 'fail'
   */
  function quickCheck(venue, text) {
    var findings = [];
    var words = countWords(text);
    var ab = venue.abstract || {};
    var kw = venue.keywords || {};

    if (!words) {
      return { wordCount: 0, findings: [{ severity: 'warn', message: 'No text to check — paste your abstract or manuscript excerpt first.' }] };
    }

    /* --- abstract length --- */
    if (ab.wordLimit != null) {
      if (words <= ab.wordLimit) {
        findings.push({ severity: 'ok', message: 'Word count ' + words + ' is within the ' + ab.wordLimit + '-word abstract limit.' });
      } else {
        findings.push({ severity: 'fail', message: 'Word count ' + words + ' exceeds the ' + ab.wordLimit + '-word abstract limit by ' + (words - ab.wordLimit) + ' words. (If you pasted a full manuscript, ignore this — the limit applies to the abstract only.)' });
      }
    } else {
      findings.push({ severity: 'ok', message: 'This venue does not publish an abstract word limit; ' + words + ' words pasted.' });
    }

    /* --- SMJ no-citations-in-abstract policy --- */
    if (venue.id === 'smj' && /\([^)]*\b(19|20)\d{2}[a-z]?\s*[,)]/.test(text)) {
      findings.push({ severity: 'fail', message: 'Possible citation in the abstract — SMJ policy allows no citations to other works in the abstract.' });
    }

    /* --- keywords --- */
    var keywords = extractKeywords(text);
    if (keywords) {
      var tooFew = kw.min != null && keywords.length < kw.min;
      var tooMany = kw.max != null && keywords.length > kw.max;
      var range = kw.min != null && kw.max != null ? (kw.min === kw.max ? 'exactly ' + kw.min : kw.min + '–' + kw.max)
        : (kw.max != null ? 'up to ' + kw.max : 'at least ' + kw.min);
      if (tooFew || tooMany) {
        findings.push({ severity: 'fail', message: 'Found ' + keywords.length + ' keyword(s) ("' + keywords.join('", "') + '"); ' + venue.shortName + ' requires ' + range + '.' });
      } else {
        findings.push({ severity: 'ok', message: 'Found ' + keywords.length + ' keyword(s) — within the ' + venue.shortName + ' requirement (' + range + ').' });
      }
    } else if (kw.min != null || kw.max != null) {
      findings.push({ severity: 'warn', message: 'No "Keywords:" line detected; ' + venue.shortName + ' requires ' + (kw.min != null && kw.max != null ? (kw.min === kw.max ? 'exactly ' + kw.min : kw.min + '–' + kw.max) : (kw.max != null ? 'up to ' + kw.max : 'at least ' + kw.min)) + ' keyword(s)' + (kw.placement ? ' (' + kw.placement + ')' : '') + '.' });
    }

    /* --- anonymization red flags --- */
    if (anonymizationRequired(venue)) {
      var flags = [];
      if (/\backnowledg(e)?(ment)?s?\b/i.test(text)) { flags.push('an "Acknowledgement(s)" section'); }
      if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) { flags.push('an email address'); }
      if (/\b(corresponding author|author note)\b/i.test(text)) { flags.push('a "corresponding author"/author-note statement'); }
      if (/\b(my|our)\s+(dissertation|earlier|previous|prior)\s+(study|work|paper|dissertation|research)\b/i.test(text)) { flags.push('first-person references to your own prior work ("my/our previous study")'); }
      if (/\b(we|i)\s+(thank|acknowledge|are grateful to)\b/i.test(text)) { flags.push('first-person thanks/acknowledgements'); }
      if (/\b(this (research|study|work) was (supported|funded)|grant (number|no\.?|#))\b/i.test(text)) { flags.push('a funding statement (grant numbers often identify authors)'); }
      if (/\(\s*authors?['’]?\s+(own\s+)?(data|survey|analysis)\s*\)/i.test(text)) { flags.push('an unmasked self-reference such as "(authors\' own data)"'); }
      if (flags.length) {
        findings.push({ severity: 'fail', message: 'Possible identifying material in an anonymized submission: ' + flags.join('; ') + '. Move identifying content to the title page / cover letter.' });
      } else {
        findings.push({ severity: 'ok', message: 'No obvious anonymization red flags found (acknowledgements, emails, funding statements, first-person self-references). Also check file metadata and self-citations manually.' });
      }
    }

    /* --- heading hints --- */
    var heads = candidateHeadings(text);
    var numbered = heads.filter(function (h) { return /^\d+(\.\d+)*\.?\s+\S/.test(h); });
    var allCaps = heads.filter(function (h) { return /[A-Z]/.test(h) && h === h.toUpperCase() && h.length > 3; });
    var lvl1 = venue.headings && venue.headings[0];
    if (lvl1 && lvl1.numbered === false && numbered.length) {
      findings.push({ severity: 'warn', message: 'Found ' + numbered.length + ' numbered heading(s) (e.g., "' + numbered[0] + '") — ' + venue.shortName + ' does not number section headings.' });
    } else if (lvl1 && lvl1.numbered === true && heads.length >= 2 && !numbered.length) {
      findings.push({ severity: 'warn', message: 'Headings detected but none are numbered — ' + venue.shortName + ' uses numbered sections (1, 1.1, 1.1.1).' });
    } else if (heads.length && lvl1 && lvl1.numbered != null) {
      findings.push({ severity: 'ok', message: 'Heading numbering looks consistent with ' + venue.shortName + ' style (' + heads.length + ' candidate heading(s) found).' });
    }
    if (lvl1 && lvl1.caps === 'all' && heads.length && !allCaps.length) {
      findings.push({ severity: 'warn', message: 'No all-capitals main headings detected — ' + venue.shortName + ' level-1 headings are set in ALL CAPITAL LETTERS, centered, bold.' });
    }

    /* --- page/word limits (word-based only) --- */
    if (venue.limits && venue.limits.maxWords != null && words > venue.limits.maxWords) {
      findings.push({ severity: 'fail', message: 'Pasted text (' + words + ' words) exceeds the ' + venue.limits.maxWords + '-word limit.' });
    }

    return { wordCount: words, findings: findings };
  }

  /* ================= .docx template generation ================= */

  var TWIPS_PER_INCH = 1440;

  function spacingTwips(lineSpacing) {
    if (lineSpacing === 'single') { return 240; }
    if (lineSpacing === '1.5') { return 360; }
    return 480; /* double (default for these venues) */
  }

  function headingText(h) {
    var t = h.example;
    if (h.caps === 'all') { t = t.toUpperCase(); }
    return t;
  }

  /* Build the docx.Document for a venue. Requires the docx global. */
  function buildVenueDocument(venue) {
    var d = global.docx;
    var ps = venue.pageSetup || {};
    var ab = venue.abstract || {};
    var kw = venue.keywords || {};
    var tp = venue.titlePage || {};

    var font = ps.fontFamily && ps.fontFamily.indexOf('Times New Roman') === 0 ? 'Times New Roman'
      : (ps.fontFamily && /garamond/i.test(ps.fontFamily) ? 'Garamond' : 'Times New Roman');
    var halfPt = (ps.fontSizePt || 12) * 2;
    var marginTwips = Math.round((ps.marginsInches != null ? ps.marginsInches : 1) * TWIPS_PER_INCH);
    var line = spacingTwips(ps.lineSpacing);
    var align = d.AlignmentType;

    function para(text, opts) {
      opts = opts || {};
      return new d.Paragraph({
        alignment: opts.alignment || align.LEFT,
        spacing: { line: opts.line || line },
        indent: opts.indent,
        children: [new d.TextRun({
          text: text,
          font: font,
          size: halfPt,
          bold: !!opts.bold,
          italics: !!opts.italic,
          allCaps: !!opts.caps
        })]
      });
    }

    function note(text) {
      return new d.Paragraph({
        spacing: { line: 240 },
        children: [new d.TextRun({ text: text, font: font, size: halfPt - 4, italics: true, color: '666666' })]
      });
    }

    var children = [];

    /* --- title page --- */
    if (tp.separate) {
      children.push(para('[Title of the Manuscript]', { alignment: align.CENTER, bold: true }));
      children.push(para('', {}));
      if (tp.anonymizedManuscript !== true) {
        children.push(para('[Author Name]', { alignment: align.CENTER }));
        children.push(para('[Affiliation]', { alignment: align.CENTER }));
        children.push(para('[Contact: address, email, phone]', { alignment: align.CENTER }));
      }
      (tp.includes || []).forEach(function (t) { children.push(note('Title page must include: ' + t)); });
      if (venue.id === 'smj') {
        children.push(note('Running head (up to 60 characters):'));
        children.push(note('Keywords: five keywords, listed on the title page.'));
      }
      children.push(new d.Paragraph({ children: [new d.PageBreak()] }));
    } else {
      children.push(para('[Title of the Paper in Title Case]', { alignment: align.CENTER, bold: true }));
      children.push(para('', {}));
    }

    if (tp.anonymizedManuscript === true) {
      children.push(note('Anonymized manuscript: remove all author names, affiliations, acknowledgements, and identifying metadata from this document.'));
    }

    /* --- abstract block --- */
    var absHeadingText = 'Abstract';
    var absStyle = { alignment: align.CENTER, bold: true };
    if (ab.heading && /"Abstract"/.test(ab.heading)) { absStyle = { alignment: align.CENTER, bold: true }; }
    children.push(para(absHeadingText, absStyle));
    children.push(note('Abstract' + (ab.wordLimit != null ? ' — maximum ' + ab.wordLimit + ' words' : '') + (ab.format ? ', ' + ab.format : '') + '. Replace this line with your abstract.'));
    children.push(para('[Abstract text. ' + (ab.notes || '') + ']', {}));

    /* --- keywords --- */
    if (kw.min != null || kw.max != null || kw.placement) {
      var kwLabelItalic = /italic/i.test(kw.placement || '');
      children.push(new d.Paragraph({
        spacing: { line: line },
        indent: kwLabelItalic ? { left: Math.round(0.5 * TWIPS_PER_INCH) } : undefined,
        children: [
          new d.TextRun({ text: 'Keywords: ', font: font, size: halfPt, italics: kwLabelItalic }),
          new d.TextRun({ text: '[keyword 1], [keyword 2], [keyword 3]', font: font, size: halfPt })
        ]
      }));
      if (kw.min != null || kw.max != null) {
        children.push(note('Keyword requirement: ' +
          (kw.min != null && kw.max != null ? (kw.min === kw.max ? 'exactly ' + kw.min : kw.min + '–' + kw.max)
            : (kw.max != null ? 'up to ' + kw.max : 'at least ' + kw.min)) +
          (kw.notes ? ' — ' + kw.notes : '')));
      }
    }

    children.push(new d.Paragraph({ children: [new d.PageBreak()] }));

    /* --- heading styles demonstration --- */
    var hs = venue.headings || [];
    hs.forEach(function (h) {
      var indentIn = h.align === 'indent-runin' ? 0.5 : 0;
      var hPara = new d.Paragraph({
        alignment: h.align === 'center' ? align.CENTER : align.LEFT,
        spacing: { line: venue.id === 'aom' || venue.id === 'amj' || venue.id === 'amr' ? 360 : line },
        indent: indentIn ? { left: Math.round(indentIn * TWIPS_PER_INCH) } : undefined,
        children: [
          new d.TextRun({
            text: headingText(h) + (h.runIn ? ' ' : ''),
            font: font, size: halfPt,
            bold: h.bold === true, italics: h.italic === true,
            allCaps: false /* caps already applied to the example text */
          })
        ].concat(h.runIn ? [new d.TextRun({
          text: 'Body text runs in on the same line as the heading. Replace with your text.',
          font: font, size: halfPt
        })] : [])
      });
      children.push(hPara);
      if (!h.runIn) {
        children.push(para('[Section text. ' + (h.note || '') + ']', { indent: { left: 0 } }));
      }
    });
    if (!hs.length && venue.headingNotes) {
      children.push(note('Headings: ' + venue.headingNotes));
      children.push(para('[Section Heading]', { bold: true }));
      children.push(para('[Section text]', {}));
    }

    /* --- references --- */
    children.push(new d.Paragraph({ children: [new d.PageBreak()] }));
    children.push(para('References', { alignment: align.CENTER, bold: true }));
    children.push(note('Reference style for ' + venue.name + ': ' + (venue.references.style || 'see guidelines') +
      (venue.references.ordering ? '; ' + venue.references.ordering : '') + '.'));
    children.push(new d.Paragraph({
      spacing: { line: spacingTwips(ps.referenceSpacing || ps.lineSpacing) },
      indent: { hanging: Math.round(0.5 * TWIPS_PER_INCH) },
      children: [new d.TextRun({ text: '[Reference entry 1]', font: font, size: halfPt })]
    }));
    children.push(new d.Paragraph({
      spacing: { line: spacingTwips(ps.referenceSpacing || ps.lineSpacing) },
      indent: { hanging: Math.round(0.5 * TWIPS_PER_INCH) },
      children: [new d.TextRun({ text: '[Reference entry 2]', font: font, size: halfPt })]
    }));

    return new d.Document({
      creator: 'ScholarFix',
      title: venue.shortName + ' manuscript template',
      description: 'Template generated by ScholarFix from the documented ' + venue.name + ' author guidelines (' + venue.sourceUrl + ', checked ' + venue.lastChecked + ').',
      sections: [{
        properties: {
          page: {
            size: ps.pageSize === 'letter' || !ps.pageSize
              ? { width: 12240, height: 15840 } /* US Letter */
              : { width: 12240, height: 15840 },
            margin: { top: marginTwips, bottom: marginTwips, left: marginTwips, right: marginTwips }
          }
        },
        children: children
      }]
    });
  }

  /* Returns a Promise resolving to a Blob of the .docx file. */
  function generateDocxBlob(venue) {
    return loadDocx().then(function () {
      return global.docx.Packer.toBlob(buildVenueDocument(venue));
    });
  }

  global.ScholarFixFormatter = {
    DOCX_URL: DOCX_URL,
    loadDocx: loadDocx,
    buildChecklist: buildChecklist,
    quickCheck: quickCheck,
    generateDocxBlob: generateDocxBlob,
    /* exposed for testing */
    _internals: { countWords: countWords, extractKeywords: extractKeywords, candidateHeadings: candidateHeadings }
  };

})(typeof window !== 'undefined' ? window : globalThis);
