// Shared number/date formatting.
//
// The brand book asks for a thin space between thousands ("9 955"). fr-FR
// gives U+202F (narrow no-break space), which is exactly that and never wraps.
// Kept in one place so Phase 4 can switch the locale with the language.

const LOCALE = 'fr-FR'

/** 10867 -> "10 867". Null/undefined render as "0". */
export const fmtNum = (n) => Number(n ?? 0).toLocaleString(LOCALE)
