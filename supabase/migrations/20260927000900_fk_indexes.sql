-- AUDIT M11 — index the 12 hottest unindexed foreign keys.
-- 56 FKs had no index. Irrelevant at 30 documents, painful at exam-period
-- traffic: every one of these backs a join or a cascade the app runs per page.
-- The remaining 44 are cold (suggestion/review/audit tables) and left alone.
begin;
create index if not exists idx_documents_uploader      on public.documents (uploader_id);
create index if not exists idx_doc_reactions_document  on public.document_reactions (document_id);
create index if not exists idx_downloads_log_document  on public.downloads_log (document_id);
create index if not exists idx_messages_sender         on public.messages (sender_id);
create index if not exists idx_messages_receiver       on public.messages (receiver_id);
create index if not exists idx_senpai_replies_post     on public.senpai_replies (post_id);
create index if not exists idx_senpai_votes_post       on public.senpai_votes (post_id);
create index if not exists idx_request_votes_request   on public.document_request_votes (request_id);
create index if not exists idx_module_bookmarks_module on public.module_bookmarks (module_id);
create index if not exists idx_document_feedback_user  on public.document_feedback (user_id);
create index if not exists idx_user_profiles_filiere   on public.user_profiles (filiere_id);
create index if not exists idx_notifications_actor     on public.notifications (actor_id);
commit;
