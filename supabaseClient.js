// supabaseClient.js
// Single source of truth for Supabase client — loaded once before all other scripts

const SUPABASE_URL = 'https://txnckfkaecrqwooiobhs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bmNrZmthZWNycXdvb2lvYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjAyOTQsImV4cCI6MjA5MjY5NjI5NH0.CcD0x_MXDhsW3kFahF7l3C10MejS8YAffaPgBFtLXZ4';

// Guard: only initialize once
if (!window.supabaseClient) {
  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Client initialized successfully.');
  } else {
    console.error('[Supabase] ERROR: supabase-js SDK not loaded. Make sure the CDN script is included before supabaseClient.js.');
  }
}
