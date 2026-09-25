// 9rawZid9ra — search query parser: turns free text like "exam réseau GI 2024" into
// facets (doc type, semester, year) + the remaining free-text terms, for search_catalog
// (see supabase/migrations/20260925000400_search.sql).

const normalizeWord = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const BASE_TYPE_BY_WORD = {
  exam: 'examen', examen: 'examen', examens: 'examen',
  td: 'td',
  tp: 'tp',
  cours: 'cours', cour: 'cours',
  quiz: 'quiz',
  projet: 'projet_final',
};
const CORRIGE_WORDS = new Set(['corrige', 'corriges', 'correction', 'corrections']);
const CORRIGE_BASE = new Set(['td', 'tp', 'examen']);

export const TYPE_CHIP_LABELS = {
  examen: 'Examen',
  projet_final: 'Projet',
  cc: 'CC',
  td: 'TD',
  tp: 'TP',
  cours: 'Cours',
  quiz: 'Quiz',
  corrige: 'Corrigé',
  corrige_td: 'Corrigé TD',
  corrige_tp: 'Corrigé TP',
  corrige_examen: 'Corrigé Examen',
};

const TYPE_QUERY_WORD = {
  examen: 'examen',
  projet_final: 'projet',
  cc: 'cc',
  td: 'td',
  tp: 'tp',
  cours: 'cours',
  quiz: 'quiz',
  corrige: 'correction',
  corrige_td: 'corrigé td',
  corrige_tp: 'corrigé tp',
  corrige_examen: 'corrigé examen',
};

function detectDocType(words) {
  for (let i = 0; i < words.length; i++) {
    const w = normalizeWord(words[i]);
    if (/^cc\d*$/.test(w) || w === 'controle') {
      const consumed = [i];
      if (words[i + 1] && normalizeWord(words[i + 1]) === 'continu') consumed.push(i + 1);
      return { docType: 'cc', consumed };
    }
    if (CORRIGE_WORDS.has(w)) {
      const next = words[i + 1] ? normalizeWord(words[i + 1]) : null;
      const nextType = next ? BASE_TYPE_BY_WORD[next] : null;
      if (nextType && CORRIGE_BASE.has(nextType)) {
        return { docType: 'corrige_' + nextType, consumed: [i, i + 1] };
      }
      return { docType: 'corrige', consumed: [i] };
    }
    if (BASE_TYPE_BY_WORD[w]) {
      return { docType: BASE_TYPE_BY_WORD[w], consumed: [i] };
    }
  }
  return null;
}

function detectSemester(words) {
  for (let i = 0; i < words.length; i++) {
    const w = normalizeWord(words[i]);
    const single = w.match(/^s(\d{1,2})$/);
    if (single) return { semester: 'S' + parseInt(single[1], 10), consumed: [i] };
    const fused = w.match(/^semestre(\d{1,2})$/);
    if (fused) return { semester: 'S' + parseInt(fused[1], 10), consumed: [i] };
    if (w === 'semestre' && words[i + 1] && /^\d{1,2}$/.test(words[i + 1])) {
      return { semester: 'S' + parseInt(words[i + 1], 10), consumed: [i, i + 1] };
    }
  }
  return null;
}

const normalizeYearPart = (s) => (s.length <= 2 ? 2000 + parseInt(s, 10) : parseInt(s, 10));

function detectYear(words) {
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const range = w.match(/^(\d{2,4})[/-](\d{2,4})$/);
    if (range) {
      const year = Math.max(normalizeYearPart(range[1]), normalizeYearPart(range[2]));
      return { year: String(year), consumed: [i] };
    }
    if (/^(19|20)\d{2}$/.test(w)) return { year: w, consumed: [i] };
  }
  return null;
}

/**
 * Parses free-text search input into facets + remaining text.
 * @returns {{ text: string, docType: string|null, semester: string|null, year: string|null, chips: {id:string,label:string}[] }}
 */
export function parseQuery(raw) {
  const original = (raw || '').trim();
  if (!original) return { text: '', docType: null, semester: null, year: null, chips: [] };

  let words = original.split(/\s+/);

  const typeResult = detectDocType(words);
  const docType = typeResult ? typeResult.docType : null;
  if (typeResult) words = words.filter((_, idx) => !typeResult.consumed.includes(idx));

  const semResult = detectSemester(words);
  const semester = semResult ? semResult.semester : null;
  if (semResult) words = words.filter((_, idx) => !semResult.consumed.includes(idx));

  const yearResult = detectYear(words);
  const year = yearResult ? yearResult.year : null;
  if (yearResult) words = words.filter((_, idx) => !yearResult.consumed.includes(idx));

  const text = words.join(' ').trim();

  const chips = [];
  if (docType) chips.push({ id: 'docType', label: TYPE_CHIP_LABELS[docType] || docType });
  if (semester) chips.push({ id: 'semester', label: semester });
  if (year) chips.push({ id: 'year', label: year });

  return { text, docType, semester, year, chips };
}

/** Merges a parsed query with explicit filters (explicit wins) into search_catalog RPC params. */
export function toSearchParams(parsed, filters = {}) {
  const f = filters || {};
  return {
    p_query: (parsed?.text || '').trim(),
    p_doc_type: f.docType ?? parsed?.docType ?? null,
    p_year: f.year ?? parsed?.year ?? null,
    p_semester: f.semester ?? parsed?.semester ?? null,
    p_university_id: f.universityId ?? null,
    p_faculty_id: f.facultyId ?? null,
    p_filiere_id: f.filiereId ?? null,
    p_verified_only: !!f.verifiedOnly,
  };
}

/** Rewrites a raw query string with one detected facet removed (used by the chip "×" buttons). */
export function removeFacet(raw, facet) {
  const p = parseQuery(raw);
  const parts = [p.text];
  if (facet !== 'docType' && p.docType) parts.push(TYPE_QUERY_WORD[p.docType] || p.docType);
  if (facet !== 'semester' && p.semester) parts.push(p.semester.toLowerCase());
  if (facet !== 'year' && p.year) parts.push(p.year);
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

const RECENT_KEY = '9rz_recent_searches';
const RECENT_MAX = 8;

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query) {
  const q = (query || '').trim();
  if (!q) return;
  try {
    const list = getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    // localStorage unavailable (private mode, quota) — recent searches are a convenience only.
  }
}
