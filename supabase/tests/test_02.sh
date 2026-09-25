. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
# extra users for community feedback
for i in 1 2 3 4 5 6; do q "insert into auth.users(id) values ('00000000-0000-0000-0000-00000000010$i'); insert into user_profiles(id,name) values ('00000000-0000-0000-0000-00000000010$i','U$i');" >/dev/null; done
as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged,file_hashes) values (2,'$B','examen',false,'{abc123}');" >/dev/null
D=$(q "select max(id) from documents")
check "new doc published" "$(q "select status from documents where id=$D")" "published"
check "self feedback blocked" "$(as $B "insert into document_feedback (document_id,user_id,correct_module,readable,complete) values ($D,'$B',true,true,true);" | grep -c "propre document")" "1"
check "self rating blocked" "$(as $B "insert into document_reactions (user_id,document_id,reaction_type,rating) values ('$B',$D,'rating',5);" | grep -c "propre document")" "1"
S0=$(q "select quality_score from documents where id=$D")
for i in 1 2 3 4; do as 00000000-0000-0000-0000-00000000010$i "insert into document_feedback (document_id,user_id,correct_module,readable,complete) values ($D,auth.uid(),true,true,true); insert into document_reactions (user_id,document_id,reaction_type,rating) values (auth.uid(),$D,'rating',5);" >/dev/null; done
S1=$(q "select quality_score from documents where id=$D")
check "score rises with positive feedback ($S0 -> $S1)" "$([ $S1 -gt $S0 ] && echo up)" "up"
check "4 answers: still published" "$(q "select status from documents where id=$D")" "published"
check "checklist readable=yes" "$(q "select quality_signals->>'readable' from documents where id=$D")" "yes"
as 00000000-0000-0000-0000-000000000105 "insert into document_feedback (document_id,user_id,correct_module,readable,complete) values ($D,auth.uid(),true,true,true);" >/dev/null
check "5th positive answer → community verified" "$(q "select status||'/'||verification_source||'/'||(quality_signals->>'recently_verified') from documents where id=$D")" "verified/community/true"
S2=$(q "select quality_score from documents where id=$D"); echo "      score now $S2"
as $B "insert into documents (module_id,uploader_id,doc_type,is_flagged,file_hashes) values (3,'$B','cours',false,'{abc123,zzz}');" >/dev/null
check "duplicate fingerprint → held for review" "$(q "select status||'|'||flag_reason from documents order by id desc limit 1")" "pending_review|Doublon possible du document #$D"
check "find_duplicate_documents" "$(as $C "select document_id from find_duplicate_documents('{abc123}') order by 1 limit 1;" | tail -1)" "$D"
as $C "insert into documents (module_id,uploader_id,doc_type,is_flagged) values (1,'$C','td',false);" >/dev/null
E=$(q "select max(id) from documents")
for i in 1 2; do as 00000000-0000-0000-0000-00000000010$i "select report_document($E,'bad_scan','illisible');" >/dev/null; done
check "2 reports: still published" "$(q "select status from documents where id=$E")" "published"
as 00000000-0000-0000-0000-000000000103 "select report_document($E,'wrong_module');" >/dev/null
check "3rd report → needs_review + hidden" "$(q "select status||'/'||is_verified from documents where id=$E")" "needs_review/false"
check "invalid report reason rejected" "$(as $A "select report_document($E,'lol');" | grep -c violates)" "1"
check "queue lists it for moderators" "$(as $M "select count(*) from get_moderation_queue() where document_id=$E;" | tail -1)" "1"
check "queue forbidden for users" "$(as $B "select * from get_moderation_queue();" | grep -c forbidden)" "1"
as $M "select moderate_document($E,'reset_reports');" >/dev/null
check "reset → back to published" "$(q "select status||'/'||report_count from documents where id=$E")" "published/0"
as $M "select moderate_document($E,'reject',null,'Mauvais module');" >/dev/null
check "reject → score 0, notif to uploader, log" "$(q "select status||'/'||quality_score from documents where id=$E")/$(q "select count(*) from notifications where type='document_rejected' and user_id='$C'")/$(q "select count(*) from moderation_log where document_id=$E")" "rejected/0/1/2"
as $M "select moderate_document($E,'verify');" >/dev/null
check "staff verify" "$(q "select status||'/'||verification_source from documents where id=$E")" "verified/staff"
as $B "update documents set status='verified' where id=$D;" 2>&1 | grep -q "permission denied" && echo "PASS  uploader cannot set status"
