// ===== SYS:LEVEL MEDIA VAULT â€” scraper & gallery =====

const IMG_RE = /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i;
const VID_RE = /\.(webm|mp4|mov|m4v|ogv)(\?|#|$)/i;

const PROXIES = [
  (u) => u, // direct — works for CORS-enabled endpoints (e.g. reddit .json)
  (u) => `https://r.jina.ai/${u}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
];

const els = {
  form: document.getElementById('scrapeForm'),
  input: document.getElementById('urlInput'),
  btn: document.getElementById('scrapeBtn'),
  archiveForm: document.getElementById('archiveForm'),
  archiveInput: document.getElementById('archiveInput'),
  archiveBtn: document.getElementById('archiveBtn'),
  grid: document.getElementById('vaultGrid'),
  empty: document.getElementById('vaultEmpty'),
  toolbar: document.getElementById('toolbar'),
  status: document.getElementById('vaultStatus'),
  dlAll: document.getElementById('downloadAllBtn'),
  counts: {
    all: document.getElementById('countAll'),
    image: document.getElementById('countImage'),
    gif: document.getElementById('countGif'),
    video: document.getElementById('countVideo')
  },
  lightbox: document.getElementById('lightbox'),
  lbStage: document.getElementById('lightboxStage'),
  lbClose: document.getElementById('lightboxClose'),
  lbPrev: document.getElementById('lightboxPrev'),
  lbNext: document.getElementById('lightboxNext'),
  lbOpen: document.getElementById('lightboxOpen'),
  lbDownload: document.getElementById('lightboxDownload')
};

let media = [];
let filtered = [];
let current = 0;
let activeFilter = 'all';

// Seed the vault with the bundled media pack
loadBuiltinMedia();
applyFilter();
setStatus(`BUNDLED PACK LOADED — ${media.length} ITEMS`);

function classify(url) {
  if (VID_RE.test(url)) return 'video';
  if (/\.gif(\?|#|$)/i.test(url)) return 'gif';
  if (IMG_RE.test(url)) return 'image';
  return null;
}

function fileName(url) {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop()) || 'media'; }
  catch { return 'media'; }
}

function absUrl(raw, base) {
  try { return new URL(raw, base).href; } catch { return null; }
}

function setStatus(text) { els.status.textContent = text; }

async function fetchPage(url) {
  let lastErr = null;
  for (const make of PROXIES) {
    try {
      setStatus('HARVESTINGâ€¦');
      const res = await fetch(make(url), { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('All proxies failed');
}

/* ---------- Reddit JSON support (gifs / videos / galleries) ---------- */

function unescapeRedditUrl(u) {
  return u ? u.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : u;
}

function isReddit(url) { return /(^|\.)reddit\.com$/i.test(new URL(url).hostname); }

function redditJsonUrl(url) {
  return url.replace(/\/?(\?.*)?$/, '') + '.json?limit=100&raw_json=1';
}

function parseRedditJson(data, baseUrl) {
  const posts = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.kind === 'Listing' && node.data) { walk(node.data.children); return; }
    const d = node.data || node;
    if (d && (d.title !== undefined)) posts.push(d);
    if (d && d.crosspost_parent_list) d.crosspost_parent_list.forEach((p) => posts.push(p));
    if (d && d.children) d.children.forEach(walk);
  };
  walk(data);

  const add = (raw, type) => {
    const u = unescapeRedditUrl(raw);
    if (!u || !/^https?:\/\//i.test(u)) return;
    const t = type || classify(u);
    if (!t) return;
    if (media.some((m) => m.url === u)) return;
    media.push({ url: u, type: t, name: fileName(u) });
  };

  posts.forEach((d) => {
    // direct file links (i.redd.it .gif/.png/.jpg/.webp, external .mp4/.webm)
    add(d.url_overridden_by_dest || d.url);
    // preview image + animated variants
    const src = d.preview && d.preview.images && d.preview.images[0];
    if (src) {
      if (src.variants) {
        if (src.variants.gif) add(src.variants.gif.source.url, 'gif');
        if (src.variants.mp4) add(src.variants.mp4.source.url, 'video');
      }
      if (!VID_RE.test(d.url || '')) add(src.source && src.source.url, 'image');
    }
    // native v.redd.it video (DASH mp4 fallback, direct-playable)
    const rv = (d.secure_media || d.media) && (d.secure_media || d.media).reddit_video;
    if (rv && rv.fallback_url) add(rv.fallback_url, 'video');
    // gallery posts
    if (d.is_gallery && d.media_metadata) {
      Object.values(d.media_metadata).forEach((m) => {
        if (m && m.status === 'valid') {
          add(m.s && m.s.u, 'image');
          add(m.s && m.s.gif, 'gif');
          add(m.s && m.s.mp4, 'video');
          add(m.p && m.p.length && m.p[m.p.length - 1].u, 'image');
        }
      });
    }
    // embeds
    if (d.preview && d.preview.reddit_video_preview && d.preview.reddit_video_preview.fallback_url) {
      add(d.preview.reddit_video_preview.fallback_url, 'video');
    }
  });
}

/* ---------- Imgur archive search (gifs / mp4 videos) ---------- */

const IMGUR_CLIENT = '546c25a59c58ad7';

function imgurType(mime) {
  if (mime === 'video/mp4') return 'video';
  if (mime === 'image/gif') return 'gif';
  if (/^image\//.test(mime)) return 'image';
  return null;
}

async function searchArchive(q) {
  setStatus('SEARCHING ARCHIVE…');
  const res = await fetch(
    `https://api.imgur.com/3/gallery/search?q=${encodeURIComponent(q)}&sort=viral`,
    { headers: { Authorization: `Client-ID ${IMGUR_CLIENT}` }, signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`Archive HTTP ${res.status}`);
  const json = await res.json();
  const posts = json.data || [];
  let added = 0;

  const push = (link, mime) => {
    const type = imgurType(mime);
    if (!link || !type) return;
    if (media.some((m) => m.url === link)) return;
    media.push({ url: link, type, name: fileName(link) });
    added++;
  };

  posts.forEach((p) => {
    if (Array.isArray(p.images)) {
      p.images.forEach((i) => push(i.link, i.type));
    } else {
      push(p.link, p.type);
    }
  });
  return added;
}

function extractMedia(html, baseUrl) {
  const found = new Set();
  const add = (raw) => {
    if (!raw) return;
    const abs = absUrl(raw, baseUrl);
    if (!abs || found.has(abs)) return;
    const type = classify(abs);
    if (type) { found.add(abs); media.push({ url: abs, type, name: fileName(abs) }); }
  };

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('img[src]').forEach((el) => add(el.getAttribute('src')));
    doc.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
      el.getAttribute('srcset').split(',').forEach((part) => add(part.trim().split(/\s+/)[0]));
    });
    doc.querySelectorAll('video[src], video > source[src]').forEach((el) => add(el.getAttribute('src')));
    doc.querySelectorAll('[style*="url("]').forEach((el) => {
      const m = el.getAttribute('style').match(/url\((['"]?)(.*?)\1\)/i);
      if (m) add(m[2]);
    });
    doc.querySelectorAll('a[href]').forEach((el) => add(el.getAttribute('href')));
  } catch { /* fall through to regex */ }

  const re = /https?:\/\/[^\s"'<>()\\]+\.(?:png|jpe?g|webp|gif|avif|webm|mp4)(?:\?[^\s"'<>()\\]*)?/gi;
  for (const m of html.matchAll(re)) add(m[0]);
}

/* ---------- built-in media pack (bundled assets) ---------- */

const builtinModules = import.meta.glob('../assets/media/*', { eager: true, query: '?url', import: 'default' });

function loadBuiltinMedia() {
  let n = 0;
  Object.entries(builtinModules).forEach(([path, url]) => {
    const file = path.split('/').pop();
    let type = classify(url) || (file.endsWith('.mp4') ? 'video' : file.endsWith('.gif') ? 'gif' : 'image');
    media.push({ url, type, name: file, builtin: true });
    n++;
  });
  return n;
}

/* ---------- rendering ---------- */

function applyFilter() {
  filtered = media.filter((m) => activeFilter === 'all' || m.type === activeFilter);
  els.grid.innerHTML = '';
  els.empty.hidden = filtered.length > 0;
  els.toolbar.hidden = media.length === 0;

  const counts = { all: media.length, image: 0, gif: 0, video: 0 };
  media.forEach((m) => { counts[m.type]++; });
  Object.entries(els.counts).forEach(([k, el]) => { if (el) el.textContent = counts[k]; });

  filtered.forEach((m, i) => els.grid.appendChild(buildCard(m, i)));
}

function buildCard(m, i) {
  const card = document.createElement('article');
  card.className = 'card';
  card.style.animationDelay = (Math.min(i * 40, 400)) + 'ms';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', 'Open ' + m.name);

  if (m.type === 'video') {
    const v = document.createElement('video');
    v.className = 'card__media';
    v.src = m.url;
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
    v.addEventListener('loadeddata', () => v.play().catch(() => {}));
    card.appendChild(v);
    const play = document.createElement('div');
    play.className = 'card__play';
    play.textContent = 'â–¶';
    card.appendChild(play);
  } else {
    const img = document.createElement('img');
    img.className = 'card__media';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = m.name;
    img.src = m.url;
    card.appendChild(img);
  }

  const badge = document.createElement('span');
  badge.className = 'card__badge' + (m.type === 'video' ? ' card__badge--video' : '');
  badge.textContent = m.type.toUpperCase();
  card.appendChild(badge);

  const actions = document.createElement('div');
  actions.className = 'card__actions';
  const dl = document.createElement('a');
  dl.className = 'card__action';
  dl.href = m.url;
  dl.download = m.name;
  dl.target = '_blank';
  dl.rel = 'noopener';
  dl.textContent = 'â¬‡';
  dl.setAttribute('aria-label', 'Download ' + m.name);
  dl.addEventListener('click', (e) => e.stopPropagation());
  actions.appendChild(dl);
  card.appendChild(actions);

  const name = document.createElement('p');
  name.className = 'card__name';
  name.textContent = m.name;
  card.appendChild(name);

  card.addEventListener('click', () => openLightbox(i));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
  });
  return card;
}

/* ---------- lightbox ---------- */

function openLightbox(i) {
  current = i;
  const m = filtered[i];
  if (!m) return;
  els.lbStage.innerHTML = '';
  if (m.type === 'video') {
    const v = document.createElement('video');
    v.src = m.url; v.controls = true; v.autoplay = true; v.loop = true; v.playsInline = true;
    els.lbStage.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = m.url; img.alt = m.name;
    els.lbStage.appendChild(img);
  }
  els.lbOpen.href = m.url;
  els.lbDownload.href = m.url;
  els.lbDownload.download = m.name;
  els.lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lbStage.innerHTML = '';
  document.body.style.overflow = '';
}

function step(dir) {
  if (!filtered.length) return;
  openLightbox((current + dir + filtered.length) % filtered.length);
}

/* ---------- download all ---------- */

async function downloadAll() {
  setStatus('DOWNLOADINGâ€¦');
  for (const m of filtered) {
    try {
      const res = await fetch(m.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = m.name;
      a.click();
      URL.revokeObjectURL(a.href);
      await new Promise((r) => setTimeout(r, 350));
    } catch { /* skip blocked resource */ }
  }
  setStatus('COMPLETE');
}

/* ---------- events ---------- */

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = els.input.value.trim();
  if (!url) return;
  media = media.filter((m) => m.builtin);
  activeFilter = 'all';
  els.btn.disabled = true;
  els.btn.setAttribute('aria-disabled', 'true');
  els.btn.classList.add('loading');
  setStatus('SCANNINGâ€¦');
  try {
    const target = isReddit(url) ? redditJsonUrl(url) : url;
    const raw = await fetchPage(target);
    let json = null;
    try { json = JSON.parse(raw); } catch { /* not JSON */ }
    if (json && isReddit(url)) parseRedditJson(json, url);
    extractMedia(raw, url);
    applyFilter();
    setStatus(media.length ? 'HARVESTED ' + media.length + ' ITEMS' : 'NO MEDIA FOUND ON PAGE');
  } catch (err) {
    setStatus('ERROR: ' + (err.message || 'fetch failed'));
    applyFilter();
  } finally {
    els.btn.disabled = false;
    els.btn.removeAttribute('aria-disabled');
    els.btn.classList.remove('loading');
  }
});

els.archiveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = els.archiveInput.value.trim();
  if (!q) return;
  media = [];
  activeFilter = 'all';
  els.archiveBtn.disabled = true;
  els.archiveBtn.setAttribute('aria-disabled', 'true');
  els.archiveBtn.classList.add('loading');
  try {
    const n = await searchArchive(q);
    applyFilter();
    setStatus(n ? `ARCHIVE: ${n} ITEMS FOUND` : 'ARCHIVE: NOTHING FOUND');
  } catch (err) {
    setStatus(`ARCHIVE ERROR: ${err.message || 'search failed'}`);
    applyFilter();
  } finally {
    els.archiveBtn.disabled = false;
    els.archiveBtn.removeAttribute('aria-disabled');
    els.archiveBtn.classList.remove('loading');
  }
});

document.querySelectorAll('.chip[data-q]').forEach((chip) => {
  chip.addEventListener('click', () => {
    els.archiveInput.value = chip.dataset.q;
    els.archiveForm.requestSubmit();
  });
});

document.querySelectorAll('[data-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('chip--active', b === btn));
    applyFilter();
  });
});

document.querySelectorAll('.chip[data-url]').forEach((chip) => {
  chip.addEventListener('click', () => {
    els.input.value = chip.dataset.url;
    els.form.requestSubmit();
  });
});

els.dlAll.addEventListener('click', downloadAll);
els.lbClose.addEventListener('click', closeLightbox);
els.lbPrev.addEventListener('click', () => step(-1));
els.lbNext.addEventListener('click', () => step(1));
els.lightbox.addEventListener('click', (e) => { if (e.target === els.lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (els.lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});
