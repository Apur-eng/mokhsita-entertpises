/* ============================================================
   ACCOUNT DASHBOARD — JavaScript
   Mokshita Enterprises — Customer Portal
   ============================================================
   FLOW:
     1. On DOMContentLoaded, check for a live Supabase session.
     2. If no session → redirect to login.html (protected route).
     3. If session  → hide loading overlay, render profile, 
                      fetch & display this user's orders via RLS.
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;

  /* ── Auth Guard ───────────────────────────────────────────── */
  if (!supabase) {
    console.error('[Account] Supabase client not loaded.');
    window.location.href = 'login.html';
    return;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (!session || sessionError) {
    // No valid session — redirect to login
    window.location.replace('login.html?redirect=account');
    return;
  }

  /* ── Session confirmed — reveal page ─────────────────────── */
  const overlay = document.getElementById('auth-redirect-overlay');
  if (overlay) overlay.classList.add('hidden');

  const user = session.user;
  const fullName  = user.user_metadata?.full_name || '';
  const email     = user.email || '';
  const firstLetter = (fullName || email).charAt(0).toUpperCase();

  /* ── Populate Hero ────────────────────────────────────────── */
  setTextContent('hero-avatar',    firstLetter);
  setTextContent('hero-name',      fullName  || 'Welcome back');
  setTextContent('hero-email',     email);

  /* ── Populate Profile Panel ───────────────────────────────── */
  setTextContent('profile-name',   fullName  || '—');
  setTextContent('profile-email',  email);
  setTextContent('profile-uid',    user.id ? user.id.slice(0, 8).toUpperCase() + '…' : '—');

  // Member since
  const since = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
    : '—';
  setTextContent('profile-since', `Member since ${since}`);

  /* ── Populate Addresses Panel ─────────────────────────────── */
  const addressPanel = document.getElementById('panel-addresses');
  if (addressPanel) {
    const meta = user.user_metadata || {};
    if (meta.address_line) {
      addressPanel.innerHTML = `
        <h2 class="panel-title">Saved Addresses</h2>
        <p class="panel-subtitle">Manage your delivery addresses for faster checkout.</p>
        <div style="background: #FFFFFF; border: 1px solid #DDD4C8; border-radius: 12px; padding: 24px; margin-top: 24px; position: relative;">
          <div style="position: absolute; top: 24px; right: 24px; display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; background: #eef3f0; color: #2f5d50; padding: 4px 10px; border-radius: 20px; font-weight: 500;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Default
          </div>
          <h3 style="font-family: 'Lora', serif; font-size: 1.3rem; margin-bottom: 12px; color: #1F1F1F;">${meta.full_name || fullName || 'Saved Address'}</h3>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #4a544e;">
            ${meta.address_line}<br>
            ${meta.city || ''}${meta.state ? ', ' + meta.state : ''} ${meta.pincode ? ' - ' + meta.pincode : ''}<br>
            ${meta.country || ''}<br><br>
            <strong>Phone:</strong> ${meta.phone || '—'}
          </p>
        </div>
      `;
    }
  }

  /* ── Logout ───────────────────────────────────────────────── */
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Signing out…';
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    });
  }

  /* ── Tab Navigation ───────────────────────────────────────── */
  const navItems = document.querySelectorAll('.account-nav-item');
  const panels   = document.querySelectorAll('.account-panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.panel;
      navItems.forEach(n => n.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`panel-${target}`)?.classList.add('active');
    });
  });

  /* ── Load Orders ──────────────────────────────────────────── */
  await loadOrders(supabase, user);
});

/* ─── Helpers ─────────────────────────────────────────────── */
function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function formatCurrency(amount) {
  return '₹' + (amount || 0).toLocaleString('en-IN');
}

function statusBadge(status) {
  return `<span class="order-status-badge status-${status}">${status}</span>`;
}

/* ─── Order Fetching & Rendering ──────────────────────────── */
async function loadOrders(supabase, user) {
  const container = document.getElementById('orders-container');
  if (!container) return;

  // Show skeleton while loading
  container.innerHTML = `
    <div class="orders-skeleton">
      ${[1,2,3].map(() => `
        <div class="skeleton-card">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line med"></div>
          <div class="skeleton-line full"></div>
          <div class="skeleton-line med"></div>
        </div>
      `).join('')}
    </div>`;

  try {
    /* RLS on the orders table ensures only the logged-in user's
       rows are returned — we filter by email as the match key,
       since orders are recorded with the customer's email.
       If your orders table has a user_id FK, also add:
         .eq('user_id', user.id)  */
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h3>No orders found</h3>
          <p>When you place your first order, it will appear here. Start exploring our collection.</p>
          <a href="handicrafts.html" class="btn btn-primary">Explore Collection</a>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="orders-list">${orders.map(order => renderOrderCard(order)).join('')}</div>`;

    // Fallback: if user_metadata is empty but they have orders, populate from the latest order
    const meta = user.user_metadata || {};
    if (!meta.address_line && orders.length > 0) {
      const latestOrder = orders[0];
      const addressPanel = document.getElementById('panel-addresses');
      if (addressPanel && latestOrder.address_line) {
        addressPanel.innerHTML = `
          <h2 class="panel-title">Saved Addresses</h2>
          <p class="panel-subtitle">Manage your delivery addresses for faster checkout.</p>
          <div style="background: #FFFFFF; border: 1px solid #DDD4C8; border-radius: 12px; padding: 24px; margin-top: 24px; position: relative;">
            <div style="position: absolute; top: 24px; right: 24px; display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; background: #eef3f0; color: #2f5d50; padding: 4px 10px; border-radius: 20px; font-weight: 500;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Default
            </div>
            <h3 style="font-family: 'Lora', serif; font-size: 1.3rem; margin-bottom: 12px; color: #1F1F1F;">${latestOrder.customer_name || 'Saved Address'}</h3>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #4a544e;">
              ${latestOrder.address_line}<br>
              ${latestOrder.city || ''}${latestOrder.state ? ', ' + latestOrder.state : ''} ${latestOrder.pincode ? ' - ' + latestOrder.pincode : ''}<br>
              ${latestOrder.country || ''}<br><br>
              <strong>Phone:</strong> ${latestOrder.phone || '—'}
            </p>
          </div>
        `;
      }
      // Also update Hero Name if missing
      const heroName = document.getElementById('hero-name');
      if (heroName && (heroName.textContent === 'Welcome back' || heroName.textContent === '')) {
         heroName.textContent = latestOrder.customer_name || 'Welcome back';
         setTextContent('profile-name', latestOrder.customer_name || '—');
         const firstL = (latestOrder.customer_name || user.email || 'A').charAt(0).toUpperCase();
         setTextContent('hero-avatar', firstL);
      }
    }

  } catch (err) {
    console.error('[Account] Order fetch error:', err);
    let errorMessage = err.message || 'Please try refreshing the page.';
    
    // Check for RLS permission error (code 42501 or message containing policy/permission)
    if (err.code === '42501' || errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('policy')) {
      errorMessage = 'Order access policy misconfigured';
    }

    container.innerHTML = `
      <div class="orders-empty">
        <div class="orders-empty-icon" style="background:var(--terra-pale);color:var(--terra);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>Couldn't load orders</h3>
        <p>${errorMessage}</p>
      </div>`;
  }
}

function renderOrderCard(order) {
  const id      = order.order_number || order.id.slice(0, 8).toUpperCase();
  const items   = order.order_items || [];
  const preview = items.length
    ? items.map(i => `${i.quantity}× ${i.product_name}`).join(', ')
    : (order.notes || '—');

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-number">Order #${id}</div>
          <div class="order-date">${formatDate(order.created_at)}</div>
        </div>
        ${statusBadge(order.status || 'pending')}
      </div>
      <div class="order-card-body">
        <div>
          <div class="order-detail-label">Total</div>
          <div class="order-detail-value">${formatCurrency(order.total)}</div>
        </div>
        <div>
          <div class="order-detail-label">Payment</div>
          <div class="order-detail-value">${order.payment_method || '—'}</div>
        </div>
        <div>
          <div class="order-detail-label">Ship to</div>
          <div class="order-detail-value">${order.city || '—'}, ${order.state || ''}</div>
        </div>
      </div>
      ${preview !== '—' ? `
        <div class="order-items-preview">
          <strong>Items:</strong> ${preview}
        </div>` : ''}
    </div>`;
}
