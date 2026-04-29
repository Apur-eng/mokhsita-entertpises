// modules/ui.js
'use strict';

window.App = window.App || {};

window.App.UI = (function() {
    // Inject a generic toast container if it doesn't exist
    function initToastContainer() {
        if (!document.getElementById('app-toast-container')) {
            const container = document.createElement('div');
            container.id = 'app-toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return document.getElementById('app-toast-container');
    }

    return {
        showToast: function(message, type = 'info') {
            const container = initToastContainer();
            const toast = document.createElement('div');
            
            const bgColors = {
                'error': '#b91c1c',
                'success': '#166534',
                'info': '#3a4a42',
                'warning': '#ca8a04'
            };
            
            toast.style.cssText = `
                background: ${bgColors[type] || bgColors['info']};
                color: #fff;
                padding: 12px 24px;
                border-radius: 8px;
                font-family: 'Inter', sans-serif;
                font-size: 0.9rem;
                box-shadow: 0 4px 16px rgba(0,0,0,0.18);
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                pointer-events: auto;
            `;
            toast.textContent = message;
            
            container.appendChild(toast);
            
            // Trigger animation
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });
            
            // Remove after 3.5 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(20px)';
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        },
        showError: function(msg) {
            console.error('[App Error]', msg);
            this.showToast(msg, 'error');
        },
        showSuccess: function(msg) {
            this.showToast(msg, 'success');
        }
    };
})();
