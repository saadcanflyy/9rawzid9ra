# Search v2 + context resolution
. "$(dirname $0)/as.sh"
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (expected '$3' got '$2')"; fi; }
q "update faculties set name='Faculté des Sciences de Rabat (FSR)' where id=1; insert into modules (id,filiere_id,semester,name) values (7,1,'S3','Analyse II'),(9,2,'S5','Réseaux Avancés')" >/dev/null
q "insert into documents (module_id,uploader_id,doc_type,academic_year,is_flagged,is_verified,professor,title) values (2,'$B','examen','2023/2024',false,true,'Nada SBIHI','Examen réseaux 2024'),(2,'$C','corrige_examen','2023/2024',false,true,'Pr Nada Sbihi',null),(2,'$C','examen','2019/2020',false,true,null,'Vieil examen'),(7,'$C','examen','2024/2025',false,true,'Ahmed BENALI',null),(9,'$B','td','2024/2025',false,true,null,null)" >/dev/null
ctx() { as $B "select resolve_academic_context('$1')$2;" | tail -1; }
check "GI S5 réseau exam + correction: filière" "$(ctx 'Je cherche un examen de réseau GI S5 avec correction' "->'filiere'->>'name'")" "Génie Informatique"
check "… semester" "$(ctx 'Je cherche un examen de réseau GI S5 avec correction' "->>'semester'")" "S5"
check "… types exam + corrigé" "$(ctx 'Je cherche un examen de réseau GI S5 avec correction' "->'doc_types'")" '["examen", "corrige_examen"]'
check "… module Réseaux" "$(ctx 'Je cherche un examen de réseau GI S5 avec correction' "->'module'->>'name'")" "Réseaux Informatiques"
check "'analyse 2 fs rabat examen': faculty" "$(ctx 'analyse 2 fs rabat examen' "->'faculty'->>'name'")" "Faculté des Sciences de Rabat (FSR)"
check "… school" "$(ctx 'analyse 2 fs rabat examen' "->'university'->>'name'")" "Université Mohammed V de Rabat"
check "… module (Analyse II = analyse 2)" "$(ctx 'analyse 2 fs rabat examen' "->'module'->>'name'")" "Analyse II"
check "… semester from the module" "$(ctx 'analyse 2 fs rabat examen' "->'module'->>'semester'")" "S3"
check "UM5 curated alias" "$(ctx 'um5 analyse' "->'university'->>'name'")" "Université Mohammed V de Rabat"
check "professor by family name" "$(ctx 'examen sbihi' "->'professor'->>'name'")" "Pr. Nada SBIHI"
check "multi-type search returns both" "$(as anon "select jsonb_path_query_array(search_catalog('reseau', p_doc_types=>array['examen','corrige_examen']), '\$.documents[*].doc_type');" | tail -1 | python3 -c 'import json,sys;print(sorted(set(json.load(sys.stdin))))')" "['corrige_examen', 'examen']"
check "professor filter" "$(as anon "select jsonb_array_length(search_catalog('', p_professor_id=>(select id from professors where name_key='sbihi'))->'documents');" | tail -1)" "2"
check "module filter" "$(as anon "select jsonb_array_length(search_catalog('', p_module_id=>2)->'documents');" | tail -1)" "3"
check "text search finds professor name" "$(as anon "select search_catalog('sbihi')->'documents'->0->>'professor';" | tail -1)" "Pr. Nada SBIHI"
DV=$(q "select id from documents where title='Vieil examen'"); as $M "select moderate_document($DV,'verify');" >/dev/null
check "ranking: verified first even if older" "$(as anon "select search_catalog('reseau', p_doc_type=>'examen')->'documents'->0->>'title';" | tail -1)" "Vieil examen"
as $M "select moderate_document($DV,'publish');" >/dev/null
check "ranking: recent first when equal" "$(as anon "select search_catalog('reseau', p_doc_type=>'examen')->'documents'->0->>'title';" | tail -1)" "Examen réseaux 2024"
check "suggest: professor" "$(as anon "select kind from search_suggest('sbih') where kind='professor' limit 1;" | tail -1)" "professor"
check "suggest: faculty by acronym" "$(as anon "select label from search_suggest('fsr') where kind='faculty' limit 1;" | tail -1)" "Faculté des Sciences de Rabat (FSR)"
check "roman numerals" "$(q "select search_norm('Analyse II')")" "analyse 2"
