// dashboard/js/auth.js
// Dashboard-local auth module. No dependency on ../modules/ or root-level files.
// Requires: window.supabaseClient (from dashboard/js/supabaseClient.js)
'use strict';

window.App = window.App || {};

window.App.Auth = (function () {
  // ── Runtime guard ──────────────────────────────────────────────────────────
  var db = window.supabaseClient;
  if (!db) {
    console.error(
      '[App.Auth] supabaseClient is missing. ' +
      'Ensure dashboard/js/supabaseClient.js is loaded before dashboard/js/auth.js.'
    );
  }

  return {
    /**
     * Returns the current user or null. Does NOT redirect.
     */
    getCurrentUser: async function () {
      if (!db) return { error: 'Database not initialized' };
      try {
        var res = await db.auth.getUser();
        return { user: res.data.user, error: res.error };
      } catch (err) {
        return { user: null, error: err };
      }
    },

    /**
     * Route guard for PROTECTED pages.
     * If no active session → redirect to the given loginPage path.
     * Returns the user object on success.
     */
    requireAuth: async function (loginPage) {
      loginPage = loginPage || 'login.html';
      if (!db) {
        window.location.href = loginPage;
        return null;
      }
      try {
        var res = await db.auth.getSession();
        var session = res.data.session;
        if (!session || !session.user) {
          window.location.href = loginPage;
          return null;
        }
        return session.user;
      } catch (err) {
        console.error('[App.Auth] requireAuth error:', err);
        window.location.href = loginPage;
        return null;
      }
    },

    /**
     * Route guard for GUEST-ONLY pages (e.g., login page).
     * If a session exists → redirect to the given dashboardPage path.
     */
    requireGuest: async function (dashboardPage) {
      dashboardPage = dashboardPage || 'index.html';
      if (!db) return;
      try {
        var res = await db.auth.getSession();
        var session = res.data.session;
        if (session && session.user) {
          window.location.href = dashboardPage;
        }
      } catch (err) {
        // Silently fail — stay on guest page
        console.warn('[App.Auth] requireGuest check failed:', err);
      }
    },

    /**
     * Signs the admin out and redirects to loginPage.
     */
    logout: async function (loginPage) {
      loginPage = loginPage || 'login.html';
      if (!db) {
        window.location.href = loginPage;
        return;
      }
      try {
        await db.auth.signOut();
      } catch (err) {
        console.warn('[App.Auth] Logout error (proceeding anyway):', err);
      }
      window.location.href = loginPage;
    }
  };
})();
