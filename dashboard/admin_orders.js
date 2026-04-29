'use strict';

let allOrders = [];

async function loadOrders() {
    const db = window.supabaseClient;
    if (!db) {
        alert("Database connection not found.");
        return;
    }

    const pendingTbody = document.getElementById('pending-orders-tbody');
    const shippedTbody = document.getElementById('shipped-orders-tbody');
    const deliveredTbody = document.getElementById('delivered-orders-tbody');
    
    pendingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading orders...</td></tr>';
    shippedTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading orders...</td></tr>';
    deliveredTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading orders...</td></tr>';

    try {
        const { data: orders, error } = await db
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log('[Admin Dashboard] Fetch Orders Response:', { count: orders ? orders.length : 0, data: orders });
        
        allOrders = orders || [];
        renderOrders();
        updateStats();
    } catch (err) {
        console.error('Error loading orders:', err);
        pendingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load orders. Please check permissions or login.</td></tr>';
        shippedTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load orders. Please check permissions or login.</td></tr>';
        deliveredTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load orders. Please check permissions or login.</td></tr>';
    }
}

function renderOrders() {
    const pendingTbody = document.getElementById('pending-orders-tbody');
    const shippedTbody = document.getElementById('shipped-orders-tbody');
    const deliveredTbody = document.getElementById('delivered-orders-tbody');
    pendingTbody.innerHTML = '';
    shippedTbody.innerHTML = '';
    deliveredTbody.innerHTML = '';

    const pendingOrders = allOrders.filter(o => o.status === 'received' || o.status === 'pending');
    const shippedOrders = allOrders.filter(o => o.status === 'shipped');
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

    if (pendingOrders.length === 0) {
        pendingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No pending orders.</td></tr>';
    } else {
        pendingOrders.forEach(order => pendingTbody.appendChild(createOrderRow(order)));
    }

    if (shippedOrders.length === 0) {
        shippedTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No shipped orders.</td></tr>';
    } else {
        shippedOrders.forEach(order => shippedTbody.appendChild(createOrderRow(order)));
    }

    if (deliveredOrders.length === 0) {
        deliveredTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No completed orders.</td></tr>';
    } else {
        deliveredOrders.forEach(order => deliveredTbody.appendChild(createOrderRow(order)));
    }
}

function createOrderRow(order) {
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td data-label="Order #">#${order.order_number || order.id.slice(0,8).toUpperCase()}</td>
        <td data-label="Date">${date}</td>
        <td data-label="Customer">${order.customer_name}<br><small style="color:#6a7d75">${order.phone}</small></td>
        <td data-label="Total">₹${(order.total || 0).toLocaleString('en-IN')}</td>
        <td data-label="Status">
            <select class="status-dropdown status-${order.status}" onchange="updateOrderStatus('${order.id}', this.value)">
                <option value="received"  ${order.status === 'received' || order.status === 'pending'  ? 'selected' : ''}>Received</option>
                <option value="shipped"   ${order.status === 'shipped'   ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
        </td>
        <td data-label="Actions">
            <button class="action-btn" onclick="viewOrderDetails('${order.id}')">View Details</button>
        </td>
    `;
    return tr;
}

function updateStats() {
    let pending = 0;
    let shipped = 0;
    let completed = 0;

    allOrders.forEach(o => {
        if (o.status === 'pending' || o.status === 'received') pending++;
        if (o.status === 'shipped') shipped++;
        if (o.status === 'delivered' || o.status === 'cancelled') completed++;
    });

    document.getElementById('stat-new').innerText = pending;
    document.getElementById('stat-shipped').innerText = shipped;
    document.getElementById('stat-completed').innerText = completed;
}

// Part 2 — Admin status update with timestamps + tracking note
async function updateOrderStatus(orderId, newStatus) {
    const db = window.supabaseClient;
    try {
        const now = new Date().toISOString();
        const updatePayload = {
            status: newStatus,
            tracking_updated_at: now
        };

        // Set timestamp fields for key status transitions
        if (newStatus === 'shipped')   updatePayload.shipped_at   = now;
        if (newStatus === 'delivered') updatePayload.delivered_at = now;
        // 'cancelled' preserves existing timestamps — no extra field needed

        const { error } = await db.from('orders').update(updatePayload).eq('id', orderId);
        if (error) throw error;

        // Update local state so re-render is immediate
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            order.tracking_updated_at = now;
            if (newStatus === 'shipped')   order.shipped_at   = now;
            if (newStatus === 'delivered') order.delivered_at = now;
        }

        // Re-render so order moves between Pending / History tables
        renderOrders();
        updateStats();

    } catch (err) {
        alert('Failed to update status: ' + err.message);
        loadOrders(); // reload to revert UI
    }
}

// Part 4 — Save tracking note from admin modal
async function saveTrackingNote(orderId) {
    const db = window.supabaseClient;
    const noteInput = document.getElementById('admin-tracking-note-input');
    if (!noteInput) return;
    const note = noteInput.value.trim();

    try {
        const { error } = await db.from('orders')
            .update({ tracking_note: note, tracking_updated_at: new Date().toISOString() })
            .eq('id', orderId);
        if (error) throw error;

        // Update local state
        const order = allOrders.find(o => o.id === orderId);
        if (order) order.tracking_note = note;

        // Visual feedback
        const btn = document.getElementById('admin-tracking-note-btn');
        if (btn) { btn.textContent = 'Saved!'; setTimeout(() => { btn.textContent = 'Save Note'; }, 2000); }
    } catch (err) {
        alert('Failed to save note: ' + err.message);
    }
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('modal-order-id').innerText = `Order #${order.order_number || order.id.slice(0,8).toUpperCase()}`;
    
    let itemsHtml = (order.order_items || []).map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #eee;">
            <span>${item.quantity}x ${item.product_name}</span>
            <span>₹${((item.price_at_time || 0) * item.quantity).toLocaleString('en-IN')}</span>
        </div>
    `).join('');

    const content = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
            <div>
                <h4 style="margin-bottom:8px; color:#c26a3d;">Customer Details</h4>
                <p><strong>Name:</strong> ${order.customer_name}</p>
                <p><strong>Email:</strong> ${order.email}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
            </div>
            <div>
                <h4 style="margin-bottom:8px; color:#c26a3d;">Shipping Address</h4>
                <p>${order.address_line}</p>
                <p>${order.city}, ${order.state}</p>
                <p>${order.country} - ${order.pincode}</p>
            </div>
        </div>
        <div>
            <h4 style="margin-bottom:8px; color:#c26a3d;">Payment Info</h4>
            <p><strong>Method:</strong> ${order.payment_method}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
        </div>
        <div style="margin-top:20px;">
            <h4 style="margin-bottom:12px; color:#c26a3d;">Items</h4>
            ${itemsHtml}
            <div style="margin-top:12px; text-align:right; font-weight:600; font-size:1.1rem;">
                Total: ₹${(order.total || 0).toLocaleString('en-IN')}
            </div>
        </div>
        <div style="margin-top:24px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.08);">
            <h4 style="margin-bottom:10px; color:#c26a3d;">Tracking Note <span style="font-size:0.75rem; color:#6a7d75; font-weight:400;">(visible to customer)</span></h4>
            <textarea
                id="admin-tracking-note-input"
                placeholder="e.g. Dispatched from warehouse, Out for delivery…"
                style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:inherit; font-family:'Inter',sans-serif; font-size:0.875rem; resize:vertical; min-height:70px; outline:none;"
            >${order.tracking_note || ''}</textarea>
            <button
                id="admin-tracking-note-btn"
                onclick="saveTrackingNote('${order.id}')"
                style="margin-top:10px; padding:8px 20px; background:#c26a3d; color:#fff; border:none; border-radius:20px; font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:500; cursor:pointer;"
            >Save Note</button>
        </div>
    `;

    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('order-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadOrders);
