'use strict';
/*
 * My Real X — a calm, curated alternative to the X "For You" feed.
 * No X API, no server. Data lives in data.json (optionally synced to GitHub)
 * plus this browser's localStorage.
 */

const DEFAULT_TAGS = ['AI', 'Business', 'Learning', 'Writing'];
const LS = { data: 'mrx.data.v1', sync: 'mrx.sync.v1', usage: 'mrx.usage.v1' };
const TRIAL_DAYS = 14;
const TRUSTED_SOFT_MAX = 30;
const LIB_PAGE = 30;

const PROMPTS = [
  'Rewrite your best takeaway this week in your own words, for a beginner.',
  'Politely disagree with one thing you read recently. Why?',
  'Share one mistake you made and what it taught you.',
  'Write a 5-step how-to about something you do every week.',
  'Combine two ideas from your Library into one new idea.',
  'Write the post you wish you had read one year ago.',
  'Explain an AI tool you use as if to your parents.',
  'Pick a small business problem. How could AI fix it? Sketch it.',
  'Write a 3-post thread: problem → insight → action.',
  'Turn one of your ideas into a hook + 3 bullet outline.',
  'Build in public: document something you tried today.',
  'List 10 ideas in 10 minutes. Quantity, not quality.',
  'Share one prompt that saves you time. Show before and after.',
  'Answer a question someone asked you recently — publicly.',
  'Write a strong opinion you hold that most people don’t.',
  'Summarize an article or video in 3 lines, then add your own verdict.',
  'Try a new tool for 20 minutes and report what happened.',
  'Write about the creator who influenced you most, and why.',
  'Describe your process for something you’re good at, step by step.',
  'Finish an old draft today. Done is better than perfect.',
  'What did you learn this week that changed your mind?',
  'Teach one thing in under 280 characters.',
  'Make a checklist other people could copy and use.',
  'Write a short story about a customer whose problem you solved.',
  'What would you tell a friend starting in AI today?',
  'Turn a takeaway into a tiny experiment you can run tomorrow.',
  'Write a “myth vs reality” post about your field.',
  'Remix a post you liked: same topic, your experience.',
];

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
const dark = () => window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
const opts = (pairs, sel) => pairs.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function forget(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- data ---------- */
let db = normalize({});
let view = 'today';
const expanded = new Set();
let openIdea = null;
let libLimit = LIB_PAGE;
let promptShift = 0;
const filters = { lib: { q: '', type: '', status: 'unread', tag: '' }, people: { status: 'trusted', tag: '' } };

function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  const out = { version: 1 };
  out.settings = Object.assign({ dailyMinutes: 15, todayCount: 5, xListUrl: '', tags: DEFAULT_TAGS.slice(), updated: '' }, d.settings || {});
  if (!Array.isArray(out.settings.tags)) out.settings.tags = DEFAULT_TAGS.slice();
  for (const k of ['creators', 'items', 'ideas']) out[k] = Array.isArray(d[k]) ? d[k].filter((x) => x && x.id) : [];
  return out;
}
// Merge two copies record-by-record; the newer `updated` wins. Deletions are kept as tombstones.
function mergeDb(a, b) {
  const out = normalize({});
  out.settings = (a.settings.updated || '') >= (b.settings.updated || '') ? a.settings : b.settings;
  for (const k of ['creators', 'items', 'ideas']) {
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
function addDay(idea) {
  const d = today();
  idea.days = idea.days || [];
  if (!idea.days.includes(d)) idea.days.push(d);
}

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
    if (after !== before && !isEditing()) render();
    if (!r || JSON.stringify(r.data) !== after) save(); else setSync('synced');
  } catch (e) {
    setSync('error', e.message);
  }
}
function setSync(state, msg) {
  const el = $('#sync');
  const labels = { local: '💾 This device', pending: '⏳ Unsaved', saving: '🔄 Syncing', synced: '☁️ Synced', error: '⚠️ Sync error' };
  el.textContent = labels[state] || '';
  el.title = msg || (state === 'local' ? 'Saved in this browser only. Tap to set up sync.' : 'Sync status');
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

/* ---------- daily reading timer ---------- */
let usage = loadUsage();
function loadUsage() {
  const u = load(LS.usage);
  return u && u.date === today() ? u : { date: today(), sec: 0, bonus: 0 };
}
function limitSec() {
  const m = Number(db.settings.dailyMinutes) || 0;
  return m > 0 ? (m + usage.bonus) * 60 : Infinity;
}
const locked = () => usage.sec >= limitSec();
function tick() {
  if (usage.date !== today()) { usage = { date: today(), sec: 0, bonus: 0 }; store(LS.usage, usage); }
  const gated = view === 'today' || view === 'library';
  if (gated && document.visibilityState === 'visible' && !locked()) {
    usage.sec++;
    if (usage.sec % 5 === 0) store(LS.usage, usage);
    if (locked()) { store(LS.usage, usage); if (!isEditing()) render(); }
  }
  renderTimer();
}
function renderTimer() {
  const el = $('#timer');
  const lim = limitSec();
  if (lim === Infinity) { el.textContent = ''; return; }
  if (locked()) { el.textContent = '📕 Reading done'; return; }
  const left = lim - usage.sec;
  el.textContent = `📖 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
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
function weekStats() {
  const c = new Date(); c.setDate(c.getDate() - 6);
  const cutoff = localDate(c);
  return {
    read: live('items').filter((i) => i.readAt && dayOf(i.readAt) >= cutoff).length,
    made: live('ideas').filter((i) => (i.days || []).some((d) => d >= cutoff)).length,
    pub: live('ideas').filter((i) => i.publishedAt && dayOf(i.publishedAt) >= cutoff).length,
  };
}
function streakText() {
  const n = makingStreak();
  return n ? `🔥 ${n}-day making streak` : 'Make one thing today to start a streak';
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
  try { const u = new URL(url); return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').slice(0, 70); } catch (e) { return url; }
}
const typeIcon = (t) => ({ x: '𝕏', youtube: '▶️', web: '📄' }[t] || '📄');
const platformLabel = (p) => ({ x: '𝕏', youtube: 'YouTube', web: 'Web' }[p] || 'Web');
function itemTitle(it) {
  if (it.title) return it.title;
  if (it.type === 'x') return it.handle ? `Post by @${it.handle}` : 'X post';
  if (it.type === 'youtube') return 'YouTube video';
  return hostOf(it.url);
}
const ideaTitle = (i) => i.title || (i.body || '').split('\n')[0].slice(0, 80) || 'Untitled idea';
const intentUrl = (i) => `https://x.com/intent/tweet?text=${encodeURIComponent((i.body || i.title || '').trim())}`;
async function fetchMeta(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url.replace('://x.com/', '://twitter.com/'))}`, { signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    return j.error ? null : j;
  } catch (e) { return null; }
}

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
  if (it.type === 'x') {
    return `<blockquote class="twitter-tweet" data-dnt="true" data-theme="${dark() ? 'dark' : 'light'}"><a href="${esc(safeHref(it.url))}">Loading post… (open on X)</a></blockquote>`;
  }
  if (it.type === 'youtube' && /^[\w-]{6,20}$/.test(it.videoId || '')) {
    return `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${it.videoId}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  }
  return '';
}
const canEmbed = (it) => it.type === 'x' || it.type === 'youtube';

/* ---------- small renderers ---------- */
const tagsHtml = (tags) => (tags && tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '');
function tagPicker(selected) {
  return `<fieldset class="tagpick"><legend>Tags</legend>
    ${db.settings.tags.map((t) => `<label class="chip"><input type="checkbox" name="tag" value="${esc(t)}" ${selected.includes(t) ? 'checked' : ''}>${esc(t)}</label>`).join('')}
    <input name="newTags" placeholder="New tags, comma separated" autocomplete="off"></fieldset>`;
}
function lockedHtml() {
  return `<section class="card locked">
    <h2>Reading time is done for today ✅</h2>
    <p>You chose ${esc(db.settings.dailyMinutes)} minutes. Everything will still be here tomorrow.<br>Now use what you learned.</p>
    <div class="row" style="justify-content:center"><button class="primary" data-act="goto" data-view="create">Go create</button>
    <button data-act="bonus">I really need 5 more minutes</button></div></section>`;
}
function itemCard(it, embed = false) {
  const open = embed || expanded.has(it.id);
  const statusLabel = it.status === 'archived' ? 'dropped' : it.status;
  return `<article class="card item" data-card="${it.id}" data-kind="items" data-embed="${embed ? 1 : 0}">
    <div class="row between">
      <div class="meta">${typeIcon(it.type)} <a href="${esc(safeHref(it.url))}" target="_blank" rel="noopener">${esc(itemTitle(it))}</a>
        ${it.handle && it.title ? `<span class="muted">· @${esc(it.handle)}</span>` : ''}</div>
      <span class="badge s-${it.status}">${esc(statusLabel)}</span>
    </div>
    ${tagsHtml(it.tags)}
    ${it.note ? `<p class="note">${esc(it.note)}</p>` : ''}
    ${it.takeaway ? `<p class="takeaway">💡 ${esc(it.takeaway)}</p>` : ''}
    ${open && canEmbed(it) ? `<div class="embed">${embedHtml(it)}</div>` : ''}
    <div class="actions">
      ${!embed && canEmbed(it) ? `<button data-act="toggle">${open ? 'Hide' : 'Show'}</button>` : ''}
      ${it.status !== 'read' ? '<button class="primary" data-act="done">✓ Done</button>' : ''}
      <button data-act="make-idea">✍️ Make from this</button>
      <button data-act="edit">Edit</button>
      ${it.status === 'unread' ? '<button data-act="archive" title="Not worth my time">Drop</button>' : '<button data-act="unread">Mark unread</button>'}
    </div>
    <div class="slot"></div>
  </article>`;
}
function takeawayForm(it) {
  return `<label>One-line takeaway — what will you use or make from this?
      <textarea rows="2" placeholder="e.g. Use 3 examples in every prompt">${esc(it.takeaway || '')}</textarea></label>
    <div class="actions"><button class="primary" data-act="done-save">Save</button>
      <button data-act="done-idea">Save + turn into idea</button><button data-act="done-cancel">Cancel</button></div>`;
}
function refreshCard(kind, id) {
  const el = $(`[data-card="${id}"]`);
  const rec = byId(kind, id);
  if (!el) return;
  if (!rec) { el.remove(); return; }
  const tpl = document.createElement('template');
  tpl.innerHTML = kind === 'items' ? itemCard(rec, el.dataset.embed === '1' && rec.status === 'unread')
    : kind === 'creators' ? creatorCard(rec) : ideaCard(rec);
  const fresh = tpl.content.firstElementChild;
  el.replaceWith(fresh);
  loadTwitter(fresh);
}

/* ---------- views ---------- */
function renderToday() {
  const s = db.settings;
  const items = live('items');
  const t = today();
  const readToday = items.filter((i) => i.readAt && dayOf(i.readAt) === t);
  const unread = items.filter((i) => i.status === 'unread').sort((a, b) => (a.added || '').localeCompare(b.added || ''));
  const todays = unread.slice(0, Math.max(0, s.todayCount - readToday.length));
  const wk = weekStats();
  let html = `<section class="card hero">
    <div class="row between"><h2>Make one thing today</h2><span class="streak">${streakText()}</span></div>
    <p class="prompt">“${esc(currentPrompt())}”</p>
    <div class="row"><button class="primary" data-act="draft-from-prompt">Start writing</button>
      <button data-act="another-prompt">Another prompt</button></div>
    <p class="muted small">Last 7 days: read ${wk.read} · made ${wk.made} · published ${wk.pub}${wk.read > wk.made * 2 + 1 ? ' — you’re consuming more than making. Make something next.' : ''}</p>
  </section>`;
  if (locked()) return html + lockedHtml();
  html += `<div class="row between"><h3>Today’s ${esc(s.todayCount)} to read</h3>
    <span class="muted small">${readToday.length}/${esc(s.todayCount)} done · ${unread.length} unread in Library</span></div>`;
  if (!todays.length && readToday.length >= s.todayCount) {
    html += '<div class="card done">✅ That’s today’s reading. The rest can wait until tomorrow — go make something.</div>';
  } else if (!todays.length) {
    html += `<div class="card empty">Nothing unread. Save posts, articles or videos with <b>+ Add</b>, or visit one of your
      <a href="#" data-act="goto" data-view="people">people</a> on purpose.</div>`;
  }
  html += todays.map((i) => itemCard(i, true)).join('');
  if (readToday.length) {
    html += `<details class="sec"><summary><h3>Read today <span class="muted">(${readToday.length})</span></h3></summary>${readToday.map((i) => itemCard(i)).join('')}</details>`;
  }
  return html;
}

function ideaCard(i) {
  const src = i.sourceId ? byId('items', i.sourceId) : null;
  const head = `<div class="row between" data-act="toggle"><b>${esc(ideaTitle(i))}</b><span class="badge s-${i.status}">${esc(i.status)}</span></div>`;
  if (openIdea !== i.id) {
    return `<article class="card idea" data-card="${i.id}" data-kind="ideas">${head}
      <p class="muted small" style="margin:4px 0 0">Worked on ${(i.days || []).length} day(s)${src ? ` · from ${esc(itemTitle(src))}` : ''}${i.status === 'published' && i.publishedAt ? ` · published ${esc(dayOf(i.publishedAt))}` : ''}</p></article>`;
  }
  return `<article class="card idea open" data-card="${i.id}" data-kind="ideas">${head}
    <input class="i-title" placeholder="Title / hook" value="${esc(i.title || '')}">
    <textarea class="i-body" rows="9" placeholder="Write freely. Done is better than perfect.">${esc(i.body || '')}</textarea>
    <div class="row between small muted"><span class="count">${(i.body || '').length} chars</span>
      ${src ? `<span>from <a href="${esc(safeHref(src.url))}" target="_blank" rel="noopener">${esc(itemTitle(src))}</a></span>` : ''}</div>
    <div class="actions">
      <a class="btn primary" target="_blank" rel="noopener" data-role="intent" href="${esc(intentUrl(i))}">Post on X ↗</a>
      ${i.status !== 'published' ? '<button data-act="publish">Mark published</button>'
        : `${i.publishedUrl ? `<a class="btn" target="_blank" rel="noopener" href="${esc(safeHref(i.publishedUrl))}">View post ↗</a>` : ''}<button data-act="unpublish">Back to draft</button>`}
      <button data-act="copy">Copy</button>
      <button data-act="close-idea">Close</button>
      <button class="danger" data-act="del-idea">Delete</button>
    </div></article>`;
}
function ideaSection(title, list, open) {
  return `<details class="sec" ${open ? 'open' : ''}><summary><h3>${title} <span class="muted">(${list.length})</span></h3></summary>
    ${list.length ? list.map(ideaCard).join('') : '<p class="muted small">Nothing here yet.</p>'}</details>`;
}
function renderCreate() {
  const all = live('ideas').sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  return `<section class="card hero">
      <div class="row between"><h2>Create</h2><span class="streak">${streakText()}</span></div>
      <form data-form="quick" class="row"><input name="text" placeholder="Capture an idea before it disappears…" autocomplete="off"><button class="primary">Add</button></form>
      <p class="prompt">“${esc(currentPrompt())}”</p>
      <div class="row"><button data-act="draft-from-prompt">Write this</button><button data-act="another-prompt">Another prompt</button></div>
      <p class="muted small">Rule of thumb: for every 2 things you read, make 1 thing. Small counts.</p>
    </section>
    ${ideaSection('Drafts', all.filter((i) => i.status === 'draft'), true)}
    ${ideaSection('Ideas', all.filter((i) => i.status === 'idea'), true)}
    ${ideaSection('Published', all.filter((i) => i.status === 'published'), false)}`;
}

function renderLibrary() {
  if (locked()) return lockedHtml();
  const f = filters.lib;
  const tags = db.settings.tags;
  return `<section class="card">
      <div class="row">
        <input type="search" data-filter="lib.q" placeholder="Search titles, notes, @handles…" value="${esc(f.q)}">
      </div>
      <div class="row">
        <select data-filter="lib.status">${opts([['unread', 'Unread'], ['read', 'Read'], ['archived', 'Dropped'], ['', 'All']], f.status)}</select>
        <select data-filter="lib.type">${opts([['', 'All types'], ['x', '𝕏 posts'], ['youtube', 'YouTube'], ['web', 'Articles / web']], f.type)}</select>
        <select data-filter="lib.tag">${opts([['', 'All tags'], ...tags.map((t) => [t, t]), ['__none', 'No tag yet']], f.tag)}</select>
      </div>
      <div class="row"><button class="primary" data-act="open-add">+ Add</button><button data-act="bulk">Bulk add (clean up bookmarks)</button></div>
    </section><div id="libList"></div>`;
}
function renderLibList() {
  const el = $('#libList');
  if (!el) return;
  const f = filters.lib;
  const q = f.q.trim().toLowerCase();
  const list = live('items').filter((i) => (!f.status || i.status === f.status) &&
      (!f.type || i.type === f.type) &&
      (!f.tag || (f.tag === '__none' ? !(i.tags || []).length : (i.tags || []).includes(f.tag))) &&
      (!q || [i.title, i.note, i.takeaway, i.handle, i.url, ...(i.tags || [])].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  el.innerHTML = `<p class="muted small">${list.length} item(s)</p>${list.slice(0, libLimit).map((i) => itemCard(i)).join('')}
    ${list.length > libLimit ? '<button data-act="more-lib">Show more</button>' : ''}`;
  loadTwitter(el);
}

function creatorCard(c) {
  const saved = c.handle ? live('items').filter((i) => (i.handle || '').toLowerCase() === c.handle.toLowerCase()).length : 0;
  const trialDays = daysSince(c.trialStart || c.added);
  return `<article class="card person" data-card="${c.id}" data-kind="creators">
    <div class="row between">
      <div class="meta"><b>${esc(c.name || (c.handle ? '@' + c.handle : hostOf(c.url)))}</b>
        ${c.handle && c.name ? `<span class="muted">@${esc(c.handle)}</span>` : ''} <span class="badge">${platformLabel(c.platform)}</span></div>
      <span class="badge s-${c.status}">${c.status === 'trial' ? `trial · day ${trialDays + 1}` : 'trusted'}</span>
    </div>
    ${tagsHtml(c.tags)}
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
    <p class="muted small" style="margin:6px 0 0">${saved} saved item(s)${c.foundVia ? ` · found via ${esc(c.foundVia)}` : ''}</p>
    ${c.status === 'trial' && trialDays >= TRIAL_DAYS ? '<p class="warn small">Trial is over. Did they help you make things — or just keep you busy?</p>' : ''}
    <div class="actions">
      <a class="btn primary" href="${esc(safeHref(c.url))}" target="_blank" rel="noopener">Visit ↗</a>
      ${c.status === 'trial' ? '<button data-act="promote">Keep (trusted)</button>' : '<button data-act="demote">Move to trial</button>'}
      <button data-act="edit">Edit</button>
      <button class="danger" data-act="drop-creator">Drop</button>
    </div></article>`;
}
function renderPeople() {
  const s = db.settings;
  const f = filters.people;
  const people = live('creators');
  const trusted = people.filter((c) => c.status === 'trusted').length;
  const trialDue = people.filter((c) => c.status === 'trial' && daysSince(c.trialStart || c.added) >= TRIAL_DAYS).length;
  return `<section class="card hero">
      <h2>My people</h2>
      <p class="muted small">Visit people on purpose: open their profile, read, leave. Trusted: ${trusted}${trusted > TRUSTED_SOFT_MAX ? ` — more than ${TRUSTED_SOFT_MAX}. Adding one? Consider dropping one.` : ''}</p>
      ${s.xListUrl ? `<a class="btn primary" href="${esc(safeHref(s.xListUrl))}" target="_blank" rel="noopener">Open my X List ↗</a>`
        : '<p class="small">💡 Tip: put your trusted people in a private <b>X List</b> and save its link in ⚙︎ Settings. A List shows only them, newest first — no “For You”.</p>'}
      ${trialDue ? `<p class="warn">${trialDue} person(s) finished their ${TRIAL_DAYS}-day trial — keep or drop?</p>` : ''}
      <div class="row">
        <select data-filter="people.status">${opts([['trusted', 'Trusted'], ['trial', 'On trial'], ['', 'Everyone']], f.status)}</select>
        <select data-filter="people.tag">${opts([['', 'All tags'], ...s.tags.map((t) => [t, t])], f.tag)}</select>
        <button data-act="open-add" data-kind="creator">+ Add person</button>
      </div>
    </section>
    <div id="peopleList"></div>
    <details class="card"><summary><b>🔭 How to find new people (once a week, not every day)</b></summary>
      <ul class="small">
        <li><b>Pick one slot a week</b> (e.g. Sunday, 20 minutes) for discovery. The rest of the week: no searching, no “For You”.</li>
        <li><b>Follow the trail of people you trust</b>: who do they quote, reply to, recommend or interview? Their picks are pre-filtered for you.</li>
        <li>When you save a great post from someone new, tick <b>“Also add to People (on trial)”</b>.</li>
        <li>For YouTube and blogs: check the newsletters, podcasts and blogrolls your trusted people mention.</li>
        <li><b>${TRIAL_DAYS}-day trial rule:</b> keep someone only if they gave you an idea you used, or made you want to create.</li>
        <li>Write “found via” — you’ll learn which people lead you to other good people.</li>
      </ul></details>`;
}
function renderPeopleList() {
  const el = $('#peopleList');
  if (!el) return;
  const f = filters.people;
  const list = live('creators').filter((c) => (!f.status || c.status === f.status) && (!f.tag || (c.tags || []).includes(f.tag)))
    .sort((a, b) => (a.name || a.handle || '').localeCompare(b.name || b.handle || ''));
  el.innerHTML = list.length ? list.map(creatorCard).join('')
    : `<div class="card empty">No one here yet. ${f.status === 'trial' ? 'New people you add go here first.' : 'Add a person with an X, YouTube or blog link.'}</div>`;
}

function renderSettings() {
  const s = db.settings;
  const g = sync || guessSync();
  return `<section class="card"><h2>Habits</h2>
      <div class="grid2">
        <label>Daily reading limit (minutes, 0 = none)<input type="number" min="0" max="240" id="setMin" value="${esc(s.dailyMinutes)}"></label>
        <label>Items in “Today” per day<input type="number" min="1" max="50" id="setCount" value="${esc(s.todayCount)}"></label>
      </div>
      <label>My X List link (optional)<input type="url" id="setList" placeholder="https://x.com/i/lists/…" value="${esc(s.xListUrl)}"></label>
      <button class="primary" data-act="settings-save">Save</button>
    </section>
    <section class="card"><h2>Tags</h2>
      <div class="tags">${s.tags.map((t) => `<span class="tag">${esc(t)}<button class="x" data-act="tag-del" data-tag="${esc(t)}" aria-label="Remove tag ${esc(t)}">×</button></span>`).join('')}</div>
      <form data-form="tag" class="row"><input name="tag" placeholder="New tag" autocomplete="off"><button>Add tag</button></form>
    </section>
    <section class="card"><h2>Sync across devices (GitHub)</h2>
      <p class="small">Without sync, changes stay in this browser only. With sync, every change is saved to <code>data.json</code> in your GitHub repo,
        so your phone and laptop see the same thing. The token is stored only in this browser — never in the repo.</p>
      <ol class="small">
        <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained token → Generate new token</a>.</li>
        <li>Repository access: <b>Only select repositories</b> → <code>${esc(g.repo)}</code>.</li>
        <li>Permissions → Repository permissions → <b>Contents: Read and write</b>. Generate, copy, paste below.</li>
        <li>Do this once on each device (you can reuse the same token).</li>
      </ol>
      <div class="grid2">
        <label>Owner<input id="syOwner" value="${esc(g.owner)}" autocomplete="off"></label>
        <label>Repo<input id="syRepo" value="${esc(g.repo)}" autocomplete="off"></label>
        <label>Branch (empty = default)<input id="syBranch" value="${esc(g.branch || '')}" autocomplete="off"></label>
        <label>File<input id="syPath" value="${esc(g.path || 'data.json')}" autocomplete="off"></label>
      </div>
      <label>Token<input id="syToken" type="password" placeholder="github_pat_…" value="${esc((sync && sync.token) || '')}" autocomplete="off"></label>
      <div class="row"><button class="primary" data-act="sync-save">Save & sync now</button>${syncOn() ? '<button data-act="sync-off">Disconnect this device</button>' : ''}</div>
      <p class="small muted" id="syncMsg">${syncOn() ? 'Connected.' : 'Not connected — saving on this device only.'}</p>
    </section>
    <section class="card"><h2>Backup</h2>
      <div class="row"><button data-act="export">Download backup (.json)</button>
        <label class="btn" style="margin:0">Import backup<input type="file" accept="application/json,.json" id="importFile" hidden></label></div>
    </section>
    <section class="card"><h2>Tame X itself</h2>
      <ul class="small">
        <li>Create a <b>private X List</b> with only your trusted people. Pin it. It’s chronological and only shows them. Save its link above.</li>
        <li>On X, use your pinned List or the <b>Following</b> tab — never <b>For You</b>.</li>
        <li><b>Bookmarks:</b> move the ones still worth it here (Library → Bulk add), then clear your X bookmarks. A bookmark means “decide later”; here means “decided”.</li>
        <li>After someone’s trial, <b>unfollow or mute</b> anyone you dropped. Aim for: who you follow ≈ your Trusted list.</li>
        <li>Move the X app off your home screen. Put <b>My Real X</b> there instead (browser Share → “Add to Home Screen”).</li>
        <li>Turn off X push notifications except DMs.</li>
        <li>On Android, after adding to home screen you can <b>Share → My Real X</b> from any app to save a link.</li>
      </ul>
    </section>`;
}

function render() {
  $$('#nav [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  const main = $('#main');
  const fn = { today: renderToday, create: renderCreate, library: renderLibrary, people: renderPeople, settings: renderSettings }[view] || renderToday;
  main.innerHTML = fn();
  if (view === 'library') renderLibList();
  if (view === 'people') renderPeopleList();
  loadTwitter(main);
  renderTimer();
}
function goView(v) { view = v; window.scrollTo(0, 0); render(); }
function isEditing() {
  const a = document.activeElement;
  return ($('#dlg') && $('#dlg').open) || (a && a.matches && a.matches('.i-title, .i-body, input, textarea'));
}

/* ---------- ideas ---------- */
function newIdea(fields, open = true) {
  const idea = { id: uid(), added: nowIso(), status: 'idea', title: '', body: '', tags: [], days: [], ...fields };
  upsert('ideas', idea);
  if (open) {
    openIdea = idea.id;
    goView('create');
    setTimeout(() => { const b = $('.idea.open .i-body'); if (b) b.focus(); }, 0);
  }
  return idea;
}
function newIdeaFromItem(it) {
  newIdea({ title: `My take on: ${itemTitle(it)}`, body: it.takeaway ? `${it.takeaway}\n\n` : '', sourceId: it.id, tags: (it.tags || []).slice() });
}
let ideaSaveT = null;
function onIdeaInput(t) {
  const card = t.closest('[data-card]');
  const rec = byId('ideas', card.dataset.card);
  if (!rec) return;
  rec.title = $('.i-title', card).value;
  rec.body = $('.i-body', card).value;
  addDay(rec);
  if (rec.status === 'idea' && rec.body.trim()) {
    rec.status = 'draft';
    const b = $('.badge', card); b.textContent = 'draft'; b.className = 'badge s-draft';
  }
  $('.count', card).textContent = `${rec.body.length} chars`;
  $('[data-role=intent]', card).href = intentUrl(rec);
  clearTimeout(ideaSaveT);
  ideaSaveT = setTimeout(() => upsert('ideas', rec), 700);
}

/* ---------- add / edit dialog ---------- */
let dlgCtx = null;
const dlgActions = (withDelete) => `<div class="actions end">${withDelete ? '<button class="danger" data-dlg="delete" style="margin-right:auto">Delete</button>' : ''}
  <button data-dlg="cancel">Cancel</button><button class="primary" data-dlg="save">Save</button></div>`;
function openAdd(url = '', kind = null) {
  dlgCtx = { mode: 'add', forcedKind: kind, initial: {} };
  $('#dlgBody').innerHTML = `<h2>${kind === 'creator' ? 'Add a person' : 'Add'}</h2>
    <label>Link<input name="url" type="url" placeholder="Paste a link: X post, X profile, YouTube, blog…" value="${esc(url)}" autocomplete="off"></label>
    <div id="addFields"></div>${dlgActions(false)}`;
  updateAddFields(true);
  $('#dlg').showModal();
  if (!url) $('#dlg [name=url]').focus();
}
function openEdit(kind, id) {
  const rec = byId(kind, id);
  if (!rec) return;
  dlgCtx = { mode: 'edit', kindTable: kind, id, forcedKind: kind === 'creators' ? 'creator' : 'item', initial: { ...rec, tags: rec.tags || [] } };
  $('#dlgBody').innerHTML = `<h2>Edit</h2>
    <label>Link<input name="url" type="url" value="${esc(rec.url)}" autocomplete="off"></label>
    <div id="addFields"></div>${dlgActions(true)}`;
  updateAddFields(true);
  $('#dlg').showModal();
}
function openBulk() {
  dlgCtx = { mode: 'bulk' };
  $('#dlgBody').innerHTML = `<h2>Bulk add</h2>
    <p class="small">Paste many links at once — one per line, or any text that contains links. Great for cleaning up X bookmarks:
      copy the links of bookmarks still worth it, paste them here, then clear your bookmarks on X. Profile links become people on trial.</p>
    <textarea name="bulk" rows="9" placeholder="https://x.com/someone/status/123…&#10;https://www.youtube.com/watch?v=…"></textarea>
    ${tagPicker([])}${dlgActions(false)}`;
  $('#dlg').showModal();
}
function readForm() {
  const d = $('#dlg');
  const val = (n) => { const el = d.querySelector(`[name="${n}"]`); return el ? el.value : ''; };
  const tags = $$('[name=tag]:checked', d).map((x) => x.value);
  const extra = val('newTags').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    url: val('url').trim(), title: val('title'), note: val('note'), name: val('name'), handle: val('handle'),
    platform: val('platform'), status: val('status'), foundVia: val('foundVia'), bulk: val('bulk'),
    addCreator: !!d.querySelector('[name=addCreator]:checked'), tags: [...new Set([...tags, ...extra])],
  };
}
function detectedLine(p, kind) {
  if (kind === 'creator') return `<p class="small muted">Person on ${platformLabel(p.platform)}${p.handle ? ` · @${esc(p.handle)}` : ''}</p>`;
  if (p.type === 'x') return `<p class="small muted">𝕏 post${p.handle ? ` by @${esc(p.handle)}` : ''} — will show embedded</p>`;
  if (p.type === 'youtube') return '<p class="small muted">▶️ YouTube video — will play right here</p>';
  return `<p class="small muted">📄 ${p.platform === 'x' ? 'X article' : 'Web page'} · ${esc(hostOf(p.url))}</p>`;
}
function fieldsHtml(kind, v, p) {
  if (kind === 'creator') {
    return `<div class="grid2">
        <label>Name<input name="name" value="${esc(v.name)}" placeholder="Their name"></label>
        <label>Handle<input name="handle" value="${esc(v.handle)}" placeholder="optional"></label>
        <label>Where<select name="platform">${opts([['x', '𝕏'], ['youtube', 'YouTube'], ['web', 'Blog / website']], v.platform)}</select></label>
        <label>Status<select name="status">${opts([['trial', `On trial (${TRIAL_DAYS} days)`], ['trusted', 'Trusted']], v.status)}</select></label>
      </div>
      <label>Why do I follow them?<textarea name="note" rows="2" placeholder="What do they help me make or think better?">${esc(v.note)}</textarea></label>
      <label>Found via<input name="foundVia" value="${esc(v.foundVia)}" placeholder="e.g. @someone’s article, a podcast…"></label>
      ${tagPicker(v.tags)}`;
  }
  const showAddCreator = dlgCtx.mode === 'add' && p && p.handle && !findCreator(p.platform, p.handle);
  return `<label>Title (optional)<input name="title" value="${esc(v.title)}" placeholder="Short name so you can find it later"></label>
    <label>Why is this worth my time?<textarea name="note" rows="2" placeholder="What do I want to learn or make from it?">${esc(v.note)}</textarea></label>
    ${tagPicker(v.tags)}
    ${showAddCreator ? `<label class="check"><input type="checkbox" name="addCreator">Also add @${esc(p.handle)} to People (on trial)</label>` : ''}`;
}
function updateAddFields(force = false) {
  const box = $('#addFields');
  if (!box) return;
  const raw = $('#dlg [name=url]').value.trim();
  const p = parseUrl(raw);
  const kind = dlgCtx.forcedKind || (p ? p.kind : 'item');
  const sig = `${kind}|${p ? p.url : ''}`;
  if (!force && sig === dlgCtx.sig) return;
  const urlChanged = (p ? p.url : '') !== dlgCtx.lastUrl;
  dlgCtx.sig = sig;
  dlgCtx.lastUrl = p ? p.url : '';
  dlgCtx.kind = kind;
  const cur = box.children.length ? readForm() : dlgCtx.initial;
  const v = {
    title: cur.title || '', note: cur.note || '', tags: cur.tags || [], name: cur.name || dlgCtx.authorName || '',
    handle: (p && p.handle) || cur.handle || '', platform: (p && p.platform) || cur.platform || 'web',
    status: cur.status || 'trial', foundVia: cur.foundVia || '',
  };
  let dup = '';
  if (dlgCtx.mode === 'add' && p) {
    const existing = kind === 'creator' ? findCreator(p.platform, p.handle) : findItemByUrl(p.url);
    if (existing) dup = '<p class="warn small">Already saved — saving will update it.</p>';
  }
  box.innerHTML = (dlgCtx.mode === 'add' ? `<div class="seg">
      <label><input type="radio" name="kind" value="item" ${kind === 'item' ? 'checked' : ''}>Save to Library</label>
      <label><input type="radio" name="kind" value="creator" ${kind === 'creator' ? 'checked' : ''}>Add a person</label></div>` : '') +
    (p ? detectedLine(p, kind) : raw ? '<p class="warn small">That doesn’t look like a link yet.</p>' : '') + dup + fieldsHtml(kind, v, p);
  if (urlChanged && p && dlgCtx.mode === 'add' && (p.type === 'youtube' || p.type === 'x')) {
    const want = p.url;
    fetchMeta(want).then((m) => {
      if (!m || !dlgCtx || dlgCtx.lastUrl !== want || !$('#dlg').open) return;
      dlgCtx.authorName = m.author_name || '';
      const ti = $('#dlg [name=title]');
      if (ti && !ti.value && p.type === 'youtube' && m.title) ti.value = m.title;
      const nm = $('#dlg [name=name]');
      if (nm && !nm.value && m.author_name) nm.value = m.author_name;
    });
  }
}
function creatorUrl(p) {
  if (p.kind === 'creator') return p.url;
  if (p.platform === 'x' && p.handle) return `https://x.com/${p.handle}`;
  return p.url;
}
function saveDialog() {
  const f = readForm();
  if (dlgCtx.mode === 'bulk') return saveBulk(f);
  const p = parseUrl(f.url);
  if (!p) { toast('Please paste a valid http(s) link'); return; }
  ensureTags(f.tags);
  if (dlgCtx.kind === 'creator') {
    const handle = f.handle.trim().replace(/^@/, '');
    let rec = dlgCtx.id ? byId('creators', dlgCtx.id) : findCreator(f.platform, handle);
    if (!rec) rec = { id: uid(), added: nowIso() };
    if (rec.status === 'trusted' && f.status === 'trial') rec.trialStart = nowIso();
    Object.assign(rec, { name: f.name.trim(), handle, platform: f.platform || 'web', url: creatorUrl(p), note: f.note.trim(), status: f.status || 'trial', foundVia: f.foundVia.trim(), tags: f.tags });
    upsert('creators', rec);
  } else {
    let rec = dlgCtx.id ? byId('items', dlgCtx.id) : findItemByUrl(p.url);
    if (!rec) rec = { id: uid(), added: nowIso(), status: 'unread' };
    Object.assign(rec, { url: p.url, type: p.type || 'web', handle: p.handle || '', videoId: p.videoId || '', title: f.title.trim(), note: f.note.trim(), tags: f.tags });
    upsert('items', rec);
    if (f.addCreator && p.handle && !findCreator(p.platform, p.handle)) {
      upsert('creators', { id: uid(), added: nowIso(), name: dlgCtx.authorName || '', handle: p.handle, platform: p.platform, url: creatorUrl(p), status: 'trial', note: '', foundVia: `post: ${p.url}`, tags: f.tags.slice() });
    }
  }
  $('#dlg').close();
  render();
  toast('Saved');
}
function saveBulk(f) {
  const urls = [...new Set(f.bulk.match(/https?:\/\/[^\s<>"')\]]+/g) || [])];
  let items = 0; let people = 0; let dup = 0;
  ensureTags(f.tags);
  for (const u of urls) {
    const p = parseUrl(u);
    if (!p) continue;
    const base = { id: uid(), added: nowIso(), updated: nowIso(), tags: f.tags.slice() };
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
  $('#dlg').close();
  render();
  toast(`Added ${items} item(s), ${people} person(s)${dup ? `, skipped ${dup} duplicate(s)` : ''}`);
}

/* ---------- events ---------- */
function onClick(e) {
  const d = e.target.closest('[data-dlg]');
  if (d) {
    e.preventDefault();
    if (d.dataset.dlg === 'save') saveDialog();
    else if (d.dataset.dlg === 'delete') {
      if (confirm('Delete this for good?')) { removeRec(dlgCtx.kindTable, dlgCtx.id); $('#dlg').close(); render(); }
    } else $('#dlg').close();
    return;
  }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  if (a.tagName === 'A') e.preventDefault();
  const card = a.closest('[data-card]');
  const id = card ? card.dataset.card : null;
  const kind = card ? card.dataset.kind : null;
  const rec = id ? byId(kind, id) : null;
  switch (a.dataset.act) {
    case 'goto': goView(a.dataset.view); break;
    case 'open-add': openAdd('', a.dataset.kind || null); break;
    case 'bulk': openBulk(); break;
    case 'toggle':
      if (kind === 'ideas') {
        openIdea = openIdea === id ? null : id;
        render();
        if (openIdea) { const b = $('.idea.open .i-body'); if (b) b.focus(); }
      } else {
        if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
        refreshCard(kind, id);
      }
      break;
    case 'done': {
      const slot = $('.slot', card);
      slot.innerHTML = takeawayForm(rec);
      $('textarea', slot).focus();
      break;
    }
    case 'done-cancel': $('.slot', card).innerHTML = ''; break;
    case 'done-save':
    case 'done-idea': {
      const tk = $('.slot textarea', card).value.trim();
      rec.status = 'read';
      rec.readAt = nowIso();
      if (tk) rec.takeaway = tk;
      upsert('items', rec);
      if (a.dataset.act === 'done-idea') newIdeaFromItem(rec);
      else { refreshCard(kind, id); toast(tk ? 'Takeaway saved 💡' : 'Marked as read'); }
      break;
    }
    case 'make-idea': newIdeaFromItem(rec); break;
    case 'archive': rec.status = 'archived'; upsert('items', rec); refreshCard(kind, id); toast('Dropped — less noise'); break;
    case 'unread': rec.status = 'unread'; delete rec.readAt; upsert('items', rec); refreshCard(kind, id); break;
    case 'edit': openEdit(kind, id); break;
    case 'promote': rec.status = 'trusted'; upsert('creators', rec); renderPeopleList(); toast('Kept as trusted'); break;
    case 'demote': rec.status = 'trial'; rec.trialStart = nowIso(); upsert('creators', rec); renderPeopleList(); break;
    case 'drop-creator':
      if (confirm(`Drop ${rec.name || '@' + rec.handle}? Their saved posts stay in your Library. (Remember to unfollow on X too.)`)) {
        removeRec('creators', id); renderPeopleList();
      }
      break;
    case 'del-idea':
      if (confirm('Delete this idea?')) { removeRec('ideas', id); openIdea = null; render(); }
      break;
    case 'publish': {
      const u = prompt('Nice! 🎉 Paste the link to your published post (optional):', '');
      if (u === null) break;
      rec.status = 'published';
      rec.publishedAt = nowIso();
      if (/^https?:\/\//.test(u.trim())) rec.publishedUrl = u.trim();
      addDay(rec);
      upsert('ideas', rec);
      render();
      toast('Published! That counts. 🔥');
      break;
    }
    case 'unpublish': rec.status = 'draft'; upsert('ideas', rec); render(); break;
    case 'copy':
      if (navigator.clipboard) navigator.clipboard.writeText(rec.body || rec.title || '').then(() => toast('Copied'), () => toast('Copy failed'));
      break;
    case 'close-idea': openIdea = null; render(); break;
    case 'draft-from-prompt': newIdea({ title: currentPrompt() }); break;
    case 'another-prompt': promptShift++; render(); break;
    case 'more-lib': libLimit += LIB_PAGE; renderLibList(); break;
    case 'bonus': usage.bonus += 5; store(LS.usage, usage); render(); toast('5 more minutes. Make them count.'); break;
    case 'settings-save': {
      const list = $('#setList').value.trim();
      if (list && !/^https?:\/\//.test(list)) { toast('X List link must start with https://'); break; }
      setSettings({
        dailyMinutes: Math.max(0, Math.min(240, parseInt($('#setMin').value, 10) || 0)),
        todayCount: Math.max(1, Math.min(50, parseInt($('#setCount').value, 10) || 5)),
        xListUrl: list,
      });
      renderTimer();
      toast('Settings saved');
      break;
    }
    case 'tag-del': {
      const t = a.dataset.tag;
      if (confirm(`Remove tag “${t}” from the tag list? (Items keep it.)`)) { setSettings({ tags: db.settings.tags.filter((x) => x !== t) }); render(); }
      break;
    }
    case 'sync-save': {
      const token = $('#syToken').value.trim();
      const cfg = { owner: $('#syOwner').value.trim(), repo: $('#syRepo').value.trim(), branch: $('#syBranch').value.trim(), path: $('#syPath').value.trim() || 'data.json', token };
      if (!token || !cfg.owner || !cfg.repo) { toast('Owner, repo and token are needed'); break; }
      sync = cfg;
      store(LS.sync, sync);
      remoteSha = null;
      $('#syncMsg').textContent = 'Connecting…';
      pullRemote().then(() => { const m = $('#syncMsg'); if (m && !/Error/.test(m.textContent)) m.textContent = 'Connected. Changes now sync to GitHub.'; });
      break;
    }
    case 'sync-off':
      if (confirm('Disconnect this device from GitHub sync? (Your data stays here and in GitHub.)')) {
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
    if (group === 'lib') { libLimit = LIB_PAGE; renderLibList(); } else renderPeopleList();
    return;
  }
  if (t.matches('#dlg [name=url]')) { updateAddFields(); return; }
  if (t.matches('.i-title, .i-body')) onIdeaInput(t);
}
function onChange(e) {
  const t = e.target;
  if (t.matches('#dlg [name=kind]')) { dlgCtx.forcedKind = t.value; updateAddFields(true); return; }
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
    newIdea({ title: text, days: [today()] }, false);
    render();
    toast('Idea captured ✍️');
  } else if (f.dataset.form === 'tag') {
    ensureTags([text]);
    render();
  }
}
function handleIncomingShare() {
  const p = new URLSearchParams(location.search);
  const raw = ['add', 'url', 'text', 'title'].map((k) => p.get(k)).filter(Boolean).join(' ');
  if (!raw) return;
  history.replaceState(null, '', location.pathname);
  const m = raw.match(/https?:\/\/[^\s<>"']+/);
  if (m) openAdd(m[0]);
}

/* ---------- start ---------- */
async function init() {
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
  $('#addBtn').addEventListener('click', () => openAdd());
  $('#sync').addEventListener('click', () => goView('settings'));
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && syncOn() && Date.now() - lastPull > 60000) pullRemote();
  });
  setInterval(tick, 1000);

  render();
  handleIncomingShare();
  if (syncOn()) pullRemote();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
