// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://eejhuoascszybhmpelqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WZzwe6xezCKhNViuy39L-Q_5Jmi...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
