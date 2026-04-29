/* reset-password.js */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const formReset = document.getElementById('form-reset-password');
  const btnUpdate = document.getElementById('btn-update-password');
  const msgEl = document.getElementById('reset-message');
  const newPwdInput = document.getElementById('new-password');
  const confirmPwdInput = document.getElementById('confirm-password');

  if (!window.supabaseClient) {
    window.App.UI.showError('Supabase client not loaded.');
    btnUpdate.disabled = true;
    return;
  }

  // Supabase automatically parses the URL hash (#access_token=...) and establishes a session.
  // Wait briefly to ensure session is initialized.
  const { data: { session }, error: sessionErr } = await window.supabaseClient.auth.getSession();
  
  if (sessionErr || !session) {
    window.App.UI.showError('Invalid or expired password reset link. Please request a new one.');
    btnUpdate.disabled = true;
    return;
  }

  formReset.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = newPwdInput.value;
    const confirmPassword = confirmPwdInput.value;

    if (newPassword.length < 6) {
      window.App.UI.showError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      window.App.UI.showError('Passwords do not match.');
      return;
    }

    const originalText = btnUpdate.innerText;
    btnUpdate.innerText = 'Updating...';
    btnUpdate.disabled = true;

    try {
      const { error } = await window.supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        window.App.UI.showError(error.message);
        btnUpdate.innerText = originalText;
        btnUpdate.disabled = false;
      } else {
        window.App.UI.showSuccess('Password updated successfully!');
        // Sign out to force re-login with new password, or redirect directly
        await window.supabaseClient.auth.signOut();
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      window.App.UI.showError('An unexpected error occurred.');
      btnUpdate.innerText = originalText;
      btnUpdate.disabled = false;
    }
  });
});
