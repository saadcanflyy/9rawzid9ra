// 9rawZid9ra — client for the AI academic assistant.
// Edge function: supabase/functions/assistant/index.ts
// Tables: assistant_conversations, assistant_messages (RLS: owner only).
import { supabase } from '../supabase';

export const ASSISTANT_EXAMPLES = [
  'Examens Analyse 2 SMI S3 avec corrigé',
  'Je suis en S4 GI à l’ENSIAS, qu’est-ce qui me manque pour les partiels ?',
  'Comment réviser Réseaux avec les documents dispo ?',
  'Les TD de Pr. BENALI',
];

export class AssistantError extends Error {
  constructor(code, extra = {}) { super(code); this.code = code; Object.assign(this, extra); }
}

/**
 * Send one message. Returns { conversationId, message: {id, role, content, cards, context, created_at}, quota }.
 * Throws AssistantError with code 'quota_exceeded' (err.quota = {used, limit, premium}), 'login_required',
 * 'assistant_unavailable' or 'error'.
 */
export async function sendAssistantMessage(message, conversationId = null) {
  const { data, error } = await supabase.functions.invoke('assistant', {
    body: { message, conversation_id: conversationId },
  });
  if (error) {
    let body = null;
    try { body = await error.context?.json?.(); } catch { /* not json */ }
    const status = error.context?.status;
    if (status === 429 || body?.error === 'quota_exceeded') throw new AssistantError('quota_exceeded', { quota: body?.quota });
    if (status === 401) throw new AssistantError('login_required');
    throw new AssistantError(body?.error === 'assistant_unavailable' ? 'assistant_unavailable' : 'error',
      { conversationId: body?.conversation_id ?? conversationId });
  }
  return { conversationId: data.conversation_id, message: data.message, quota: data.quota };
}

export async function getQuota() {
  const { data, error } = await supabase.rpc('assistant_quota');
  if (error) throw error;
  return data; // { used, limit, premium }
}

export async function listConversations({ limit = 30, archived = false } = {}) {
  const { data, error } = await supabase.from('assistant_conversations')
    .select('id, title, updated_at, archived')
    .eq('archived', archived).order('updated_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId) {
  const { data, error } = await supabase.from('assistant_messages')
    .select('id, role, content, cards, context, feedback, created_at')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function renameConversation(id, title) {
  const { error } = await supabase.from('assistant_conversations').update({ title: String(title).slice(0, 80) }).eq('id', id);
  if (error) throw error;
}

export async function archiveConversation(id, archived = true) {
  const { error } = await supabase.from('assistant_conversations').update({ archived }).eq('id', id);
  if (error) throw error;
}

export async function deleteConversation(id) {
  const { error } = await supabase.from('assistant_conversations').delete().eq('id', id);
  if (error) throw error;
}

/** 👍 = 1, 👎 = -1, null clears. */
export async function rateAnswer(messageId, value) {
  const { error } = await supabase.from('assistant_messages').update({ feedback: value }).eq('id', messageId);
  if (error) throw error;
}

/** Route for a card returned by the assistant (matches the app's existing routes — adjust if they differ). */
export function cardHref(card) {
  switch (card?.type) {
    case 'document':         return card.module_slug ? `/module/${card.module_slug}?doc=${card.id}` : `/document/${card.id}`;
    case 'module':           return card.slug ? `/module/${card.slug}` : null;
    case 'professor':        return `/professeur/${card.id}`;
    case 'request_proposal': return card.module_slug ? `/module/${card.module_slug}?request=${card.doc_type}` : null;
    default:                 return null;
  }
}
