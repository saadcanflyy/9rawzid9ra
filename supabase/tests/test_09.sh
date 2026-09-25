# Reputation v2
. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
lvl() { q "select l.name from reputation_level($1) l"; }
check "levels" "$(lvl 0)|$(lvl 50)|$(lvl 250)|$(lvl 750)|$(lvl 2500)" "Nouveau|Contributeur|Contributeur de confiance|Expert|Légende du campus"
check "requested badges exist" "$(q "select count(*) from badges where code in ('first_upload','downloads_100','quality_contributor','community_helper','top_university_contributor')")" "5"
q "update user_profiles set faculty_id=2 where id in ('$B','$A'); update user_profiles set faculty_id=1, university_id=1 where id='$C'" >/dev/null
as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (2,'$B','examen',false);" >/dev/null
D=$(q "select max(id) from documents")
check "first upload badge" "$(q "select count(*) from user_badges where user_id='$B' and badge_code='first_upload'")" "1"
q "update documents set downloads=100 where id=$D" >/dev/null
check "100 downloads badge" "$(q "select count(*) from user_badges where user_id='$B' and badge_code='downloads_100'")" "1"
as $C "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (1,'$C','td',false);" >/dev/null
check "faculty leaderboard" "$(as anon "select count(*) from get_faculty_leaderboard('week');" | tail -1)" "2"
check "student leaderboard by faculty" "$(as anon "select name from get_leaderboard('week', null, null, 10, 1);" | tail -1)" "Carl"
check "my faculty rank" "$(as $C "select faculty_rank from get_my_reputation('week');" | tail -1)" "1"
q "update reputation_events set created_at = date_trunc('month', now()) - interval '10 days'" >/dev/null
check "monthly top contributors awarded (1 per school)" "$(as $M "select award_top_university_contributors();" | tail -1)" "2"
check "badge + bonus points" "$(q "select count(*) from user_badges where badge_code='top_university_contributor'")/$(q "select count(*) from reputation_events where event_type='top_university_month'")" "2/2"
as $M "select award_top_university_contributors();" >/dev/null
check "re-running the same month doesn't double" "$(q "select sum(times_awarded) from user_badges where badge_code='top_university_contributor'")/$(q "select count(*) from reputation_events where event_type='top_university_month'")" "2/2"
check "students cannot run the monthly award" "$(as $B "select award_top_university_contributors();" 2>&1 | grep -c forbidden)" "1"
