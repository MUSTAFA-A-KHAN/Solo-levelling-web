/* ============================================================
   SYS:LEVEL — Main Script
   =============================================================*/
(function () {
  'use strict';

  /* ---------- Particle Background ---------- */
  const initParticles = () => {
    const container = document.getElementById('particles');
    if (!container) return;

    const count = 70;
    const frag = document.createDocumentFragment();
    const sizes = [1, 2, 3];
    const colors = ['#00f0ff', '#8a2be2', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const posX = Math.random() * window.innerWidth;
      const posY = Math.random() * window.innerHeight;
      const delay = Math.random() * 3;
      const duration = 3 + Math.random() * 4;

      Object.assign(p.style, {
        position: 'absolute',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        borderRadius: '50%',
        boxShadow: `0 0 ${size * 4}px ${color}`,
        opacity: Math.random() * 0.5 + 0.3,
        animation: `particle-pulse ${2 + Math.random() * 2}s ease-in-out infinite ${delay}s`,
        transform: 'translateZ(0)'
      });
      frag.appendChild(p);
    }
    container.appendChild(frag);

    let ticking = false;
    const onMove = (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const particles = container.querySelectorAll('div');
        particles.forEach((p, i) => {
          const dx = mouseX - parseFloat(p.style.left);
          const dy = mouseY - parseFloat(p.style.top);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = Math.min(20 / (dist + 1), 4);
          const angle = Math.atan2(dy, dx);
          p.style.transform = `translate(${Math.cos(angle) * force}px, ${Math.sin(angle) * force}px)`;
        });
        ticking = false;
      });
    };
    document.addEventListener('mousemove', onMove);
  };

  /* ---------- Scroll Animations (IntersectionObserver) ---------- */
  const initScrollAnimations = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el);
    });
  };

  /* ---------- Animated Counters ---------- */
  const initCounters = () => {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-count')) || 0;
          const digits = String(Math.floor(target)).length;
          const duration = 1400 + digits * 180;
          const isDecimal = target % 1 !== 0;
          let start = null;
          const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = target * easeOut;
            el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              el.textContent = isDecimal ? target.toFixed(1) : Math.floor(target).toLocaleString();
            }
          };
          requestAnimationFrame(step);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach((c) => counterObserver.observe(c));
  };

  /* ---------- Stat bar fill on view ---------- */
  const initStatBars = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('filled');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.45 });

    document.querySelectorAll('.stat-bar__fill, .quest-panel__fill, .level-progress__fill').forEach((bar) => {
      observer.observe(bar);
    });

    // Hero phone is visible on load — trigger bar fills immediately
    setTimeout(() => {
      document.querySelectorAll('.hero .stat-bar__fill, .hero .quest-item__fill').forEach((bar) => {
        bar.classList.add('filled');
      });
    }, 700);
  };

  /* ---------- Sticky Nav Scroll Effect ---------- */
  const initNavScroll = () => {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  /* ---------- Mobile Nav Toggle ---------- */
  const initNavToggle = () => {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      menu.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  };

  /* ---------- Close mobile menu on Escape ---------- */
  const initEscapeClose = () => {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (!toggle || !menu) return;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  };

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initScrollAnimations();
    initCounters();
    initStatBars();
    initNavScroll();
    initNavToggle();
    initEscapeClose();
  });
})();
