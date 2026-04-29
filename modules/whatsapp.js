// modules/whatsapp.js
// Centralised WhatsApp URL builder.
// Reads the logged-in user from App.Auth and personalises the pre-filled message.
// Usage:  App.WA.open('Your base message here')
//         App.WA.personalise(anchorEl, 'Your base message here')

'use strict';

window.App = window.App || {};

window.App.WA = (function () {
    const PHONE = '918871872924'; // Mokshita WhatsApp number (with country code, no +)

    /**
     * Build a wa.me URL with the message personalised with user info if logged in.
     * @param {string} baseMessage  – plain-text message (not encoded)
     * @param {object|null} user    – Supabase user object or null for guests
     * @returns {string} Full wa.me URL
     */
    function buildUrl(baseMessage, user) {
        let message = baseMessage;

        if (user) {
            const name  = user.user_metadata?.full_name || '';
            const email = user.email || '';
            const intro = name
                ? `Hi, I'm ${name} (${email}).`
                : `Hi, I'm ${email}.`;
            message = `${intro} ${baseMessage}`;
        }

        return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
    }

    /**
     * Personalise an existing anchor element's href in-place.
     * Safe to call before the session is resolved — it will update the href async.
     * @param {HTMLAnchorElement} el    – the <a> tag to update
     * @param {string} baseMessage      – base message text
     */
    async function personalise(el, baseMessage) {
        if (!el) return;

        // Set a sensible default immediately (for guests / slow loads)
        el.href = buildUrl(baseMessage, null);

        try {
            if (window.App && window.App.Auth) {
                const { session } = await window.App.Auth.getCurrentUser();
                if (session) {
                    el.href = buildUrl(baseMessage, session.user);
                }
            }
        } catch (e) {
            // Silent — guest href already set
        }
    }

    /**
     * Directly open WhatsApp in a new tab with a personalised message.
     * @param {string} baseMessage
     */
    async function open(baseMessage) {
        let user = null;
        try {
            if (window.App && window.App.Auth) {
                const { session } = await window.App.Auth.getCurrentUser();
                if (session) user = session.user;
            }
        } catch (e) { /* silent */ }
        window.open(buildUrl(baseMessage, user), '_blank', 'noopener,noreferrer');
    }

    return { buildUrl, personalise, open };
})();
