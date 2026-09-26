// File-type helpers.
//
// Deliberately free of any import: ModulePage needs isPdf() to decide whether
// to mount the viewer, and importing it from PdfViewer.js would pull react-pdf
// into the main bundle (defeating the lazy() split) and into Jest's parse path,
// where its ESM breaks the test run.

/** True for a URL that points at a PDF, ignoring query string and fragment. */
export const isPdf = (url) => /\.pdf(\?|#|$)/i.test(url || '')
