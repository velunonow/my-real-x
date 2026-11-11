'use strict';
/*
 * My Real X — a calm, curated collection instead of the X "For You" feed.
 * No X API, no server. Data lives in data.json (optionally synced to GitHub)
 * plus this browser's localStorage. Visual rules live in DESIGN.md.
 */

const DEFAULT_TAGS = ['AI', 'Business', 'Learning', 'Writing'];
const LS = { data: 'mrx.data.v1', sync: 'mrx.sync.v1', syncTip: 'mrx.syncTip.v1', nudge: 'mrx.nudgeHidden.v1' };
// outputs: things I made. output_inputs: which saves fed each output (many to many).
const TABLES = ['creators', 'items', 'ideas', 'outputs', 'output_inputs'];
const TRIAL_DAYS = 14;
const TRUSTED_SOFT_MAX = 30;
const LIB_PAGE = 40;

const PROMPTS = [
  'Rewrite your best takeaway this week in your own words, for a beginner.',
  'Politely disagree with one thing you read recently. Why?',
  'Share one mistake you made and what it taught you.',
  'Write a 5-step how-to about something you do every week.',
  'Combine two things from your collection into one new idea.',
  'Write the post you wish you had read one year ago.',
  'Explain an AI tool you use as if to your parents.',
  'Pick a small business problem. How could AI fix it?',
  'Write a 3-post thread: problem, insight, action.',
  'Turn one of your ideas into a hook and three bullet points.',
  'Build in public: write down something you tried today.',
  'List 10 ideas in 10 minutes. Quantity, not quality.',
  'Share one prompt that saves you time. Show before and after.',
  'Answer a question someone asked you recently, publicly.',
  'Write a strong opinion you hold that most people don’t.',
  'Summarise something you read in 3 lines, then add your verdict.',
  'Try a new tool for 20 minutes and report what happened.',
  'Write about the creator who influenced you most, and why.',
  'Describe your process for something you’re good at.',
  'Finish an old draft today. Done is better than perfect.',
  'What did you learn this week that changed your mind?',
  'Teach one thing in under 280 characters.',
  'Make a checklist other people could copy and use.',
  'What would you tell a friend starting in AI today?',
  'Turn a takeaway into a tiny experiment for tomorrow.',
  'Remix a post you liked: same topic, your own experience.',
];

/* ---------- icons (one stroke family) ---------- */
const ICONS = {
  collect: '<path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.5 3.5 5.2"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  open: '<path d="M7 17L17 7M8 7h9v9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  clipboard: '<rect x="5.5" y="4.5" width="13" height="16" rx="2.5"/><path d="M9 4.5h6v3H9z"/>',
  layers: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12.5l8.5 4.5 8.5-4.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  play: '<path d="M8 5.5l10.5 6.5L8 18.5z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.7-5.6 3.8-8.8 1.4 1.7 1.9 3.2 1.9 4.6 1-.9 1.9-2.4 1.9-3.9 2.9 2.4 5.4 5.3 5.4 8.1 0 3.6-2.6 6.2-6.5 6.2z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  send: '<path d="M4.5 12L20 4.5 15.5 20l-3.2-6.4z"/><path d="M12.3 13.6L20 4.5"/>',
  undo: '<path d="M9 14L4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',
  archive: '<path d="M4 8h16v11.5H4zM3 4.5h18V8H3zM10 12h4"/>',
};
const icon = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowIso = () => new Date().toISOString();
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate(new Date());
const dayOf = (iso) => (iso ? localDate(new Date(iso)) : '');
const daysSince = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)) : 0);
const safeHref = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
const clip = (s, n) => { s = String(s || ''); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function forget(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- data ---------- */
let db = normalize({});
let view = 'library';
let libLimit = LIB_PAGE;
let promptShift = 0;
const filters = { lib: { q: '', status: '', tag: '' }, people: { status: 'trusted', tag: '' } };

function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  const out = { version: 1 };
  out.settings = Object.assign({ xListUrl: '', tags: DEFAULT_TAGS.slice(), updated: '' }, d.settings || {});
  if (!Array.isArray(out.settings.tags)) out.settings.tags = DEFAULT_TAGS.slice();
  for (const k of TABLES) out[k] = Array.isArray(d[k]) ? d[k].filter((x) => x && x.id) : [];
  return out;
}
// Merge two copies record by record; the newer `updated` wins. Deletions are kept as tombstones.
function mergeDb(a, b) {
  const out = normalize({});
  out.settings = (a.settings.updated || '') >= (b.settings.updated || '') ? a.settings : b.settings;
  for (const k of TABLES) {
    const m = new Map();
    for (const x of [...b[k], ...a[k]]) {
      const y = m.get(x.id);
      if (!y || (x.updated || '') >= (y.updated || '')) m.set(x.id, x);
    }
    out[k] = [...m.values()];
  }
  return out;
}
const live = (k) => db[k].filter((x) => !x.deleted);
const byId = (k, id) => db[k].find((x) => x.id === id && !x.deleted);
function upsert(k, rec) {
  rec.updated = nowIso();
  const i = db[k].findIndex((x) => x.id === rec.id);
  if (i < 0) db[k].push(rec); else db[k][i] = rec;
  save();
}
function removeRec(k, id) {
  const i = db[k].findIndex((x) => x.id === id);
  if (i < 0) return;
  db[k][i] = { id, deleted: true, updated: nowIso() };
  save();
}
function setSettings(patch) { Object.assign(db.settings, patch); db.settings.updated = nowIso(); save(); }
function findCreator(platform, handle) {
  if (!handle) return null;
  const h = handle.toLowerCase();
  return live('creators').find((c) => c.platform === platform && (c.handle || '').toLowerCase() === h) || null;
}
const findItemByUrl = (url) => live('items').find((i) => i.url === url) || null;
function ensureTags(tags) {
  const t = db.settings.tags.slice();
  let changed = false;
  tags.forEach((x) => { if (!t.some((y) => y.toLowerCase() === x.toLowerCase())) { t.push(x); changed = true; } });
  if (changed) setSettings({ tags: t });
}
function allTags() {
  const set = new Set(db.settings.tags);
  live('items').concat(live('creators'), live('ideas')).forEach((x) => (x.tags || []).forEach((t) => set.add(t)));
  return [...set];
}
function addDay(idea) {
  const d = today();
  idea.days = idea.days || [];
  if (!idea.days.includes(d)) idea.days.push(d);
}

/* ---------- outputs: things I made, linked to the saves behind them ---------- */
const OUTPUT_TYPES = [['post', 'Post'], ['product', 'Product'], ['note', 'Note']];
const outputTypeLabel = (t) => (OUTPUT_TYPES.find(([v]) => v === t) || OUTPUT_TYPES[2])[1];
const outputTitle = (o) => o.title || `Untitled ${outputTypeLabel(o.type).toLowerCase()}`;
const linkId = (outputId, itemId) => `${outputId}~${itemId}`;
const liveLinks = () => live('output_inputs');
function inputsOf(outputId) {
  return liveLinks().filter((l) => l.output_id === outputId).map((l) => byId('items', l.item_id)).filter(Boolean);
}
function outputsFrom(itemId) {
  return liveLinks().filter((l) => l.item_id === itemId).map((l) => byId('outputs', l.output_id)).filter(Boolean)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}
function setLink(outputId, itemId, on) {
  const id = linkId(outputId, itemId);
  const linked = !!byId('output_inputs', id);
  if (on && !linked) upsert('output_inputs', { id, output_id: outputId, item_id: itemId });
  if (!on && linked) removeRec('output_inputs', id);
}
function newOutput(itemIds = []) {
  const o = { id: uid(), type: 'post', title: '', url: '', notes: '', created_at: nowIso() };
  upsert('outputs', o);
  itemIds.forEach((itemId) => setLink(o.id, itemId, true));
  openOutput(o.id);
  setTimeout(() => { const t = $('#sheetBody [data-field=title]'); if (t) t.focus(); }, 80);
  return o;
}
const madeLine = (it) => { const n = outputsFrom(it.id).length; return `<p class="made ${n ? 'yes' : ''}">${n ? `Made from this: ${n}` : 'Nothing yet'}</p>`; };
const weekKey = () => Math.floor(new Date(today()).getTime() / (7 * 864e5));

/* ---------- GitHub sync (optional) ---------- */
let sync = load(LS.sync);
let remoteSha = null;
let pushTimer = null;
let pushing = false;
let pendingPush = false;
let lastPull = 0;
const syncOn = () => !!(sync && sync.token && sync.owner && sync.repo);

function b64enc(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64dec(b) {
  const bin = atob(b.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function ghUrl() {
  const path = (sync.path || 'data.json').split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${encodeURIComponent(sync.owner)}/${encodeURIComponent(sync.repo)}/contents/${path}`;
}
const ghHeaders = () => ({ Authorization: `Bearer ${sync.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
async function ghGet() {
  const q = sync.branch ? `?ref=${encodeURIComponent(sync.branch)}` : '';
  const r = await fetch(ghUrl() + q, { headers: ghHeaders(), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.json().catch(() => ({}))).message || r.statusText}`);
  const j = await r.json();
  let text = j.content ? b64dec(j.content) : '';
  if (!text && j.download_url) text = await (await fetch(j.download_url, { cache: 'no-store' })).text();
  return { sha: j.sha, data: normalize(text ? JSON.parse(text) : {}) };
}
async function ghPut(text, sha) {
  const body = { message: `Update my-real-x data (${today()})`, content: b64enc(text) };
  if (sha) body.sha = sha;
  if (sync.branch) body.branch = sync.branch;
  const r = await fetch(ghUrl(), { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, sha: j.content && j.content.sha, message: j.message };
}
function save() {
  store(LS.data, db);
  if (!syncOn()) { setSync('local'); return; }
  setSync('pending');
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemote, 2000);
}
async function pushRemote() {
  if (pushing) { pendingPush = true; return; }
  pushing = true;
  setSync('saving');
  try {
    for (let attempt = 0; ; attempt++) {
      if (!remoteSha) {
        const r = await ghGet();
        if (r) { db = mergeDb(db, r.data); remoteSha = r.sha; }
      }
      const res = await ghPut(JSON.stringify(db, null, 2) + '\n', remoteSha);
      if (res.ok) { remoteSha = res.sha; store(LS.data, db); setSync('synced'); break; }
      if ((res.status === 409 || res.status === 422) && attempt < 3) { remoteSha = null; continue; }
      throw new Error(res.message || `GitHub ${res.status}`);
    }
  } catch (e) {
    setSync('error', e.message);
  } finally {
    pushing = false;
    if (pendingPush) { pendingPush = false; pushRemote(); }
  }
}
async function pullRemote() {
  if (!syncOn() || pushing) return;
  lastPull = Date.now();
  try {
    setSync('saving');
    const r = await ghGet();
    const before = JSON.stringify(db);
    if (r) { db = mergeDb(db, r.data); remoteSha = r.sha; } else remoteSha = null;
    store(LS.data, db);
    const after = JSON.stringify(db);
    if (after !== before && !isBusy()) render();
    if (!r || JSON.stringify(r.data) !== after) save(); else setSync('synced');
  } catch (e) {
    setSync('error', e.message);
  }
}
function setSync(state, msg) {
  const el = $('#sync');
  const labels = { local: 'This device', pending: 'Saving…', saving: 'Syncing…', synced: 'Synced', error: 'Sync error' };
  el.textContent = labels[state] || '';
  el.title = msg || (state === 'local' ? 'Saved in this browser only. Tap to set up sync.' : 'Sync status');
  el.style.color = state === 'error' ? 'var(--danger)' : '';
  const m = $('#syncMsg');
  if (m && msg) m.textContent = `Error: ${msg}`;
}
function guessSync() {
  const h = location.hostname;
  if (h.endsWith('.github.io')) {
    return { owner: h.split('.')[0], repo: location.pathname.split('/').filter(Boolean)[0] || h, branch: '', path: 'data.json' };
  }
  return { owner: 'velunonow', repo: 'my-real-x', branch: '', path: 'data.json' };
}

/* ---------- making stats ---------- */
function makingStreak() {
  const s = new Set();
  live('ideas').forEach((i) => (i.days || []).forEach((d) => s.add(d)));
  const d = new Date();
  if (!s.has(localDate(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (s.has(localDate(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function streakHtml() {
  const n = makingStreak();
  return n ? `<span class="streak">${icon('flame')}${plural(n, 'day')} of making</span>` : '<span class="streak">Make one thing to start a streak</span>';
}
function currentPrompt() {
  const dayNum = Math.floor(new Date(today()).getTime() / 864e5);
  return PROMPTS[(dayNum + promptShift) % PROMPTS.length];
}

/* ---------- URL parsing ---------- */
const X_HOSTS = ['x.com', 'twitter.com', 'fxtwitter.com', 'vxtwitter.com', 'fixupx.com'];
const X_RESERVED = new Set(['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search', 'compose', 'intent', 'share', 'hashtag', 'login', 'signup', 'tos', 'privacy']);
function parseUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^(www\.|mobile\.|m\.)/, '');
  const parts = u.pathname.split('/').filter(Boolean);
  if (X_HOSTS.includes(host)) {
    if (parts[1] === 'status' && /^\d+$/.test(parts[2] || '')) {
      if (parts[0] === 'i') return { kind: 'item', type: 'x', platform: 'x', handle: '', url: `https://x.com/i/status/${parts[2]}` };
      return { kind: 'item', type: 'x', platform: 'x', handle: parts[0], url: `https://x.com/${parts[0]}/status/${parts[2]}` };
    }
    if (parts[0] === 'i' && parts[1] === 'article' && parts[2]) return { kind: 'item', type: 'web', platform: 'x', handle: '', url: `https://x.com/i/article/${parts[2]}` };
    if (parts[0] && /^\w{1,15}$/.test(parts[0]) && !X_RESERVED.has(parts[0].toLowerCase()) &&
        (parts.length === 1 || ['with_replies', 'media', 'highlights', 'articles'].includes(parts[1]))) {
      return { kind: 'creator', platform: 'x', handle: parts[0], url: `https://x.com/${parts[0]}` };
    }
    return { kind: 'item', type: 'web', platform: 'x', handle: '', url: `https://x.com${u.pathname}` };
  }
  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const id = host === 'youtu.be' ? parts[0] : u.searchParams.get('v') || (['shorts', 'live', 'embed'].includes(parts[0]) ? parts[1] : null);
    if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'item', type: 'youtube', platform: 'youtube', videoId: id, handle: '', url: `https://www.youtube.com/watch?v=${id}` };
    if (parts[0] && parts[0].startsWith('@')) return { kind: 'creator', platform: 'youtube', handle: parts[0].slice(1), url: `https://www.youtube.com/${parts[0]}` };
    if (['channel', 'c', 'user'].includes(parts[0]) && parts[1]) return { kind: 'creator', platform: 'youtube', handle: parts[1], url: `https://www.youtube.com/${parts[0]}/${parts[1]}` };
  }
  u.hash = '';
  [...u.searchParams.keys()].forEach((k) => { if (/^utm_|^(fbclid|gclid|ref_src|mc_cid|mc_eid)$/.test(k)) u.searchParams.delete(k); });
  return { kind: 'item', type: 'web', platform: 'web', handle: '', url: u.href };
}
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}
function pathOf(url) {
  try { const u = new URL(url); return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, ''); } catch (e) { return url; }
}
function itemTitle(it) {
  if (it.title) return it.title;
  if (it.type === 'x') return it.author ? `A post by ${it.author}` : 'A post on X';
  if (it.type === 'youtube') return 'YouTube video';
  return pathOf(it.url);
}
function sourceLine(it) {
  if (it.type === 'x') return it.handle ? `${it.author ? `${it.author} · ` : ''}@${it.handle} on X` : 'X';
  if (it.type === 'youtube') return it.author ? `${it.author} · YouTube` : 'YouTube';
  return it.site || hostOf(it.url);
}
const threadLen = (it) => (Array.isArray(it.thread) && it.thread.length > 1 ? it.thread.length : 0);
function threadHtml(it) {
  const n = it.thread.length;
  return `<div class="thread">${it.thread.map((p, i) => `<section class="thread-part">
      <span class="thread-n">${i + 1}/${n}</span>
      ${p.text ? `<p class="post-text">${esc(p.text)}</p>` : ''}
      ${p.image ? `<img class="thread-img" src="${esc(p.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
    </section>`).join('')}</div>`;
}
const typeIcon = (it) => (it.type === 'x' ? '' : icon(it.type === 'youtube' ? 'play' : 'link'));
function itemImage(it) {
  if (it.image) return it.image;
  if (it.type === 'youtube' && /^[\w-]{6,20}$/.test(it.videoId || '')) return `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg`;
  const gh = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/.exec(it.url || '');
  if (gh) return `https://opengraph.githubassets.com/1/${gh[1]}/${gh[2]}`;
  return '';
}
function avatarHtml(c, cls = '') {
  const label = (c.name || c.handle || hostOf(c.url) || '?').replace(/^@/, '').charAt(0).toUpperCase();
  const src = c.avatar || (c.platform === 'x' && c.handle ? `https://unavatar.io/x/${encodeURIComponent(c.handle)}?fallback=false`
    : c.platform === 'youtube' && c.handle ? `https://unavatar.io/youtube/${encodeURIComponent(c.handle)}?fallback=false` : '');
  return `<span class="avatar ${cls}">${esc(label)}${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
}
const ideaTitle = (i) => i.title || (i.body || '').split('\n')[0].slice(0, 80) || 'Untitled idea';
const intentUrl = (i) => `https://x.com/intent/tweet?text=${encodeURIComponent((i.body || i.title || '').trim())}`;

/* ---------- embeds ---------- */
let twLoading = null;
function loadTwitter(el) {
  if (!el || !el.querySelector('.twitter-tweet')) return;
  if (window.twttr && window.twttr.widgets) { window.twttr.widgets.load(el); return; }
  if (!twLoading) {
    twLoading = new Promise((res) => {
      const s = document.createElement('script');
      s.src = 'https://platform.twitter.com/widgets.js';
      s.async = true; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
  }
  twLoading.then(() => window.twttr && window.twttr.widgets && window.twttr.widgets.load(el));
}
function embedHtml(it) {
  if (it.type === 'x') return `<div class="pad"><blockquote class="twitter-tweet" data-dnt="true"><a href="${esc(safeHref(it.url))}">Loading the post…</a></blockquote></div>`;
  if (it.type === 'youtube' && /^[\w-]{6,20}$/.test(it.videoId || '')) {
    return `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${it.videoId}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  }
  const img = itemImage(it);
  return img ? `<img class="media" src="${esc(img)}" alt="" onerror="this.remove()">` : '';
}

/* ---------- small pieces ---------- */
const imgTag = (src, cls = 'media') => (src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : '');
function chipsHtml(pairs, active, attrs) {
  return pairs.map(([val, label, n]) => `<button type="button" class="chip" ${attrs(val)} aria-pressed="${val === active}">${esc(label)}${n !== undefined ? `<span class="n">${n}</span>` : ''}</button>`).join('');
}
function tagChips(selected, scope) {
  return `<div class="chips wrap">${allTags().map((t) => `<button type="button" class="chip" data-act="tag-toggle" data-scope="${scope}" data-tag="${esc(t)}" aria-pressed="${selected.includes(t)}">${esc(t)}</button>`).join('')}
    <input class="chip-input" data-newtag="${scope}" placeholder="+ New tag" enterkeyhint="done" autocomplete="off"></div>`;
}
function syncTipHtml() {
  if (syncOn() || load(LS.syncTip)) return '';
  return `<div class="card pad small muted" style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px">
    <span style="flex:1">Saved on this device only. <a href="#" data-act="goto" data-view="settings">Turn on sync</a> so your phone and laptop match, and new links get their photos.</span>
    <button type="button" class="close" style="width:30px;height:30px;background:var(--sunk)" data-act="hide-sync-tip" aria-label="Hide">${icon('close')}</button></div>`;
}

/* ---------- cards ---------- */
function tileCard(it, even = false) {
  const img = itemImage(it);
  const quote = it.type === 'x' && it.text && !img && !it.title;
  // Even grid: every card gets the same picture area (a placeholder when there is no photo).
  const pic = even ? (quote ? '' : `<div class="ph">${img ? imgTag(img) : typeIcon(it) || icon('link')}</div>`) : imgTag(img);
  const flag = threadLen(it) ? `<span class="flag thread-flag">Thread · ${threadLen(it)} posts</span>` : '';
  return `<article class="card tile ${quote ? 'quote' : ''}" data-card="${it.id}" data-kind="items" data-open>
    ${pic}
    <div class="tile-body">
      ${quote || (it.type === 'x' && it.text && !it.title) ? `<p class="q">${esc(clip(it.text, 320))}</p>` : `<h3 class="t">${esc(itemTitle(it))}</h3>`}
      <p class="src">${typeIcon(it)}<span>${esc(sourceLine(it))}</span></p>
      ${madeLine(it)}${flag}
    </div></article>`;
}
function rowCard(it) {
  const img = itemImage(it);
  return `<article class="card rowcard" data-card="${it.id}" data-kind="items" data-open>
    ${img ? imgTag(img, 'thumb') : `<span class="thumb" style="display:grid;place-items:center;color:var(--faint)">${typeIcon(it)}</span>`}
    <span class="t">${esc(itemTitle(it))}</span>${icon('check')}</article>`;
}
function ideaCard(i) {
  const label = { idea: 'Idea', draft: 'Draft', published: 'Published' }[i.status] || 'Idea';
  return `<article class="card tile" data-card="${i.id}" data-kind="ideas" data-open>
    <div class="tile-body">
      <h3 class="t">${esc(ideaTitle(i))}</h3>
      ${i.body ? `<p class="note" style="margin:0 0 6px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${esc(clip(i.body, 220))}</p>` : ''}
      <span class="flag ${i.status === 'published' ? '' : 'muted'}">${label}</span>
    </div></article>`;
}
function outputCard(o) {
  const ins = inputsOf(o.id);
  return `<article class="card tile output" data-card="${o.id}" data-kind="outputs" data-open>
    <div class="tile-body">
      <span class="flag">${outputTypeLabel(o.type)}</span>
      <h3 class="t" style="margin-top:10px">${esc(outputTitle(o))}</h3>
      <p class="src"><span>${esc(dayOf(o.created_at))}${o.url ? ` · ${esc(hostOf(o.url))}` : ''}</span></p>
      ${ins.length ? `<div class="fed">${ins.slice(0, 3).map((it) => `<span>${itemImage(it) ? imgTag(itemImage(it), 'mini') : ''}${esc(clip(itemTitle(it), 42))}</span>`).join('')}${ins.length > 3 ? `<span class="muted">+ ${ins.length - 3} more</span>` : ''}</div>`
        : '<p class="tiny muted" style="margin:8px 0 0">Not linked to any saves yet</p>'}
    </div></article>`;
}
function linkRow(it, mode) {
  const img = itemImage(it);
  const thumb = img ? imgTag(img, 'thumb') : `<span class="thumb" style="display:grid;place-items:center;color:var(--faint)">${typeIcon(it) || icon('link')}</span>`;
  if (mode === 'linked') {
    return `<div class="card rowcard">${thumb}<span class="t">${esc(itemTitle(it))}</span>
      <button type="button" class="close" style="width:32px;height:32px;background:var(--sunk)" data-act="unlink" data-item="${it.id}" aria-label="Unlink">${icon('close')}</button></div>`;
  }
  const on = mode === 'on';
  return `<button type="button" class="card rowcard pick ${on ? 'on' : ''}" data-act="link-toggle" data-item="${it.id}" aria-pressed="${on}">${thumb}<span class="t">${esc(itemTitle(it))}</span>${on ? icon('check') : icon('plus')}</button>`;
}

function personCard(c) {
  const trialDay = daysSince(c.trialStart || c.added) + 1;
  const due = c.status === 'trial' && trialDay > TRIAL_DAYS;
  return `<article class="card tile person" data-card="${c.id}" data-kind="creators" data-open>
    ${avatarHtml(c)}
    <h3 class="name">${esc(c.name || (c.handle ? c.handle : hostOf(c.url)))}</h3>
    <p class="handle">${c.handle ? `@${esc(c.handle)}` : esc(hostOf(c.url))}</p>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
    ${c.status === 'trial' ? `<span class="flag ${due ? '' : 'muted'}">${due ? 'Keep or drop?' : `Trial · day ${Math.min(trialDay, TRIAL_DAYS)} of ${TRIAL_DAYS}`}</span>` : ''}
  </article>`;
}

/* ---------- views ---------- */
function renderLibrary() {
  const f = filters.lib;
  const items = live('items');
  return `<section class="page-head">
      <h1 class="display">Collection</h1>
      <p class="sub">${plural(items.length, 'thing')} you chose to keep.</p>
    </section>
    ${syncTipHtml()}
    ${nudgeHtml()}
    <div class="search">${icon('search')}<input type="search" data-filter="lib.q" placeholder="Search your collection" value="${esc(f.q)}" enterkeyhint="search"></div>
    <div class="chips">${chipsHtml([['', 'All tags'], ...allTags().map((t) => [t, t]), ['__none', 'No tag yet']], f.tag,
      (v) => `data-act="filter" data-group="lib" data-key="tag" data-val="${esc(v)}"`)}</div>
    <div id="libList"></div>`;
}
function nudgeHtml() {
  if (load(LS.nudge) === weekKey()) return '';
  const weekAgo = Date.now() - 7 * 864e5;
  const idle = live('items').filter((i) => i.added && new Date(i.added).getTime() < weekAgo && !outputsFrom(i.id).length)
    .sort((a, b) => (a.added || '').localeCompare(b.added || ''));
  if (!idle.length) return '';
  return `<section class="nudge">
    <div class="row-head"><h2 class="section" style="margin:0">Waiting for you<span class="count">${idle.length}</span></h2>
      <button type="button" class="btn quiet" data-act="hide-nudge">Hide this week</button></div>
    <p class="sub small" style="margin:4px 0 12px">Saved over a week ago, nothing made from them yet.</p>
    <div class="strip">${idle.slice(0, 12).map((it) => `<article class="card mini-card" data-card="${it.id}" data-kind="items" data-open>
      ${itemImage(it) ? imgTag(itemImage(it)) : `<div class="ph-s">${typeIcon(it) || icon('link')}</div>`}<p>${esc(clip(itemTitle(it), 60))}</p></article>`).join('')}</div>
  </section>`;
}
function renderLibList() {
  const el = $('#libList');
  if (!el) return;
  const f = filters.lib;
  const q = f.q.trim().toLowerCase();
  const list = live('items').filter((i) => (!f.status || i.status === f.status) &&
      (!f.tag || (f.tag === '__none' ? !(i.tags || []).length : (i.tags || []).includes(f.tag))) &&
      (!q || [i.title, i.note, i.text, i.takeaway, i.handle, i.author, i.url, ...(i.tags || []), ...(i.thread || []).map((p) => p.text)].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  el.innerHTML = list.length
    ? `<div class="masonry dense">${list.slice(0, libLimit).map(tileCard).join('')}</div>${list.length > libLimit ? '<button type="button" class="btn block" data-act="more-lib">Show more</button>' : ''}`
    : '<div class="card empty"><p class="display-s">Nothing here.</p>Try another filter, or tap + to add something.</div>';
}

function outputsSection() {
  const outs = live('outputs').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return `<div class="row-head" style="margin:32px 4px 12px"><h2 class="section" style="margin:0">Things I made<span class="count">${outs.length}</span></h2>
      <button type="button" class="btn soft" data-act="new-output">${icon('plus')}New</button></div>
    ${outs.length ? `<div class="masonry">${outs.map(outputCard).join('')}</div>`
      : '<div class="card empty"><p class="display-s">Nothing made yet.</p>Open anything in your collection and tap <b>Make something from this</b>, or tap New.</div>'}`;
}
function renderCreate() {
  const all = live('ideas').sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const group = (st) => all.filter((i) => i.status === st);
  const section = (title, list) => (list.length ? `<h2 class="section">${title}<span class="count">${list.length}</span></h2><div class="masonry">${list.map(ideaCard).join('')}</div>` : '');
  return `<section class="page-head">
      <h1 class="display">Create</h1>
      <p class="sub">${streakHtml()}</p>
    </section>
    <form data-form="quick" class="card pad" style="display:flex;gap:10px;align-items:center;padding:10px 10px 10px 18px">
      <input class="plain" name="text" placeholder="A thought worth keeping…" autocomplete="off" style="font-family:var(--serif);font-size:19px">
      <button class="btn primary">Save</button>
    </form>
    <section class="card forest pad">
      <p class="display-s">${esc(currentPrompt())}</p>
      <div class="actions">
        <button type="button" class="btn light" data-act="draft-from-prompt">${icon('pen')}Write this</button>
        <button type="button" class="btn ghost-light" data-act="another-prompt">Another prompt</button>
      </div>
      <p class="tiny" style="margin:14px 0 0">For every two things you read, make one. Small counts.</p>
    </section>
    ${outputsSection()}
    ${section('Drafts', group('draft'))}${section('Ideas', group('idea'))}${section('Published', group('published'))}
    ${all.length ? '' : '<div class="card empty" style="margin-top:14px"><p class="display-s">Your first idea goes here.</p>Write a thought above, or tap “Make from this” on anything you read.</div>'}`;
}

function renderPeople() {
  const s = db.settings;
  const f = filters.people;
  const people = live('creators');
  const n = (st) => people.filter((c) => c.status === st).length;
  const trusted = n('trusted');
  return `<section class="page-head">
      <h1 class="display">People</h1>
      <p class="sub">Visit on purpose. Read, then leave.${trusted > TRUSTED_SOFT_MAX ? ` You trust ${trusted} people — adding one? Consider dropping one.` : ''}</p>
    </section>
    ${s.xListUrl ? `<a class="card forest pad" href="${esc(safeHref(s.xListUrl))}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;text-decoration:none">
        <span class="display-s" style="flex:1">Open my X List</span>${icon('open')}</a>`
      : `<div class="card pad small muted">Put your trusted people in a private <b>X List</b> and paste its link in Settings. A List shows only them, newest first — no “For You”.</div>`}
    <div class="chips" style="margin-top:18px">${chipsHtml([['trusted', 'Trusted', trusted], ['trial', 'On trial', n('trial')], ['', 'Everyone', people.length]], f.status,
      (v) => `data-act="filter" data-group="people" data-key="status" data-val="${esc(v)}"`)}</div>
    <div class="chips">${chipsHtml([['', 'All tags'], ...allTags().map((t) => [t, t])], f.tag,
      (v) => `data-act="filter" data-group="people" data-key="tag" data-val="${esc(v)}"`)}</div>
    <div id="peopleList"></div>
    <details class="card" style="margin-top:18px"><summary>How to find new people, once a week</summary>
      <ul class="small">
        <li><b>One slot a week</b> (say Sunday, 20 minutes) for discovery. The rest of the week: no searching, no “For You”.</li>
        <li><b>Follow the trail of people you trust</b>: who do they quote, reply to, recommend? Their picks are already filtered.</li>
        <li>Saving a great post from someone new? Tap <b>Follow on trial</b> after saving it.</li>
        <li>For YouTube and blogs: the newsletters, podcasts and blogrolls your trusted people mention.</li>
        <li><b>${TRIAL_DAYS}-day trial:</b> keep someone only if they gave you an idea you used, or made you want to create.</li>
      </ul></details>`;
}
function renderPeopleList() {
  const el = $('#peopleList');
  if (!el) return;
  const f = filters.people;
  const list = live('creators').filter((c) => (!f.status || c.status === f.status) && (!f.tag || (c.tags || []).includes(f.tag)))
    .sort((a, b) => (a.name || a.handle || '').localeCompare(b.name || b.handle || ''));
  el.innerHTML = list.length ? `<div class="masonry">${list.map(personCard).join('')}</div>`
    : `<div class="card empty"><p class="display-s">No one here yet.</p>${f.status === 'trial' ? 'New people start here for two weeks.' : 'Tap + and paste someone’s profile link.'}</div>`;
}

function renderSettings() {
  const s = db.settings;
  const g = sync || guessSync();
  return `<section class="page-head"><h1 class="display">Settings</h1></section>
    <div class="settings">
    <section class="card"><h3>X List</h3>
      <label><span class="field-label" style="margin-top:0">My X List link (optional)</span><input class="boxed" type="url" id="setList" placeholder="https://x.com/i/lists/…" value="${esc(s.xListUrl)}"></label>
      <div class="actions"><button type="button" class="btn primary" data-act="settings-save">Save</button></div>
    </section>
    <section class="card"><h3>Tags</h3>
      <div class="chips wrap">${s.tags.map((t) => `<span class="chip">${esc(t)}<button type="button" class="tag-x" data-act="tag-del" data-tag="${esc(t)}" aria-label="Remove tag ${esc(t)}">×</button></span>`).join('')}
        <input class="chip-input" data-newtag="settings" placeholder="+ New tag" enterkeyhint="done"></div>
    </section>
    <section class="card"><h3>Sync across devices</h3>
      <p class="small muted" style="margin-top:0">Without sync, changes stay in this browser. With sync, every change is saved to <code>data.json</code> in your GitHub repo, so phone and laptop match. The token stays in this browser only.</p>
      <ol class="steps">
        <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → new fine-grained token</a>.</li>
        <li>Repository access: <b>Only select repositories</b> → <code>${esc(g.repo)}</code>.</li>
        <li>Permissions → Repository → <b>Contents: Read and write</b>. Generate, copy, paste below.</li>
        <li>Do this once on each device.</li>
      </ol>
      <label><span class="field-label">Token</span><input class="boxed" id="syToken" type="password" placeholder="github_pat_…" value="${esc((sync && sync.token) || '')}" autocomplete="off"></label>
      <details style="margin-top:10px"><summary class="small muted" style="cursor:pointer">Repository details</summary>
        <div class="grid2" style="margin-top:8px">
          <label><span class="field-label">Owner</span><input class="boxed" id="syOwner" value="${esc(g.owner)}"></label>
          <label><span class="field-label">Repo</span><input class="boxed" id="syRepo" value="${esc(g.repo)}"></label>
          <label><span class="field-label">Branch (empty = default)</span><input class="boxed" id="syBranch" value="${esc(g.branch || '')}"></label>
          <label><span class="field-label">File</span><input class="boxed" id="syPath" value="${esc(g.path || 'data.json')}"></label>
        </div></details>
      <div class="actions"><button type="button" class="btn primary" data-act="sync-save">Save & sync now</button>${syncOn() ? '<button type="button" class="btn" data-act="sync-off">Disconnect this device</button>' : ''}</div>
      <p class="small muted" id="syncMsg">${syncOn() ? 'Connected.' : 'Not connected — saving on this device only.'}</p>
    </section>
    <section class="card"><h3>Backup</h3>
      <div class="actions" style="margin-top:0"><button type="button" class="btn" data-act="export">Download backup</button>
        <label class="btn">Import backup<input type="file" accept="application/json,.json" id="importFile" hidden></label></div>
    </section>
    <section class="card"><h3>Tame X itself</h3>
      <ul class="small muted" style="padding-left:18px;margin:0">
        <li>Make a <b>private X List</b> of your trusted people, pin it, and paste its link above.</li>
        <li>On X, use that List or <b>Following</b> — never <b>For You</b>.</li>
        <li>Move good bookmarks here (+ → Many links at once), then clear your X bookmarks.</li>
        <li>Unfollow or mute anyone you dropped after a trial.</li>
        <li>Swap the X app on your home screen for My Real X (browser Share → Add to Home Screen).</li>
        <li>On Android, after installing: Share → My Real X from any app.</li>
      </ul>
    </section></div>`;
}

function render() {
  $$('#nav [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.body.dataset.view = view;
  const main = $('#main');
  const fn = { create: renderCreate, library: renderLibrary, people: renderPeople, settings: renderSettings }[view] || renderLibrary;
  main.innerHTML = fn();
  if (view === 'library') renderLibList();
  if (view === 'people') renderPeopleList();
}
function goView(v) { view = v; libLimit = LIB_PAGE; window.scrollTo(0, 0); render(); }
function isBusy() {
  const a = document.activeElement;
  return $('#sheet').open || (a && a.matches && a.matches('input, textarea'));
}

/* ---------- sheets ---------- */
let sheetCtx = null;
function openSheet(html, { forest = false, ctx = null } = {}) {
  const d = $('#sheet');
  if (sheetCtx && sheetCtx.dirty) { clearTimeout(fieldSaveT); const r = sheetRec(); if (r) upsert(sheetCtx.table, r); }
  sheetCtx = ctx;
  d.className = forest ? 'forest-sheet' : '';
  $('#sheetBody').innerHTML = `<div class="grabber"></div><div class="sheet-top"><button type="button" class="close" data-act="sheet-close" aria-label="Close">${icon('close')}</button></div>${html}`;
  if (!d.open) d.showModal();
  d.scrollTop = 0;
  loadTwitter($('#sheetBody'));
}
function closeSheet() { const d = $('#sheet'); if (d.open) d.close(); }

/* capture: one box for everything */
function openCapture(prefill = '') {
  openSheet(`
    <h2 class="display">What did you find today?</h2>
    <div class="capture-box"><textarea class="plain" id="capIn" rows="2" placeholder="Paste a link, or write a thought" enterkeyhint="done">${esc(prefill)}</textarea></div>
    <p class="hint" id="capHint"></p>
    <div id="capSave"></div>
    <div class="choice-grid" id="capChoices">
      <button type="button" class="choice tilt-l" data-act="cap-paste">${icon('clipboard')}<span>Paste from clipboard</span></button>
      <button type="button" class="choice dark tilt-r" data-act="cap-bulk">${icon('layers')}<span>Many links at once</span></button>
    </div>`, { forest: true, ctx: { kind: 'capture' } });
  updateCapture();
  if (!prefill) setTimeout(() => { const t = $('#capIn'); if (t) t.focus(); }, 60);
}
function detect(text) {
  const v = text.trim();
  if (!v) return null;
  const m = v.match(/^https?:\/\/\S+$/);
  if (!m) return { kind: 'idea', hint: 'A thought — it will be saved as an idea in Create.' };
  const p = parseUrl(v);
  if (!p) return { kind: 'idea', hint: 'A thought — it will be saved as an idea in Create.' };
  if (p.kind === 'creator') return { kind: 'creator', p, hint: `A person on ${p.platform === 'x' ? 'X' : 'YouTube'} — they’ll start on a ${TRIAL_DAYS}-day trial.` };
  const existing = findItemByUrl(p.url);
  if (existing) return { kind: 'item', p, existing, hint: 'Already in your collection — saving opens it.' };
  if (/^https:\/\/x\.com\/i\/article\//.test(p.url)) return { kind: 'item', p, hint: 'An X article. Tip: save the post that shares it (x.com/name/status/…) instead — that way you get its title and cover photo.' };
  const what = p.type === 'x' ? `An X post${p.handle ? ` by @${p.handle}` : ''}` : p.type === 'youtube' ? 'A YouTube video' : `A link from ${hostOf(p.url)}`;
  return { kind: 'item', p, hint: `${what} — it will be saved to your collection.` };
}
function updateCapture() {
  const t = $('#capIn');
  if (!t) return;
  const d = detect(t.value);
  $('#capHint').textContent = d ? d.hint : 'One box for everything. It works out what you pasted.';
  $('#capSave').innerHTML = d ? `<button type="button" class="btn light big block" data-act="cap-save" style="margin-top:14px">${icon('check')}Save</button>` : '';
  $('#capChoices').style.display = d ? 'none' : '';
  t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`;
}
function captureSave() {
  const text = $('#capIn').value.trim();
  const d = detect(text);
  if (!d) return;
  if (d.kind === 'idea') {
    const lines = text.split('\n');
    const body = lines.length > 1 || lines[0].length > 120 ? text : '';
    const idea = newIdea({ title: lines[0].slice(0, 120), body, status: body ? 'draft' : 'idea', days: [today()] });
    showSaved('ideas', idea.id);
    return;
  }
  if (d.kind === 'creator') {
    let c = findCreator(d.p.platform, d.p.handle);
    if (!c) { c = { id: uid(), added: nowIso(), name: '', handle: d.p.handle, platform: d.p.platform, url: d.p.url, status: 'trial', note: '', foundVia: '', tags: [] }; upsert('creators', c); }
    showSaved('creators', c.id);
    return;
  }
  if (d.existing) { openItem(d.existing.id); return; }
  const it = { id: uid(), added: nowIso(), status: 'unread', url: d.p.url, type: d.p.type, handle: d.p.handle || '', videoId: d.p.videoId || '', title: '', note: '', tags: [] };
  upsert('items', it);
  showSaved('items', it.id);
}
function showSaved(kind, id) {
  const rec = byId(kind, id);
  let preview = '';
  let extra = '';
  if (kind === 'items') {
    preview = tileCard(rec).replace(' data-open', '');
    const c = rec.handle ? findCreator('x', rec.handle) : null;
    extra = `${rec.handle && !c ? `<div class="chips" style="margin-top:22px"><button type="button" class="chip" data-act="follow-author" aria-pressed="false">Follow @${esc(rec.handle)} on trial</button></div>` : ''}`;
  } else if (kind === 'creators') {
    preview = personCard(rec).replace(' data-open', '');
    extra = `<span class="field-label">Trust</span><div class="seg">${[['trial', `On trial (${TRIAL_DAYS} days)`], ['trusted', 'Trusted']].map(([v, l]) => `<button type="button" data-act="set-status" data-scope="cap" data-status="${v}" aria-pressed="${rec.status === v}">${l}</button>`).join('')}</div>`;
  } else {
    preview = ideaCard(rec).replace(' data-open', '');
  }
  openSheet(`
    <h2 class="display">Saved.</h2>
    <div class="saved-card">${preview}</div>
    ${extra}
    <span class="field-label">Tags (optional)</span>
    ${tagChips(rec.tags || [], 'cap')}
    <div class="actions" style="margin-top:26px">
      <button type="button" class="btn light big" data-act="sheet-close">Done</button>
      ${kind === 'ideas' ? `<button type="button" class="btn ghost-light big" data-act="open-idea" data-id="${id}">Keep writing</button>` : ''}
      <button type="button" class="btn ghost-light big" data-act="cap-again">Add another</button>
    </div>`, { forest: true, ctx: { kind: 'saved', table: kind, id } });
}
function openBulk() {
  openSheet(`
    <h2 class="display">Many links at once.</h2>
    <p class="hint">Paste anything that contains links — your old X bookmarks, a note, a list. Profile links become people on trial; everything else goes to your collection.</p>
    <div class="capture-box"><textarea class="plain" id="bulkIn" rows="7" placeholder="https://x.com/…&#10;https://youtube.com/…"></textarea></div>
    <button type="button" class="btn light big block" data-act="bulk-save" style="margin-top:16px">Save all</button>`, { forest: true, ctx: { kind: 'bulk' } });
  setTimeout(() => { const t = $('#bulkIn'); if (t) t.focus(); }, 60);
}
function saveBulk() {
  const urls = [...new Set($('#bulkIn').value.match(/https?:\/\/[^\s<>"')\]]+/g) || [])];
  let items = 0; let people = 0; let dup = 0;
  for (const u of urls) {
    const p = parseUrl(u);
    if (!p) continue;
    const base = { id: uid(), added: nowIso(), updated: nowIso(), tags: [] };
    if (p.kind === 'creator') {
      if (findCreator(p.platform, p.handle)) { dup++; continue; }
      db.creators.push({ ...base, name: '', handle: p.handle, platform: p.platform, url: p.url, status: 'trial', note: '', foundVia: 'bulk add' });
      people++;
    } else {
      if (findItemByUrl(p.url)) { dup++; continue; }
      db.items.push({ ...base, status: 'unread', url: p.url, type: p.type, handle: p.handle || '', videoId: p.videoId || '', title: '', note: '' });
      items++;
    }
  }
  save();
  closeSheet();
  toast(`Saved ${plural(items, 'link')}, ${plural(people, 'person', 'people')}${dup ? ` · ${dup} already saved` : ''}`);
  if (items) { filters.lib = { q: '', status: '', tag: '__none' }; goView('library'); }
}

/* detail sheets: edit in place, no forms */
function openItem(id) {
  const it = byId('items', id);
  if (!it) return;
  const media = threadLen(it) ? '' : embedHtml(it);
  openSheet(`
    ${media ? `<div class="sheet-media">${media}</div>` : ''}
    <textarea class="plain title" data-field="title" rows="1" placeholder="${esc(itemTitle(it))}">${esc(it.title || '')}</textarea>
    <p class="src" style="margin-top:8px">${typeIcon(it)}<span>${esc(sourceLine(it))}</span> · <a href="${esc(safeHref(it.url))}" target="_blank" rel="noopener">Open original</a></p>
    ${threadLen(it) ? `<span class="field-label">Thread · ${threadLen(it)} posts</span>${threadHtml(it)}`
      : it.type === 'x' && it.text && !media.includes('twitter-tweet') ? `<p class="post-text">${esc(it.text)}</p>` : ''}
    <textarea class="plain note" data-field="note" rows="2" placeholder="Why is this worth your time? (optional)">${esc(it.note || '')}</textarea>
    <span class="field-label">Tags</span>
    ${tagChips(it.tags || [], 'item')}
    <span class="field-label">Made from this</span>
    ${(() => { const outs = outputsFrom(it.id); return outs.length ? outs.map((o) => `<button type="button" class="card rowcard pick" data-act="open-output" data-id="${o.id}"><span class="flag">${outputTypeLabel(o.type)}</span><span class="t">${esc(outputTitle(o))}</span>${icon('open')}</button>`).join('') : '<p class="small muted" style="margin:0">Nothing yet</p>'; })()}
    <div class="actions" style="margin-top:26px">
      <button type="button" class="btn primary" data-act="make-output">${icon('pen')}Make something from this</button>
      <button type="button" class="btn danger" data-act="delete">${icon('trash')}Delete</button>
    </div>`, { ctx: { kind: 'item', table: 'items', id } });
  autoGrow();
}
function openOutput(id, { picking = false, q = '' } = {}) {
  const o = byId('outputs', id);
  if (!o) return;
  const ins = inputsOf(o.id);
  const urlHint = o.type === 'post' ? 'Link to the published X post' : o.type === 'product' ? 'Link to the product (optional)' : 'Link (optional)';
  openSheet(`
    <div class="seg">${OUTPUT_TYPES.map(([v, l]) => `<button type="button" data-act="out-type" data-type="${v}" aria-pressed="${o.type === v}">${l}</button>`).join('')}</div>
    <textarea class="plain title" data-field="title" rows="1" placeholder="What did you make?" style="margin-top:20px">${esc(o.title || '')}</textarea>
    <textarea class="plain note" data-field="notes" rows="2" placeholder="Notes (optional)">${esc(o.notes || '')}</textarea>
    <span class="field-label">${o.type === 'post' ? 'Published post' : 'Link'}</span>
    <div style="display:flex;gap:8px;align-items:center">
      <input class="boxed" type="url" data-field="url" value="${esc(o.url || '')}" placeholder="${urlHint}" inputmode="url">
      ${o.url && safeHref(o.url) !== '#' ? `<a class="btn soft" href="${esc(safeHref(o.url))}" target="_blank" rel="noopener" aria-label="Open link">${icon('open')}</a>` : ''}
    </div>
    <span class="field-label">Made on</span>
    <input class="boxed" type="date" data-field="created_at" value="${esc(dayOf(o.created_at))}" style="max-width:200px">
    <span class="field-label">Made from ${ins.length ? `(${ins.length})` : ''}</span>
    <div id="linkedList">${ins.map((it) => linkRow(it, 'linked')).join('') || '<p class="small muted" style="margin:0 0 4px">No saves linked yet.</p>'}</div>
    ${picking ? `<div class="search" style="margin:12px 0 10px">${icon('search')}<input type="search" id="pickQ" placeholder="Find a save to link" value="${esc(q)}" enterkeyhint="search"></div><div id="pickList"></div>`
      : '<button type="button" class="btn soft" data-act="pick-open" style="margin-top:10px">' + icon('plus') + 'Link saves</button>'}
    <div class="actions" style="margin-top:26px"><button type="button" class="btn danger" data-act="delete">${icon('trash')}Delete</button></div>`,
  { ctx: { kind: 'output', table: 'outputs', id, picking, q } });
  if (picking) renderPicker();
  autoGrow();
}
function renderPicker() {
  const el = $('#pickList');
  if (!el || !sheetCtx || sheetCtx.table !== 'outputs') return;
  const q = (($('#pickQ') || {}).value || '').trim().toLowerCase();
  sheetCtx.q = q;
  const linked = new Set(inputsOf(sheetCtx.id).map((i) => i.id));
  const list = live('items').filter((i) => !q || [i.title, i.text, i.note, i.handle, i.author, i.url, ...(i.tags || [])].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.added || '').localeCompare(a.added || '')).slice(0, 30);
  el.innerHTML = list.map((it) => linkRow(it, linked.has(it.id) ? 'on' : 'off')).join('') || '<p class="small muted">No saves match.</p>';
}

function openPerson(id) {
  const c = byId('creators', id);
  if (!c) return;
  const saved = c.handle ? live('items').filter((i) => (i.handle || '').toLowerCase() === c.handle.toLowerCase()) : [];
  openSheet(`
    <div class="person" style="padding:0;text-align:left">${avatarHtml(c)}</div>
    <textarea class="plain title" data-field="name" rows="1" placeholder="${esc(c.handle ? `@${c.handle}` : 'Name')}">${esc(c.name || '')}</textarea>
    <p class="src" style="margin-top:6px"><span>${c.handle ? `@${esc(c.handle)} · ` : ''}${c.platform === 'x' ? 'X' : c.platform === 'youtube' ? 'YouTube' : esc(hostOf(c.url))}</span></p>
    <textarea class="plain note" data-field="note" rows="2" placeholder="Why do I follow them? (optional)">${esc(c.note || '')}</textarea>
    <div class="actions"><a class="btn primary big" href="${esc(safeHref(c.url))}" target="_blank" rel="noopener">${icon('open')}Visit</a></div>
    <span class="field-label">Trust</span>
    <div class="seg">${[['trial', `On trial · day ${Math.min(daysSince(c.trialStart || c.added) + 1, TRIAL_DAYS)} of ${TRIAL_DAYS}`], ['trusted', 'Trusted']].map(([v, l]) => `<button type="button" data-act="set-status" data-scope="person" data-status="${v}" aria-pressed="${c.status === v}">${l}</button>`).join('')}</div>
    <span class="field-label">Tags</span>
    ${tagChips(c.tags || [], 'person')}
    <span class="field-label">Found via</span>
    <input class="boxed" data-field="foundVia" value="${esc(c.foundVia || '')}" placeholder="Someone’s post, a podcast…">
    ${saved.length ? `<span class="field-label">Saved from them</span>${saved.map(rowCard).join('')}` : ''}
    <div class="actions" style="margin-top:26px"><button type="button" class="btn danger" data-act="delete">${icon('trash')}Drop this person</button></div>`,
  { ctx: { kind: 'person', table: 'creators', id } });
  autoGrow();
}
function openIdeaSheet(id) {
  const i = byId('ideas', id);
  if (!i) return;
  const src = i.sourceId ? byId('items', i.sourceId) : null;
  openSheet(`
    <textarea class="plain title" data-field="title" rows="1" placeholder="Title or hook">${esc(i.title || '')}</textarea>
    ${src ? `<p class="src" style="margin-top:8px"><span>From <a href="#" data-act="open-item" data-id="${src.id}">${esc(itemTitle(src))}</a></span></p>` : ''}
    <textarea class="plain body" data-field="body" style="margin-top:16px" placeholder="Write freely. Done is better than perfect.">${esc(i.body || '')}</textarea>
    <p class="tiny muted" id="charCount">${(i.body || '').length} characters</p>
    <div class="actions">
      <a class="btn primary" target="_blank" rel="noopener" id="intentLink" href="${esc(intentUrl(i))}">${icon('send')}Post on X</a>
      <button type="button" class="btn soft" data-act="copy">${icon('copy')}Copy</button>
      ${i.status !== 'published' ? `<button type="button" class="btn" data-act="publish">${icon('check')}Mark published</button>`
        : `${i.publishedUrl ? `<a class="btn" target="_blank" rel="noopener" href="${esc(safeHref(i.publishedUrl))}">${icon('open')}View post</a>` : ''}<button type="button" class="btn" data-act="unpublish">${icon('undo')}Back to draft</button>`}
      <button type="button" class="btn danger" data-act="delete">${icon('trash')}Delete</button>
    </div>`, { ctx: { kind: 'idea', table: 'ideas', id } });
  autoGrow();
}
function autoGrow() {
  $$('#sheetBody textarea.title, #sheetBody textarea.note').forEach((t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; });
}

/* ---------- ideas ---------- */
function newIdea(fields) {
  const idea = { id: uid(), added: nowIso(), status: 'idea', title: '', body: '', tags: [], days: [], ...fields };
  upsert('ideas', idea);
  return idea;
}
function writeIdea(fields) {
  const idea = newIdea(fields);
  view = 'create';
  render();
  openIdeaSheet(idea.id);
  setTimeout(() => { const b = $('#sheetBody [data-field=body]'); if (b) b.focus(); }, 80);
}
function newIdeaFromItem(it) {
  writeIdea({ title: `My take on: ${itemTitle(it)}`, body: it.takeaway ? `${it.takeaway}\n\n` : '', sourceId: it.id, tags: (it.tags || []).slice() });
}
/* ---------- events ---------- */
let fieldSaveT = null;
function sheetRec() { return sheetCtx && sheetCtx.table ? byId(sheetCtx.table, sheetCtx.id) : null; }

function onClick(e) {
  const a = e.target.closest('[data-act], [data-open]');
  if (!a) return;
  const act = a.dataset.act || 'open';
  if (a.tagName === 'A' && (a.getAttribute('href') === '#' || act === 'goto')) e.preventDefault();
  const card = a.closest('[data-card]');
  const inSheet = !!a.closest('#sheet');
  const id = card ? card.dataset.card : null;
  const kind = card ? card.dataset.kind : null;
  const rec = inSheet && !card ? sheetRec() : id ? byId(kind, id) : null;
  const table = inSheet && !card ? sheetCtx && sheetCtx.table : kind;

  switch (act) {
    case 'goto': closeSheet(); goView(a.dataset.view); break;
    case 'open':
      if (!rec) break;
      if (table === 'items') openItem(rec.id); else if (table === 'ideas') openIdeaSheet(rec.id); else if (table === 'creators') openPerson(rec.id); else if (table === 'outputs') openOutput(rec.id);
      break;
    case 'open-item': openItem(a.dataset.id); break;
    case 'open-idea': openIdeaSheet(a.dataset.id); break;
    case 'sheet-close': closeSheet(); break;
    case 'filter': {
      filters[a.dataset.group][a.dataset.key] = a.dataset.val;
      libLimit = LIB_PAGE;
      render();
      break;
    }
    case 'make-idea': if (rec) newIdeaFromItem(rec); break;
    case 'make-output': if (rec) newOutput([rec.id]); break;
    case 'new-output': newOutput(); break;
    case 'open-output': openOutput(a.dataset.id); break;
    case 'out-type': if (rec) { rec.type = a.dataset.type; upsert('outputs', rec); openOutput(rec.id, { picking: sheetCtx.picking, q: sheetCtx.q }); } break;
    case 'pick-open': if (rec) { openOutput(rec.id, { picking: true }); setTimeout(() => { const p = $('#pickQ'); if (p) p.focus(); }, 60); } break;
    case 'link-toggle':
    case 'unlink': {
      const o = sheetRec();
      if (!o) break;
      const itemId = a.dataset.item;
      setLink(o.id, itemId, act === 'link-toggle' ? !byId('output_inputs', linkId(o.id, itemId)) : false);
      const y = $('#sheet').scrollTop;
      openOutput(o.id, { picking: sheetCtx.picking, q: sheetCtx.q });
      $('#sheet').scrollTop = y;
      break;
    }
    case 'hide-nudge': store(LS.nudge, weekKey()); render(); break;
    case 'set-status': {
      if (!rec) break;
      const st = a.dataset.status;
      if (table === 'creators' && rec.status === 'trusted' && st === 'trial') rec.trialStart = nowIso();
      rec.status = st;
      if (table === 'items') { if (st === 'read' && !rec.readAt) rec.readAt = nowIso(); if (st === 'unread') delete rec.readAt; }
      upsert(table, rec);
      $$('[data-act=set-status]', a.parentElement).forEach((b) => b.setAttribute('aria-pressed', String(b === a)));
      break;
    }
    case 'tag-toggle': {
      if (!rec) break;
      const t = a.dataset.tag;
      rec.tags = rec.tags || [];
      rec.tags = rec.tags.includes(t) ? rec.tags.filter((x) => x !== t) : [...rec.tags, t];
      upsert(table, rec);
      a.setAttribute('aria-pressed', String(rec.tags.includes(t)));
      break;
    }
    case 'follow-author': {
      if (!rec || findCreator('x', rec.handle)) break;
      upsert('creators', { id: uid(), added: nowIso(), name: rec.author || '', handle: rec.handle, platform: 'x', url: `https://x.com/${rec.handle}`, status: 'trial', note: '', foundVia: `post: ${rec.url}`, tags: (rec.tags || []).slice() });
      a.setAttribute('aria-pressed', 'true');
      a.textContent = `Following @${rec.handle} on trial`;
      break;
    }
    case 'delete': {
      if (!rec) break;
      const what = table === 'creators' ? 'Drop this person? Their saved posts stay in your collection. (Unfollow them on X too.)' : 'Delete this for good?';
      if (confirm(what)) {
        if (table === 'items' || table === 'outputs') {
          const key = table === 'items' ? 'item_id' : 'output_id';
          liveLinks().filter((l) => l[key] === rec.id).forEach((l) => removeRec('output_inputs', l.id));
        }
        removeRec(table, rec.id); closeSheet(); toast(table === 'creators' ? 'Dropped' : 'Deleted');
      }
      break;
    }
    case 'publish': {
      const u = prompt('Nice! Paste the link to your published post (optional):', '');
      if (u === null) break;
      rec.status = 'published';
      rec.publishedAt = nowIso();
      if (/^https?:\/\//.test(u.trim())) rec.publishedUrl = u.trim();
      addDay(rec);
      upsert('ideas', rec);
      openIdeaSheet(rec.id);
      toast('Published. That counts.');
      break;
    }
    case 'unpublish': rec.status = 'draft'; upsert('ideas', rec); openIdeaSheet(rec.id); break;
    case 'copy':
      if (navigator.clipboard) navigator.clipboard.writeText(rec.body || rec.title || '').then(() => toast('Copied'), () => toast('Copy failed'));
      break;
    case 'draft-from-prompt': writeIdea({ title: currentPrompt() }); break;
    case 'another-prompt': promptShift++; render(); break;
    case 'more-lib': libLimit += LIB_PAGE; renderLibList(); break;
    case 'open-capture': openCapture(); break;
    case 'hide-sync-tip': store(LS.syncTip, 1); render(); break;
    case 'cap-paste':
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then((t) => { $('#capIn').value = t; updateCapture(); }, () => { $('#capIn').focus(); toast('Long-press the box and choose Paste'); });
      } else { $('#capIn').focus(); toast('Long-press the box and choose Paste'); }
      break;
    case 'cap-save': captureSave(); break;
    case 'cap-bulk': openBulk(); break;
    case 'cap-again': openCapture(); break;
    case 'bulk-save': saveBulk(); break;
    case 'settings-save': {
      const list = $('#setList').value.trim();
      if (list && !/^https?:\/\//.test(list)) { toast('The X List link must start with https://'); break; }
      setSettings({
        xListUrl: list,
      });
      toast('Saved');
      break;
    }
    case 'tag-del': {
      const t = a.dataset.tag;
      if (confirm(`Remove “${t}” from your tag list? Things already tagged keep it.`)) { setSettings({ tags: db.settings.tags.filter((x) => x !== t) }); render(); }
      break;
    }
    case 'sync-save': {
      const token = $('#syToken').value.trim();
      const cfg = { owner: $('#syOwner').value.trim(), repo: $('#syRepo').value.trim(), branch: $('#syBranch').value.trim(), path: $('#syPath').value.trim() || 'data.json', token };
      if (!token || !cfg.owner || !cfg.repo) { toast('Paste your token first'); break; }
      sync = cfg;
      store(LS.sync, sync);
      remoteSha = null;
      $('#syncMsg').textContent = 'Connecting…';
      pullRemote().then(() => { const m = $('#syncMsg'); if (m && !/Error/.test(m.textContent)) m.textContent = 'Connected. Changes now sync to GitHub.'; });
      break;
    }
    case 'sync-off':
      if (confirm('Disconnect this device from sync? Your data stays here and on GitHub.')) {
        sync = null; forget(LS.sync); remoteSha = null; setSync('local'); render();
      }
      break;
    case 'export': {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `my-real-x-backup-${today()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      break;
    }
    default: break;
  }
}
function onInput(e) {
  const t = e.target;
  if (t.matches('[data-filter]')) {
    const [group, key] = t.dataset.filter.split('.');
    filters[group][key] = t.value;
    libLimit = LIB_PAGE;
    if (group === 'lib') renderLibList(); else renderPeopleList();
    return;
  }
  if (t.id === 'capIn') { updateCapture(); return; }
  if (t.id === 'pickQ') { renderPicker(); return; }
  if (t.matches('#sheetBody [data-field]')) {
    const rec = sheetRec();
    if (!rec) return;
    if (t.type === 'date') {
      if (!t.value) return;
      rec[t.dataset.field] = new Date(`${t.value}T12:00:00`).toISOString();
    } else rec[t.dataset.field] = t.value;
    if (sheetCtx.table === 'ideas') {
      addDay(rec);
      if (rec.status === 'idea' && (rec.body || '').trim()) rec.status = 'draft';
      const cc = $('#charCount'); if (cc) cc.textContent = `${(rec.body || '').length} characters`;
      const il = $('#intentLink'); if (il) il.href = intentUrl(rec);
    }
    if (t.matches('textarea.title, textarea.note')) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }
    sheetCtx.dirty = true;
    const table = sheetCtx.table;
    clearTimeout(fieldSaveT);
    fieldSaveT = setTimeout(() => { upsert(table, rec); if (sheetCtx && sheetCtx.id === rec.id) sheetCtx.dirty = false; }, 600);
  }
}
function addNewTag(input) {
  const tag = input.value.trim().replace(/,/g, '');
  if (!tag) return;
  ensureTags([tag]);
  const scope = input.dataset.newtag;
  if (scope === 'settings') { render(); return; }
  const rec = sheetRec();
  if (rec) {
    rec.tags = [...new Set([...(rec.tags || []), tag])];
    upsert(sheetCtx.table, rec);
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'chip'; chip.dataset.act = 'tag-toggle'; chip.dataset.scope = scope; chip.dataset.tag = tag;
    chip.setAttribute('aria-pressed', 'true'); chip.textContent = tag;
    input.before(chip);
  }
  input.value = '';
}
function onKeydown(e) {
  if (e.key === 'Enter' && e.target.matches('[data-newtag]')) { e.preventDefault(); addNewTag(e.target); }
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'capIn') {
    const v = e.target.value.trim();
    if (/^https?:\/\/\S+$/.test(v)) { e.preventDefault(); captureSave(); }
  }
}
function onChange(e) {
  const t = e.target;
  if (t.matches('[data-newtag]')) { addNewTag(t); return; }
  if (t.id === 'importFile' && t.files[0]) {
    t.files[0].text().then((txt) => {
      db = mergeDb(db, normalize(JSON.parse(txt)));
      save(); render(); toast('Backup imported');
    }).catch(() => toast('That file is not a valid backup'));
  }
}
function onSubmit(e) {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const input = $('input', f);
  const text = input.value.trim();
  if (!text) return;
  if (f.dataset.form === 'quick') {
    newIdea({ title: text, days: [today()] });
    render();
    toast('Idea saved');
  }
}
function handleIncomingShare() {
  const p = new URLSearchParams(location.search);
  const raw = ['add', 'url', 'text', 'title'].map((k) => p.get(k)).filter(Boolean).join(' ');
  if (!raw) return;
  history.replaceState(null, '', location.pathname);
  const m = raw.match(/https?:\/\/[^\s<>"']+/);
  openCapture(m ? m[0] : raw);
}

/* ---------- start ---------- */
async function init() {
  // icons in static chrome
  $('#addBtn').innerHTML = icon('plus');
  const tabs = { library: ['collect', 'Collection'], people: ['people', 'People'], create: ['pen', 'Create'], settings: ['settings', 'Settings'] };
  $$('#nav [data-view]').forEach((b) => { const [ic, label] = tabs[b.dataset.view]; b.innerHTML = `${icon(ic)}<span>${label}</span>`; });

  let base = null;
  try {
    const r = await fetch(`data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (r.ok) base = await r.json();
  } catch (e) { /* offline or missing */ }
  const local = load(LS.data);
  db = local ? mergeDb(normalize(local), normalize(base)) : normalize(base);
  store(LS.data, db);
  setSync(syncOn() ? 'saving' : 'local');

  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) goView(b.dataset.view); });
  $('#addBtn').addEventListener('click', () => openCapture());
  $('#sync').addEventListener('click', () => goView('settings'));
  const sheet = $('#sheet');
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
  sheet.addEventListener('close', () => {
    const rec = sheetRec();
    if (rec && sheetCtx.dirty) { clearTimeout(fieldSaveT); upsert(sheetCtx.table, rec); }
    sheetCtx = null;
    $('#sheetBody').innerHTML = '';
    render();
  });
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && syncOn() && Date.now() - lastPull > 60000) pullRemote();
  });

  render();
  handleIncomingShare();
  if (syncOn()) pullRemote();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
