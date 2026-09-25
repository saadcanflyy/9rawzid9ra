// 9rawZid9ra — turns what a student types into search filters.
//   parseQuery('exam réseau GI 2024')
//   → { text: 'réseau GI', docType: 'examen', year: '2024', semester: null, chips: [...] }
// The remaining words go to supabase.rpc('search_catalog', { p_query: text, ... }),
// which handles accents, typos, synonyms and filière abbreviations (GI, SMI…) server-side.

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// word (without accents) → documents.doc_type value. 'corrige' = any corrigé (server side).
const TYPE_WORDS = {
  exam: 'examen', exams: 'examen', examen: 'examen', examens: 'examen', final: 'examen', finale: 'examen',
  cc: 'cc', cc1: 'cc', cc2: 'cc', cc3: 'cc', controle: 'cc', controles: 'cc', partiel: 'cc', partiels: 'cc', ds: 'cc',
  td: 'td', tds: 'td', tp: 'tp', tps: 'tp',
  cours: 'cours', cour: 'cours', poly: 'cours', polycopie: 'cours', resume: 'cours', resumes: 'cours', support: 'cours',
  quiz: 'quiz', qcm: 'quiz',
  projet: 'projet_final', projets: 'projet_final', pfe: 'projet_final',
  corrige: 'corrige', corriges: 'corrige', correction: 'corrige', corrections: 'corrige', corr: 'corrige', solution: 'corrige', solutions: 'corrige',
};

// "corrigé td" / "correction examen" → the precise corrigé type
const CORRIGE_OF = { examen: 'corrige_examen', td: 'corrige_td', tp: 'corrige_tp' };

export const DOC_TYPE_LABELS = {
  examen: 'Examen', cc: 'CC', td: 'TD', tp: 'TP', cours: 'Cours', quiz: 'Quiz', projet_final: 'Projet',
  corrige: 'Corrigé', corrige_examen: 'Corrigé examen', corrige_td: 'Corrigé TD', corrige_tp: 'Corrigé TP',
};

const YEAR_RE = /^(?:(19|20)?(\d{2}))(?:[/-](?:(19|20)?(\d{2})))?$/;

function parseYear(token) {
  const m = YEAR_RE.exec(token);
  if (!m) return null;
  const a = Number((m[1] || '20') + m[2]);
  if (a < 2000 || a > 2100) return null;
  if (m[4] !== undefined) {
    const b = Number((m[3] || '20') + m[4]);
    if (b !== a + 1) return null;
    return String(b);            // "2023/2024" → June session 2024 → matches '…/2024' first
  }
  // bare 2-digit numbers are too ambiguous ("s3 21"?) — only 4 digits count as a year
  return m[1] ? String(a) : null;
}

function parseSemester(token, next) {
  let m = /^s(\d{1,2})$/.exec(token);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 14) return { value: `S${Number(m[1])}`, consumed: 1 };
  if (/^(semestre|sem|semester)$/.test(token) && next && /^\d{1,2}$/.test(next)) {
    const n = Number(next);
    if (n >= 1 && n <= 14) return { value: `S${n}`, consumed: 2 };
  }
  m = /^(semestre|sem)(\d{1,2})$/.exec(token);
  if (m) return { value: `S${Number(m[2])}`, consumed: 1 };
  return null;
}

/**
 * @param {string} input what the student typed
 * @returns {{ text: string, docType: string|null, year: string|null, semester: string|null, chips: {key: string, label: string}[] }}
 */
export function parseQuery(input) {
  const raw = String(input || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { text: '', docType: null, year: null, semester: null, chips: [] };

  const tokens = raw.split(' ');
  const keep = [];
  let docType = null;
  let year = null;
  let semester = null;
  let sawCorrige = false;

  for (let i = 0; i < tokens.length; i++) {
    const original = tokens[i];
    const t = strip(original).replace(/[.,;:!?()"']/g, '');
    if (!t) continue;

    if (!semester) {
      const s = parseSemester(t, tokens[i + 1] && strip(tokens[i + 1]));
      if (s) { semester = s.value; i += s.consumed - 1; continue; }
    }
    if (!year) {
      const y = parseYear(t);
      if (y) { year = y; continue; }
    }
    const type = TYPE_WORDS[t];
    if (type) {
      if (type === 'corrige') { sawCorrige = true; continue; }
      if (!docType) { docType = type; continue; }
    }
    keep.push(original);
  }

  if (sawCorrige) docType = CORRIGE_OF[docType] || (docType ? docType : 'corrige');
  // "corrigé cours" makes no sense → keep the plain corrigé filter
  if (sawCorrige && !docType.startsWith('corrige')) docType = 'corrige';

  const chips = [];
  if (docType) chips.push({ key: 'docType', label: DOC_TYPE_LABELS[docType] || docType });
  if (semester) chips.push({ key: 'semester', label: semester });
  if (year) chips.push({ key: 'year', label: year });

  return { text: keep.join(' '), docType, year, semester, chips };
}

/**
 * Builds the search_catalog RPC arguments from the parsed query and the explicit filters
 * chosen in the UI. Explicit filters win over what was parsed from the text.
 */
export function toSearchParams(parsed, filters = {}) {
  return {
    p_query: parsed.text,
    p_university_id: filters.universityId ?? null,
    p_faculty_id: filters.facultyId ?? null,
    p_filiere_id: filters.filiereId ?? null,
    p_semester: filters.semester ?? parsed.semester ?? null,
    p_doc_type: filters.docType ?? parsed.docType ?? null,
    p_year: filters.year ?? parsed.year ?? null,
    p_verified_only: !!filters.verifiedOnly,
    p_limit: filters.limit ?? 20,
    p_offset: filters.offset ?? 0,
    p_module_id: filters.moduleId ?? null,
    p_professor_id: filters.professorId ?? null,
    p_doc_types: filters.docTypes?.length ? filters.docTypes : null,
  };
}

/**
 * Smart mode (search v2): turns the jsonb returned by supabase.rpc('resolve_academic_context', { p_text })
 * into UI filters + removable chips. "analyse 2 fs rabat examen" →
 *   filters { universityId, facultyId, moduleId, docTypes: ['examen'] }, chips [FS Rabat, Analyse 2, Examen].
 * Only confident matches become filters; module_candidates are offered as "Tu voulais dire…" choices.
 */
export function contextToFilters(ctx) {
  if (!ctx) return { filters: {}, chips: [], text: '', candidates: [] };
  const filters = {};
  const chips = [];
  if (ctx.university) { filters.universityId = ctx.university.id; chips.push({ key: 'universityId', label: ctx.university.name }); }
  if (ctx.faculty)    { filters.facultyId = ctx.faculty.id;       chips.push({ key: 'facultyId', label: ctx.faculty.name }); }
  if (ctx.filiere)    { filters.filiereId = ctx.filiere.id;       chips.push({ key: 'filiereId', label: ctx.filiere.abbreviation || ctx.filiere.name }); }
  if (ctx.semester)   { filters.semester = ctx.semester;          chips.push({ key: 'semester', label: ctx.semester }); }
  if (ctx.module)     { filters.moduleId = ctx.module.id;         chips.push({ key: 'moduleId', label: ctx.module.name }); }
  if (ctx.professor)  { filters.professorId = ctx.professor.id;   chips.push({ key: 'professorId', label: ctx.professor.name }); }
  if (ctx.doc_types?.length) {
    filters.docTypes = ctx.doc_types;
    ctx.doc_types.forEach((t) => chips.push({ key: `docType:${t}`, label: DOC_TYPE_LABELS[t] || t }));
  }
  if (ctx.year)       { filters.year = ctx.year;                  chips.push({ key: 'year', label: ctx.year }); }
  // words not understood stay as free text unless a module already covers them
  const text = ctx.module ? '' : (ctx.remaining || '');
  const candidates = ctx.module ? [] : (ctx.module_candidates || []);
  return { filters, chips, text, candidates };
}

/** Removes one chip from the filters built by contextToFilters. */
export function dropChip(filters, key) {
  const next = { ...filters };
  if (key.startsWith('docType:')) {
    const t = key.slice(8);
    next.docTypes = (next.docTypes || []).filter((x) => x !== t);
    if (!next.docTypes.length) delete next.docTypes;
  } else {
    delete next[key];
  }
  return next;
}

/** Removes one understood facet from the typed text (when the student clicks × on a chip). */
export function removeFacet(input, key) {
  const p = parseQuery(input);
  const parts = [p.text];
  if (key !== 'docType' && p.docType) parts.push((DOC_TYPE_LABELS[p.docType] || '').toLowerCase());
  if (key !== 'semester' && p.semester) parts.push(p.semester);
  if (key !== 'year' && p.year) parts.push(p.year);
  return parts.filter(Boolean).join(' ');
}

// Recent searches (per browser)
const RECENT_KEY = 'qz-recent-searches';
export function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch (e) { return []; }
}
export function addRecentSearch(q) {
  const v = String(q || '').trim();
  if (v.length < 2) return;
  try {
    const list = [v, ...getRecentSearches().filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch (e) { /* storage unavailable */ }
}
