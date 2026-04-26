/* ============================================================
   SUPABASE AUTHENTICATION LOGIC
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client is not loaded.");
    return;
  }

  // UI Elements
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const authLoggedIn = document.getElementById('auth-logged-in');
  
  const loginMsg = document.getElementById('login-message');
  const signupMsg = document.getElementById('signup-message');

  // Tab switching
  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      formLogin.classList.add('active');
      formSignup.classList.remove('active');
    });
    
    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      formSignup.classList.add('active');
      formLogin.classList.remove('active');
    });
  }

  // Handle Login
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const btn = formLogin.querySelector('.auth-submit');
      
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      loginMsg.className = 'auth-message';
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        loginMsg.textContent = "Successfully logged in!";
        loginMsg.classList.add('success');
        // Page UI will update via auth listener
        
      } catch (err) {
        loginMsg.textContent = err.message;
        loginMsg.classList.add('error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // Handle Signup
  if (formSignup) {
    formSignup.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const name = document.getElementById('signup-name').value;
      const btn = formSignup.querySelector('.auth-submit');
      
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      signupMsg.className = 'auth-message';
      
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            }
          }
        });
        
        if (error) throw error;
        
        signupMsg.innerHTML = "Account created! <b>Please check your email to confirm your account.</b>";
        signupMsg.classList.add('success');
        formSignup.reset();
        
      } catch (err) {
        signupMsg.textContent = err.message;
        signupMsg.classList.add('error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }

  // Handle Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  }

  // Listen to Auth State Changes to update UI
  supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
  });
  
  // Check initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session);
  });

  function updateAuthUI(session) {
    if (!formLogin || !formSignup || !authLoggedIn) return;
    
    const tabsContainer = document.querySelector('.auth-tabs');
    
    if (session) {
      // User is logged in
      formLogin.classList.remove('active');
      formSignup.classList.remove('active');
      if (tabsContainer) tabsContainer.style.display = 'none';
      
      authLoggedIn.classList.add('active');
      
      const emailDisplay = document.getElementById('account-email-display');
      const nameDisplay = document.getElementById('account-name-display');
      
      if (emailDisplay) emailDisplay.textContent = session.user.email;
      if (nameDisplay && session.user.user_metadata?.full_name) {
        nameDisplay.textContent = `Welcome, ${session.user.user_metadata.full_name}`;
      }
    } else {
      // User is logged out
      if (tabLogin.classList.contains('active')) {
        formLogin.classList.add('active');
      } else {
        formSignup.classList.add('active');
      }
      if (tabsContainer) tabsContainer.style.display = 'flex';
      authLoggedIn.classList.remove('active');
    }
  }
});
