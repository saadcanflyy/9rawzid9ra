. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
q "insert into documents (module_id,uploader_id,doc_type,academic_year,is_flagged,is_verified,title) values (2,'$B','examen','2023/2024',false,true,'Examen final réseaux'),(2,'$B','td','2024/2025',false,true,'TD 1'),(4,'$C','examen','2024/2025',false,true,'Examen gestion prod'),(6,'$C','corrige_examen','2024/2025',false,true,null)" >/dev/null
check "accent-insensitive: 'reseau' finds Réseaux" "$(as anon "select search_catalog('reseau')->'modules'->0->>'name';" | tail -1)" "Réseaux Informatiques"
check "typo tolerant: 'resaux informatiqe'" "$(as anon "select search_catalog('resaux informatiqe')->'modules'->0->>'name';" | tail -1)" "Réseaux Informatiques"
check "synonym: 'bdd' → Bases de Données" "$(as anon "select search_catalog('bdd')->'modules'->0->>'name';" | tail -1)" "Bases de Données"
check "exam réseau 2024 → the 2023/2024 exam first" "$(as anon "select search_catalog('reseau', p_doc_type=>'examen', p_year=>'2024')->'documents'->0->>'title';" | tail -1)" "Examen final réseaux"
check "type filter corrigé (any corrigé)" "$(as anon "select search_catalog('', p_doc_type=>'corrige')->'modules'->0->>'name';" | tail -1)" "Bases de Données"
check "semester filter S5 + alias gi" "$(as anon "select search_catalog('gi', p_semester=>'S5')->>'total_modules';" | tail -1)" "3"
check "school filter" "$(as anon "select search_catalog('', p_university_id=>1)->>'total_modules';" | tail -1)" "2"
check "empty query, no filter → nothing" "$(as anon "select search_catalog('')->>'total_modules';" | tail -1)" "0"
check "own school ranked first for Carl (UM5) on 'analyse'" "$(as $C "select search_catalog('analyse')->'modules'->0->>'university_name';" | tail -1)" "Université Mohammed V de Rabat"
check "suggest: school by acronym" "$(as anon "select label from search_suggest('emsi') limit 1;" | tail -1)" "École Marocaine des Sciences de l'Ingénieur (EMSI)"
check "suggest: filière by alias" "$(as anon "select kind from search_suggest('gi') limit 1;" | tail -1)" "filiere"
check "module stats cached" "$(q "select docs_count||':'||array_to_string(doc_types,',') from modules where id=2")" "2:examen,td"
as anon "select log_search('mecanique des fluides','{}',0);" >/dev/null
check "zero-result searches visible to staff" "$(as $M "select zero_results from get_search_insights() where query='mecanique des fluides';" | tail -1)" "1"
check "search log hidden from users" "$(as $B "select count(*) from search_log;" | tail -1)" "0"
