/* ============================================================
   INDIA ART & JOURNEYS — SHARED JAVASCRIPT
   Nav scroll effects, reveal animations, mobile menu
   ============================================================ */

'use strict';

/* ─── PAGE LOADER ────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 600);
  }
});

/* ─── NAV SCROLL BEHAVIOR ────────────────────────────────── */
const nav = document.getElementById('main-nav');
const SCROLL_THRESHOLD = 60;

function updateNav() {
  if (window.scrollY > SCROLL_THRESHOLD) {
    nav?.classList.add('scrolled');
  } else {
    nav?.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ─── MOBILE MENU ────────────────────────────────────────── */
const hamburger = document.getElementById('nav-hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
  // Animate hamburger
  const spans = hamburger.querySelectorAll('span');
  if (mobileMenu?.classList.contains('open')) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});

// Close mobile menu on link click
document.querySelectorAll('.mobile-menu .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu?.classList.remove('open');
    const spans = hamburger?.querySelectorAll('span');
    spans?.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});

/* ─── REVEAL ON SCROLL (IntersectionObserver) ────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ─── PARALLAX HERO ──────────────────────────────────────── */
const heroBg = document.getElementById('hero-parallax');
if (heroBg) {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    heroBg.style.transform = `translateY(${scrolled * 0.35}px)`;
  }, { passive: true });
}

/* ─── SMOOTH COUNT-UP FOR STATS ──────────────────────────── */
function countUp(el, target, suffix = '', duration = 1800) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(easedProgress * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      countUp(el, target, suffix);
      statsObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => statsObserver.observe(el));

/* ─── ACTIVE NAV LINK ────────────────────────────────────── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

/* ─── WATER RIPPLE CANVAS ────────────────────────────────── */
function initRippleCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLS = 80, ROWS = 30;
  let current = new Float32Array(COLS * ROWS);
  let prev    = new Float32Array(COLS * ROWS);

  // Seed some random ripples
  function seed() {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    current[r * COLS + c] = 0.5 + Math.random() * 0.5;
  }
  setInterval(seed, 800);

  function idx(r, c) { return r * COLS + c; }

  function step() {
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        const i = idx(r, c);
        current[i] = (
          prev[idx(r-1,c)] + prev[idx(r+1,c)] +
          prev[idx(r,c-1)] + prev[idx(r,c+1)]
        ) / 2 - current[i];
        current[i] *= 0.97; // damping
      }
    }
    // Swap
    [current, prev] = [prev, current];
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cw = canvas.width / COLS;
    const rh = canvas.height / ROWS;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = prev[idx(r, c)];
        const alpha = Math.min(Math.abs(v) * 0.6, 0.18);
        if (alpha < 0.005) continue;
        ctx.fillStyle = `rgba(201,168,76,${alpha})`;
        const x = c * cw + (v * 8);
        const y = r * rh;
        ctx.fillRect(x, y, cw + 1, rh + 1);
      }
    }
  }

  function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
}

initRippleCanvas('ripple-canvas');
