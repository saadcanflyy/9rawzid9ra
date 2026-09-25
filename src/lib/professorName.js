// 9rawZid9ra — client mirror of public.professor_name_parts() (20260926000100_professors.sql).
// Used for the live preview in the professor picker ("Tu vas ajouter : Pr. Ahmed BENALI").
// The server is the source of truth: it re-normalizes on insert and does the matching.
//
//   professorNameParts('dr. ahmed bn ali') → { title: 'Pr.', firstName: 'Ahmed', lastName: 'BN ALI',
//                                              nameKey: 'benali', firstKey: 'ahmed', displayName: 'Pr. Ahmed BN ALI' }

const PARTICLES = ['ben', 'bn', 'bin', 'ibn', 'el', 'al', 'ait', 'ou', 'oul', 'ould', 'bel', 'bou', 'abou', 'abu', 'de', 'da'];
const TITLES = ['pr', 'prof', 'professeur', 'professor', 'dr', 'docteur', 'doctor', 'mme', 'mr', 'm', 'mlle', 'madame',
  'monsieur', 'mm', 'ms', 'mrs', 'prs'];

/** Same as SQL search_norm(): lowercase, no accents, only [a-z0-9] words, roman II–VIII → digits. */
export function searchNorm(s) {
  let t = ' ' + String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') + ' ';
  for (const [r, d] of [['viii', 8], ['vii', 7], ['vi', 6], ['iv', 4], ['iii', 3], ['ii', 2]]) {
    t = t.split(` ${r} `).join(` ${d} `);
  }
  return t.replace(/\s+/g, ' ').trim();
}

const isAllCaps = (tok) => /^[A-ZÉÈÀÂÎÔÛÇ]{2,}$/.test(tok) && !/[a-zà-ÿ]/.test(tok);
const initcap = (s) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

export function professorNameParts(raw) {
  const out = { title: 'Pr.', firstName: null, lastName: null, nameKey: null, firstKey: null, displayName: null };
  if (!raw || !String(raw).trim()) return out;

  const tokens = String(raw).replace(/[.,;:/()_-]+/g, ' ').trim().split(/\s+/);
  const caps = [];
  const rest = [];
  for (const tok of tokens) {
    const n = searchNorm(tok);
    if (!n || TITLES.includes(n)) continue;
    (isAllCaps(tok) ? caps : rest).push(tok);
  }

  let lasts;
  let firsts = [];
  if (caps.length && rest.length) { lasts = caps; firsts = rest; }
  else if (caps.length) { lasts = caps.slice(-1); firsts = caps.slice(0, -1); }
  else if (rest.length) { lasts = rest.slice(-1); firsts = rest.slice(0, -1); }
  else return out;                                           // only titles, e.g. "PR"

  while (firsts.length > 1 && PARTICLES.includes(searchNorm(firsts[firsts.length - 1]))) {
    lasts = [firsts.pop(), ...lasts];
  }
  if (firsts.length === 1 && PARTICLES.includes(searchNorm(firsts[0])) && lasts.length >= 1) {
    lasts = [...firsts, ...lasts];
    firsts = [];
  }

  out.lastName = lasts.join(' ').toUpperCase();
  let first = firsts.length ? initcap(firsts.join(' ')) : null;
  if (first && /^\p{L}$/u.test(first)) first = first.toUpperCase() + '.';
  out.firstName = first;

  const key = searchNorm(lasts.join(' ').toLowerCase().replace(/(^|\s)bn(?=\s|$)/g, '$1ben')).replace(/\s/g, '');
  if (!key) return { ...out, lastName: null, firstName: null };
  out.nameKey = key;
  out.firstKey = first ? searchNorm(first) || null : null;
  out.displayName = `Pr. ${[first, out.lastName].filter(Boolean).join(' ')}`;
  return out;
}

/** True when the input looks like a usable name (not "PR", "?", "x"). */
export const isUsableProfessorName = (raw) => {
  const p = professorNameParts(raw);
  return !!p.nameKey && p.nameKey.length >= 3;
};
