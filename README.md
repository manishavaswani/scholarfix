# ScholarFix

Reference & formatting toolkit for academics. A fully static web app — no backend,
no build step, no account. Open `index.html` and start fixing references.

## Features

### 1. DOI Fixer
Paste references (one per line) or upload a `.txt`, `.bib`, or `.ris` file.
For every reference ScholarFix:

1. Extracts any DOI and validates it against the Crossref API
   (`api.crossref.org/works/{doi}` — 200 = valid, 404 = broken).
2. If the DOI is missing or broken, searches Crossref (`query.bibliographic`)
   and accepts the top hit when the token-overlap title similarity is ≥ 0.6.

Results are shown in a table (original reference, status valid/fixed/not found,
resolved DOI link, matched title, confidence) and can be exported as a corrected
`.txt` bibliography or `.bib` file.

### 2. Retraction Checker
Resolves each reference to a DOI (same pipeline as the DOI Fixer), then screens:

- the OpenAlex `is_retracted` flag (`api.openalex.org/works/doi:{doi}`), and
- the Crossref `relation` field for retraction / update notices
  (`is-retraction-of`, `updated-by`, corrections).

Each reference is labeled **Clean**, **Corrected / updated**, or **Retracted**
(with a link to the notice where available), plus a summary banner:
"N of M references are retracted — replace before submission".

### 3. Citation Style Converter + Formatting Checklist
Paste BibTeX, a list of DOIs, or plain-text references. Entries are parsed with
[citation.js](https://citation.js.org/) and converted to:

- APA 7th edition
- MLA 9th edition
- Chicago 18th edition (author–date)
- IEEE
- Vancouver

Live preview, copy-all, and `.txt` download. A built-in checklist panel
(`js/data/styleGuides.js`) summarizes the manuscript formatting rules
(margins, spacing, headings, reference formatting, DOI presentation) for the
chosen style.

### 4. Journal & Venue Formatter
Pick a target venue and get four tools in one place:

- **Interactive formatting checklist** (with progress bar) built from the
  venue's documented rules: margins, font/size, line spacing, title page,
  abstract format and word limit, keywords, heading hierarchy, reference
  style, page limits, and anonymization rules.
- **Visual style preview** — a sample manuscript excerpt rendered with the
  venue's typography (font, spacing, heading styling, abstract block,
  reference example).
- **Downloadable .docx template** — generated in the browser with
  [docx.js](https://github.com/dolanmiu/docx) (pinned CDN, lazy-loaded):
  margins, fonts, spacing, title page, abstract block, and heading styles
  pre-configured with placeholder text and inline notes.
- **Quick compliance check** — paste an abstract or manuscript excerpt to
  check the abstract word limit, keyword count, anonymization red flags
  (emails, acknowledgements, funding statements, first-person
  self-references), and heading-pattern hints.

Venue profiles live in `js/data/venues.js` and are transcribed from each
venue's **official** author guidelines (source URL + last-checked date per
profile; details the venue does not publish are marked `null` — never
invented). Profiles flagged as *partial* have sections the venue does not
document publicly. Bundled venues: Academy of Management Annual Meeting,
Academy of Management Journal, Academy of Management Review, Journal of
Business Venturing (Elsevier), Entrepreneurship Theory and Practice (SAGE),
Strategic Management Journal (Wiley), Journal of Applied Psychology (APA),
Organization Science (INFORMS), plus a generic APA 7th-edition fallback.
The JSON schema is documented in the header of `venues.js`, so adding a new
venue is a data-only change.

### Quality details
- Handles 50+ references with concurrency-limited batching (max 4 requests in
  flight) and a progress bar.
- Graceful failures for network errors, malformed references, and rate limits
  (retries with backoff; Crossref/OpenAlex polite-pool `mailto` placeholders in
  `js/doi.js` / `js/retract.js` — replace with your own email for production use).
- Everything runs client-side; only the metadata lookups described above leave
  your browser. BibTeX parsing and style checklists work fully offline.

## Screenshots

<!-- Add screenshots after deploying, e.g.:
![DOI Fixer results table](docs/screenshot-doi-fixer.png)
![Retraction Checker banner](docs/screenshot-retraction-checker.png)
![Citation style converter](docs/screenshot-citation-styles.png)
-->

_coming soon_

## Tech

- Vanilla HTML/CSS/JS. No framework, no bundler, no build step.
- [citation.js](https://citation.js.org/) (`@citation-js/core`, `plugin-csl`,
  `plugin-bibtex`) via pinned jsDelivr URLs, with the `citation-js` UMD bundle
  as an automatic fallback.
- CSL styles from the official
  [citation-style-language/styles](https://github.com/citation-style-language/styles)
  repo via jsDelivr.
- [docx.js](https://github.com/dolanmiu/docx) (`docx@9.8.1` IIFE build) via a
  pinned jsDelivr URL for client-side .docx template generation.
- APIs (free, CORS-enabled, no key):
  [Crossref REST API](https://api.crossref.org/) and
  [OpenAlex](https://docs.openalex.org/).

## Run locally

Option A — just open the file:

```
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

Option B — serve it (recommended, behaves exactly like hosting):

```
cd scholarfix
python3 -m http.server 8000
# then visit http://localhost:8000
```

Any static server works (`npx serve`, nginx, …). Internet access is required for
the DOI Fixer, Retraction Checker, and for loading citation.js from the CDN.

## Put it on GitHub (step-by-step, no git experience needed)

1. Create a free account at <https://github.com> and sign in.
2. Click the **+** in the top-right corner → **New repository**.
3. Name it `scholarfix`, leave it **Public**, do **not** check "Add a README"
   (this repo already has one), click **Create repository**.
4. Install git if you don't have it: <https://git-scm.com/downloads>
   (accept the defaults during install).
5. Open a terminal (macOS/Linux) or **Git Bash** (Windows) and run:

   ```
   cd path/to/scholarfix          # the folder containing index.html
   git init                       # only if this isn't already a git repo
   git add .
   git commit -m "Initial commit: ScholarFix"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/scholarfix.git
   git push -u origin main
   ```

   Replace `YOUR-USERNAME` with your GitHub username. When asked to sign in,
   use the browser window that opens (or a personal access token).
6. Refresh your repository page on GitHub — you should see all the files.

## Deploy to GitHub Pages

1. In your GitHub repository, click **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Under **Branch**, select **main** and **/ (root)**, click **Save**.
4. Wait a minute, then reload the page — GitHub shows your site URL:
   `https://YOUR-USERNAME.github.io/scholarfix/`

That's it — the app is a plain static site, so no build configuration is needed.

## Embed in your personal website

```html
<iframe
  src="https://YOUR-USERNAME.github.io/scholarfix/"
  style="width:100%; max-width:1020px; height:800px; border:1px solid #e2d9c9; border-radius:4px;"
  title="ScholarFix — reference and formatting toolkit"
  loading="lazy">
</iframe>
```

Deep-link to a specific tool with the URL hash: `#doi`, `#retract`, `#cite`, or `#venue`:

```html
<iframe src="https://YOUR-USERNAME.github.io/scholarfix/#retract" …></iframe>
```

## Repository layout

```
scholarfix/
├── index.html
├── styles.css
├── app.js            # UI wiring, tabs
├── js/
│   ├── doi.js        # Crossref resolve/validate + batching
│   ├── retract.js    # OpenAlex + Crossref retraction checks
│   ├── citations.js  # citation.js wrapper
│   ├── formatter.js  # venue checklist/compliance logic + docx.js template generation
│   └── data/
│       ├── styleGuides.js
│       └── venues.js # venue profile database (documented JSON schema)
├── README.md
├── LICENSE           # MIT
└── .gitignore
```

## Disclaimer

Results depend on publisher-deposited metadata. A "clean" verdict means no
retraction signal was found in Crossref/OpenAlex — always double-check against
the publisher record and [Retraction Watch](http://retractiondatabase.org/)
before submission.

## License

MIT — see [LICENSE](LICENSE).
