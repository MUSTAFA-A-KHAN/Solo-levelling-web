/* ============================================================
   SYS:LEVEL — site interactions
   One rAF loop drives every scroll-linked scene.
   =============================================================*/
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- Text splitting ---------- */
const splitWords = (el, start = 0) => {
  let i = start;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const wd = document.createElement('span');
          const wi = document.createElement('span');
          wd.className = 'wd';
          wi.className = 'wi';
          wi.style.setProperty('--i', i++);
          wi.textContent = part;
          wd.append(wi);
          frag.append(wd);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'BR') {
        walk(n);
      }
    });
  };
  walk(el);
  return i;
};

let heroIndex = 0;
$$('[data-hero]').forEach((el) => { heroIndex = splitWords(el, heroIndex); });
$$('[data-h]').forEach((el) => splitWords(el));

/* ---------- Scramble labels ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/[]<>+=*';
const scramble = (el) => {
  const final = el.dataset.text || el.textContent;
  el.dataset.text = final;
  if (reduce) return;
  const t0 = performance.now();
  const dur = 650;
  const tick = (t) => {
    const p = clamp((t - t0) / dur);
    const n = Math.floor(p * final.length);
    let out = final.slice(0, n);
    for (let k = n; k < final.length; k++) {
      out += final[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = p < 1 ? out : final;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/* ---------- Counters ---------- */
const countUp = (el) => {
  const raw = el.dataset.count;
  const target = parseFloat(raw);
  const dec = (raw.split('.')[1] || '').length;
  const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (reduce) { el.textContent = fmt(target); return; }
  const t0 = performance.now();
  const delay = 200;
  const dur = 1600;
  const tick = (t) => {
    const p = clamp((t - t0 - delay) / dur);
    el.textContent = fmt(target * ease(p));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
if (!reduce) $$('[data-count]').forEach((el) => { el.textContent = '0'; });

/* ---------- Reveal on view ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    if (el.matches('[data-scramble]')) scramble(el);
    if (el.matches('[data-count]')) countUp(el);
    io.unobserve(el);
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
$$('[data-h], [data-rv], [data-scramble], [data-count], [data-chat], .quest').forEach((el) => io.observe(el));

/* ---------- Preloader ---------- */
const boot = () => {
  const ld = $('[data-ld]');
  const done = () => root.classList.add('is-loaded');
  if (!ld || reduce) { done(); return; }
  const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1800))]);
  const t0 = performance.now();
  const dur = 1100;
  const tick = (t) => {
    const p = clamp((t - t0) / dur);
    ld.textContent = String(Math.round(ease(p) * 100)).padStart(3, '0');
    if (p < 1) requestAnimationFrame(tick);
    else fontsReady.then(() => setTimeout(done, 120));
  };
  requestAnimationFrame(tick);
};
boot();

/* ---------- Clock ---------- */
const clocks = $$('[data-clock]');
const setClock = () => {
  const s = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  clocks.forEach((c) => { c.textContent = s; });
};
setClock();
setInterval(setClock, 15000);

/* ---------- Menu ---------- */
const menuBtn = $('.menu-btn');
const menu = $('#menu');
const menuLabel = $('.menu-btn__t');
const isMenuOpen = () => root.classList.contains('menu-open');
const setMenu = (open) => {
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  menuLabel.textContent = open ? 'Close' : 'Menu';
  menu.setAttribute('aria-hidden', String(!open));
  menu.inert = !open;
  $('#main').inert = open;
  $('.foot').inert = open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) setTimeout(() => menu.querySelector('a')?.focus({ preventScroll: true }), 300);
};
if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => setMenu(!isMenuOpen()));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen()) { setMenu(false); menuBtn.focus(); }
  });
}

/* ---------- Grid overlay (G) ---------- */
const gridBtn = $('[data-grid-toggle]');
const toggleGrid = () => {
  const on = root.classList.toggle('show-grid');
  gridBtn?.setAttribute('aria-pressed', String(on));
};
gridBtn?.addEventListener('click', toggleGrid);
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
  const a = document.activeElement;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  toggleGrid();
});

/* ---------- Rotating word ---------- */
$$('[data-rot]').forEach((rot) => {
  const items = $$('.rot__i', rot);
  if (reduce || items.length < 2) return;
  let k = 0;
  setInterval(() => {
    const cur = items[k];
    k = (k + 1) % items.length;
    const next = items[k];
    cur.classList.remove('is-on');
    cur.classList.add('is-out');
    next.classList.remove('is-out');
    next.classList.add('is-on');
    setTimeout(() => cur.classList.remove('is-out'), 800);
  }, 2200);
});

/* ---------- Scrubbed statement ---------- */
const scrub = $('[data-scrub]');
let scrubWords = [];
if (scrub) {
  [...scrub.childNodes].forEach((n) => {
    if (n.nodeType !== Node.TEXT_NODE) return;
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(' '); return; }
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = part;
      frag.append(s);
    });
    n.replaceWith(frag);
  });
  scrubWords = $$('.sw, .rot', scrub);
}

/* ---------- Features: active row ---------- */
const rows = $$('[data-srow]');
const panels = $$('.fv__p');
const dots = $$('.fv__dots i');
let fvActive = -1;
let fvHoverAt = 0;
const setFv = (k) => {
  if (k === fvActive) return;
  fvActive = k;
  panels.forEach((p, i) => p.classList.toggle('is-on', i === k));
  dots.forEach((d, i) => d.classList.toggle('is-on', i === k));
  rows.forEach((r, i) => r.classList.toggle('is-on', i === k));
};
rows.forEach((r) => {
  const k = Number(r.dataset.srow);
  r.addEventListener('pointerenter', () => { fvHoverAt = performance.now(); setFv(k); });
  r.addEventListener('focus', () => { fvHoverAt = performance.now(); setFv(k); });
});
if (rows.length) setFv(0);

/* ---------- Magnetic buttons ---------- */
if (finePointer && !reduce) {
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.16}px, ${dy * 0.26}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- Cursor ---------- */
const cursor = $('.cursor');
const cursorText = $('.cursor__t');
const pointer = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, nx: 0, ny: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / innerWidth) * 2 - 1;
  pointer.ny = (e.clientY / innerHeight) * 2 - 1;
  if (e.pointerType === 'mouse') root.classList.add('has-cursor');
}, { passive: true });
if (finePointer && !reduce && cursor) {
  document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button, summary, [data-srow]');
    cursor.classList.toggle('is-label', !!lab);
    cursor.classList.toggle('is-link', !lab && !!link);
    cursorText.textContent = lab ? lab.dataset.cursor : '';
  });
}

/* ---------- Reel video ---------- */
const reel = $('[data-reel]');
const reelVideo = reel?.querySelector('video');
if (reelVideo && !reduce) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      reelVideo.play().then(() => reel.classList.add('is-playing')).catch(() => {});
    } else {
      reelVideo.pause();
      reel.classList.remove('is-playing');
    }
  }, { threshold: 0.25 }).observe(reel);
}

/* ---------- Marquee ---------- */
const mq = $('[data-marquee]');
const mqTrack = mq?.querySelector('.mq__track');
const marquee = { x: 0, w: 0, dir: 1, drag: null };
const measureMarquee = () => { if (mqTrack) marquee.w = mqTrack.scrollWidth / 2; };
if (mq && mqTrack) {
  measureMarquee();
  document.fonts?.ready.then(measureMarquee);
  mq.addEventListener('pointerdown', (e) => {
    marquee.drag = { x: e.clientX, start: marquee.x };
    mq.setPointerCapture(e.pointerId);
    mq.classList.add('is-drag');
  });
  mq.addEventListener('pointermove', (e) => {
    if (marquee.drag) marquee.x = marquee.drag.start + (e.clientX - marquee.drag.x);
  });
  const endDrag = () => { marquee.drag = null; mq.classList.remove('is-drag'); };
  mq.addEventListener('pointerup', endDrag);
  mq.addEventListener('pointercancel', endDrag);
}

/* ---------- Starfield ---------- */
const sf = $('[data-starfield]');
const sfx = sf?.getContext('2d');
const field = { w: 0, h: 0, dpr: 1, hw: [], rd: [], mode: 0, boost: 0 };
const spawnHighway = (p, fresh) => {
  p.x = fresh ? Math.random() * field.w : field.w + Math.random() * 60;
  p.y = Math.random() * field.h;
  p.l = 8 + Math.pow(Math.random(), 2) * 90;
  p.s = 0.35 + Math.random() * 2.2;
  p.a = 0.12 + Math.random() * 0.5;
  p.m = Math.random() < 0.14;
  return p;
};
const spawnRadial = (p, fresh) => {
  p.x = Math.random() * 2 - 1;
  p.y = Math.random() * 2 - 1;
  p.z = fresh ? 0.05 + Math.random() * 0.95 : 1;
  p.s = 0.5 + Math.random();
  p.m = Math.random() < 0.18;
  return p;
};
const sizeField = () => {
  if (!sf) return;
  field.dpr = Math.min(devicePixelRatio || 1, 1.75);
  field.w = innerWidth;
  field.h = innerHeight;
  sf.width = field.w * field.dpr;
  sf.height = field.h * field.dpr;
  sfx.setTransform(field.dpr, 0, 0, field.dpr, 0, 0);
  const n = Math.round(clamp((field.w * field.h) / 5200, 90, 340));
  field.hw = Array.from({ length: n }, () => spawnHighway({}, true));
  field.rd = Array.from({ length: Math.round(n * 0.8) }, () => spawnRadial({}, true));
};
const drawField = (dt) => {
  if (!sfx) return;
  const { w, h, mode, boost } = field;
  sfx.clearRect(0, 0, w, h);
  sfx.lineWidth = 1;
  if (mode < 0.995) {
    const fade = 1 - mode;
    for (const p of field.hw) {
      p.x -= p.s * (1 + boost) * dt;
      if (p.x + p.l * 2 < 0) spawnHighway(p, false);
      sfx.strokeStyle = p.m ? `rgba(255,0,255,${p.a * fade})` : `rgba(255,255,255,${p.a * fade})`;
      sfx.beginPath();
      sfx.moveTo(p.x, p.y);
      sfx.lineTo(p.x + p.l * (1 + boost * 0.5), p.y);
      sfx.stroke();
    }
  }
  if (mode > 0.005) {
    const cx = w / 2;
    const cy = h / 2;
    const f = Math.max(w, h) * 0.32;
    for (const p of field.rd) {
      const z0 = p.z;
      p.z -= 0.0032 * p.s * (1 + boost * 2.5) * dt;
      if (p.z <= 0.02) { spawnRadial(p, false); continue; }
      const sx = cx + (p.x / p.z) * f;
      const sy = cy + (p.y / p.z) * f;
      if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) { spawnRadial(p, false); continue; }
      const tail = Math.min(z0 + 0.012 + boost * 0.02, 1.2);
      const tx = cx + (p.x / tail) * f;
      const ty = cy + (p.y / tail) * f;
      const a = clamp(1 - p.z) * 0.85 * mode;
      sfx.strokeStyle = p.m ? `rgba(255,0,255,${a})` : `rgba(255,255,255,${a})`;
      sfx.beginPath();
      sfx.moveTo(tx, ty);
      sfx.lineTo(sx, sy);
      sfx.stroke();
    }
  }
};

/* ---------- Closing terrain ---------- */
const terrain = $('[data-terrain]');
const tctx = terrain?.getContext('2d');
const land = { w: 0, h: 0, visible: false, ridges: [] };
const sizeTerrain = () => {
  if (!terrain) return;
  const r = terrain.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  land.w = r.width;
  land.h = r.height;
  terrain.width = r.width * dpr;
  terrain.height = r.height * dpr;
  tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ridge = (amp, seed) => Array.from({ length: 64 }, (_, i) => {
    const x = i / 63;
    return amp * (0.55 * Math.abs(Math.sin(x * 9 + seed)) + 0.3 * Math.abs(Math.sin(x * 23 + seed * 2)) + 0.15 * Math.sin(x * 51 + seed * 3));
  });
  land.ridges = [ridge(0.11, 1.3), ridge(0.07, 4.1)];
};
const drawTerrain = (t) => {
  if (!tctx || !land.w) return;
  const { w, h } = land;
  const hor = h * 0.58;
  const sunX = w * 0.64;
  tctx.clearRect(0, 0, w, h);

  const sky = tctx.createLinearGradient(0, 0, 0, hor);
  sky.addColorStop(0, '#000');
  sky.addColorStop(1, '#2c0030');
  tctx.fillStyle = sky;
  tctx.fillRect(0, 0, w, hor);

  const sun = tctx.createRadialGradient(sunX, hor, 0, sunX, hor, w * 0.5);
  sun.addColorStop(0, 'rgba(255,200,255,1)');
  sun.addColorStop(0.03, 'rgba(255,90,255,.9)');
  sun.addColorStop(0.18, 'rgba(255,0,255,.38)');
  sun.addColorStop(0.5, 'rgba(160,0,160,.12)');
  sun.addColorStop(1, 'rgba(255,0,255,0)');
  tctx.fillStyle = sun;
  tctx.fillRect(0, 0, w, h);

  land.ridges.forEach((ridge, li) => {
    tctx.beginPath();
    tctx.moveTo(0, hor);
    ridge.forEach((v, i) => tctx.lineTo((i / (ridge.length - 1)) * w, hor - v * h * (li ? 0.7 : 1)));
    tctx.lineTo(w, hor);
    tctx.closePath();
    tctx.fillStyle = li ? '#14001a' : '#0b000f';
    tctx.fill();
    tctx.strokeStyle = li ? 'rgba(255,0,255,.55)' : 'rgba(255,120,255,.3)';
    tctx.lineWidth = 1;
    tctx.stroke();
  });

  const floor = tctx.createLinearGradient(0, hor, 0, h);
  floor.addColorStop(0, '#2a0030');
  floor.addColorStop(1, '#120014');
  tctx.fillStyle = floor;
  tctx.fillRect(0, hor, w, h - hor);

  const depth = h - hor;
  const shift = reduce ? 0 : (t * 0.00035) % 1;
  for (let i = 1; i < 30; i++) {
    const z = i - shift;
    const y = hor + depth * (0.9 / z);
    if (y > h || y < hor) continue;
    tctx.strokeStyle = `rgba(255,0,255,${clamp(0.75 - z / 30)})`;
    tctx.beginPath();
    tctx.moveTo(0, y);
    tctx.lineTo(w, y);
    tctx.stroke();
  }
  for (let j = -24; j <= 24; j++) {
    const xb = sunX + j * w * 0.09;
    tctx.strokeStyle = `rgba(255,0,255,${0.5 - Math.abs(j) / 60})`;
    tctx.beginPath();
    tctx.moveTo(sunX + j * 4, hor);
    tctx.lineTo(xb, h);
    tctx.stroke();
  }

  tctx.fillStyle = 'rgba(255,255,255,.9)';
  tctx.beginPath();
  tctx.arc(sunX, hor - 2, 5, 0, Math.PI * 2);
  tctx.fill();
};
if (terrain) {
  new IntersectionObserver(([e]) => { land.visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(terrain);
}

/* ---------- Scroll scenes ---------- */
const progressEl = $('.progress');
const heroFig = $('.hero__fig');
const heroShapes = $$('.hero__shapes .shp');
const statement = $('.statement');
const parallax = $$('[data-par]');
const depths = $$('[data-depth]').map((sec) => ({ sec, stage: $('.depth__stage', sec), n: $('[data-depth-n]', sec) }));
const spiral = $('[data-spiral]');
const cards = spiral ? $$('.spiral__card', spiral) : [];
const warp = $('[data-warp]');
const warpStage = warp && $('.warp__stage', warp);
const steps = warp ? $$('.step', warp) : [];
const words = warp ? $$('.ww', warp) : [];
const warpZones = $$('[data-warp-zone]');
const fv = $('#features');

const sectionProgress = (r, vh) => clamp(-r.top / Math.max(1, r.height - vh));
const inView = (r, vh) => r.bottom > 0 && r.top < vh;

let lastY = scrollY;
let vel = 0;
let lastT = performance.now();

const frame = (t) => {
  const dt = clamp((t - lastT) / 16.667, 0.2, 3);
  lastT = t;
  const vh = innerHeight;
  const y = scrollY;
  const dy = y - lastY;
  lastY = y;
  vel = lerp(vel, dy, 0.18);
  if (Math.abs(dy) > 0.5) marquee.dir = dy < 0 ? -1 : 1;

  pointer.sx = lerp(pointer.sx, pointer.nx, 0.06);
  pointer.sy = lerp(pointer.sy, pointer.ny, 0.06);

  // Page chrome
  const max = Math.max(1, document.documentElement.scrollHeight - vh);
  progressEl?.style.setProperty('--sp', (y / max).toFixed(4));
  root.classList.toggle('is-scrolled', y > 40);

  // Cursor
  if (cursor && finePointer && !reduce) {
    pointer.cx = lerp(pointer.cx, pointer.x, 0.22);
    pointer.cy = lerp(pointer.cy, pointer.y, 0.22);
    cursor.style.transform = `translate3d(${pointer.cx}px, ${pointer.cy}px, 0)`;
  }

  // Hero
  if (heroFig && y < vh * 1.2 && !reduce) {
    heroFig.style.translate = `${pointer.sx * -16}px ${y * 0.18 + pointer.sy * -10}px`;
    heroShapes.forEach((s, i) => { s.style.translate = `${pointer.sx * (30 + i * 20)}px ${pointer.sy * (24 + i * 16) - y * (0.1 + i * 0.12)}px`; });
  }

  // Statement: parallax shapes + scrubbed words
  if (statement) {
    const r = statement.getBoundingClientRect();
    if (inView(r, vh)) {
      if (!reduce) {
        const rel = (r.top + r.height / 2 - vh / 2) / vh;
        parallax.forEach((el) => {
          const k = parseFloat(el.dataset.par);
          el.style.transform = `translate3d(${pointer.sx * 36 * k}px, ${rel * 160 * k + pointer.sy * 24 * k}px, 0)`;
        });
      }
      if (scrubWords.length) {
        const sr = scrub.getBoundingClientRect();
        const p = reduce ? 1 : clamp((vh * 0.88 - sr.top) / (vh * 0.5));
        const lit = p * scrubWords.length;
        scrubWords.forEach((w, i) => w.classList.toggle('on', i < lit));
      }
    }
  }

  // Depth image sections
  depths.forEach(({ sec, stage, n }) => {
    const r = sec.getBoundingClientRect();
    if (!inView(r, vh)) return;
    const p = sectionProgress(r, vh);
    const enter = clamp((vh - r.top) / vh);
    const open = ease(clamp(p / 0.42));
    stage.style.setProperty('--ci', `${(1 - open) * 18 * (0.6 + 0.4 * enter)}%`);
    stage.style.setProperty('--cx', `${(1 - open) * 28}%`);
    stage.style.setProperty('--cr', `${(1 - open) * 28}px`);
    stage.style.setProperty('--s', (1.32 - 0.24 * p).toFixed(4));
    stage.style.setProperty('--b', (0.35 + 0.3 * open).toFixed(3));
    stage.style.setProperty('--ty', `${(1 - open) * 6}vh`);
    stage.style.setProperty('--p', p.toFixed(4));
    if (n) n.textContent = String(Math.round(p * 100)).padStart(3, '0');
  });

  // Features: follow scroll when not hovering
  if (fv && rows.length && t - fvHoverAt > 1500) {
    const r = fv.getBoundingClientRect();
    if (inView(r, vh)) {
      let best = 0;
      let bestD = Infinity;
      rows.forEach((row, i) => {
        const rr = row.getBoundingClientRect();
        const d = Math.abs(rr.top + rr.height / 2 - vh * 0.5);
        if (d < bestD) { bestD = d; best = i; }
      });
      setFv(best);
    }
  }

  // Reel tilt
  if (reel) {
    const r = reel.getBoundingClientRect();
    if (inView(r, vh)) {
      const p = reduce ? 1 : ease(clamp((vh - r.top) / (vh * 0.95)));
      reel.style.setProperty('--rx', `${(1 - p) * 26}deg`);
      reel.style.setProperty('--rs', (0.86 + 0.14 * p).toFixed(4));
    }
  }

  // Marquee
  if (mqTrack && marquee.w) {
    if (!marquee.drag && !reduce) marquee.x -= (0.7 + Math.min(Math.abs(vel) * 0.35, 14)) * marquee.dir * dt;
    if (marquee.x <= -marquee.w) marquee.x += marquee.w;
    if (marquee.x > 0) marquee.x -= marquee.w;
    mqTrack.style.transform = `translate3d(${marquee.x}px, 0, 0)`;
  }

  // Spiral archive
  if (spiral) {
    const r = spiral.getBoundingClientRect();
    if (inView(r, vh)) {
      const p = sectionProgress(r, vh);
      const N = cards.length;
      const span = 6;
      const total = N + span - 2;
      const R = clamp(innerWidth * 0.32, 160, 560);
      cards.forEach((c, i) => {
        const ph = (p * total - i + 2) / span;
        if (ph <= 0 || ph >= 1) {
          if (c.style.visibility !== 'hidden') { c.style.visibility = 'hidden'; c.style.opacity = '0'; }
          return;
        }
        const z = -2600 + ph * 3300;
        const a = i * 2.39996 + ph * 2.4;
        const x = Math.cos(a) * R;
        const yy = Math.sin(a) * R * 0.62;
        const o = clamp(ph / 0.18) * (1 - clamp((ph - 0.86) / 0.14));
        c.style.visibility = 'visible';
        c.style.opacity = o.toFixed(3);
        c.style.zIndex = String(Math.round(ph * 100));
        c.style.transform = `perspective(1200px) translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(-Math.cos(a) * 16).toFixed(2)}deg)`;
      });
    }
  }

  // Warp
  let warpBoost = 0;
  if (warpStage) {
    const r = warp.getBoundingClientRect();
    if (inView(r, vh)) {
      const p = sectionProgress(r, vh);
      steps.forEach((s, k) => s.classList.toggle('is-on', reduce || p > 0.04 + k * 0.08));
      const fade = clamp((p - 0.42) / 0.14);
      warpStage.style.setProperty('--co', (1 - fade).toFixed(3));
      warpStage.style.setProperty('--cs', (1 - fade * 0.12).toFixed(4));
      warpStage.style.setProperty('--cb', `${(fade * 14).toFixed(2)}px`);
      warpStage.style.setProperty('--g', clamp((p - 0.45) / 0.4).toFixed(3));
      words.forEach((w, k) => {
        const q = ease(clamp((p - 0.55 - k * 0.1) / 0.12));
        w.style.setProperty('--o', q.toFixed(3));
        w.style.setProperty('--sc', (2.4 - 1.4 * q).toFixed(4));
        w.style.setProperty('--bl', `${((1 - q) * 24).toFixed(2)}px`);
      });
      warpBoost = clamp((p - 0.4) / 0.4) * 2.5;
    }
  }

  // Starfield
  if (sfx) {
    let target = 0;
    warpZones.forEach((z) => {
      const r = z.getBoundingClientRect();
      if (r.top < vh * 0.5 && r.bottom > vh * 0.5) target = 1;
    });
    field.mode = lerp(field.mode, target, 0.05 * dt);
    field.boost = lerp(field.boost, Math.min(Math.abs(vel) / 10, 4) + warpBoost, 0.1);
    if (!reduce) drawField(dt);
  }

  if (land.visible) drawTerrain(t);

  requestAnimationFrame(frame);
};

/* ---------- Init ---------- */
sizeField();
sizeTerrain();
if (reduce) {
  drawField(0);
  requestAnimationFrame((t) => drawTerrain(t));
}
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    sizeField();
    sizeTerrain();
    measureMarquee();
    if (reduce) { drawField(0); drawTerrain(0); }
  }, 150);
});
requestAnimationFrame(frame);
