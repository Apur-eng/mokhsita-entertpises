/* forgot-password.js */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const formForgot = document.getElementById('form-forgot-password');
  const btnReset = document.getElementById('btn-reset-password');
  const msgEl = document.getElementById('forgot-message');

  formForgot.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.supabaseClient) {
      window.App.UI.showError('Supabase client not loaded.');
      return;
    }

    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
      window.App.UI.showError('Please enter your email.');
      return;
    }

    const originalText = btnReset.innerText;
    btnReset.innerText = 'Sending...';
    btnReset.disabled = true;

    try {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
      });

      if (error) {
        window.App.UI.showError(error.message);
      } else {
        window.App.UI.showSuccess('Check your email for reset instructions.');
      }
    } catch (err) {
      console.error(err);
      window.App.UI.showError('An unexpected error occurred.');
    } finally {
      btnReset.innerText = originalText;
      btnReset.disabled = false;
    }
  });
});
