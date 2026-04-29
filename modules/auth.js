// modules/auth.js
'use strict';

window.App = window.App || {};

window.App.Auth = (function() {
    // Runtime dependency check
    if (!window.supabaseClient) {
        console.error('[App.Auth] ERROR: supabaseClient is missing. Ensure supabaseClient.js is loaded before modules/auth.js.');
        if (window.App.UI) window.App.UI.showError('Critical Error: Database client missing.');
    }

    const db = window.supabaseClient;

    return {
        /**
         * Fetch current session/user. Returns { session, user, error }
         */
        getCurrentUser: async function() {
            if (!db) return { error: 'Database not initialized' };
            try {
                const { data: { session }, error } = await db.auth.getSession();
                return { session, user: session ? session.user : null, error };
            } catch (err) {
                return { error: err };
            }
        },

        /**
         * Protect a route. Redirects if not logged in.
         * @param {string} redirectUrl - where to send guest users
         */
        requireAuth: async function(redirectUrl = 'login.html') {
            const { session, error } = await this.getCurrentUser();
            if (error || !session) {
                window.location.replace(redirectUrl);
                return null;
            }
            return session.user;
        },

        /**
         * Protect a guest route (e.g. login). Redirects if ALREADY logged in.
         * @param {string} redirectUrl - where to send logged-in users
         */
        requireGuest: async function(redirectUrl = 'account.html') {
            const { session } = await this.getCurrentUser();
            if (session) {
                window.location.replace(redirectUrl);
                return null;
            }
            return true;
        },

        logout: async function(redirectUrl = 'index.html') {
            if (!db) return;
            await db.auth.signOut();
            if (redirectUrl) {
                window.location.replace(redirectUrl);
            }
        }
    };
})();
