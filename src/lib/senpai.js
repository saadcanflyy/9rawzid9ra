// 9rawZid9ra — Senpai de filière (volunteer student mentors, per filière).
// Contact goes through the in-app Messenger. No RPC returns a senpai's email
// to a student (migration 20260927000400); the DM's `new_message` notification
// is what reaches them by email, via the notify-email edge function.

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
  if (msg.includes('senpai_paused')) return 'Ce senpai est en pause en ce moment. Réessaie plus tard ou écris à un autre senpai.';
  if (msg.includes('cannot contact yourself')) return 'Tu ne peux pas te contacter toi-même.';
  return msg || "Impossible d'envoyer le message pour le moment.";
}

/**
 * Logs the contact attempt (rate limits enforced server-side), then opens the
 * in-app Messenger with the senpai.
 *
 * Contact deliberately does NOT use the senpai's email: no RPC returns it to a
 * student any more (migration 20260927000400). The DM raises a `new_message`
 * notification, which the notify-email edge function turns into an email in the
 * senpai's inbox — so they're still reached by email, but neither side ever
 * learns the other's address.
 */
export async function contactSenpai(supabase, senpai) {
  const { error } = await supabase.rpc('log_senpai_contact', { p_senpai_id: senpai.id });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('open-dm', {
    detail: { userId: senpai.user_id, name: senpai.name || 'Senpai' },
  }));
}
