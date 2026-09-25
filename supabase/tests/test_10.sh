# Assistant: history, quota, recommendations
. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
q "insert into documents (module_id,uploader_id,doc_type,academic_year,is_flagged,is_verified) values (2,'$C','examen','2024/2025',false,true),(6,'$C','cours','2024/2025',false,true),(3,'$C','td','2024/2025',false,true)" >/dev/null
q "update user_profiles set filiere_id=2, current_semester='S5' where id='$B'" >/dev/null
CID=$(as $B "insert into assistant_conversations (user_id,title) values (auth.uid(),'Test') returning id;" | sed -n 2p)
as $B "insert into assistant_messages (conversation_id,user_id,role,content) values ('$CID',auth.uid(),'user','Salut');" >/dev/null
check "own history readable" "$(as $B "select count(*) from assistant_messages;" | tail -1)" "1"
check "others' history hidden" "$(as $C "select count(*) from assistant_messages;" | tail -1)" "0"
check "cannot write into someone else's conversation" "$(as $C "insert into assistant_messages (conversation_id,user_id,role,content) values ('$CID',auth.uid(),'user','x');" 2>&1 | grep -c 'row-level security')" "1"
check "quota free = 15" "$(as $B "select assistant_quota()->>'limit';" | tail -1)" "15"
for i in $(seq 1 15); do as $B "select assistant_consume();" >/dev/null; done
check "16th message refused" "$(as $B "select assistant_consume();" 2>&1 | grep -c quota_exceeded)" "1"
q "update user_profiles set is_premium=true where id='$B'" >/dev/null
check "premium limit 200" "$(as $B "select assistant_quota()->>'limit';" | tail -1)" "200"
check "module overview by type" "$(as anon "select get_module_overview(2)->'by_type'->'examen'->0->>'academic_year';" | tail -1)" "2024/2025"
check "missing types listed" "$(as anon "select get_module_overview(2)->'missing_types' ? 'corrige_examen';" | tail -1)" "t"
check "related modules (same filière)" "$(as anon "select count(*) > 0 from get_related_modules(2);" | tail -1)" "t"
check "recommendations for my filière" "$(as $B "select count(*) from recommend_for_me();" | tail -1)" "3"
as $B "select record_download((select id from documents where module_id=2 and uploader_id='$C' limit 1));" >/dev/null
check "downloaded docs not recommended again" "$(as $B "select count(*) from recommend_for_me();" | tail -1)" "2"
check "missing resources in my semester" "$(as anon "select count(*) from get_missing_resources(2,'S5');" | tail -1)" "2"
