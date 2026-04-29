// dashboard/js/ui.js
// Dashboard-local UI utility module.
// No external dependencies. Provides toast notifications.
'use strict';

window.App = window.App || {};

window.App.UI = (function () {
  function initToastContainer() {
    if (!document.getElementById('app-toast-container')) {
      var container = document.createElement('div');
      container.id = 'app-toast-container';
      container.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        'z-index:10000',
        'display:flex',
        'flex-direction:column',
        'gap:10px',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(container);
    }
    return document.getElementById('app-toast-container');
  }

  var bgColors = {
    error:   '#b91c1c',
    success: '#166534',
    info:    '#3a4a42',
    warning: '#ca8a04'
  };

  return {
    showToast: function (message, type) {
      type = type || 'info';
      var container = initToastContainer();
      var toast = document.createElement('div');
      toast.style.cssText = [
        'background:' + (bgColors[type] || bgColors.info),
        'color:#fff',
        'padding:12px 24px',
        'border-radius:8px',
        "font-family:'Inter',sans-serif",
        'font-size:0.9rem',
        'box-shadow:0 4px 16px rgba(0,0,0,0.18)',
        'opacity:0',
        'transform:translateY(20px)',
        'transition:all 0.3s ease',
        'pointer-events:auto'
      ].join(';');
      toast.textContent = message;
      container.appendChild(toast);

      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(function () { toast.remove(); }, 300);
      }, 3500);
    },

    showError: function (msg) {
      console.error('[App Error]', msg);
      this.showToast(msg, 'error');
    },

    showSuccess: function (msg) {
      this.showToast(msg, 'success');
    }
  };
})();
