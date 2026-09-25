// 9rawZid9ra — reputation levels, point rules and badge display.
// Must match supabase/migrations/20260926000400_reputation_v2.sql (reputation_level, reputation_rules, badges).

export const LEVELS = [
  { level: 1, name: 'Nouveau',                   min: 0,    short: 'Nouveau',      icon: 'user' },
  { level: 2, name: 'Contributeur',              min: 50,   short: 'Contributeur', icon: 'upload' },
  { level: 3, name: 'Contributeur de confiance', min: 250,  short: 'Confiance',    icon: 'shield' },
  { level: 4, name: 'Expert',                    min: 750,  short: 'Expert',       icon: 'sparkle' },
  { level: 5, name: 'Légende du campus',         min: 2500, short: 'Légende',      icon: 'star' },
];

// Tone per level, for Badge/LevelBadge — must cover every LEVELS entry.
export const LEVEL_TONES = { 1: 'neutral', 2: 'accent', 3: 'brand', 4: 'warning', 5: 'founder' };

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
    icon: cur.icon,
    tone: LEVEL_TONES[cur.level],
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
  { key: 'top_university_month',  points: 25,  label: 'N°1 des contributeurs de ton école ce mois-ci' },
  { key: 'doc_rejected',          points: -50, label: 'Ton document est refusé' },
];

export const BADGE_TIERS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or', special: 'Spécial' };
export const BADGE_TIER_TONES = { bronze: 'neutral', silver: 'accent', gold: 'warning', special: 'founder' };

export const formatPoints = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/ | /g, ' ');
export const signedPoints = (n) => (n > 0 ? `+${formatPoints(n)}` : `−${formatPoints(Math.abs(n))}`);

export const PERIODS = [
  { id: 'week',  label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'all',   label: 'Depuis le début' },
];

// Badge catalogue (the server is the source of truth: table badges; this is for empty states / previews).
export const BADGES = [
  { code: 'first_upload',               name: 'Premier partage',              icon: 'upload',   tier: 'bronze', hint: 'Publie ton premier document.' },
  { code: 'downloads_100',              name: '100 téléchargements',          icon: 'download', tier: 'silver', hint: 'Tes documents atteignent 100 téléchargements.' },
  { code: 'quality_contributor',        name: 'Contributeur qualité',         icon: 'check',    tier: 'gold',   hint: '5 documents vérifiés ou approuvés, qualité moyenne ≥ 75/100.' },
  { code: 'community_helper',           name: 'Pilier de l’entraide',         icon: 'reply',    tier: 'silver', hint: '10 réponses dans Senpai Zone ou 3 meilleures réponses.' },
  { code: 'top_university_contributor', name: 'Top contributeur de l’école',  icon: 'star',     tier: 'gold',   hint: 'Sois N°1 des contributeurs de ton école sur un mois.', repeatable: true },
  { code: 'campus_legend',              name: 'Légende du campus',            icon: 'star',     tier: 'gold',   hint: 'Atteins 2 500 points.' },
];

export const RANKING_SCOPES = [
  { id: 'global',     label: 'Global' },
  { id: 'university', label: 'Mon école' },
  { id: 'faculty',    label: 'Ma faculté' },
];

/** "N° 3" style rank label, or null. */
export const rankLabel = (rank) => (Number(rank) > 0 ? `N° ${Number(rank)}` : null);
