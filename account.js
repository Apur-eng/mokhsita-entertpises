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
  const user = await window.App.Auth.requireAuth('login.html?redirect=account');
  if (!user) return; // requireAuth handles the redirect

  /* ── Session confirmed — reveal page ─────────────────────── */
  const overlay = document.getElementById('auth-redirect-overlay');
  if (overlay) overlay.classList.add('hidden');

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
      await window.App.Auth.logout('index.html');
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
    ? items.map(i => `${i.quantity}\xd7 ${i.product_name}`).join(', ')
    : (order.notes || '\u2014');

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
          <div class="order-detail-value">${order.payment_method || '\u2014'}</div>
        </div>
        <div>
          <div class="order-detail-label">Ship to</div>
          <div class="order-detail-value">${order.city || '\u2014'}, ${order.state || ''}</div>
        </div>
      </div>
      ${preview !== '\u2014' ? `
        <div class="order-items-preview">
          <strong>Items:</strong> ${preview}
        </div>` : ''}
      ${renderTrackingTimeline(order)}
      ${renderWhatsAppQueryBtn(order, id, preview)}
    </div>`;
}

/* ─── Order Tracking Timeline (Parts 1 & 3) ────────────────── */
function renderTrackingTimeline(order) {
  const status = (order.status || 'pending').toLowerCase();

  // Cancelled — special badge
  if (status === 'cancelled') {
    return `
      <div class="tracking-timeline">
        <div class="tracking-cancelled-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Order Cancelled
        </div>
        ${order.tracking_note ? `<div class="tracking-note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${order.tracking_note}</div>` : ''}
      </div>`;
  }

  // Map legacy statuses to progress stages
  const isReceived  = ['pending', 'received', 'confirmed', 'shipped', 'delivered'].includes(status);
  const isShipped   = ['shipped', 'delivered'].includes(status);
  const isDelivered = status === 'delivered';

  const step = (done, label, date) => `
    <div class="tracking-step${done ? ' done' : ''}">
      <div class="tracking-step-dot">
        ${done ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </div>
      <div class="tracking-step-info">
        <div class="tracking-step-label">${label}</div>
        ${done && date ? `<div class="tracking-step-date">${formatDate(date)}</div>` : ''}
      </div>
    </div>`;

  return `
    <div class="tracking-timeline">
      <div class="tracking-steps">
        ${step(isReceived,  'Order Received', order.created_at)}
        ${step(isShipped,   'Shipped',        order.shipped_at)}
        ${step(isDelivered, 'Delivered',      order.delivered_at)}
      </div>
      ${order.tracking_note ? `<div class="tracking-note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${order.tracking_note}</div>` : ''}
    </div>`;
}

/* ─── WhatsApp Order Query Button ──────────────────────────── */
function renderWhatsAppQueryBtn(order, orderId, itemsPreview) {
  // Build automated message with order details
  const status = (order.status || 'received').charAt(0).toUpperCase() + (order.status || 'received').slice(1);
  const msg = `I have a query about my order #${orderId}.\n\nItems: ${itemsPreview}\nTotal: ${formatCurrency(order.total)}\nStatus: ${status}\n\nPlease update me on this order.`;

  // Use App.WA.buildUrl — it will be personalised with user info when called from the click handler
  return `
    <div class="order-wa-query">
      <a href="#"
         class="order-wa-btn"
         data-wa-msg="${msg.replace(/"/g, '&quot;')}"
         onclick="event.preventDefault(); window.App.WA.open(this.dataset.waMsg);"
         target="_blank"
         rel="noopener noreferrer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.553 4.115 1.516 5.843L.06 23.487a.5.5 0 00.607.607l5.644-1.456A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.94 0-3.749-.57-5.267-1.546l-.378-.232-3.353.866.882-3.354-.24-.384A9.946 9.946 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Query on WhatsApp
      </a>
    </div>`;
}
