# Professors
. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
up() { as $1 "insert into documents (module_id,uploader_id,doc_type,is_flagged,professor) values ($2,auth.uid(),'td',false,'$3');" >/dev/null; q "select professor_id from documents order by id desc limit 1"; }
P1=$(up $B 2 'Pr Ahmed Benali')
check "new name → pending profile, standard display" "$(q "select display_name||'/'||status from professors where id=$P1")" "Pr. Ahmed BENALI/pending"
check "same person 'Ahmed Benali' → same profile" "$(up $C 3 'Ahmed Benali')" "$P1"
check "'Ahmed Bn Ali' → same profile" "$(up $C 3 'Ahmed Bn Ali')" "$P1"
check "'Prof. A. Benali' → same profile (initial)" "$(up $B 6 'Prof. A. Benali')" "$P1"
check "document text standardised" "$(q "select professor from documents order by id desc limit 1")" "Pr. Ahmed BENALI"
P2=$(up $B 2 'Youssef Benali')
check "different first name → different profile" "$([ "$P2" != "$P1" ] && echo diff)" "diff"
check "title-only 'PR' → no link" "$(up $B 2 'PR')" ""
check "aliases recorded" "$(q "select count(*) from professor_aliases where professor_id=$P1")" "4"
check "search_professors 'benali'" "$(as anon "select count(*) from search_professors('benali');" | tail -1)" "2"
check "search_professors 'ahmed ben'" "$(as anon "select display_name from search_professors('ahmed benali') limit 1;" | tail -1)" "Pr. Ahmed BENALI"
check "get_professor: modules + docs" "$(as anon "select jsonb_array_length(get_professor($P1)->'modules')||'/'||jsonb_array_length(get_professor($P1)->'documents');" | tail -1)" "3/4"
check "feedback hidden under 3 answers" "$(as anon "select get_professor($P1)->'feedback'->>'hidden';" | tail -1)" "true"
for u in $B $C $A; do as $u "insert into professor_feedback (professor_id,user_id,module_id,exam_style,materials_help,difficulty) values ($P1,auth.uid(),2,'close_to_td',true,3);" >/dev/null; done
check "feedback shown from 3 answers" "$(as anon "select get_professor($P1)->'feedback'->>'materials_help_pct';" | tail -1)" "100"
check "users cannot verify professors" "$(as $B "select verify_professor($P1);" 2>&1 | grep -c forbidden)" "1"
as $M "select verify_professor($P1, 'Ahmed', 'Benali', 2);" >/dev/null
check "moderator verifies" "$(q "select status||'/'||university_id from professors where id=$P1")" "verified/2"
check "queue shows the other pending one + duplicate hint" "$(as $M "select jsonb_array_length(possible_duplicates) from get_professor_queue() where id=$P2;" | tail -1)" "1"
as $M "select merge_professors($P2, $P1);" >/dev/null
check "merge moves documents" "$(q "select count(*) from documents where professor_id=$P2")/$(q "select status||'>'||merged_into from professors where id=$P2")" "0/merged>$P1"
check "get_professor follows merge" "$(as anon "select get_professor($P2)->>'id';" | tail -1)" "$P1"
as $B "select propose_professor('Mme Salma EL IDRISSI', 1);" >/dev/null
check "propose_professor creates pending" "$(q "select display_name||'/'||status from professors order by id desc limit 1")" "Pr. Salma EL IDRISSI/pending"
check "anon cannot propose" "$(as anon "select propose_professor('X Y');" 2>&1 | grep -c 'permission denied')" "1"
PID=$(q "select id from professors where display_name='Pr. Ahmed BENALI'"); D=$(q "select max(id) from documents where uploader_id='$B'")
as $B "update documents set professor_id=$PID where id=$D;" >/dev/null
check "uploader picks a profile from the list" "$(q "select professor from documents where id=$D")" "Pr. Ahmed BENALI"
