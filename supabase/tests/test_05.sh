. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
q "insert into documents (module_id,uploader_id,doc_type,academic_year,is_flagged,is_verified,title) values (2,'$C','examen','2024/2025',false,true,'Examen réseaux')" >/dev/null
check "onboarding follows semester modules" "$(as $B "select complete_onboarding(2, null, 2, 'S5');" | tail -1)" "2"
check "profile saved with hierarchy from DB" "$(q "select university_id||'/'||faculty_id||'/'||filiere_id||'/'||current_semester||'/'||(onboarded_at is not null) from user_profiles where id='$B'")" "2/2/2/S5/true"
check "cannot fake the school (filière wins)" "$(as $C "select complete_onboarding(1, null, 2, 'S5');" >/dev/null; q "select university_id from user_profiles where id='$C'")" "2"
F=$(as $B "select get_home_feed();" | tail -1)
check "home: my modules" "$(echo "$F" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(sorted(m["name"] for m in d["my_modules"]))')" "['Bases de Données', 'Réseaux Informatiques']"
check "home: recent docs in my filière" "$(echo "$F" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(len(d["recent_documents"]))')" "1"
check "home: missing modules to fill" "$(echo "$F" | python3 -c 'import json,sys;d=json.load(sys.stdin);print([m["name"] for m in d["missing"]])')" "['Bases de Données']"
check "home: reputation block" "$(echo "$F" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["reputation"]["level_name"])')" "Nouveau"
check "platform stats public" "$(as anon "select get_platform_stats()->>'modules_with_documents';" | tail -1)" "1"
check "home feed needs login" "$(as anon "select get_home_feed();" 2>&1 | grep -c 'permission denied')" "1"
q "insert into notifications (user_id,type,content) values ('$B','welcome','hi')" >/dev/null
check "email webhook uses vault secret + anon key (no service key)" "$(q "select (headers->>'x-webhook-secret')||'/'||(headers->>'Authorization')||'/'||(body->'record'->>'type') from net.calls order by ctid desc limit 1")" "test-secret/Bearer anon-jwt/welcome"
