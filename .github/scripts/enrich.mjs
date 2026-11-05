// Adds preview images, titles and post text to saved links in data.json.
// Runs on GitHub (no browser CORS limits). No API keys: web pages are read
// for their Open Graph tags, X posts and profiles come from the public
// FxTwitter API (api.fxtwitter.com). Only empty fields are filled.
import fs from 'node:fs';

const FILE = process.env.DATA_FILE || 'data.json';
const FX = process.env.FX_API || 'https://api.fxtwitter.com';
const MAX = 40;
const UA = 'Mozilla/5.0 (compatible; MyRealXPreview/1.0; +https://github.com/velunonow/my-real-x)';
const now = new Date().toISOString();

const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let changed = 0;
let tried = 0;

async function get(url, json) {
  const r = await fetch(url, {
    headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return json ? r.json() : (await r.text()).slice(0, 600000);
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
function meta(html, names) {
  for (const n of names) {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*>`, 'i'));
    const c = tag && tag[0].match(/content=["']([^"']*)["']/i);
    if (c && c[1].trim()) return decode(c[1]);
  }
  return '';
}
const abs = (u, base) => { try { return new URL(u, base).href; } catch { return ''; } };
const statusId = (url) => (url.match(/\/status\/(\d+)/) || [])[1];
// Try each URL in turn; return the first JSON body that has `key`. Throws with every
// failure reason if none worked, so the run log says why and the link is retried later.
async function firstJson(urls, key) {
  const why = [];
  for (const u of urls) {
    try {
      const j = await get(u, true);
      if (j && j[key]) return j[key];
      why.push(`${u}: no ${key} (code ${j && j.code})`);
    } catch (e) { why.push(`${u}: ${e.message}`); }
  }
  throw new Error(why.join('; '));
}
const fill = (rec, key, val) => { if (val && !rec[key]) { rec[key] = String(val).slice(0, 2000); return true; } return false; };

async function enrichX(it) {
  const id = statusId(it.url);
  if (!id) return false;
  // Documented v2 endpoint first ({ status }), older v1 endpoint as a fallback ({ tweet }).
  let t;
  try { t = await firstJson([`${FX}/2/status/${id}`], 'status'); } catch (e) { t = await firstJson([`${FX}/status/${id}`], 'tweet'); }
  if (!t.author) return false;
  let ch = false;
  const art = t.article;
  if (art && art.title) ch = fill(it, 'title', art.title) || ch;
  // An article post's own text is usually just a short link; its preview text reads better.
  const body = art ? art.preview_text : (t.raw_text?.text || t.text);
  ch = fill(it, 'text', (body || '').replace(/\s*https:\/\/t\.co\/\w+\s*$/, '')) || ch;
  ch = fill(it, 'author', t.author?.name) || ch;
  if (!it.handle && t.author?.screen_name) { it.handle = t.author.screen_name; ch = true; }
  const img = art?.cover_media?.media_info?.original_img_url || t.media?.photos?.[0]?.url || t.media?.videos?.[0]?.thumbnail_url || t.media?.mosaic?.formats?.jpeg;
  ch = fill(it, 'image', img) || ch;
  return ch;
}
async function enrichWeb(it) {
  const html = await get(it.url, false);
  let ch = false;
  if (!it.title) {
    const tt = meta(html, ['og:title', 'twitter:title']) || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
    ch = fill(it, 'title', tt) || ch;
  }
  ch = fill(it, 'site', meta(html, ['og:site_name'])) || ch;
  ch = fill(it, 'desc', meta(html, ['og:description', 'description', 'twitter:description'])) || ch;
  const img = abs(meta(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']), it.url);
  ch = fill(it, 'image', img) || ch;
  return ch;
}
async function enrichYouTube(it) {
  const j = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(it.url)}`, true);
  let ch = fill(it, 'title', j.title);
  ch = fill(it, 'author', j.author_name) || ch;
  return ch;
}
async function enrichPerson(c) {
  if (c.platform !== 'x' || !c.handle) return false;
  const h = encodeURIComponent(c.handle);
  const u = await firstJson([`${FX}/2/profile/${h}`, `${FX}/${h}`], 'user');
  let ch = fill(c, 'name', u.name);
  ch = fill(c, 'avatar', (u.avatar_url || '').replace('_normal.', '_400x400.')) || ch;
  ch = fill(c, 'bio', u.description) || ch;
  return ch;
}

// A failed lookup is retried on the next runs; after 3 failures we stop trying.
function giveUpOrRetry(rec) {
  rec.enrichTries = (rec.enrichTries || 0) + 1;
  if (rec.enrichTries >= 3) rec.enriched = now;
}

for (const it of db.items || []) {
  if (tried >= MAX) break;
  if (it.deleted || it.enriched) continue;
  tried++;
  try {
    const ch = it.type === 'x' ? await enrichX(it)
      : it.type === 'youtube' ? await enrichYouTube(it)
      : /^https:\/\/github\.com\//.test(it.url) ? false // the app builds GitHub preview images itself
      : await enrichWeb(it);
    console.log(`${ch ? 'updated' : 'nothing new'}: ${it.url}`);
    it.enriched = now;
  } catch (e) {
    console.log(`failed ${it.url}: ${e.message}`);
    giveUpOrRetry(it);
  }
  it.updated = now;
  changed++;
}
for (const c of db.creators || []) {
  if (tried >= MAX) break;
  if (c.deleted || c.enriched) continue;
  tried++;
  try {
    console.log(`${(await enrichPerson(c)) ? 'updated' : 'nothing new'}: ${c.url}`);
    c.enriched = now;
  } catch (e) {
    console.log(`failed ${c.url}: ${e.message}`);
    giveUpOrRetry(c);
  }
  c.updated = now;
  changed++;
}

if (changed) fs.writeFileSync(FILE, `${JSON.stringify(db, null, 2)}\n`);
console.log(`Checked ${changed} record(s).`);
