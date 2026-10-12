# SPEC — ScholarFix (App 1)

Reference & formatting toolkit for academics. Static web app, zero backend, zero build step.

## Deliverable
Repo folder: `/mnt/agents/output/academic-apps/scholarfix/`
Deployable: open `index.html` in a browser — everything must work from static hosting (GitHub Pages / any web server). CDN libraries allowed (pinned versions).

## Tech constraints
- Vanilla HTML/CSS/JS (no framework, no bundler). One `index.html`, `app.js`, `styles.css` (+ optional `js/` modules).
- Citation formatting: **citation.js** via CDN (`@citation-js/core`, `plugin-csl`, `plugin-bibtex` — use jsdelivr pinned versions).
- APIs (all free, CORS-enabled, no key):
  - Crossref: `https://api.crossref.org/works/{doi}` and `.../works?query.bibliographic=...`
  - OpenAlex: `https://api.openalex.org/works/doi:{doi}` — exposes `is_retracted` flag
- Visual style: low-saturation, warm neutrals, generous whitespace, serif headings (academic feel), no gradients. Clean, professional, dense-but-readable.

## Features (3 tools in one app, tabbed UI)

### Tab 1 — DOI Fixer
- Input: textarea (pasted references, one per line) or file upload (.txt/.bib/.ris)
- For each reference:
  1. If DOI present → validate via Crossref `works/{doi}` (200 = valid; 404 = broken)
  2. If no DOI or broken → search Crossref `query.bibliographic` with the reference text; accept top hit if title similarity is high (simple token-overlap ≥ 0.6); show match confidence
- Output table: original ref | status (valid / fixed / not found) | resolved DOI (link) | matched title | confidence
- Export: corrected bibliography as .txt and .bib

### Tab 2 — Retraction Checker
- Same input handling as Tab 1
- Resolve each ref to a DOI (reuse Tab 1 logic), then check:
  - OpenAlex `is_retracted` flag
  - Crossref `relation` field for `is-retraction-of` / `updated-by` retraction notices
- Output: status per ref — ✅ clean / ⚠️ corrected or updated / ❌ RETRACTED (with retraction notice link where available)
- Summary banner: "N of M references are retracted — replace before submission"

### Tab 3 — Citation Style Converter + Formatting Checklist
- Input: references (text or .bib) → parse via citation.js
- Convert to: APA 7, MLA 9, Chicago 18 (author-date), IEEE, Vancouver
- Live preview list + copy-all + download .txt
- Checklist panel: pick a target style → show formatting checklist (margins, spacing, heading rules, ref formatting, DOI presentation) from built-in `data/styleGuides.js`

## Repo contents
```
scholarfix/
├── index.html
├── styles.css
├── app.js            # UI wiring, tabs
├── js/
│   ├── doi.js        # Crossref resolve/validate
│   ├── retract.js    # OpenAlex + Crossref retraction checks
│   ├── citations.js  # citation.js wrapper
│   └── data/styleGuides.js
├── README.md         # features, how to run locally, how to deploy to GitHub Pages + how to upload repo to GitHub (step-by-step), embed-in-website instructions
├── LICENSE           # MIT
└── .gitignore
```

### Tab 4 — Journal/Venue Formatter (v2 addition)
- Venue profile database (`js/data/venues.js`): each profile encodes official author guidelines —
  margins, font family/size, line spacing, title page rules, abstract format (word limit,
  bold "Abstract" heading vs run-in vs structured), keywords rules, heading hierarchy styling
  (e.g., AOM: level-1 centered bold caps, level-2 flush-left bold, level-3 flush-left bold italic,
  level-4 indented bold run-in), reference style mapping, page/word limits, anonymization rules,
  source URL + last-checked date.
- Starter venue set (research official guidelines via web search; encode accurately):
  Academy of Management Annual Meeting (AOM), Journal of Business Venturing (JBV),
  Academy of Management Journal (AMJ), Academy of Management Review (AMR),
  Entrepreneurship Theory and Practice (ETP), Strategic Management Journal (SMJ),
  Journal of Applied Psychology, Organization Science, plus generic APA 7 fallback.
- Features per selected venue:
  1. **Formatting checklist** (interactive, checkboxes, progress)
  2. **Visual style preview** — a sample manuscript excerpt rendered with the venue's
     heading/abstract/title-page styling in-browser
  3. **Download .docx template** — client-side DOCX generation (docx.js via pinned CDN)
     with margins, fonts, heading styles, abstract block, and title page pre-configured
  4. **Quick compliance check** — paste abstract/manuscript text → word-limit check,
     keyword count check, anonymization red flags (author names), heading-pattern hints
- Extensible: documented JSON schema in venues.js header so users can add venues

## Quality bar

- Handles ≥50 references with concurrency-limited batching (max 4 in flight) + progress bar
- Graceful failures: network errors, malformed refs, API rate limits (Crossref polite pool: include `mailto` param placeholder in code comments)
- No console errors; works offline except API-dependent features clearly labeled
- README must include: local run, GitHub repo creation + push steps, GitHub Pages deploy steps, iframe/embed snippet for user's website
