/* ============================================================
   CART — Supabase-backed with localStorage fallback
   ============================================================ */

'use strict';

// ── Toast Helper (Removed) ──
// Handled by App.UI

// ── Cart Badge Update ────────────────────────────────────────
async function updateCartUI() {
  const db = window.supabaseClient;
  let count = 0;

  if (db) {
    try {
      const { session } = await window.App.Auth.getCurrentUser();
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

// ── Sync Guest Cart ──────────────────────────────────────────
async function syncGuestCart() {
  const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
  if (!local || local.length === 0) return;

  const db = window.supabaseClient;
  if (!db) return;

  const { session } = await window.App.Auth.getCurrentUser();
  if (!session) return;

  try {
    const cartId = await getOrCreateCart(session.user.id);
    
    // For each local item, add/update in Supabase
    for (const item of local) {
      let actualProductId = item.id;
      if (typeof actualProductId === 'string' && actualProductId.includes(':')) {
        actualProductId = actualProductId.split(':')[0];
      }
      const productData = (window.products || []).find(p => p.id === actualProductId || p.dbId === actualProductId);
      if (productData && productData.dbId) {
        actualProductId = productData.dbId;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(actualProductId)) {
        console.error('[Cart] Skipping guest cart sync for non-UUID product:', actualProductId);
        continue;
      }

      const { data: existing } = await db
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', actualProductId)
        .maybeSingle();

      if (existing) {
        await db.from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);
      } else {
        const { error: insertErr } = await db.from('cart_items')
          .insert([{ cart_id: cartId, product_id: actualProductId, quantity: item.quantity }]);
          
        if (insertErr) {
          if (insertErr.code === '23505') {
            const { data: retryExisting } = await db.from('cart_items')
              .select('id, quantity').eq('cart_id', cartId).eq('product_id', actualProductId).maybeSingle();
            if (retryExisting) {
              await db.from('cart_items')
                .update({ quantity: retryExisting.quantity + item.quantity })
                .eq('id', retryExisting.id);
            }
          } else {
             console.error('[Cart] syncGuestCart insert error:', insertErr);
          }
        }
      }
    }

    // Clear local cart after successful sync
    localStorage.removeItem('mokshita_cart');
    await updateCartUI();
  } catch (err) {
    console.error('[Cart] Sync error:', err);
  }
}
window.syncGuestCart = syncGuestCart;

// ── Add To Cart ──────────────────────────────────────────────
async function addToCart(productId, quantity = 1) {
  const db = window.supabaseClient;

  if (db) {
    try {
      const { session } = await window.App.Auth.getCurrentUser();

      if (session) {
        // ── Authenticated flow: write to Supabase ──
        let actualProductId = productId;
        if (typeof actualProductId === 'string' && actualProductId.includes(':')) {
            actualProductId = actualProductId.split(':')[0];
        }
        const productData = (window.products || []).find(p => p.id === actualProductId || p.dbId === actualProductId);
        if (productData && productData.dbId) {
            actualProductId = productData.dbId;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(actualProductId)) {
            console.error('[Cart] Cannot add to cart, actualProductId is not a UUID:', actualProductId);
            window.App.UI.showError('Error adding to cart. Product data invalid.');
            return;
        }

        const cartId = await getOrCreateCart(session.user.id);

        // Check if this product already exists in cart
        const { data: existing, error: findErr } = await db
          .from('cart_items')
          .select('id, quantity')
          .eq('cart_id', cartId)
          .eq('product_id', actualProductId)
          .maybeSingle();

        if (findErr) throw findErr;

        if (existing) {
          // Product already in cart — increment quantity
          const { error: updateErr } = await db
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
          if (updateErr) throw updateErr;
        } else {
          // New item — insert
          const { error: insertErr } = await db
            .from('cart_items')
            .insert([{ cart_id: cartId, product_id: actualProductId, quantity }]);
          
          if (insertErr) {
            if (insertErr.code === '23505') {
              // Concurrency/Race Condition: It was just inserted by another click
              const { data: retryExisting } = await db
                .from('cart_items')
                .select('id, quantity')
                .eq('cart_id', cartId)
                .eq('product_id', actualProductId)
                .maybeSingle();
              if (retryExisting) {
                const { error: retryUpdateErr } = await db
                  .from('cart_items')
                  .update({ quantity: retryExisting.quantity + quantity })
                  .eq('id', retryExisting.id);
                if (retryUpdateErr) throw retryUpdateErr;
              }
            } else {
              throw insertErr;
            }
          }
        }

        console.log(`[Cart] Added product ${actualProductId} (qty: ${quantity}) to Supabase cart`);
        window.App.UI.showSuccess('Added to Cart!');
        await updateCartUI();
        if (typeof renderCart === 'function') await renderCart();
        return;
      }
    } catch (err) {
      console.error('[Cart] Authenticated cart error:', err);
      window.App.UI.showError('Error adding to cart. Please try again.');
      return; // Do not fall back to local storage if authenticated request fails
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
  window.App.UI.showSuccess('Added to Cart!');
  await updateCartUI();
}

// ── Remove From Cart ─────────────────────────────────────────
async function removeFromCart(productId) {
  const db = window.supabaseClient;

  if (db) {
    try {
      const { session } = await window.App.Auth.getCurrentUser();
      if (session) {
        let actualProductId = productId;
        if (typeof actualProductId === 'string' && actualProductId.includes(':')) {
          actualProductId = actualProductId.split(':')[0];
        }
        const productData = (window.products || []).find(p => p.id === actualProductId || p.dbId === actualProductId);
        if (productData && productData.dbId) actualProductId = productData.dbId;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(actualProductId)) {
          const { data: cartRow } = await db
            .from('carts').select('id').eq('user_id', session.user.id).maybeSingle();
          if (cartRow) {
            const { error } = await db
              .from('cart_items')
              .delete()
              .eq('cart_id', cartRow.id)
              .eq('product_id', actualProductId);
            if (error) console.error('[Cart] removeFromCart error:', error);
          }
        } else {
          console.error('[Cart] removeFromCart: invalid UUID', actualProductId);
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
      const { session } = await window.App.Auth.getCurrentUser();
      if (session) {
        let actualProductId = productId;
        if (typeof actualProductId === 'string' && actualProductId.includes(':')) {
          actualProductId = actualProductId.split(':')[0];
        }
        const productData = (window.products || []).find(p => p.id === actualProductId || p.dbId === actualProductId);
        if (productData && productData.dbId) actualProductId = productData.dbId;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(actualProductId)) {
          const { data: cartRow } = await db
            .from('carts').select('id').eq('user_id', session.user.id).maybeSingle();
          if (cartRow) {
            const { error } = await db
              .from('cart_items')
              .update({ quantity })
              .eq('cart_id', cartRow.id)
              .eq('product_id', actualProductId);
            if (error) console.error('[Cart] updateQuantity error:', error);
          }
        } else {
          console.error('[Cart] updateQuantity: invalid UUID', actualProductId);
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
            const { session } = await window.App.Auth.getCurrentUser();
            if (session) {
                let actualProductId = productId;
                if (typeof actualProductId === 'string' && actualProductId.includes(':')) {
                    actualProductId = actualProductId.split(':')[0];
                }
                const productData = (window.products || []).find(p => p.id === actualProductId || p.dbId === actualProductId);
                if (productData && productData.dbId) actualProductId = productData.dbId;

                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(actualProductId)) {
                    const { data: cartRow } = await db.from('carts').select('id').eq('user_id', session.user.id).maybeSingle();
                    if (cartRow) {
                        const { data: existing } = await db.from('cart_items').select('id, quantity').eq('cart_id', cartRow.id).eq('product_id', actualProductId).maybeSingle();
                        if (existing) {
                            const newQty = Math.max(1, existing.quantity + change);
                            await db.from('cart_items').update({ quantity: newQty }).eq('id', existing.id);
                        }
                    }
                } else {
                    console.error('[Cart] updateQuantityFallback: invalid UUID', actualProductId);
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
  // --- ANTI-SPAM & RATE LIMITING ---
  const lastOrderTime = localStorage.getItem('mokshita_last_order');
  const now = Date.now();
  if (lastOrderTime && now - parseInt(lastOrderTime) < 60000) { // 1 min limit
    return { error: 'Please wait a minute before placing another order.' };
  }
  if (addressData.honeypot) {
    return { error: 'Spam detected.' };
  }

  // --- STRICT INPUT VALIDATION ---
  if (!addressData.name || addressData.name.trim().length < 2) return { error: 'Please enter a valid name.' };
  if (!addressData.phone || !/^[0-9\s\+\-]{10,15}$/.test(addressData.phone)) return { error: 'Please enter a valid phone number.' };
  if (!addressData.pincode || !/^[0-9]{5,6}$/.test(addressData.pincode)) return { error: 'Please enter a valid 5 or 6 digit pincode.' };
  
  const db = window.supabaseClient;
  if (!db) return { error: 'No database connection' };

  const { session } = await window.App.Auth.getCurrentUser();
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

  // Recalculate true prices from DB and detect genuine per-item price changes
  let dbSubtotal = 0;
  let priceMismatch = false;
  let missingProducts = false;

  const orderItemsData = cartItems.map(item => {
    const p = priceMap[item.product_id];
    if (!p) {
      missingProducts = true;
      return null;
    }
    const dbPrice = p.price || 0;
    dbSubtotal += dbPrice * item.quantity;
    return {
      product_id:    item.product_id,
      product_name:  p.name || p.title || 'Unknown', // stored for notes; not a DB column
      quantity:      item.quantity,
      price_at_time: dbPrice                          // correct schema column
    };
  }).filter(Boolean);

  if (missingProducts) {
    return { error: 'One or more products in your cart could not be found. Please refresh and try again.' };
  }

  // The UI passed shippingCost, we accept it as calculated by the UI rules
  const dbTotalAmount = dbSubtotal + shippingCost;

  // clientTotal = what the UI displayed as grand total (subtotal + shipping)
  console.log({
    clientSubtotal: subtotal,
    clientTotal: subtotal + shippingCost,   // grand total as shown to user
    serverSubtotal: dbSubtotal,
    serverTotal: dbTotalAmount,
    shipping: shippingCost
  });

  // Only flag a price mismatch if the difference in SUBTOTAL exceeds ₹1.
  // This excludes shipping logic from the product price validation.
  if (Math.abs(dbSubtotal - subtotal) > 1) {
      // Update local storage to fix UI prices for guest
      if (!userId) {
          const local = JSON.parse(localStorage.getItem('mokshita_cart') || '[]');
          const updatedLocal = local.map(i => {
              const p = priceMap[i.id];
              if (p) i.price = p.price;
              return i;
          });
          localStorage.setItem('mokshita_cart', JSON.stringify(updatedLocal));
          if (typeof renderCart === 'function') renderCart();
      }
      return { error: 'Prices have been updated in the database. Your cart totals have been refreshed. Please review and try checkout again.' };
  }

  const orderNumber = 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  const addressLine = addressData.address + (addressData.landmark ? ', ' + addressData.landmark : '');

  // Build the items snapshot — stored as JSONB in the orders row.
  // This is how account.js and admin_orders.js read order items (via select('*') on orders).
  const orderItemsSnapshot = orderItemsData.map(item => ({
      product_id:   item.product_id,
      product_name: item.product_name,
      quantity:     item.quantity,
      price:        item.price_at_time   // column name in orders.order_items JSONB
  }));

  const orderPayload = {
      user_id:       userId,
      order_number:  orderNumber,
      customer_name: addressData.name,
      phone:         addressData.phone,
      email:         addressData.email,
      address_line:  addressLine,
      city:          addressData.city,
      state:         addressData.state,
      pincode:       addressData.pincode,
      country:       addressData.country,
      payment_method: paymentMethod,
      subtotal:      dbSubtotal,
      shipping_cost: shippingCost, // Fix: use the accepted shipping cost
      total:         dbTotalAmount,
      status:        'received',        // 'pending' not in orders_status_check constraint
      order_items:   orderItemsSnapshot   // JSONB — read by account.js & admin_orders.js
  };

  console.log('[Checkout] Insert Payload:', orderPayload);

  // Issue 2 Fix: Use .select() instead of .single() so RLS doesn't crash guest checkouts (PGRST116)
  const { data: newOrderData, error: orderErr } = await db
    .from('orders')
    .insert([orderPayload])
    .select();

  console.log('[Checkout] Insert Response:', { data: newOrderData, error: orderErr });

  if (orderErr) {
    console.error('[Checkout] Error creating order:', orderErr);
    return { error: orderErr.message };
  }

  // Handle RLS hiding the returned row for guest users
  const newOrderId = newOrderData && newOrderData.length > 0 ? newOrderData[0].id : orderNumber;

  // Best-effort: also write to relational order_items table if it exists.
  // This does NOT block order completion — failure here is non-fatal.
  try {
    const relationalItems = orderItemsData.map(item => ({
        order_id:      newOrderId,
        product_id:    item.product_id,
        quantity:      item.quantity,
        price_at_time: item.price_at_time
    }));
    const { error: itemsErr } = await db.from('order_items').insert(relationalItems);
    if (itemsErr) {
      // Log but do not block — order is already saved with JSONB items
      console.warn('[Checkout] Relational order_items insert skipped:', itemsErr.message);
    }
  } catch (e) {
    console.warn('[Checkout] Relational order_items insert error (non-fatal):', e);
  }

  // Update user profile metadata
  if (userId) {
    try {
      await db.auth.updateUser({
        data: {
          full_name: addressData.name,
          address_line: addressLine,
          city: addressData.city,
          state: addressData.state,
          pincode: addressData.pincode,
          country: addressData.country,
          phone: addressData.phone
        }
      });
    } catch (e) {
      console.warn('[Checkout] Could not update user profile metadata:', e);
    }
  }

  // Clear cart
  if (userId && cartId) {
    await db.from('cart_items').delete().eq('cart_id', cartId);
  } else {
    localStorage.removeItem('mokshita_cart');
  }

  console.log('[Checkout] Order created:', newOrderId, '| Total:', totalAmount);
  localStorage.setItem('mokshita_last_order', Date.now().toString());
  await updateCartUI();
  return { success: true, orderId: newOrderId, orderNumber: orderNumber, total: totalAmount };
}

// ── Inject CSS ───────────────────────────────────────────────
const cartStyle = document.createElement('style');
cartStyle.innerHTML = `
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
