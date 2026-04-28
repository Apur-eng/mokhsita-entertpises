/* reset-password.js */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const formReset = document.getElementById('form-reset-password');
  const btnUpdate = document.getElementById('btn-update-password');
  const msgEl = document.getElementById('reset-message');
  const newPwdInput = document.getElementById('new-password');
  const confirmPwdInput = document.getElementById('confirm-password');

  const showMsg = (msg, isError = false) => {
    msgEl.innerText = msg;
    msgEl.className = 'auth-message ' + (isError ? 'error' : 'success');
  };

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'cart-toast success';
    toast.innerText = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      }, 2200);
    });
  };

  if (!window.supabaseClient) {
    showMsg('Supabase client not loaded.', true);
    btnUpdate.disabled = true;
    return;
  }

  // Supabase automatically parses the URL hash (#access_token=...) and establishes a session.
  // Wait briefly to ensure session is initialized.
  const { data: { session }, error: sessionErr } = await window.supabaseClient.auth.getSession();
  
  if (sessionErr || !session) {
    showMsg('Invalid or expired password reset link. Please request a new one.', true);
    btnUpdate.disabled = true;
    return;
  }

  formReset.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = newPwdInput.value;
    const confirmPassword = confirmPwdInput.value;

    if (newPassword.length < 6) {
      showMsg('Password must be at least 6 characters long.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showMsg('Passwords do not match.', true);
      return;
    }

    const originalText = btnUpdate.innerText;
    btnUpdate.innerText = 'Updating...';
    btnUpdate.disabled = true;
    showMsg('');

    try {
      const { error } = await window.supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showMsg(error.message, true);
        btnUpdate.innerText = originalText;
        btnUpdate.disabled = false;
      } else {
        showToast('Password updated successfully!');
        // Sign out to force re-login with new password, or redirect directly
        await window.supabaseClient.auth.signOut();
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      showMsg('An unexpected error occurred.', true);
      btnUpdate.innerText = originalText;
      btnUpdate.disabled = false;
    }
  });
});
