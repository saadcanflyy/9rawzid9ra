// 9rawZid9ra — reputation levels, point rules and badge display.
// Must match supabase/migrations/20260925000300_reputation.sql (reputation_level, reputation_rules).

export const LEVELS = [
  { level: 1, name: 'Nouveau',           min: 0,    short: 'Nouveau' },
  { level: 2, name: 'Contributeur',      min: 50,   short: 'Contributeur' },
  { level: 3, name: 'Expert',            min: 300,  short: 'Expert' },
  { level: 4, name: 'Mentor',            min: 1000, short: 'Mentor' },
  { level: 5, name: 'Légende du campus', min: 3000, short: 'Légende' },
];

/** @returns {{ level, name, min, next, nextName, progress (0–1), toNext }} */
export function levelFor(points) {
  const p = Math.max(0, Number(points) || 0);
  let i = LEVELS.length - 1;
  while (i > 0 && p < LEVELS[i].min) i--;
  const cur = LEVELS[i];
  const nxt = LEVELS[i + 1] || null;
  return {
    level: cur.level,
    name: cur.name,
    min: cur.min,
    next: nxt ? nxt.min : null,
    nextName: nxt ? nxt.name : null,
    progress: nxt ? (p - cur.min) / (nxt.min - cur.min) : 1,
    toNext: nxt ? nxt.min - p : 0,
  };
}

// Shown in the Upload flow, the "Comment gagner des points" sheet and the Classement page.
export const POINT_RULES = [
  { key: 'upload_published',      points: 10,  label: 'Document publié' },
  { key: 'doc_verified',          points: 40,  label: 'Document vérifié (modération ou communauté)' },
  { key: 'helpful_received',      points: 5,   label: 'Quelqu’un marque ton document « utile »' },
  { key: 'rating_received',       points: 3,   label: 'Ton document reçoit 4 ou 5 étoiles' },
  { key: 'answer_posted',         points: 5,   label: 'Tu réponds dans Senpai Zone' },
  { key: 'best_answer',           points: 15,  label: 'Ta réponse est choisie comme la meilleure' },
  { key: 'post_helpful_received', points: 2,   label: 'Ton post Senpai reçoit un vote' },
  { key: 'feedback_given',        points: 1,   label: 'Tu évalues la qualité d’un document' },
  { key: 'report_confirmed',      points: 10,  label: 'Ton signalement est confirmé' },
  { key: 'doc_rejected',          points: -50, label: 'Ton document est refusé' },
];

export const BADGE_TIERS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or', special: 'Spécial' };

export const formatPoints = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/ /g, ' ');
export const signedPoints = (n) => (n > 0 ? `+${formatPoints(n)}` : `−${formatPoints(Math.abs(n))}`);

export const PERIODS = [
  { id: 'week',  label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'all',   label: 'Depuis le début' },
];
