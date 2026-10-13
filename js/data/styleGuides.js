/* ScholarFix — js/data/styleGuides.js
 * Built-in formatting checklists for the five supported citation styles.
 * Content is condensed from the public guidance of each style manual;
 * it is a pre-submission aide, not a substitute for the full manual.
 * Exposed as window.STYLE_GUIDES.
 */
(function (global) {
  'use strict';

  global.STYLE_GUIDES = {
  apa: {
    label: 'APA 7th edition',
    groups: [
      {
        title: 'Page setup',
        items: [
          '1 in (2.54 cm) margins on all sides.',
          'Double-space the entire manuscript, including the reference list and block quotes.',
          'Use a readable font consistently: 11 pt Calibri, 11 pt Arial, 12 pt Times New Roman, or 10 pt Lucida Sans Unicode.',
          'Page number in the top-right header of every page; student papers need no running head.',
          'Indent the first line of every paragraph 0.5 in.'
        ]
      },
      {
        title: 'Headings',
        items: [
          'Level 1: centered, bold, title case. Level 2: flush left, bold, title case.',
          'Level 3: flush left, bold italic, title case.',
          'Do not number headings; do not label the introduction with a heading.'
        ]
      },
      {
        title: 'Reference list',
        items: [
          'Start on a new page titled "References" (bold, centered).',
          'Alphabetize by first author surname; use a 0.5 in hanging indent.',
          'Author–date citations: (Surname, Year); use "et al." for three or more authors in-text.',
          'List up to 20 authors in the reference entry; use an ampersand before the last.',
          'Italicize journal names and volume numbers; capitalize only the first word of article titles (sentence case).'
        ]
      },
      {
        title: 'DOIs and URLs',
        items: [
          'Present DOIs as full links: https://doi.org/xxxx — never as "doi:" prefixes.',
          'Include the DOI for every work that has one; do not add a period after a DOI or URL.',
          'No "Retrieved from" before URLs unless a retrieval date is genuinely needed.'
        ]
      }
    ]
  },

  mla: {
    label: 'MLA 9th edition',
    groups: [
      {
        title: 'Page setup',
        items: [
          '1 in (2.54 cm) margins on all sides.',
          'Double-space the entire paper, including the Works Cited list.',
          'Readable 12 pt font (e.g., Times New Roman); indent paragraphs 0.5 in.',
          'Header with your surname and page number, flush right, 0.5 in from the top.'
        ]
      },
      {
        title: 'Headings',
        items: [
          'No title page unless requested: name, instructor, course, and date flush left on the first page.',
          'Paper title centered, in title case, with no bold, italics, or quotation marks.',
          'Section headings, if used, are flush left and numbered (1., 1.1, …) or styled consistently.'
        ]
      },
      {
        title: 'Works Cited list',
        items: [
          'Start on a new page titled "Works Cited" (centered, no bold).',
          'Alphabetize by author surname (or title if no author); 0.5 in hanging indent.',
          'Entries follow the nine core elements in order: Author. Title of source. Title of container, Contributors, Version, Number, Publisher, Publication date, Location.',
          'In-text citations give author and page, without a comma: (Surname 24).',
          'For three or more authors, give the first author followed by "et al."'
        ]
      },
      {
        title: 'DOIs and URLs',
        items: [
          'Cite a DOI (prefixed with https://doi.org/) in preference to a URL whenever one exists.',
          'Omit "https://" from ordinary web URLs; include the full DOI link.',
          'Access dates are optional but recommended for undated online sources.'
        ]
      }
    ]
  },

  chicago: {
    label: 'Chicago 18th (author–date)',
    groups: [
      {
        title: 'Page setup',
        items: [
          'At least 1 in margins on all sides.',
          'Double-space the main text; single-space block quotes, table titles, and figure captions.',
          'Readable 12 pt font (e.g., Times New Roman); page numbers, usually top right or bottom center.',
          'Indent new paragraphs 0.5 in; align text flush left (ragged right).'
        ]
      },
      {
        title: 'Headings',
        items: [
          'Use a consistent hierarchy (e.g., centered bold for level 1, flush-left bold for level 2).',
          'Headline-style capitalization for titles and headings.',
          'Never end a heading with a period.'
        ]
      },
      {
        title: 'Reference list (author–date)',
        items: [
          'Start on a new page titled "References" (centered).',
          'Alphabetize by author surname; use a 0.5 in hanging indent.',
          'Place the year directly after the author(s): Surname, First. 2021. Title…',
          'In-text citations: (Surname 2021, 24) — no comma between name and year, comma before page.',
          'For four or more authors, cite first author "et al." in-text; list up to ten in the reference.'
        ]
      },
      {
        title: 'DOIs and URLs',
        items: [
          'Append the DOI as https://doi.org/xxxx at the end of the reference.',
          'Prefer the DOI over a database URL for journal articles.',
          'Access dates are required only for undated or frequently updated online sources.'
        ]
      }
    ]
  },

  ieee: {
    label: 'IEEE',
    groups: [
      {
        title: 'Page setup',
        items: [
          'Follow the conference/journal template exactly (usually two columns, 10 pt type).',
          'Margins and column widths are fixed by the template — do not adjust them.',
          'Number pages lightly in pencil only if required for review; camera-ready papers omit page numbers.'
        ]
      },
      {
        title: 'Headings',
        items: [
          'Primary headings: Roman numerals, centered, small caps (I. INTRODUCTION).',
          'Secondary headings: capital letters, flush left, italic (A. Subsection).',
          'The abstract is a single bold-“Abstract—” paragraph, not a numbered section.'
        ]
      },
      {
        title: 'References',
        items: [
          'Number references in order of first citation: [1], [2], …',
          'Reference list is single-spaced, in a smaller font if the template specifies, with bracketed numbers flush left.',
          'Journal article format: A. B. Author, "Title of paper," Abbrev. Title of Journal, vol. x, no. x, pp. xx–xx, Mon. Year.',
          'Use standard IEEE journal abbreviations; enclose article titles in quotation marks.',
          'In-text, cite as [1]; treat the number as a noun or footnote, e.g., "as shown in [3]".'
        ]
      },
      {
        title: 'DOIs and URLs',
        items: [
          'Add "doi: 10.xxxx/xxxx" at the end of the entry when available.',
          'For online sources include the URL and the access date: (accessed Mon. Day, Year).',
          'A DOI is preferred over a URL for published articles.'
        ]
      }
    ]
  },

  vancouver: {
    label: 'Vancouver (ICMJE)',
    groups: [
      {
        title: 'Page setup',
        items: [
          'Requirements come from the target journal; a common default is double-spaced text with 1 in margins.',
          'Number pages consecutively, usually starting with the title page.',
          'Follow the journal\'s line-numbering rules during peer review.'
        ]
      },
      {
        title: 'Headings',
        items: [
          'Use the IMRaD structure: Introduction, Methods, Results, Discussion.',
          'Keep headings short and unnumbered unless the journal requires numbering.',
          'Structured abstract where required (typically ≤ 250 words).'
        ]
      },
      {
        title: 'Reference list',
        items: [
          'Number references consecutively in order of first mention.',
          'Cite in-text with numbers (parentheses, brackets, or superscript per journal).',
          'Format: Author AA, Author BB. Title of article. Abbreviated Journal Title. Year;volume(issue):pages.',
          'List up to six authors; beyond six, list the first six followed by "et al." (ICMJE).',
          'Use the journal-title abbreviations from the NLM Catalog.'
        ]
      },
      {
        title: 'DOIs and URLs',
        items: [
          'End journal entries with the DOI when available, e.g. doi: 10.xxxx/xxxx.',
          'For online-only material add "Available from: URL" and the date cited: [cited YYYY Mon DD].',
          'Do not cite URLs for print articles that have a DOI.'
        ]
      }
    ]
  }
};

})(typeof window !== "undefined" ? window : globalThis);
