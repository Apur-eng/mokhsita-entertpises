// dashboard/js/supabaseClient.js
// Self-contained Supabase client for the /dashboard app.
//
// ── WHY HARDCODED ────────────────────────────────────────────────────────────
// The Vercel env-var path (@supabase_anon_key secret) was not wired correctly,
// causing the dashboard to receive an undefined/broken key at runtime.
// The anon key is intentionally public — Supabase Row-Level Security governs
// what it can access. It is safe to embed in browser code.
//
// If you later configure Vercel secrets properly, re-introduce the injection
// block below and remove the hardcoded fallbacks.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── Guard: never create a second client ──────────────────────────────────
  if (window.supabaseClient) {
    console.log('[Dashboard] Supabase client already initialized — reusing.');
    return;
  }

  // ── Verify the CDN library loaded before us ───────────────────────────────
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error(
      '[Dashboard] FATAL: @supabase/supabase-js CDN must load before ' +
      'dashboard/js/supabaseClient.js. Check <script> order in index.html.'
    );
    return;
  }

  // ── Hardcoded credentials (standalone, no env-var dependency) ────────────
  var SUPABASE_URL      = 'https://txnckfkaecrqwooiobhs.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bmNrZmthZWNycXdvb2lvYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjAyOTQsImV4cCI6MjA5MjY5NjI5NH0.CcD0x_MXDhsW3kFahF7l3C10MejS8YAffaPgBFtLXZ4';

  // ── Create the singleton client and expose on window ─────────────────────
  try {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession:    true,
          autoRefreshToken:  true,
          detectSessionInUrl: true
        }
      }
    );
    console.log('[Dashboard] Supabase client initialized. Project:', SUPABASE_URL);
  } catch (err) {
    console.error('[Dashboard] Failed to create Supabase client:', err);
  }
})();
