. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
as $B "update user_profiles set is_admin=true where id='$B';" >/dev/null
check "user cannot make self admin" "$(q "select is_admin from user_profiles where id='$B'")" "f"
as $B "update user_profiles set points=99999 where id='$B';" >/dev/null
check "user cannot set own points" "$(q "select points from user_profiles where id='$B'")" "0"
as $B "update user_profiles set bio='hello', filiere_id=2, current_semester='S5' where id='$B';" >/dev/null
check "user can edit bio/filiere/semester" "$(q "select bio||filiere_id||current_semester from user_profiles where id='$B'")" "hello2S5"
as $B "update user_profiles set bio='hack' where id='$C';" >/dev/null
check "user cannot edit someone else" "$(q "select coalesce(bio,'') from user_profiles where id='$C'")" ""
as $B "insert into documents (module_id,uploader_id,doc_type,is_verified,downloads,helpful_count,is_flagged) values (2,'$B','examen',true,999,50,false);" >/dev/null
check "upload sanitized (downloads/helpful reset, published)" "$(q "select downloads||'/'||helpful_count||'/'||is_verified||'/'||verified from documents order by id desc limit 1")" "0/0/true/false"
as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (2,'$B','cc',true);" >/dev/null
check "flagged upload held (not published)" "$(q "select is_verified from documents order by id desc limit 1")" "f"
D=$(q "select min(id) from documents")
as $B "update documents set is_verified=true, verified=true, downloads=500 where id=$D;" >/dev/null
check "uploader cannot self-verify / fake downloads" "$(q "select verified||'/'||downloads from documents where id=$D")" "false/0"
as $B "update documents set professor='Pr. X' where id=$D;" >/dev/null
check "uploader can edit metadata" "$(q "select professor from documents where id=$D")" "Pr. X"
as $C "insert into document_reactions (user_id,document_id,reaction_type,rating) values ('$C',$D,'rating',4); insert into document_reactions (user_id,document_id,reaction_type) values ('$C',$D,'helpful'); insert into document_reactions (user_id,document_id,reaction_type,report_reason) values ('$C',$D,'report','wrong_module');" >/dev/null
check "other user's rating/helpful/report counted" "$(q "select rating_sum||'/'||rating_count||'/'||helpful_count||'/'||report_count from documents where id=$D")" "4/1/1/1"
as $C "update document_reactions set rating=2 where user_id='$C' and document_id=$D and reaction_type='rating';" >/dev/null
check "rating change recounted" "$(q "select rating_sum from documents where id=$D")" "2"
check "rating out of range rejected" "$(as $C "insert into document_reactions (user_id,document_id,reaction_type,rating) values ('$C',$D,'rating',9);" | grep -c violates)" "1"
as $C "select record_download($D); select record_download($D);" >/dev/null
check "download counted once per day" "$(q "select downloads from documents where id=$D")" "1"
check "uploader total_downloads credited" "$(q "select total_downloads from user_profiles where id='$B'")" "1"
as $B "insert into points_log (user_id,points,reason) values ('$B',1000,'hack');" >/dev/null
check "user cannot insert points_log" "$(q "select count(*) from points_log where reason='hack'")" "0"
check "user reads own points_log" "$(as $B "select count(*) from points_log;" | tail -1)" "$(q "select count(*) from points_log where user_id='$B'")"
as $B "insert into notifications (user_id,type,content) values ('$C','announcement','fake admin msg');" >/dev/null
check "no actor-less notifications" "$(q "select count(*) from notifications where content='fake admin msg'")" "0"
as $B "insert into notifications (user_id,type,actor_id) values ('$C','follow','$B');" >/dev/null
check "normal follow notification allowed" "$(q "select count(*) from notifications where type='follow'")" "1"
as $B "update universities set name='HACKED' where id=1;" >/dev/null
check "user cannot rename a university" "$(q "select name from universities where id=1")" "Université Mohammed V de Rabat"
as $M "update modules set name='Analyse Numérique I' where id=1;" >/dev/null
check "moderator can rename module" "$(q "select name from modules where id=1")" "Analyse Numérique I"
as $B "select moderate_document($D,'verify');" >/dev/null
check "user cannot call moderate_document" "$(q "select verified from documents where id=$D")" "f"
as $M "select moderate_document($D,'verify');" >/dev/null
check "moderator verifies doc" "$(q "select verified||'/'||(verified_by is not null) from documents where id=$D")" "true/true"
as $M "select moderate_document($D,'reset_reports');" >/dev/null
check "reset reports" "$(q "select report_count from documents where id=$D")" "0"
as $B "select admin_set_moderator('$B',true);" >/dev/null
check "user cannot promote self" "$(q "select is_moderator from user_profiles where id='$B'")" "f"
as $A "select admin_set_moderator('$C',true);" >/dev/null
check "admin promotes moderator" "$(q "select is_moderator from user_profiles where id='$C'")" "t"
as $A "select admin_broadcast('Bienvenue');" >/dev/null
check "admin broadcast reaches users" "$(q "select count(*) from notifications where type='announcement'")" "4"
as $B "insert into document_requests (user_id,module_id,doc_type) values ('$B',2,'examen');" >/dev/null
R=$(q "select max(id) from document_requests")
as $B "insert into document_request_votes (user_id,request_id) values ('$B',$R);" >/dev/null
as $C "insert into document_request_votes (user_id,request_id) values ('$C',$R);" >/dev/null
as $B "update document_requests set votes=500 where id=$R;" >/dev/null
check "request votes counted, not forgeable" "$(q "select votes from document_requests where id=$R")" "2"
as $B "delete from documents where id=$D;" >/dev/null
check "uploader deletes own doc + cleanup" "$(q "select count(*) from documents where id=$D")/$(q "select count(*) from document_reactions where document_id=$D")/$(q "select count(*) from downloads_log where document_id=$D")" "0/0/0"
as anon "select increment_post_views(1);" >/dev/null && echo "PASS  anon can call increment_post_views"
