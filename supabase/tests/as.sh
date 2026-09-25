# usage: as <uuid|anon> "sql"
as() { local who=$1; shift; if [ "$who" = anon ]; then role=anon; sub=''; else role=authenticated; sub=$who; fi
psql -h /tmp -p 5433 -U postgres -d t -qtA -v ON_ERROR_STOP=0 <<SQL 2>&1
set role $role; select set_config('request.jwt.claim.sub','$sub',false); select set_config('request.jwt.claim.role','$role',false) \g /dev/null
$*
SQL
}
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b; C=00000000-0000-0000-0000-00000000000c; M=00000000-0000-0000-0000-00000000000d
q() { psql -h /tmp -p 5433 -U postgres -d t -qtA -c "$1"; }
