/* ScholarFix — js/data/venues.js
 * Venue profile database for the Journal/Venue Formatter (Tab 4).
 * Exposed as window.VENUE_PROFILES.
 *
 * Every rule below was taken from the venue's OFFICIAL author/submission
 * guidelines (see sourceUrl on each profile). Where a specific detail is not
 * stated publicly, the field is null — rules are never invented. Profiles
 * flagged `completeness: 'partial'` have at least one section the venue does
 * not document publicly; the UI labels these profiles accordingly.
 *
 * ---------------------------------------------------------------------------
 * SCHEMA (v1) — add new venues by appending an object with this shape:
 *
 * {
 *   id:            string   unique slug, e.g. 'jbv'
 *   name:          string   full venue name
 *   shortName:     string   acronym shown in compact UI, e.g. 'JBV'
 *   venueType:     'journal' | 'conference'
 *   publisher:     string
 *   sourceUrl:     string   official guidelines URL (publisher/venue site)
 *   sourceLabel:   string   human-readable name of the guidelines page
 *   lastChecked:   string   ISO date the profile was verified, 'YYYY-MM-DD'
 *   completeness:  'full' | 'partial'   ('partial' = some details undocumented)
 *   pageSetup: {
 *     pageSize:              'letter' | null
 *     marginsInches:         number | null      (same margin on all sides)
 *     fontFamily:            string | null      e.g. 'Times New Roman'
 *     fontSizePt:            number | null
 *     lineSpacing:           'double' | '1.5' | 'single' | null
 *     referenceSpacing:      'single' | 'double' | null  (null = same as body / unspecified)
 *     pageNumbering:         string | null      free-text rule
 *     notes:                 string | null
 *   },
 *   titlePage: {
 *     separate:              boolean | null     true = title page separate from anonymized ms
 *     anonymizedManuscript:  boolean | null     true = no author info in the review file
 *     includes:              string[] | null    required title-page contents
 *     notes:                 string | null
 *   },
 *   abstract: {
 *     wordLimit:             number | null
 *     format:                'unstructured' | 'structured' | null
 *     heading:               string | null      prescribed abstract heading style
 *     placement:             string | null      e.g. 'page 2', 'separate page'
 *     notes:                 string | null
 *   },
 *   keywords: {
 *     min:                   number | null
 *     max:                   number | null
 *     placement:             string | null
 *     notes:                 string | null
 *   },
 *   headings: [                          // null = hierarchy styling not prescribed
 *     {
 *       level:    1..5
 *       example:  string                  sample heading text as it should appear
 *       align:    'center' | 'left' | 'indent-runin'
 *       bold:     boolean | null
 *       italic:   boolean | null
 *       caps:     'all' | 'title' | 'sentence' | null
 *       runIn:    boolean                 text continues on the same line
 *       numbered: boolean | null          sections numbered (1, 1.1, 1.1.1)?
 *       note:     string | null
 *     }
 *   ] | null,
 *   headingNotes:  string | null,
 *   references: {
 *     style:                 string | null      e.g. 'APA 7th edition'
 *     inText:                string | null      e.g. '(Norman, 1977)'
 *     ordering:              string | null      e.g. 'alphabetical, unnumbered'
 *     notes:                 string | null
 *   },
 *   limits: {
 *     maxPages:              number | null
 *     maxWords:              number | null
 *     scope:                 string | null      what the limit covers
 *     notes:                 string | null
 *   },
 *   anonymization: {
 *     reviewType:            'double-anonymized' | 'single-anonymized' | 'masked' | null
 *     rules:                 string[]           concrete anonymization instructions
 *   },
 *   extra:       string[]                venue-specific rules not covered above
 * }
 * ---------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  var CHECKED = '2026-10-05';

  /* Shared AOM heading hierarchy (AOM Style Guide for Authors, updated
     2021-03-17: three levels, all boldface, never numbered). */
  var AOM_HEADINGS = [
    {
      level: 1, example: 'METHODS', align: 'center', bold: true, italic: false,
      caps: 'all', runIn: false, numbered: false,
      note: 'Main headings: all capital letters, centered, bold.'
    },
    {
      level: 2, example: 'Data and Sample', align: 'left', bold: true, italic: false,
      caps: 'title', runIn: false, numbered: false,
      note: 'Second-level headings: title-style capitalization, flush left, bold.'
    },
    {
      level: 3, example: 'Independent variable.', align: 'indent-runin', bold: true, italic: true,
      caps: 'sentence', runIn: true, numbered: false,
      note: 'Third-level headings: first letter of the first word capitalized, indented, italicized, bold, run into the paragraph.'
    }
  ];

  var AOM_HEADING_NOTES =
    'AOM uses only three levels of headings; use boldface for all three and never number ' +
    'them. Do not skip levels, and use second- and third-level headings in sets of two or ' +
    'more. Headings are set at 1.5 line spacing (body text is double-spaced).';

  /* APA 7th-edition heading hierarchy (used by Journal of Applied Psychology
     and the generic APA fallback). */
  var APA_HEADINGS = [
    {
      level: 1, example: 'Method', align: 'center', bold: true, italic: false,
      caps: 'title', runIn: false, numbered: false,
      note: 'Level 1: centered, bold, title case.'
    },
    {
      level: 2, example: 'Participants', align: 'left', bold: true, italic: false,
      caps: 'title', runIn: false, numbered: false,
      note: 'Level 2: flush left, bold, title case.'
    },
    {
      level: 3, example: 'Measures', align: 'left', bold: true, italic: true,
      caps: 'title', runIn: false, numbered: false,
      note: 'Level 3: flush left, bold italic, title case.'
    },
    {
      level: 4, example: 'Job satisfaction measure.', align: 'indent-runin', bold: true, italic: false,
      caps: 'title', runIn: true, numbered: false,
      note: 'Level 4: indented, bold, title case, ending with a period; text runs in.'
    },
    {
      level: 5, example: 'Item refinement.', align: 'indent-runin', bold: true, italic: true,
      caps: 'title', runIn: true, numbered: false,
      note: 'Level 5: indented, bold italic, title case, ending with a period; text runs in.'
    }
  ];

  var venues = [

    /* ---------------- Academy of Management Annual Meeting ---------------- */
    {
      id: 'aom',
      name: 'Academy of Management Annual Meeting',
      shortName: 'AOM',
      venueType: 'conference',
      publisher: 'Academy of Management',
      sourceUrl: 'https://www.aom.org/events/annual-meeting/submitting/submission-guidelines/',
      sourceLabel: 'AOM Annual Meeting Submission Guidelines (2026 Call for Submissions)',
      lastChecked: CHECKED,
      completeness: 'full',
      pageSetup: {
        pageSize: 'letter',
        marginsInches: 1,
        fontFamily: 'Times New Roman',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'single',
        pageNumbering: 'Number all pages; the 5-digit AOM submission ID appears in the header (upper right) of the first page.',
        notes: 'Use the 8.5" x 11" (Letter) page setting. The entire paper — title page, abstract, main text, figures, tables, appendices, references — must be one document (.pdf, .doc/.docx, or .rtf).'
      },
      titlePage: {
        separate: false,
        anonymizedManuscript: true,
        includes: ['Paper title in Title Case (no author information anywhere in the uploaded document)'],
        notes: 'The uploaded paper must contain no author-identifying information, including acknowledgements. All authors are entered in the Submission Center instead; that information appears in the program.'
      },
      abstract: {
        wordLimit: 250,
        format: 'unstructured',
        heading: null,
        placement: 'Entered into the on-screen abstract field of the Submission Center (title in Title Case; do not use all capitals; no line breaks).',
        notes: 'A paper submission must be a fully developed manuscript that includes an abstract; an abstract alone is not accepted.'
      },
      keywords: {
        min: 3,
        max: 3,
        placement: 'Selected in the Submission Center.',
        notes: 'Three keywords are selected for each division/interest group the paper is submitted to.'
      },
      headings: AOM_HEADINGS,
      headingNotes: AOM_HEADING_NOTES + ' Figures, graphs, tables, appendices, and references should follow the Academy of Management Style Guide for Authors.',
      references: {
        style: 'Academy of Management author–date style (Style Guide for Authors)',
        inText: '(Surname, Year); "et al." after first citation for three to six authors, from the first citation for seven or more',
        ordering: 'alphabetical, unnumbered',
        notes: 'References may be single-spaced to save space.'
      },
      limits: {
        maxPages: 40,
        maxWords: null,
        scope: '40 pages maximum, all-inclusive (title page, abstract, text, figures, graphs, tables, appendices, and references)',
        notes: 'Papers not prepared according to the formatting instructions will not be reviewed.'
      },
      anonymization: {
        reviewType: 'double-anonymized',
        rules: [
          'Remove ALL author-identifying information, including acknowledgements, from the uploaded document.',
          'Check document properties/metadata for author names before uploading.',
          'A paper may be submitted to only one division or interest group (Rule of 1); max three scholarly submissions per person (Rule of 3).'
        ]
      },
      extra: [
        'Submission deadline for the 2026 meeting: 13 January 2026, 17:00 ET.',
        'The paper must not have been previously presented at an AOM Annual Meeting, published, or accepted for publication; if under review it must not appear in print or online before the meeting.',
        'No changes to title, abstract, authorship, or the uploaded document are allowed after the submission deadline.',
        'Check the converted PDF on the submission site after upload; the file must be virus-free.'
      ]
    },

    /* ---------------- Academy of Management Journal ---------------- */
    {
      id: 'amj',
      name: 'Academy of Management Journal',
      shortName: 'AMJ',
      venueType: 'journal',
      publisher: 'Academy of Management',
      sourceUrl: 'https://www.aom.org/publications/journals/publishing-with-aom/author-and-reviewer-resources/author-resources/submitting-to-journal/',
      sourceLabel: 'AOM "Submitting to AMJ" page + AOM Style Guide for Authors (Mar 2021)',
      lastChecked: CHECKED,
      completeness: 'full',
      pageSetup: {
        pageSize: 'letter',
        marginsInches: 1,
        fontFamily: 'Times New Roman',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'double',
        pageNumbering: 'Neither page numbers nor running heads should be included (Style Guide).',
        notes: 'Word document, 8.5" x 11" (Letter) setting, Times New Roman 12-point (not "Times"); body text double-spaced throughout.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: true,
        includes: null,
        notes: 'A title page with author-identifying information must NOT be included with a paper submitted for review; it is added only for accepted manuscripts. Acknowledgements go in the cover-letter area of the submission system.'
      },
      abstract: {
        wordLimit: 200,
        format: 'unstructured',
        heading: null,
        placement: 'Page 2, together with the title of the work (Style Guide for Authors).',
        notes: null
      },
      keywords: {
        min: 3,
        max: 3,
        placement: 'Supplied at submission (ScholarOne).',
        notes: null
      },
      headings: AOM_HEADINGS,
      headingNotes: AOM_HEADING_NOTES,
      references: {
        style: 'Academy of Management author–date style (Style Guide for Authors)',
        inText: '(Surname, Year); page numbers as (Lee, 1998: 24); "et al." per AOM rules',
        ordering: 'alphabetical, unnumbered',
        notes: 'Every cited work needs a reference and vice versa. Group references, then appendixes, tables, and figures at the end of the manuscript.'
      },
      limits: {
        maxPages: 40,
        maxWords: null,
        scope: 'Typically no more than 40 double-spaced pages, inclusive of all content (text, references, and appendices); tables and figures excluded per current guidance',
        notes: 'Longer manuscripts may be considered when warranted; incorrectly prepared papers may be returned before review.'
      },
      anonymization: {
        reviewType: 'double-anonymized',
        rules: [
          'Remove author names, institutional identifiers, and acknowledgements from the manuscript.',
          'Remove identifying clues from self-citations and document metadata.',
          'Manuscripts are screened with iThenticate; preprints must be taken down during the review period.'
        ]
      },
      extra: [
        'Submitted via ScholarOne at mc.manuscriptcentral.com/AMJ.',
        'No submission fee and no author-paid APC (subscription journal; Green OA self-archiving only).',
        'State hypotheses in the present tense with distinct labels (Hypothesis 1, 1a), set off in indented, italic, single-spaced blocks.',
        'Any use of AI tools must be disclosed in the cover letter and acknowledgements (AOM AI policy).'
      ]
    },

    /* ---------------- Academy of Management Review ---------------- */
    {
      id: 'amr',
      name: 'Academy of Management Review',
      shortName: 'AMR',
      venueType: 'journal',
      publisher: 'Academy of Management',
      sourceUrl: 'https://www.aom.org/publications/journals/publishing-with-aom/author-and-reviewer-resources/author-resources/submitting-to-review/',
      sourceLabel: 'AOM "Submitting to AMR" page + AOM Style Guide for Authors (Mar 2021)',
      lastChecked: CHECKED,
      completeness: 'full',
      pageSetup: {
        pageSize: 'letter',
        marginsInches: 1,
        fontFamily: 'Times New Roman',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'double',
        pageNumbering: 'Neither page numbers nor running heads should be included (Style Guide).',
        notes: 'Prepared according to the AOM Style Guide for Authors: Word document, Letter setting, Times New Roman 12-point, double-spaced body.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: true,
        includes: null,
        notes: 'Submit a Word file from which the title page and all author-identifying references have been removed; acknowledgements belong in the cover letter of the web-based submission.'
      },
      abstract: {
        wordLimit: 200,
        format: 'unstructured',
        heading: null,
        placement: 'Page 2, together with the title (AOM Style Guide for Authors; the AMR page does not restate a limit).',
        notes: null
      },
      keywords: {
        min: null,
        max: null,
        placement: 'Supplied at submission (Manuscript Central).',
        notes: 'The AMR submission page and Style Guide do not state a public keyword count.'
      },
      headings: AOM_HEADINGS,
      headingNotes: AOM_HEADING_NOTES + ' Formal research propositions are not required, but the theoretical contribution must be explicit.',
      references: {
        style: 'Academy of Management author–date style (Style Guide for Authors)',
        inText: '(Surname, Year)',
        ordering: 'alphabetical, unnumbered',
        notes: null
      },
      limits: {
        maxPages: 30,
        maxWords: null,
        scope: 'Initial submissions generally no more than 30 double-spaced pages, EXCLUDING references, tables, and figures',
        notes: 'Contribution-to-length ratio is assessed; shorter, more focused submissions are welcome.'
      },
      anonymization: {
        reviewType: 'double-anonymized',
        rules: [
          'Remove the title page and author-identifying references from the submitted Word file.',
          'Take down working papers, prior drafts, and posted versions of the manuscript during the review period.'
        ]
      },
      extra: [
        'A paper can be submitted to AMR only once; significant overlap with a previously submitted paper is not allowed.',
        'No simultaneous submission elsewhere while under AMR review (conference presentation / AOM Proceedings publication is fine).',
        'AMR publishes theory development only — empirical papers should go to AMJ, comprehensive reviews to Academy of Management Annals.',
        'Disclose any AI use in the cover letter and acknowledgements (AOM AI policy).'
      ]
    },

    /* ---------------- Journal of Business Venturing ---------------- */
    {
      id: 'jbv',
      name: 'Journal of Business Venturing',
      shortName: 'JBV',
      venueType: 'journal',
      publisher: 'Elsevier',
      sourceUrl: 'https://www.sciencedirect.com/journal/journal-of-business-venturing/publish/guide-for-authors',
      sourceLabel: 'Elsevier Guide for Authors — Journal of Business Venturing',
      lastChecked: CHECKED,
      completeness: 'partial',
      pageSetup: {
        pageSize: null,
        marginsInches: null,
        fontFamily: null,
        fontSizePt: null,
        lineSpacing: null,
        referenceSpacing: null,
        pageNumbering: null,
        notes: 'The Elsevier guide does not prescribe margins, font, or spacing. Editable source files (.doc/.docx or .tex) in single-column layout are required; a PDF alone is not acceptable.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: true,
        includes: [
          'Article title (concise and informative; avoid abbreviations and formulae)',
          'Author names (given and family names) with affiliation addresses (superscript letters)',
          'Corresponding author: full postal address and email',
          'Acknowledgements and Declaration of Interest statement'
        ],
        notes: 'Double anonymized review: provide the title page (with author details) and the anonymized manuscript (without author details) as separate files. Acknowledgements appear ONLY on the title page.'
      },
      abstract: {
        wordLimit: 250,
        format: 'unstructured',
        heading: null,
        placement: null,
        notes: 'Concise and factual; must stand alone. State purpose, principal results, and major conclusions. Avoid references (cite author/year if essential) and non-standard abbreviations.'
      },
      keywords: {
        min: 1,
        max: 7,
        placement: 'After the abstract.',
        notes: 'Keywords in English; avoid multi-word keywords using "and" or "of"; abbreviations only if firmly established.'
      },
      headings: [
        {
          level: 1, example: '1. Introduction', align: 'left', bold: null, italic: null,
          caps: null, runIn: false, numbered: true,
          note: 'Divide the article into clearly defined, numbered sections; headings on a separate line.'
        },
        {
          level: 2, example: '1.1 Subsection', align: 'left', bold: null, italic: null,
          caps: null, runIn: false, numbered: true,
          note: 'Number subsections 1.1, then 1.2, etc.'
        },
        {
          level: 3, example: '1.1.1 Sub-subsection', align: 'left', bold: null, italic: null,
          caps: null, runIn: false, numbered: true,
          note: 'Deeper levels numbered 1.1.1, 1.1.2, etc.'
        }
      ],
      headingNotes: 'Sections and subsections are numbered (1, 1.1, 1.1.1, …) and the numbering is used for cross-referencing. The abstract is not included in section numbering. Typographic styling of headings (bold/italic) is not prescribed in the guide.',
      references: {
        style: 'Numbered Elsevier style — square brackets in text [1]; journal names abbreviated per LTWA; journal style applied at proof stage',
        inText: '[1], [2], …',
        ordering: 'numbered in order of appearance',
        notes: 'At submission there is NO strict reference-format requirement — any consistent style with complete bibliographic data is accepted; DOIs recommended.'
      },
      limits: {
        maxPages: null,
        maxWords: null,
        scope: null,
        notes: 'The guide sets no fixed main-text page or word limit for research articles.'
      },
      anonymization: {
        reviewType: 'double-anonymized',
        rules: [
          'The anonymized manuscript (main body, references, figures, tables) must contain no author names, affiliations, or other identifying information.',
          'Acknowledgements and the Declaration of Interest go on the title page, not in the manuscript.',
          'Check self-citations, repository links, file names, and file metadata for identifying information.'
        ]
      },
      extra: [
        'Highlights are required: 3–5 bullet points, max 85 characters each (including spaces), submitted as a separate editable file with "highlights" in the file name.',
        'A graphical abstract is encouraged (separate file; min 531 x 1328 px).',
        'Research data policy Option C applies: deposit data in a repository and cite/link it, or explain why sharing is not possible.',
        'CRediT author-contribution statement required; declare any generative-AI use in the writing process in a dedicated section before the references.',
        'Tables must be editable text (not images); figures supplied as separate files with captions in a separate file.'
      ]
    },

    /* ---------------- Entrepreneurship Theory and Practice ---------------- */
    {
      id: 'etp',
      name: 'Entrepreneurship Theory and Practice',
      shortName: 'ETP',
      venueType: 'journal',
      publisher: 'SAGE',
      sourceUrl: 'https://journals.sagepub.com/author-instructions/ETP',
      sourceLabel: 'SAGE Submission Guidelines — Entrepreneurship Theory and Practice',
      lastChecked: CHECKED,
      completeness: 'partial',
      pageSetup: {
        pageSize: null,
        marginsInches: 1,
        fontFamily: 'Times New Roman',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: null,
        pageNumbering: null,
        notes: 'Word preferred (LaTeX accepted). No template is required, but heading levels must be clear and sections clearly defined.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: true,
        includes: [
          'Article title and full author list with affiliations',
          'Corresponding author contact details (name, institutional address, phone, email)',
          'Acknowledgments section',
          'Statements and Declarations: ethical considerations, consent to participate, consent for publication, declaration of conflicting interest, funding statement, data availability statement (state "Not applicable" where relevant)'
        ],
        notes: 'The title page is NOT sent to reviewers. Do not include author names in the manuscript file name, headers, or footers.'
      },
      abstract: {
        wordLimit: 100,
        format: 'unstructured',
        heading: null,
        placement: 'Between the title and the main body of the manuscript.',
        notes: 'Concisely states the purpose, major findings, and conclusions. Submissions that do not meet this requirement will not be considered.'
      },
      keywords: {
        min: 2,
        max: 5,
        placement: 'Listed after the abstract.',
        notes: 'Keywords should be as specific as possible to the research.'
      },
      headings: null,
      headingNotes: 'ETP does not prescribe a heading hierarchy; SAGE asks only that heading levels are clear and sections clearly defined.',
      references: {
        style: 'APA reference style',
        inText: 'APA author–date: (Surname, Year)',
        ordering: 'alphabetical',
        notes: 'Every in-text citation must have a corresponding reference-list entry and vice versa, with identical spelling and year. Update preprint citations when a peer-reviewed version exists.'
      },
      limits: {
        maxPages: 40,
        maxWords: null,
        scope: 'Original Articles typically no more than 40 pages, double-spaced 12-point Times New Roman with 1-inch margins, ALL INCLUSIVE. Research Briefs: no more than 20 pages plus tables and references (the formatting section also states "no more than 25 pages" for briefs — the guidelines are inconsistent).',
        notes: null
      },
      anonymization: {
        reviewType: 'double-anonymized',
        rules: [
          'The manuscript must be fully anonymized; move all identifying information to the title page.',
          'Remove author names from the file name, headers, footers, and document properties.',
          'Anonymize anything that could reveal authors, institutions, funders, or approval committees.'
        ]
      },
      extra: [
        'Article types: Editorials, Original Articles, and Research Briefs (replication studies, registered reports, theoretical briefs, methodological briefs).',
        'A cover letter explaining why the manuscript suits ETP helps the editor\'s preliminary evaluation.',
        'ORCID iD of the submitting author is required; co-author ORCID iDs are strongly encouraged before acceptance.',
        'Preprints are accepted (supply the preprint DOI), but do not update the preprint while the paper is under review.',
        'Two independent reviews are required for a Revise or Accept decision; author-suggested reviewers are not accepted.'
      ]
    },

    /* ---------------- Strategic Management Journal ---------------- */
    {
      id: 'smj',
      name: 'Strategic Management Journal',
      shortName: 'SMJ',
      venueType: 'journal',
      publisher: 'Wiley',
      sourceUrl: 'https://onlinelibrary.wiley.com/page/journal/10970266/homepage/guide.htm',
      sourceLabel: 'Wiley Online Library — SMJ Instructions to Authors',
      lastChecked: CHECKED,
      completeness: 'partial',
      pageSetup: {
        pageSize: null,
        marginsInches: 1,
        fontFamily: null,
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'single',
        pageNumbering: null,
        notes: 'Double-spaced, 12-point readable font, 1-inch margins on all sides; text (including section titles) left-justified. Language: American English. References single-spaced to conserve space.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: null,
        includes: [
          'Full names, titles, and affiliations (with complete addresses) of all authors, including email, telephone, and fax',
          'Running head: a short title of up to 60 characters',
          'Five (5) keywords for indexing',
          'Acknowledgements (ONLY on the title page at submission, not in the text)'
        ],
        notes: 'The instructions do not explicitly describe the review anonymization model; keeping acknowledgements off the manuscript implies the review file should not identify authors.'
      },
      abstract: {
        wordLimit: 125,
        format: 'unstructured',
        heading: null,
        placement: null,
        notes: 'One paragraph for all articles, research notes, and commentaries. A precise summary of the entire paper that stands alone. SMJ policy: NO citations to other works in the abstract.'
      },
      keywords: {
        min: 5,
        max: 5,
        placement: 'On the title page.',
        notes: 'Exactly five keywords are requested for indexing.'
      },
      headings: [
        {
          level: 1, example: 'Theory and hypotheses', align: 'left', bold: null, italic: null,
          caps: null, runIn: false, numbered: false,
          note: 'Headings are flush with the left-hand margin; sections are not numbered.'
        },
        {
          level: 2, example: 'Data and methods', align: 'left', bold: null, italic: null,
          caps: 'sentence', runIn: false, numbered: false,
          note: 'In subheadings, only the first word is capitalized.'
        }
      ],
      headingNotes: 'Headings and subheadings flush left; the first line of the initial paragraph under each heading is also left-justified (other paragraphs indented). Do not number sections.',
      references: {
        style: 'SMJ author–date style (e.g., "Bagozzi R, Phillips L. 1982. Representing and testing... Administrative Science Quarterly 27(3): 459-489.")',
        inText: '(Surname, Year); four or more authors: (First author et al., year) — italicize "et al."',
        ordering: 'alphabetical at the end of the paper',
        notes: 'All references must be cited in the text and vice versa. Book chapters/magazine articles need page numbers. Unpublished or personal works are cited in text only, not listed.'
      },
      limits: {
        maxPages: 40,
        maxWords: null,
        scope: 'Suggested limit 35 pages including figures and tables; no more than 40 pages total. Research notes: no more than 20 pages including title page, abstract, text, figures, tables, and references.',
        notes: null
      },
      anonymization: {
        reviewType: null,
        rules: [
          'Acknowledgements (sponsors, grant numbers, thanks) appear ONLY on the title page, never in the manuscript text.',
          'The review anonymization model is not stated on the public instructions page.'
        ]
      },
      extra: [
        'Submitted via ScholarOne at mc.manuscriptcentral.com/smj.',
        'SMJ does not accept papers reporting p-value cutoffs: report standard errors and/or exact p-values (no asterisks) and discuss effect sizes.',
        'Footnotes (not endnotes) are used; double quotation marks; percent spelled out in text; en dashes for ranges; numbers one to nine spelled out.',
        'Indicate table/figure placement in text ("Insert Table 1 here"); tables and figures go at the end, after the references; appendices after references.',
        'Blocks of long quotations are indented and single-spaced.'
      ]
    },

    /* ---------------- Journal of Applied Psychology ---------------- */
    {
      id: 'jap',
      name: 'Journal of Applied Psychology',
      shortName: 'JAP',
      venueType: 'journal',
      publisher: 'American Psychological Association',
      sourceUrl: 'https://www.apa.org/pubs/journals/apl/submit',
      sourceLabel: 'APA — Journal of Applied Psychology Submission Guidelines',
      lastChecked: CHECKED,
      completeness: 'full',
      pageSetup: {
        pageSize: null,
        marginsInches: 1,
        fontFamily: 'Times New Roman',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'double',
        pageNumbering: 'Page number in the top-right of every page (APA 7 professional paper).',
        notes: 'APA 7th-edition style throughout; all copy double-spaced. For Research Report length counting, 25 lines of 12-point text with 1-inch margins equal one page.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: true,
        includes: [
          'Full title, all author names and affiliations, ORCID iDs',
          'Corresponding author contact information',
          'Author note / CRediT contribution statement (uploaded with the title page)'
        ],
        notes: 'JAP uses masked review: the manuscript itself must contain no clues to author identity; identifying information lives only on the separate title page.'
      },
      abstract: {
        wordLimit: 250,
        format: 'unstructured',
        heading: '"Abstract" — bold, centered, on its own page (APA 7)',
        placement: 'Separate page (page 2).',
        notes: null
      },
      keywords: {
        min: null,
        max: 5,
        placement: 'After the abstract ("Keywords:" italic, indented).',
        notes: 'Up to five keywords or brief phrases.'
      },
      headings: APA_HEADINGS,
      headingNotes: 'APA 7th edition heading levels (up to five); do not number headings and do not label the introduction with a heading.',
      references: {
        style: 'APA 7th edition',
        inText: '(Surname, Year); "et al." for three or more authors from the first citation',
        ordering: 'alphabetical, 0.5-in hanging indent',
        notes: 'Every listed reference must be cited in text and vice versa. DOIs as full https://doi.org/ links.'
      },
      limits: {
        maxPages: null,
        maxWords: null,
        scope: 'Research Reports: no more than 19 manuscript pages (excluding title page, abstract, references, tables, and figures). Feature Articles and Integrative Conceptual Reviews have no stated page limit; reviews start with a 10-page prospectus.',
        notes: null
      },
      anonymization: {
        reviewType: 'masked',
        rules: [
          'Submit a fully anonymized main manuscript (no names, affiliations, or acknowledgements); manuscripts not in masked format are returned before review.',
          'Suppress self-identifying citations or write them in the third person.',
          'Upload the title page, author note, and CRediT statement separately.'
        ]
      },
      extra: [
        'Article types: Feature Articles, Research Reports (≤19 pages), and Integrative Conceptual Reviews (10-page prospectus first).',
        'A data-transparency appendix describing how the collected data were (or will be) used is required.',
        'Complete the APA submission checklist at upload; masked review applies to all submissions.',
        'All efforts should be made to keep manuscripts concise and unambiguous; APA journals evaluate contribution-to-length.'
      ]
    },

    /* ---------------- Organization Science ---------------- */
    {
      id: 'orgsci',
      name: 'Organization Science',
      shortName: 'OrgSci',
      venueType: 'journal',
      publisher: 'INFORMS',
      sourceUrl: 'https://pubsonline.informs.org/page/orsc/submission-guidelines',
      sourceLabel: 'INFORMS PubsOnLine — Organization Science Submission Guidelines',
      lastChecked: CHECKED,
      completeness: 'partial',
      pageSetup: {
        pageSize: null,
        marginsInches: 1,
        fontFamily: 'Times New Roman or Garamond (or similar; no Helvetica Narrow)',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'double',
        pageNumbering: null,
        notes: 'PDF or MS Word. Double-spaced with 1-inch margins all around. The 50-page limit assumes 12-point text; with 11-point font the limit is 40 pages.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: true,
        includes: null,
        notes: 'Double-blind review: remove explicit indications of author names and institutions; all acknowledgements must be removed from the review file. Author names, institutions, and acknowledgements return to the manuscript upon acceptance.'
      },
      abstract: {
        wordLimit: 250,
        format: 'unstructured',
        heading: null,
        placement: 'Entered in ScholarOne (Step 1) together with the title and a running header.',
        notes: null
      },
      keywords: {
        min: 3,
        max: 10,
        placement: 'Selected as attributes in ScholarOne (Step 2).',
        notes: 'Keywords describe the paper\'s theoretical and methodological orientation.'
      },
      headings: null,
      headingNotes: 'Organization Science does not publicly prescribe a heading hierarchy.',
      references: {
        style: 'Organization Science journal style (author–date); see the journal\'s reference-style examples page',
        inText: '(Norman, 1977) or Norman (1977)',
        ordering: 'alphabetical by author name at the end of the paper',
        notes: null
      },
      limits: {
        maxPages: 50,
        maxWords: null,
        scope: 'Initial submissions should be under 50 double-spaced pages of 12-point text with 1-inch margins, ALL-INCLUSIVE (or 40 pages in 11-point font)',
        notes: 'Excessively long submissions can be desk rejected with the option to resubmit shorter; far shorter papers are welcomed.'
      },
      anonymization: {
        reviewType: 'double-anonymized',
        rules: [
          'Remove author names, institutions, and all acknowledgements.',
          'Write self-references neutrally: "This work extends the research in Norman (1995)", not "my dissertation (Norman, 1995)".',
          'Proper attribution of the authors\' own prior work takes precedence over anonymity.'
        ]
      },
      extra: [
        'Submitted via ScholarOne Manuscripts (seven-step process).',
        'Minimize endnotes and footnotes; integrate important content into the main text.',
        'Tables and figures numbered consecutively; either grouped after the references or embedded in the text.',
        'Authors certify compliance with the Code of Ethics and the Data and Methods Transparency Policy at submission.',
        'A paper may be submitted to a conference while under review at Organization Science.'
      ]
    },

    /* ---------------- Generic APA 7 fallback ---------------- */
    {
      id: 'apa7',
      name: 'Generic APA 7th edition (fallback)',
      shortName: 'APA 7',
      venueType: 'journal',
      publisher: 'American Psychological Association',
      sourceUrl: 'https://apastyle.apa.org/style-grammar-guidelines/paper-format',
      sourceLabel: 'APA Style — Paper format and headings',
      lastChecked: CHECKED,
      completeness: 'full',
      pageSetup: {
        pageSize: 'letter',
        marginsInches: 1,
        fontFamily: 'Times New Roman',
        fontSizePt: 12,
        lineSpacing: 'double',
        referenceSpacing: 'double',
        pageNumbering: 'Page number in the top-right header of every page; professional papers add a running head (≤50 characters, all caps).',
        notes: 'APA 7 also permits 11-pt Calibri, 11-pt Arial, or 10-pt Lucida Sans Unicode. Indent the first line of every paragraph 0.5 in.'
      },
      titlePage: {
        separate: true,
        anonymizedManuscript: null,
        includes: [
          'Title (bold, centered, title case, upper half of page 1)',
          'Author names and affiliations, author note',
          'Running head and page number (professional papers)'
        ],
        notes: 'Anonymization depends on the target journal\'s review model; check the journal\'s instructions.'
      },
      abstract: {
        wordLimit: 250,
        format: 'unstructured',
        heading: '"Abstract" — bold, centered',
        placement: 'Page 2, on its own page.',
        notes: 'APA recommends abstracts of no more than 250 words; individual journals may set lower limits.'
      },
      keywords: {
        min: null,
        max: null,
        placement: '"Keywords:" italic, indented 0.5 in, on the line below the abstract.',
        notes: 'APA does not fix a keyword count; the target journal usually does (commonly 3–5).'
      },
      headings: APA_HEADINGS,
      headingNotes: 'APA 7 defines five heading levels; headings are not numbered, and the introduction is not labeled.',
      references: {
        style: 'APA 7th edition',
        inText: '(Surname, Year); "et al." for three or more authors',
        ordering: 'alphabetical, 0.5-in hanging indent, new page titled "References" (bold, centered)',
        notes: 'DOIs as full https://doi.org/ links; no period after a DOI or URL.'
      },
      limits: {
        maxPages: null,
        maxWords: null,
        scope: null,
        notes: 'APA itself sets no length limit; the target journal\'s instructions control.'
      },
      anonymization: {
        reviewType: null,
        rules: [
          'Anonymization requirements come from the target journal, not from APA style.',
          'For masked review: remove names/affiliations/acknowledgements and cite your own work in the third person.'
        ]
      },
      extra: [
        'Use this profile when your target venue is not listed; then verify every detail against that venue\'s own guidelines.',
        'Double-space everything, including the reference list and block quotations.'
      ]
    }
  ];

  global.VENUE_PROFILES = {
    schemaVersion: 1,
    venues: venues,
    byId: function (id) {
      for (var i = 0; i < venues.length; i++) {
        if (venues[i].id === id) { return venues[i]; }
      }
      return null;
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
