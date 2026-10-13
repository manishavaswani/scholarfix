/* ScholarFix — js/citations.js
 * Thin wrapper around citation.js (@citation-js/core + plugin-csl + plugin-bibtex),
 * loaded from pinned jsDelivr URLs. Exposed as window.ScholarFixCitations.
 *
 * Loading strategy:
 *   1. Primary: native ES-module imports of the pinned scoped packages
 *      (jsDelivr's +esm endpoints bundle and pin their dependencies).
 *   2. Fallback: the citation-js UMD browser bundle (same packages, single file),
 *      used only if the ESM import fails (very old browsers, CDN hiccup).
 *
 * CSL styles: APA and Vancouver ship built into plugin-csl. MLA 9,
 * Chicago 18 (author-date) and IEEE are fetched from the official
 * citation-style-language/styles repo (pinned via jsDelivr) and registered
 * at runtime. plugin-csl bundles the en-US locale inline, so no separate
 * locale fetch is required.
 */
(function (global) {
  'use strict';

  var ESM_URLS = {
    core: 'https://cdn.jsdelivr.net/npm/@citation-js/core@0.9.0/+esm',
    csl: 'https://cdn.jsdelivr.net/npm/@citation-js/plugin-csl@0.9.0/+esm',
    bibtex: 'https://cdn.jsdelivr.net/npm/@citation-js/plugin-bibtex@0.9.0/+esm'
  };
  var UMD_URL = 'https://cdn.jsdelivr.net/npm/citation-js@0.9.0/build/citation.min.js';

  // CSL template URLs (official citation-style-language/styles repo).
  var STYLE_DEFS = {
    apa: { label: 'APA 7th edition', template: 'apa', builtin: true },
    mla: {
      label: 'MLA 9th edition', template: 'modern-language-association',
      url: 'https://cdn.jsdelivr.net/gh/citation-style-language/styles@master/modern-language-association.csl'
    },
    chicago: {
      label: 'Chicago 18th (author–date)', template: 'chicago-author-date',
      url: 'https://cdn.jsdelivr.net/gh/citation-style-language/styles@master/chicago-author-date.csl'
    },
    ieee: {
      label: 'IEEE', template: 'ieee',
      url: 'https://cdn.jsdelivr.net/gh/citation-style-language/styles@master/ieee.csl'
    },
    vancouver: { label: 'Vancouver', template: 'vancouver', builtin: true }
  };

  var Cite = null;
  var citePlugins = null;
  var loadPromise = null;
  var registeredTemplates = {};

  function loadScriptTag(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }

  /* Load citation.js exactly once; resolves to the Cite constructor. */
  function loadCite() {
    if (loadPromise) { return loadPromise; }
    loadPromise = (async function () {
      try {
        var core = await import(/* @vite-ignore */ ESM_URLS.core);
        await import(ESM_URLS.csl);    // self-registers the @csl plugin
        await import(ESM_URLS.bibtex); // self-registers the @bibtex plugin
        Cite = core.Cite || (core.default && core.default.Cite) || core.default;
        citePlugins = core.plugins || (core.default && core.default.plugins) || (Cite && Cite.plugins);
        if (!Cite || !citePlugins) { throw new Error('citation.js core did not expose Cite/plugins'); }
      } catch (esmErr) {
        await loadScriptTag(UMD_URL);
        // The citation-js browser bundle is browserify-style: it defines a
        // global `require`; `require('citation-js')` returns { Cite, plugins, ... }
        // with core, csl and bibtex plugins already registered.
        var mod = typeof global.require === 'function' ? global.require('citation-js') : null;
        Cite = (mod && (mod.Cite || mod.default)) || global.Cite;
        citePlugins = (mod && mod.plugins) || (Cite && Cite.plugins);
        if (!Cite || !citePlugins) { throw esmErr; }
      }
      return Cite;
    })();
    return loadPromise;
  }

  /* Fetch + register a non-built-in CSL style once. */
  async function ensureStyle(styleKey) {
    var def = STYLE_DEFS[styleKey];
    if (!def) { throw new Error('Unknown style: ' + styleKey); }
    if (def.builtin || registeredTemplates[def.template]) { return def.template; }
    var res = await fetch(def.url);
    if (!res.ok) { throw new Error('Could not fetch CSL style ' + def.label + ' (HTTP ' + res.status + ')'); }
    var xml = await res.text();
    var config = citePlugins.config.get('@csl');
    // citation.js 0.9.x exposes `styles`; 0.7.x called the same register `templates`.
    var styles = config.styles || config.templates;
    styles.add(def.template, xml);
    registeredTemplates[def.template] = true;
    return def.template;
  }

  /* ---------- input parsing ---------- */

  function looksLikeBibtex(text) { return /^\s*@\w+\s*\{/m.test(text); }

  function looksLikeDoiOnly(line) {
    var cleaned = String(line).trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:\s*/i, '');
    return /^10\.\d{4,9}\/\S+$/.test(cleaned) ? cleaned : null;
  }

  /* Fetch CSL JSON metadata for a DOI from Crossref's transform endpoint
   * (returns a citation.js-ready CSL-JSON record). */
  async function fetchCslJson(doi) {
    var url = 'https://api.crossref.org/works/' + encodeURIComponent(doi) +
      '/transform/application/vnd.citationstyles.csl+json';
    var res = await fetch(url, { headers: { Accept: 'application/vnd.citationstyles.csl+json' } });
    if (!res.ok) { throw new Error('HTTP ' + res.status + ' for DOI ' + doi); }
    var item = await res.json();
    if (item && !item.id) { item.id = doi; }
    return item;
  }

  /* Parse user input into CSL-JSON items.
   * Returns { items: [cslJson...], unparsed: [originalLine...] }
   * Strategy:
   *   - BibTeX input          -> citation.js plugin-bibtex (works offline)
   *   - bare DOI lines        -> Crossref transform endpoint (needs network)
   *   - other free-text lines -> resolve via Crossref (ScholarFixDOI), then
   *                              fetch CSL JSON; unresolved lines go to `unparsed`
   * onProgress(done, total) is optional.
   */
  async function parseToItems(text, onProgress) {
    await loadCite();
    text = String(text || '').trim();
    if (!text) { return { items: [], unparsed: [] }; }

    if (looksLikeBibtex(text)) {
      var cite = await Cite.async(text);
      return { items: cite.data, unparsed: [] };
    }

    var lines = global.ScholarFixDOI.parseReferenceInput(text);
    var items = [];
    var unparsed = [];
    var done = 0;

    await global.ScholarFixDOI.mapWithConcurrency(lines, async function (line) {
      var bareDoi = looksLikeDoiOnly(line);
      try {
        if (bareDoi) {
          items.push(await fetchCslJson(bareDoi));
          return;
        }
        var resolved = await global.ScholarFixDOI.resolveReference(line);
        if (resolved.doi && resolved.status !== 'not found') {
          items.push(await fetchCslJson(resolved.doi));
        } else {
          unparsed.push(line);
        }
      } catch (err) {
        unparsed.push(line);
      }
    }, global.ScholarFixDOI.MAX_CONCURRENCY, function (d, total) {
      done = d;
      if (onProgress) { onProgress(done, total); }
    });

    return { items: items, unparsed: unparsed };
  }

  /* ---------- formatting ---------- */

  /* Format one CSL-JSON item. Returns { html, text } bibliography strings. */
  async function formatItem(item, styleKey) {
    await loadCite();
    var template = await ensureStyle(styleKey);
    var cite = new Cite(item);
    var opts = { template: template, lang: 'en-US' };
    var html = cite.format('bibliography', Object.assign({ format: 'html' }, opts));
    var text = cite.format('bibliography', Object.assign({ format: 'text' }, opts));
    return { html: String(html).trim(), text: String(text).trim() };
  }

  /* Format a whole list. Returns [{ html, text }] in input order. */
  async function formatAll(items, styleKey) {
    await loadCite();
    await ensureStyle(styleKey);
    var out = [];
    for (var i = 0; i < items.length; i++) {
      out.push(await formatItem(items[i], styleKey));
    }
    return out;
  }

  global.ScholarFixCitations = {
    STYLE_DEFS: STYLE_DEFS,
    loadCite: loadCite,
    ensureStyle: ensureStyle,
    parseToItems: parseToItems,
    formatItem: formatItem,
    formatAll: formatAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
