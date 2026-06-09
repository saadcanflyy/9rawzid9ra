// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://egqjyzuinoljadzxiwpb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVncWp5enVpbm9samFkenhpd3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTgzOTcsImV4cCI6MjA5Mzc3NDM5N30.sSIbN3aObPFTvL9dxVsQNhuu9Pmp03UmeAUfEs-G3sE' // ← paste anon key (NOT service_role)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)