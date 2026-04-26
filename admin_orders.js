'use strict';

let allOrders = [];

async function loadOrders() {
    const db = window.supabaseClient;
    if (!db) {
        alert("Database connection not found.");
        return;
    }

    const pendingTbody = document.getElementById('pending-orders-tbody');
    const historyTbody = document.getElementById('history-orders-tbody');
    
    pendingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading orders...</td></tr>';
    historyTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading orders...</td></tr>';

    try {
        const { data: orders, error } = await db
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allOrders = orders || [];
        renderOrders();
        updateStats();
    } catch (err) {
        console.error('Error loading orders:', err);
        pendingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load orders. Please check permissions or login.</td></tr>';
        historyTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load orders. Please check permissions or login.</td></tr>';
    }
}

function renderOrders() {
    const pendingTbody = document.getElementById('pending-orders-tbody');
    const historyTbody = document.getElementById('history-orders-tbody');
    pendingTbody.innerHTML = '';
    historyTbody.innerHTML = '';

    const pendingOrders = allOrders.filter(o => o.status === 'pending');
    const historyOrders = allOrders.filter(o => o.status !== 'pending');

    if (pendingOrders.length === 0) {
        pendingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No pending orders.</td></tr>';
    } else {
        pendingOrders.forEach(order => pendingTbody.appendChild(createOrderRow(order)));
    }

    if (historyOrders.length === 0) {
        historyTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No order history.</td></tr>';
    } else {
        historyOrders.forEach(order => historyTbody.appendChild(createOrderRow(order)));
    }
}

function createOrderRow(order) {
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>#${order.order_number || order.id.slice(0,8).toUpperCase()}</td>
        <td>${date}</td>
        <td>${order.customer_name}<br><small style="color:#6a7d75">${order.phone}</small></td>
        <td>₹${(order.total || 0).toLocaleString('en-IN')}</td>
        <td>
            <select class="status-dropdown status-${order.status}" onchange="updateOrderStatus('${order.id}', this.value)">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
        </td>
        <td>
            <button class="action-btn" onclick="viewOrderDetails('${order.id}')">View Details</button>
        </td>
    `;
    return tr;
}

function updateStats() {
    let pending = 0;
    let shipped = 0;
    let revenue = 0;

    allOrders.forEach(o => {
        if (o.status === 'pending') pending++;
        if (o.status === 'shipped' || o.status === 'delivered') shipped++;
        if (o.status !== 'cancelled' && o.status !== 'pending') revenue += (o.total || 0); // Exclude pending from confirmed revenue or include it? Keep original logic: o.status === 'confirmed' also included before. Let's just do all non-cancelled.
        if (o.status === 'pending') revenue += (o.total || 0); // Keep original logic where we just sum all non-cancelled.
    });

    document.getElementById('stat-new').innerText = pending;
    document.getElementById('stat-shipped').innerText = shipped;
    document.getElementById('stat-revenue').innerText = '₹' + revenue.toLocaleString('en-IN');
}

async function updateOrderStatus(orderId, newStatus) {
    const db = window.supabaseClient;
    try {
        const { error } = await db.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) throw error;
        
        // Update local state
        const order = allOrders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        
        // Re-render entirely so order moves between tables
        renderOrders();
        updateStats();
        
    } catch (err) {
        alert('Failed to update status: ' + err.message);
        loadOrders(); // reload to revert
    }
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('modal-order-id').innerText = `Order #${order.order_number || order.id.slice(0,8).toUpperCase()}`;
    
    let itemsHtml = (order.order_items || []).map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #eee;">
            <span>${item.quantity}x ${item.product_name}</span>
            <span>₹${((item.price || 0) * item.quantity).toLocaleString('en-IN')}</span>
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
    `;

    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('order-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadOrders);
