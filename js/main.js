/* ============================================================
   SYS:LEVEL — Main Script
   =============================================================*/
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      Object.assign(p.style, {
        position: 'absolute',
        left: posX + 'px',
        top: posY + 'px',
        width: size + 'px',
        height: size + 'px',
        background: color,
        borderRadius: '50%',
        boxShadow: '0 0 ' + (size * 4) + 'px ' + color,
        opacity: (Math.random() * 0.5 + 0.3).toString(),
        animation: 'particle-pulse ' + (2 + Math.random() * 2) + 's ease-in-out infinite ' + delay + 's',
        transform: 'translateZ(0)'
      });
      frag.appendChild(p);
    }
    container.appendChild(frag);

    if (reduceMotion) return;

    let ticking = false;
    const onMove = (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const particles = container.querySelectorAll('div');
        particles.forEach((p) => {
          const dx = mouseX - parseFloat(p.style.left);
          const dy = mouseY - parseFloat(p.style.top);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = Math.min(20 / (dist + 1), 4);
          const angle = Math.atan2(dy, dx);
          p.style.transform = 'translate(' + (Math.cos(angle) * force) + 'px, ' + (Math.sin(angle) * force) + 'px)';
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

  /* ---------- Boot overlay ---------- */
  const initBoot = () => {
    const boot = document.getElementById('boot');
    if (!boot) return;

    if (reduceMotion) {
      boot.remove();
      return;
    }

    const hide = () => {
      boot.classList.add('boot--hide');
      const remove = () => boot.remove();
      boot.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 800);
    };

    if (document.readyState === 'complete') {
      setTimeout(hide, 1200);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 1200), { once: true });
      setTimeout(hide, 2400);
    }
  };

  /* ---------- Scroll progress bar ---------- */
  const initScrollProgress = () => {
    const bar = document.querySelector('.scroll-progress__bar');
    if (!bar) return;

    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + '%';
      bar.style.transform = 'scaleX(1)';
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  /* ---------- Active nav link on scroll ---------- */
  const initActiveNav = () => {
    const links = Array.prototype.slice.call(document.querySelectorAll('.nav-link'))
      .filter((l) => l.getAttribute('href').indexOf('#') !== -1);
    const map = new Map();
    links.forEach((l) => {
      const parts = l.getAttribute('href').split('#');
      const id = parts[1];
      if (!id) return;
      const section = document.getElementById(id);
      if (section) map.set(section, l);
    });
    if (!map.size) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          map.forEach((l) => l.classList.remove('active'));
          const link = map.get(entry.target);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    map.forEach((l, section) => observer.observe(section));
  };

  /* ---------- Hero parallax ---------- */
  const initParallax = () => {
    if (reduceMotion) return;
    const items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;

    let mx = 0, my = 0, sy = 0, ticking = false;
    const apply = () => {
      items.forEach((el) => {
        const tx = (mx / (window.innerWidth / 2)) * 12;
        const ty = (my / (window.innerHeight / 2)) * 12 + Math.min(sy * 0.03, 12);
        el.style.transform = 'translate3d(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px, 0)';
      });
      ticking = false;
    };
    const request = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX - window.innerWidth / 2;
      my = e.clientY - window.innerHeight / 2;
      request();
    }, { passive: true });
    window.addEventListener('scroll', () => {
      sy = window.scrollY;
      request();
    }, { passive: true });
  };

  /* ---------- Contact form ---------- */
  const initContactForm = () => {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.reset();
      const note = document.createElement('div');
      note.className = 'form-note';
      note.textContent = 'TRANSMISSION RECEIVED. We will reply soon.';
      form.appendChild(note);
      setTimeout(() => note.remove(), 5000);
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
    initBoot();
    initScrollProgress();
    initActiveNav();
    initParallax();
    initContactForm();
  });
})();
