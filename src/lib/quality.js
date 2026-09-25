// 9rawZid9ra — document quality display helpers.
// Data comes from documents.quality_score, documents.quality_signals and documents.status
// (see supabase/migrations/20260925000200_document_quality.sql).

export const STATUS = {
  pending_review: { label: 'En vérification', tone: 'warning' },
  published:      { label: 'Publié',          tone: 'neutral' },
  verified:       { label: 'Vérifié',         tone: 'success' },
  needs_review:   { label: 'À revoir',        tone: 'warning' },
  rejected:       { label: 'Refusé',          tone: 'danger' },
};

export const REPORT_REASONS = [
  { id: 'wrong_module',  label: 'Mauvais module' },
  { id: 'bad_scan',      label: 'Scan illisible ou flou' },
  { id: 'incomplete',    label: 'Document incomplet' },
  { id: 'duplicate',     label: 'Doublon' },
  { id: 'wrong_info',    label: 'Infos fausses (année, prof, type)' },
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'other',         label: 'Autre' },
];

/** True when nobody has rated or reviewed the document yet. */
export function isUnrated(doc) {
  const s = doc?.quality_signals || {};
  return !(s.feedback_count > 0) && !(s.rating_count > 0) && doc?.status !== 'verified';
}

/** Label + tone for a score. */
export function qualityLevel(doc) {
  if (!doc) return null;
  if (doc.status === 'rejected') return { label: 'Refusé', tone: 'danger' };
  if (isUnrated(doc)) return { label: 'Pas encore évalué', tone: 'neutral' };
  const s = Number(doc.quality_score) || 0;
  if (s >= 85) return { label: 'Excellent', tone: 'success' };
  if (s >= 70) return { label: 'Bon', tone: 'success' };
  if (s >= 50) return { label: 'Correct', tone: 'neutral' };
  return { label: 'À vérifier', tone: 'warning' };
}

const CRITERIA = [
  { key: 'correct_module', yes: 'Bon module',        no: 'Module à vérifier',   unknown: 'Module pas encore confirmé' },
  { key: 'readable',       yes: 'Scan lisible',      no: 'Scan peu lisible',    unknown: 'Lisibilité pas encore évaluée' },
  { key: 'complete',       yes: 'Document complet',  no: 'Document incomplet',  unknown: 'Complétude pas encore évaluée' },
];

/**
 * Checklist rows for the quality card.
 * @returns {{ key, state: 'yes'|'no'|'unknown', label }[]}
 */
export function qualityChecklist(doc) {
  const s = doc?.quality_signals || {};
  const rows = CRITERIA.map((c) => {
    const state = s[c.key] === 'yes' || s[c.key] === 'no' ? s[c.key] : 'unknown';
    return { key: c.key, state, label: c[state] };
  });
  if (doc?.status === 'verified') {
    const when = s.verified_at ? relativeDays(s.verified_at) : null;
    const by = doc.verification_source === 'community' ? 'par la communauté' : 'par la modération';
    rows.push({ key: 'verified', state: s.recently_verified ? 'yes' : 'unknown',
                label: `Vérifié ${by}${when ? ` ${when}` : ''}` });
  } else {
    rows.push({ key: 'verified', state: 'unknown', label: 'Pas encore vérifié' });
  }
  return rows;
}

export function relativeDays(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}`;
}
