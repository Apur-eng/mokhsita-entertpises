// dashboard/js/supabaseClient.js
// Self-contained Supabase client for the /dashboard app.
// Initialized ONCE. All dashboard scripts read window.supabaseClient.
//
// === ENVIRONMENT VARIABLE SUPPORT ===
// On Vercel or any build pipeline, inject credentials BEFORE this script via:
//
//   <script>
//     window.__SUPABASE_CONFIG__ = {
//       url: process.env.SUPABASE_URL,
//       key: process.env.SUPABASE_ANON_KEY
//     };
//   </script>
//
// If that object is not present, the constants below are used as fallback.
// NOTE: The ANON key is intentionally public — it is safe to ship in browser
// code. Supabase Row-Level Security policies govern what it can access.
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
      '[Dashboard] FATAL: @supabase/supabase-js CDN must be loaded before ' +
      'dashboard/js/supabaseClient.js. Check your <script> order in index.html.'
    );
    return;
  }

  // ── Resolve credentials (env-injected config wins over constants) ─────────
  var injected = window.__SUPABASE_CONFIG__ || {};

  var SUPABASE_URL =
    injected.url ||
    'https://txnckfkaecrqwooiobhs.supabase.co';

  var SUPABASE_ANON_KEY =
    injected.key ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bmNrZmthZWNycXdvb2lvYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjAyOTQsImV4cCI6MjA5MjY5NjI5NH0.CcD0x_MXDhsW3kFahF7l3C10MejS8YAffaPgBFtLXZ4';

  // ── Create the client and expose on window ────────────────────────────────
  try {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    console.log('[Dashboard] Supabase client initialized. Project:', SUPABASE_URL);
  } catch (err) {
    console.error('[Dashboard] Failed to create Supabase client:', err);
  }
})();
