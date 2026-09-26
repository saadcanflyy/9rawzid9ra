-- AUDIT M13 — one upload size limit everywhere.
-- The bucket accepted 50 MB, the client rejected above 50 MB, and the UI told
-- users "20 Mo max" in one place and "50 Mo" in two others. 20 MB is the right
-- number: egress (5 GB/month on the free plan) is the first limit this project
-- hits, and a 50 MB scan is a bad upload, not a useful document.
begin;
update storage.buckets set file_size_limit = 20971520 where id = 'documents';
commit;
