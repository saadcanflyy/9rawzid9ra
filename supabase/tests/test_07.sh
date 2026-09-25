# Quality v2
. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
for i in 1 2 3 4 5 6; do q "insert into auth.users(id) values ('00000000-0000-0000-0000-00000000030$i'); insert into user_profiles(id,name) values ('00000000-0000-0000-0000-00000000030$i','W$i');" >/dev/null; done
as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (2,'$B','examen',false);" >/dev/null
D=$(q "select max(id) from documents")
check "new doc: display_status pending" "$(q "select display_status from documents where id=$D")" "pending"
for i in 1 2 3 4 5; do as 00000000-0000-0000-0000-00000000030$i "insert into document_feedback (document_id,user_id,correct_module,correct_university,readable,complete) values ($D,auth.uid(),true,true,true,true);" >/dev/null; done
check "5 positive reviews → community_approved" "$(q "select display_status from documents where id=$D")" "community_approved"
check "checklist includes correct_university" "$(q "select quality_signals->>'correct_university' from documents where id=$D")" "yes"
S1=$(q "select quality_score from documents where id=$D")
as $M "select moderate_document($D,'verify');" >/dev/null
check "moderator confirms → verified" "$(q "select display_status from documents where id=$D")" "verified"
S2=$(q "select quality_score from documents where id=$D")
check "staff verification scores higher ($S1 → $S2)" "$([ $S2 -gt $S1 ] && echo up)" "up"
as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (2,'$B','td',false);" >/dev/null
E=$(q "select max(id) from documents")
for i in 1 2 3 4 5; do as 00000000-0000-0000-0000-00000000030$i "insert into document_feedback (document_id,user_id,correct_module,correct_university,readable,complete) values ($E,auth.uid(),true,false,true,true);" >/dev/null; done
check "wrong school (≥3 say no) blocks community approval" "$(q "select display_status||'/'||(quality_signals->>'correct_university') from documents where id=$E")" "pending/no"
as $M "select moderate_document($E,'reject',null,'Mauvaise école');" >/dev/null
check "rejected display status" "$(q "select display_status||'/'||quality_score from documents where id=$E")" "rejected/0"
