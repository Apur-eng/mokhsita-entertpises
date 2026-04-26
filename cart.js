/* ============================================================
   CART — Supabase-backed with localStorage fallback
   ============================================================ */

'use strict';

// ── Toast Helper ────────────────────────────────────────────
function showCartToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.className = 'cart-toast' + (isError ? ' error' : '');
  toast.innerText = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 2200);
  });
}

// ── Cart Badge Update ────────────────────────────────────────
async function updateCartUI() {
  const db = window.supabaseClient;
  let count = 0;

  if (db) {
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        // Authenticated: read count from Supabase cart_items
        const { data: cartRow } = await db
          .from('carts')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (cartRow) {
          const { data: items, error: itemErr } = await db
            .from('cart_items')
            .select('quantity')
            .eq('cart_id', cartRow.id);
          if (itemErr) console.error('[Cart] Error reading cart_items:', itemErr);
          else count = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        }
      } else {
        // Guest: read from localStorage
        const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
        count = local.reduce((s, i) => s + (i.quantity || 0), 0);
      }
    } catch (err) {
      console.error('[Cart] updateCartUI error:', err);
    }
  } else {
    // No Supabase client — use localStorage only
    const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
    count = local.reduce((s, i) => s + (i.quantity || 0), 0);
  }

  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.innerText = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ── Get or Create Cart (Supabase) ────────────────────────────
async function getOrCreateCart(userId) {
  const db = window.supabaseClient;
  if (!db) throw new Error('Supabase client not available');

  let { data: cart, error } = await db
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Cart] getOrCreateCart select error:', error);
    throw error;
  }

  if (!cart) {
    // No cart yet — create one
    const { data: newCart, error: createErr } = await db
      .from('carts')
      .insert([{ user_id: userId }])
      .select('id')
      .single();

    if (createErr) {
      console.error('[Cart] getOrCreateCart insert error:', createErr);
      throw createErr;
    }
    cart = newCart;
  }

  return cart.id;
}

// ── Add To Cart ──────────────────────────────────────────────
async function addToCart(productId, quantity = 1) {
  const db = window.supabaseClient;

  if (db) {
    try {
      const { data: { session } } = await db.auth.getSession();

      if (session) {
        // ── Authenticated flow: write to Supabase ──
        const cartId = await getOrCreateCart(session.user.id);

        // Check if this product already exists in cart
        const { data: existing, error: findErr } = await db
          .from('cart_items')
          .select('id, quantity')
          .eq('cart_id', cartId)
          .eq('product_id', productId)
          .maybeSingle();

        if (findErr) {
          console.error('[Cart] addToCart find error:', findErr);
          throw findErr;
        }

        if (existing) {
          // Product already in cart — increment quantity
          const { error: updateErr } = await db
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);

          if (updateErr) {
            console.error('[Cart] addToCart update error:', updateErr);
            throw updateErr;
          }
        } else {
          // New item — insert
          const { error: insertErr } = await db
            .from('cart_items')
            .insert([{ cart_id: cartId, product_id: productId, quantity }]);

          if (insertErr) {
            console.error('[Cart] addToCart insert error:', insertErr);
            throw insertErr;
          }
        }

        console.log(`[Cart] Added product ${productId} (qty: ${quantity}) to Supabase cart`);
        showCartToast('Added to Cart!');
        await updateCartUI();
        return;
      }
    } catch (err) {
      console.error('[Cart] Supabase write failed, falling back to localStorage:', err);
      showCartToast('Added to Cart! (offline mode)', false);
    }
  }

  // ── Guest / fallback: use localStorage ──
  const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
  const existing = local.find(i => i.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    local.push({ id: productId, quantity });
  }
  localStorage.setItem('mokshita_cart', JSON.stringify(local));
  showCartToast('Added to Cart!');
  await updateCartUI();
}

// ── Remove From Cart ─────────────────────────────────────────
async function removeFromCart(productId) {
  const db = window.supabaseClient;

  if (db) {
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        const { data: cartRow } = await db
          .from('carts').select('id').eq('user_id', session.user.id).maybeSingle();
        if (cartRow) {
          const { error } = await db
            .from('cart_items')
            .delete()
            .eq('cart_id', cartRow.id)
            .eq('product_id', productId);
          if (error) console.error('[Cart] removeFromCart error:', error);
        }
        await updateCartUI();
        return;
      }
    } catch (err) {
      console.error('[Cart] removeFromCart Supabase error:', err);
    }
  }

  // localStorage fallback
  const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
  localStorage.setItem('mokshita_cart', JSON.stringify(local.filter(i => i.id !== productId)));
  await updateCartUI();
}

// ── Update Quantity ──────────────────────────────────────────
async function updateQuantity(productId, quantity) {
  if (quantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  const db = window.supabaseClient;

  if (db) {
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        const { data: cartRow } = await db
          .from('carts').select('id').eq('user_id', session.user.id).maybeSingle();
        if (cartRow) {
          const { error } = await db
            .from('cart_items')
            .update({ quantity })
            .eq('cart_id', cartRow.id)
            .eq('product_id', productId);
          if (error) console.error('[Cart] updateQuantity error:', error);
        }
        await updateCartUI();
        return;
      }
    } catch (err) {
      console.error('[Cart] updateQuantity Supabase error:', err);
    }
  }

  // localStorage fallback
  const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
  const item = local.find(i => i.id === productId);
  if (item) item.quantity = quantity;
  localStorage.setItem('mokshita_cart', JSON.stringify(local));
  await updateCartUI();
}

window.updateQuantityFallback = async function(productId, change) {
    const db = window.supabaseClient;
    if (db) {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (session) {
                const { data: cartRow } = await db.from('carts').select('id').eq('user_id', session.user.id).maybeSingle();
                if (cartRow) {
                    const { data: existing } = await db.from('cart_items').select('id, quantity').eq('cart_id', cartRow.id).eq('product_id', productId).maybeSingle();
                    if (existing) {
                        const newQty = Math.max(1, existing.quantity + change);
                        await db.from('cart_items').update({ quantity: newQty }).eq('id', existing.id);
                    }
                }
                if(typeof renderCart === 'function') await renderCart();
                await updateCartUI();
                return;
            }
        } catch (err) {
            console.error('[Cart] updateQuantityFallback error:', err);
        }
    }
    const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
    const item = local.find(i => i.id === productId);
    if (item) { item.quantity = Math.max(1, item.quantity + change); }
    localStorage.setItem('mokshita_cart', JSON.stringify(local));
    if(typeof renderCart === 'function') await renderCart();
    await updateCartUI();
}

// ── Checkout: Cart → Orders ──────────────────────────────────
window.checkoutToOrderFull = async function(addressData, paymentMethod, subtotal, shippingCost, totalAmount) {
  const db = window.supabaseClient;
  if (!db) return { error: 'No database connection' };

  const { data: { session } } = await db.auth.getSession();
  let userId = session ? session.user.id : null;
  let cartItems = [];
  let cartId = null;

  if (userId) {
    // Authenticated
    cartId = await getOrCreateCart(userId);
    const { data: items, error: fetchErr } = await db
      .from('cart_items')
      .select('product_id, quantity')
      .eq('cart_id', cartId);
    if (!fetchErr && items) cartItems = items;
  } else {
    // Guest
    const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
    cartItems = local.map(i => ({ product_id: i.id, quantity: i.quantity }));
  }

  if (cartItems.length === 0) {
    return { error: 'Cart is empty' };
  }

  // Fetch prices
  const productIds = cartItems.map(i => String(i.product_id));
  const { data: dbProducts, error: prodErr } = await db
    .from('products')
    .select('id, price, name')
    .in('id', productIds);

  const priceMap = {};
  (dbProducts || []).forEach(p => { priceMap[p.id] = p; });
  (window.products || []).forEach(p => { 
      if(!priceMap[p.id]) priceMap[p.id] = p; 
      if(!priceMap[p.dbId]) priceMap[p.dbId] = p;
  });

  const orderNumber = 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  const addressLine = addressData.address + (addressData.landmark ? ', ' + addressData.landmark : '');

  // Prepare JSON array for order items
  const orderItemsData = cartItems.map(item => ({
    product_id: item.product_id,
    product_name: priceMap[item.product_id]?.name || priceMap[item.product_id]?.title || 'Unknown',
    quantity: item.quantity,
    price: priceMap[item.product_id]?.price || 0
  }));

  // Insert Order
  const orderPayload = {
      user_id: userId,
      order_number: orderNumber,
      customer_name: addressData.name,
      phone: addressData.phone,
      email: addressData.email,
      address_line: addressLine,
      city: addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      country: addressData.country,
      payment_method: paymentMethod,
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total: totalAmount,
      status: 'pending',
      order_items: orderItemsData
  };

  const { data: newOrder, error: orderErr } = await db
    .from('orders')
    .insert([orderPayload])
    .select('id')
    .single();

  if (orderErr) {
    console.error('[Checkout] Error creating order:', orderErr);
    return { error: orderErr.message };
  }

  // Clear cart
  if (userId && cartId) {
    await db.from('cart_items').delete().eq('cart_id', cartId);
  } else {
    localStorage.removeItem('mokshita_cart');
  }

  console.log('[Checkout] Order created:', newOrder.id, '| Total:', totalAmount);
  await updateCartUI();
  return { success: true, orderId: newOrder.id, orderNumber: orderNumber, total: totalAmount };
}

// ── Inject CSS ───────────────────────────────────────────────
const cartStyle = document.createElement('style');
cartStyle.innerHTML = `
.cart-toast {
  position: fixed; bottom: 24px; right: 24px;
  background: #3a4a42; color: #fff;
  padding: 12px 24px; border-radius: 8px;
  font-family: 'Inter', sans-serif; font-size: 0.9rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  transform: translateY(20px); opacity: 0;
  transition: all 0.3s ease; z-index: 10000;
}
.cart-toast.show { transform: translateY(0); opacity: 1; }
.cart-toast.error { background: #b91c1c; }
.nav-cart { position: relative; display: flex; align-items: center; color: var(--text-color, #1a231e); margin-left: 20px; text-decoration: none; }
.cart-badge {
  position: absolute; top: -8px; right: -8px;
  background: #c26a3d; color: #fff;
  width: 18px; height: 18px; border-radius: 50%;
  font-size: 0.7rem; display: flex; align-items: center; justify-content: center;
  font-family: 'Inter', sans-serif; font-weight: bold;
}
`;
document.head.appendChild(cartStyle);

// ── Initialize ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', updateCartUI);
