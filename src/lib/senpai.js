// 9rawZid9ra — Senpai de filière (volunteer student mentors, per filière).
// Contact goes through a client-built mailto: link, never a static href and
// never sent through our servers — see the migration for why (no edge
// function, no email-sending API key, senpai's reply is never seen by us).

export const HELP_WITH_OPTIONS = [
  { id: 'exams',       label: 'Examens' },
  { id: 'modules',     label: 'Choix des modules' },
  { id: 'internships', label: 'Stages' },
  { id: 'orientation', label: 'Orientation' },
];

export const RESPONSE_ESTIMATES = [
  { id: 'hours', label: 'Quelques heures' },
  { id: 'days',  label: '1 à 2 jours' },
  { id: 'week',  label: 'Une semaine' },
];

/** True when a semester string ("S3", "3"…) parses to >= n, or when it can't be parsed at all (permissive). */
export function semesterAtLeast(semester, n) {
  if (!semester) return false;
  const num = parseInt(String(semester).replace(/\D/g, ''), 10);
  return Number.isFinite(num) && num >= n;
}

export const helpWithLabel = (id) => HELP_WITH_OPTIONS.find((o) => o.id === id)?.label || id;
export const responseLabel = (id) => RESPONSE_ESTIMATES.find((o) => o.id === id)?.label || null;

export const SENPAI_REPORT_REASONS = [
  { id: 'unresponsive', label: "Ne répond jamais" },
  { id: 'inappropriate', label: 'Comportement inapproprié' },
  { id: 'wrong_filiere', label: 'Ne connaît pas la filière' },
  { id: 'other', label: 'Autre' },
];

/** Friendly French message for the RPC error codes raised by log_senpai_contact. */
export function senpaiContactErrorMessage(error) {
  const msg = error?.message || '';
  if (msg.includes('daily_limit')) return "Tu as atteint la limite de 3 messages envoyés aujourd'hui. Réessaie demain.";
  if (msg.includes('senpai_full')) return 'Ce senpai a atteint sa limite de messages cette semaine. Réessaie plus tard ou écris à un autre senpai.';
  if (msg.includes('cannot contact yourself')) return 'Tu ne peux pas te contacter toi-même.';
  return msg || "Impossible d'envoyer le message pour le moment.";
}

/**
 * Logs the contact attempt (rate limits enforced server-side), then opens the
 * student's own mail client with the senpai's address pre-filled — built here,
 * at click time, rather than rendered as a static <a href="mailto:…">.
 */
export async function contactSenpai(supabase, senpai, { studentName, filiereName } = {}) {
  const { error } = await supabase.rpc('log_senpai_contact', { p_senpai_id: senpai.id });
  if (error) throw error;
  const subject = `Question sur ${filiereName || 'ta filière'} — via 9rawZid9ra`;
  const greeting = studentName ? `Salut ${senpai.name.split(' ')[0]},\n\nJe suis ${studentName}` : `Salut ${senpai.name.split(' ')[0]},\n\nJe suis un(e) étudiant(e)`;
  const body = `${greeting}, de ${filiereName || 'ta filière'} sur 9rawZid9ra.\n\n[Ta question ici]\n\nMerci !`;
  window.location.href = `mailto:${senpai.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
