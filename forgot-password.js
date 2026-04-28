/* forgot-password.js */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const formForgot = document.getElementById('form-forgot-password');
  const btnReset = document.getElementById('btn-reset-password');
  const msgEl = document.getElementById('forgot-message');

  const showMsg = (msg, isError = false) => {
    msgEl.innerText = msg;
    msgEl.className = 'auth-message ' + (isError ? 'error' : 'success');
  };

  formForgot.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.supabaseClient) {
      showMsg('Supabase client not loaded.', true);
      return;
    }

    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
      showMsg('Please enter your email.', true);
      return;
    }

    const originalText = btnReset.innerText;
    btnReset.innerText = 'Sending...';
    btnReset.disabled = true;
    showMsg('');

    try {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
      });

      if (error) {
        showMsg(error.message, true);
      } else {
        showMsg('Check your email for reset instructions.');
      }
    } catch (err) {
      console.error(err);
      showMsg('An unexpected error occurred.', true);
    } finally {
      btnReset.innerText = originalText;
      btnReset.disabled = false;
    }
  });
});
