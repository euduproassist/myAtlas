// supabase-config.js - Supabase Client Initialization for MyAtlas

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Your Supabase Project Credentials from Step 4
const SUPABASE_URL = 'https://flyzdlkitolylihhcuuf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cRmFAsk6AuVxxOnMcNEWsA_4_YrdnT-'; 

// Initialize and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
