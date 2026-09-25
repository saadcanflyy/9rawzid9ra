. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
pts() { q "select points from user_profiles where id='$1'"; }
for i in 1 2 3 4 5 6; do q "insert into auth.users(id) values ('00000000-0000-0000-0000-00000000020$i') on conflict do nothing; insert into user_profiles(id,name,university_id) values ('00000000-0000-0000-0000-00000000020$i','V$i',1) on conflict do nothing;" >/dev/null; done
P0=$(pts $C)
as $C "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (1,'$C','examen',false);" >/dev/null
D=$(q "select max(id) from documents")
check "upload published → +10" "$(( $(pts $C) - P0 ))" "10"
as $C "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (1,'$C','cc',true);" >/dev/null
H=$(q "select max(id) from documents")
check "held upload → no points yet" "$(( $(pts $C) - P0 ))" "10"
as $M "select moderate_document($H,'publish');" >/dev/null
check "held upload published by mod → +10" "$(( $(pts $C) - P0 ))" "20"
as $B "insert into document_reactions (user_id,document_id,reaction_type) values ('$B',$D,'helpful');" >/dev/null
check "helpful received → +5" "$(( $(pts $C) - P0 ))" "25"
as $B "delete from document_reactions where user_id='$B' and document_id=$D and reaction_type='helpful';" >/dev/null
check "helpful removed → cancelled" "$(( $(pts $C) - P0 ))" "20"
as $B "insert into document_reactions (user_id,document_id,reaction_type) values ('$B',$D,'helpful');" >/dev/null
check "re-add helpful → +5 again (no farming beyond 1)" "$(( $(pts $C) - P0 ))" "25"
as $B "insert into document_reactions (user_id,document_id,reaction_type,rating) values ('$B',$D,'rating',5);" >/dev/null
check "5★ rating → +3" "$(( $(pts $C) - P0 ))" "28"
as $B "update document_reactions set rating=2 where user_id='$B' and document_id=$D and reaction_type='rating';" >/dev/null
check "rating lowered to 2★ → cancelled" "$(( $(pts $C) - P0 ))" "25"
PB=$(pts $B)
as $B "insert into document_feedback (document_id,user_id,correct_module,readable,complete) values ($D,'$B',true,true,false);" >/dev/null
check "feedback given → +1 to reviewer" "$(( $(pts $B) - PB ))" "1"
as $M "select moderate_document($D,'verify');" >/dev/null
check "verified → +40" "$(( $(pts $C) - P0 ))" "65"
check "level Contributeur at 65" "$(q "select l.name from user_profiles u, reputation_level(u.points) l where u.id='$C'")" "Contributeur"
check "level-up notification" "$(q "select count(*) from notifications where user_id='$C' and type='level_up'")" "1"
# reports then rejection
for i in 1 2; do as 00000000-0000-0000-0000-00000000020$i "select report_document($H,'wrong_module');" >/dev/null; done
as $M "select moderate_document($H,'reject',null,'Mauvais module');" >/dev/null
check "rejected → upload revoked & −50" "$(( $(pts $C) - P0 ))" "5"
check "reporters rewarded +10" "$(pts 00000000-0000-0000-0000-000000000201)" "10"
# self-delete revokes
as $C "delete from documents where id=$D;" >/dev/null
check "self-delete revokes everything earned from the doc" "$(q "select count(*) from reputation_events where document_id=$D and user_id='$C'")" "0"
check "points never negative" "$(pts $C)" "0"
# Senpai
q "insert into senpai_posts (id,author_id,post_type,title,content) values (100,'$B','question','Q','?')" >/dev/null
PA=$(pts $A)
as $A "insert into senpai_replies (post_id,author_id,content) values (100,'$A','Réponse');" >/dev/null
check "answer posted → +5" "$(( $(pts $A) - PA ))" "5"
as $B "insert into senpai_replies (post_id,author_id,content) values (100,'$B','my own');" >/dev/null
check "replying to own post → no points" "$(q "select count(*) from reputation_events where user_id='$B' and event_type='answer_posted'")" "0"
RID=$(q "select id from senpai_replies where author_id='$A'")
as $C "select mark_best_reply($RID);" 2>&1 | grep -q forbidden && echo "PASS  only post author can mark best answer"
as $B "select mark_best_reply($RID);" >/dev/null
check "best answer → +15" "$(( $(pts $A) - PA ))" "20"
as $A "insert into senpai_votes (user_id,post_id) values ('$A',100);" >/dev/null
check "post upvote → +2 to author" "$(q "select count(*) from reputation_events where user_id='$B' and event_type='post_helpful_received'")" "1"
# caps
PC=$(pts $C)
for k in $(seq 1 12); do as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (5,'$B','cours',false);" >/dev/null; done; as 00000000-0000-0000-0000-000000000206 "insert into document_feedback (document_id,user_id,readable) select id, auth.uid(), true from documents where uploader_id='$B' and status='published';" >/dev/null
check "feedback cap: 12 reviews → 10 points max" "$(pts 00000000-0000-0000-0000-000000000206)" "10"
# security
as $B "select award_reputation('$B','doc_verified','hack');" 2>&1 | grep -q "permission denied" && echo "PASS  browser cannot call award_reputation"
as $B "insert into reputation_events (user_id,event_type,points,dedupe_key) values ('$B','doc_verified',9999,'x');" 2>&1 | grep -q "permission denied" && echo "PASS  browser cannot insert events"
as $B "select admin_adjust_reputation('$B',9999,'x');" 2>&1 | grep -q forbidden && echo "PASS  only admin adjusts"
as $A "select admin_adjust_reputation('$C',100,'Aide au lancement');" >/dev/null
check "admin adjustment applied" "$(pts $C)" "$((PC+100))"
# leaderboards
check "leaderboard week has rows" "$(as anon "select count(*) > 0 from get_leaderboard('week');" | tail -1)" "t"
check "leaderboard filtered by university" "$(as anon "select bool_and(university_id=1) from get_leaderboard('all',1);" | tail -1)" "t"
check "university leaderboard" "$(as anon "select count(*) > 0 from get_university_leaderboard('month');" | tail -1)" "t"
check "my reputation" "$(as $A "select level_name from get_my_reputation('week');" | tail -1)" "Nouveau"
as anon "select rank, name, period_points, level_name, badges_count from get_leaderboard('all') limit 5;"
