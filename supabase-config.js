// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://eejhuoascszybhmpelqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WZzwe6xezCKhNViuyJ9L-Q__5JmiSCF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
