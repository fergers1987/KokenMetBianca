// Bouwt de statische website (NL / ES / EN) naar dist/. Geen dependencies: `node src/build.js`.
'use strict';
const fs = require('fs');
const path = require('path');
const art = require('./art.js');
const SCENES = require('./scenes.js');
const { autoScene } = require('./autoscene.js');
const { THEMES } = require('./themes.js');
const { LANGS, PATHS, UI } = require('./i18n.js');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(__dirname, 'data');
const OUT = path.join(ROOT, 'dist');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const T = THEMES[CONFIG.theme || 'a'];
const SITE = (CONFIG.siteUrl || '').replace(/\/$/, '');
// contactformulier: de pagina wordt altijd gebouwd, maar staat pas in menu en sitemap als "contact": true
const CONTACT_LIVE = CONFIG.contact === true;
const TURNSTILE_KEY = CONFIG.turnstileSiteKey || '1x00000000000000000000AA';  // terugval: testsleutel van Cloudflare
// Versiecodes voor cache-busting: veranderen zodra de inhoud verandert.
const V = { css: '', js: '', data: '' };
const hash = s => require('crypto').createHash('sha1').update(s).digest('hex').slice(0, 10);

const readJson = (f, fallback) => { const p = path.join(DATA, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback; };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = s => esc(s).replace(/(\d) (g|ml|el|tl|kg|min|uur|h|hrs?|cm|liter|°C|cda|cdta|tbsp|tsp)\b/g, '$1&nbsp;$2')
  .replace(/(\d+(?:[,.]\d+)?½?–\d+(?:[,.]\d+)?½?(?:&nbsp;\S+)?)/g, '<span class="nw">$1</span>');
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cleanItem = s => s.replace(/\s*\(.*?\)/g, '').split(',')[0].trim();

function hours(t) { if (!t) return null; const m = String(t).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }

// ---------- data ----------
const NL_RECIPES = readJson('recipes.json');
const NL_CHAPTERS = readJson('i18n-source.nl.json').chapters;
const STORES = readJson('stores.json', {});
const MARKETS = readJson('supermarkets.json', []);
const order = NL_RECIPES.slice().sort((a, b) => NL_CHAPTERS.indexOf(a.chapter) - NL_CHAPTERS.indexOf(b.chapter) || a.id - b.id);
const NUM = {}; order.forEach((r, i) => { NUM[r.id] = i + 1; });
const CHIDX = {}, GUID = {}, META = {}; NL_RECIPES.forEach(r => { CHIDX[r.id] = NL_CHAPTERS.indexOf(r.chapter); GUID[r.id] = r.guid; META[r.id] = { name_es: r.name_es || '', kind: r.kind || 'dish', cuisine: r.cuisine, protein: r.protein, side: r.side, price: r.price, spice: r.spice, vega: r.vega, freeze: r.freeze, hrs: hours(r.low) }; });
if (new Set(Object.values(GUID)).size !== NL_RECIPES.length || Object.values(GUID).some(g => !g)) throw new Error('Elk recept heeft een unieke guid nodig in recipes.json');

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const D = {};
for (const L of LANGS) {
  let recipes = L === 'nl' ? NL_RECIPES : readJson(`recipes.${L}.json`, null);
  if (!recipes) recipes = NL_RECIPES;
  const text = readJson(`i18n-source.${L}.json`, readJson('i18n-source.nl.json'));
  const byId = {};
  const nlById = Object.fromEntries(NL_RECIPES.map(r => [r.id, r]));
  // rollen, budgettips en basisprijs komen uit de Nederlandse bron (per index); vertaalde swap-tekst wint
  const withRoles = (list, nlList) => list.map((i, k) => ({ role: (nlList[k] || {}).role || 'basis', swap: (nlList[k] || {}).swap, saves: (nlList[k] || {}).saves, ...i }));
  recipes = recipes.map(r => { const n = nlById[r.id]; return n ? { ...r, price_basic: n.price_basic, optSteps: n.steps.map(st => /^Optioneel:/.test(st)), ingredients: withRoles(r.ingredients, n.ingredients), serve: withRoles(r.serve, n.serve) } : r; });
  const haveIds = new Set(recipes.map(r => r.id));
  recipes = recipes.concat(NL_RECIPES.filter(r => !haveIds.has(r.id)));  // nog niet vertaald: Nederlands als terugval
  recipes.forEach(r => { byId[r.id] = { ...r, ...META[r.id], guid: GUID[r.id], slug: r.slug || slugify(r.title), n: NUM[r.id], nn: String(NUM[r.id]).padStart(2, '0'), ci: CHIDX[r.id] }; });
  const nlText = readJson('i18n-source.nl.json');
  text.chapters = nlText.chapters.map((c, i) => text.chapters[i] || c);
  const all = order.map(r => byId[r.id]);
  D[L] = { text, byId, all, list: all.filter(r => r.kind !== 'extra'), extras: all.filter(r => r.kind === 'extra') };
}

// ---------- urls ----------
const u = {
  home: L => `/${L}/`,
  recipes: L => `/${L}/${PATHS[L].recipes}/`,
  recipe: (L, id) => `/${L}/${PATHS[L].recipes}/${D[L].byId[id].slug}/`,
  market: L => `/${L}/${PATHS[L].market}/`,
  basics: L => `/${L}/${PATHS[L].basics}/`,
  list: L => `/${L}/${PATHS[L].list}/`,
  more: L => `/${L}/${PATHS[L].more}/`,
  contact: L => `/${L}/${PATHS[L].contact}/`,
};
const dishImg = id => `/img/dish/${id}.svg`;
const dishJpg = id => fs.existsSync(path.join(ROOT, 'public', 'img', 'dish', `${id}.jpg`)) ? `/img/dish/${id}.jpg` : null;  // gemaakt met tools/dishjpg.py
const brand = L => UI[L].brand.join(' ');
const PDF = (() => { const f = path.join(ROOT, 'public', 'downloads', 'smaakvol-koken.pdf'); if (!fs.existsSync(f)) return null;
  const buf = fs.readFileSync(f); const m = buf.toString('latin1').match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/); return { url: '/downloads/smaakvol-koken.pdf', mb: (buf.length / 1048576).toFixed(0), pages: m ? m[1] : '' }; })();
const printIco = () => `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-5.5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 1-1.5 1.5H17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
function dlBlock(L) {
  if (!PDF) return '';
  const x = UI[L].pr;
  return `<section class="wrap sec dl"><div class="dl-in"><div><p class="eyebrow">PDF</p><h2 class="sec-title">${esc(x.dlTitle)}</h2><p>${esc(x.dlText)}</p>
  <p><a class="btn" href="${PDF.url}" download>${printIco()} ${esc(x.dlBtn)}</a> <span class="dl-meta">${esc(x.dlMeta.replace('{p}', PDF.pages).replace('{mb}', PDF.mb))}${x.dlLang ? ` · ${esc(x.dlLang)}` : ''}</span></p></div>
  <div class="dl-art"><img src="/img/hero.svg" alt="" width="600" height="600" loading="lazy"></div></div></section>`;
}

// ---------- formatting ----------
function money(L, v) { const s = L === 'en' ? v.replace(',', '.') : v.replace('.', ','); return ['es', 'de', 'fr'].includes(L) ? `${s} €` : L === 'en' ? `€${s}` : `€ ${s}`; }
function price(L, p) { return money(L, p.replace('-', '–')); }
function perPerson(L, p) {
  const [a, b] = p.split(/[–-]/).map(Number); const f = v => (v / 4).toFixed(2);
  const ui = UI[L]; return `${ui.approx} ${money(L, `${f(a)}–${f(b)}`)} ${ui.perPerson}`;
}
const spiceWord = (L, n) => D[L].text.spiceWords[n - 1];
function peppers(n, size = '') { let s = ''; for (let i = 1; i <= 3; i++) s += art.pepperIcon(i <= n, T.vars.pepOn, T.vars.pepOff); return `<span class="peps${size}" aria-hidden="true">${s}</span>`; }
const chColor = ci => T.chapters[ci % T.chapters.length];

function tags(L, r, compact = false) {
  const ui = UI[L]; const t = [];
  t.push(`<span class="tag price"><b>${price(L, r.price)}</b>${compact || r.kind === 'extra' ? (r.price_basic && r.price_basic !== r.price ? `<i>${esc(UI[L].budget.from)} ${price(L, r.price_basic)}</i>` : '') : `<i>${perPerson(L, r.price)}</i>`}</span>`);
  t.push(`<span class="tag spice" title="${esc(spiceWord(L, r.spice))}">${peppers(r.spice)}<em>${esc(spiceWord(L, r.spice))}</em></span>`);
  if (r.vega) t.push(`<span class="tag vega">${art.leafIcon(T.vars.leaf)}<em>${ui.vega}</em></span>`);
  if (!compact) {
    t.push(`<span class="tag">${art.knifeIcon(T.vars.ink)}<em>${esc(r.prep)} ${ui.prep}</em></span>`);
    t.push(`<span class="tag">${art.potIcon(T.vars.ink)}<em>LOW ${esc(r.low)}${r.high ? ` · HIGH ${esc(r.high)}` : ''}</em></span>`);
    if (r.freeze) t.push(`<span class="tag">${art.snowIcon(T.vars.ink)}<em>${ui.freeze}</em></span>`);
  }
  return `<div class="tags">${t.join('')}</div>`;
}

// ---------- layout ----------
function alternates(key, id) {
  return LANGS.map(L => { const href = key === 'recipe' ? u.recipe(L, id) : u[key](L); return { L, href }; });
}
function layout(L, { title, desc, body, key, id, jsonld, ogImage, ogSize, noindex, head }) {
  const ui = UI[L];
  const alts = alternates(key, id);
  const canonical = alts.find(a => a.L === L).href;
  const navItem = (k, label) => `<a href="${u[k](L)}"${key === k || (k === 'recipes' && key === 'recipe') ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="${ui.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}${SITE ? `<link rel="canonical" href="${SITE}${canonical}">` : ''}
${alts.map(a => `<link rel="alternate" hreflang="${a.L}" href="${SITE}${a.href}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${SITE}${alts.find(a => a.L === 'nl').href}">
<meta property="og:type" content="${key === 'recipe' ? 'article' : 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="${ui.locale}">
<meta property="og:site_name" content="${esc(brand(L))}">
${SITE ? `<meta property="og:image" content="${SITE}${ogImage || `/img/og-${L}.png`}">` : ''}
<meta property="og:image:width" content="${(ogSize || [1200, 630])[0]}"><meta property="og:image:height" content="${(ogSize || [1200, 630])[1]}">
${SITE ? `<meta property="og:url" content="${SITE}${canonical}">` : ''}
<meta name="twitter:card" content="${ogSize ? 'summary' : 'summary_large_image'}">
<meta name="theme-color" content="${T.vars.bg}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${T.fonts}" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css?v=${V.css}">
${head || ''}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body class="theme-${T.key} page-${key}">
<a class="skip" href="#main">${ui.skip}</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="${u.home(L)}"><span class="b1">${esc(ui.brand[0])}</span> <span class="b2">${esc(ui.brand[1])}</span></a>
    <nav class="main-nav" aria-label="Menu"><a class="nav-favs" href="${u.recipes(L)}?fav=1" aria-label="${esc(ui.onlyFavs)}">${heart()}<span data-fav-count></span></a><a class="nav-list" href="${u.list(L)}"${key === 'list' ? ' aria-current="page"' : ''}>${cartIco()}${esc(ui.list.nav)}<span data-list-count></span></a>${navItem('recipes', ui.nav.recipes)}${navItem('more', ui.more.nav)}${navItem('market', ui.nav.market)}${navItem('basics', ui.nav.basics)}</nav>
    <nav class="langs" aria-label="${ui.langLabel}">${alts.map(a => `<a href="${a.href}" hreflang="${a.L}" lang="${a.L}"${a.L === L ? ' aria-current="true"' : ''}>${a.L.toUpperCase()}</a>`).join('')}</nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="wrap">
    <div class="sprig">${sprig()}</div>
    <p class="f-title">${esc(brand(L))} <span>· ${esc(ui.by)}</span></p>
    <p class="f-tag">${esc(D[L].text.content.tagline)}</p>
    <nav class="f-nav">${navItem('home', ui.nav.home)}${navItem('recipes', ui.nav.recipes)}${navItem('market', ui.nav.market)}${navItem('more', ui.more.title)}${navItem('basics', ui.nav.basics)}${navItem('list', ui.list.title)}${CONTACT_LIVE ? navItem('contact', ui.contact.nav) : ''}${PDF ? `<a href="${PDF.url}" download>${esc(ui.pr.dlBtn)}</a>` : ''}</nav>
    <p class="f-small">${esc(ui.footer)} · ${alts.map(a => `<a href="${a.href}" lang="${a.L}">${UI[a.L].langName}</a>`).join(' · ')}</p>
  </div>
</footer>
<script src="/js/site.js?v=${V.js}" defer></script>
</body>
</html>`;
}

const heart = () => `<svg viewBox="0 0 24 24" class="ico heart" aria-hidden="true"><path d="M12 20.3s-7.6-4.6-9.3-9.4C1.6 7.6 3.6 4.4 6.9 4.2c2-.1 3.6 1 5.1 2.9 1.5-1.9 3.1-3 5.1-2.9 3.3.2 5.3 3.4 4.2 6.7-1.7 4.8-9.3 9.4-9.3 9.4Z"/></svg>`;
const cartIco = () => `<svg viewBox="0 0 24 24" class="ico cart" aria-hidden="true"><path d="M3 4h2.2l2.3 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20.2 8H6.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.4" fill="currentColor"/><circle cx="17" cy="19.5" r="1.4" fill="currentColor"/></svg>`;
function addBtn(L, r, big = false) {
  const l = UI[L].list;
  return `<button type="button" class="add${big ? ' big' : ''}" data-add="${r.guid}" aria-pressed="false" data-on="${esc(l.added)}" data-off="${esc(l.add)}" aria-label="${esc(l.add)}: ${esc(r.title)}">${cartIco()}<span>${esc(l.add)}</span></button>`;
}
function favBtn(L, r, big = false) {
  const ui = UI[L];
  return `<button type="button" class="fav${big ? ' big' : ''}" data-fav="${r.guid}" aria-pressed="false" aria-label="${esc(ui.favAdd)}: ${esc(r.title)}" data-on="${esc(ui.favRemove)}" data-off="${esc(ui.favAdd)}">${heart()}${big ? `<span>${ui.favAdd}</span>` : ''}</button>`;
}

function sprig(col = 'currentColor') {
  return `<svg viewBox="0 0 120 24" width="110" height="22" aria-hidden="true"><path d="M4 12h112" stroke="${col}" stroke-width="1" fill="none"/>${[20, 36, 52, 68, 84, 100].map((x, i) => `<ellipse cx="${x + 9}" cy="${12 + (i % 2 ? 5 : -5)}" rx="5" ry="2.2" transform="rotate(${i % 2 ? 30 : -30} ${x + 9} ${12 + (i % 2 ? 5 : -5)})" fill="none" stroke="${col}" stroke-width="1"/>`).join('')}<circle cx="60" cy="12" r="2.4" fill="${T.vars.accent}"/></svg>`;
}

function card(L, r) {
  const ingText = r.ingredients.concat(r.serve).map(i => `${i.item} ${i.es}`).join(' ');
  return `<li class="card" style="--ch:${chColor(r.ci)}" data-guid="${r.guid}" data-n="${r.n}" data-ch="${r.ci}" data-vega="${r.vega ? 1 : 0}" data-spice="${r.spice}" data-pp="${(parseInt(r.price, 10) / 4).toFixed(2)}" data-hrs="${r.hrs}" data-cuisine="${r.cuisine}" data-protein="${r.protein}" data-side="${r.side}" data-freeze="${r.freeze ? 1 : 0}" data-search="${esc((r.title + ' ' + (r.name_es || '') + ' ' + ingText).toLowerCase())}">
  <a href="${u.recipe(L, r.id)}">
    <div class="card-art"><img src="${dishImg(r.id)}" alt="" width="600" height="600" loading="lazy"></div>
    <div class="card-body">
      <span class="card-no">Nº ${r.nn} · ${esc(UI[L].cuisines[r.cuisine])} · ${esc(UI[L].proteins[r.protein])}</span>
      <h3>${esc(r.title)}</h3>
      ${r.name_es && L !== 'es' ? `<p class="card-es" lang="es">${esc(r.name_es)}</p>` : ''}
      ${tags(L, r, true)}
    </div>
  </a>
  ${favBtn(L, r)}
  ${addBtn(L, r)}
</li>`;
}

// ---------- pages ----------
function home(L) {
  const ui = UI[L], tx = D[L].text, c = tx.content;
  const chapters = tx.chapters.map((name, ci) => {
    const rs = D[L].list.filter(r => r.ci === ci);
    if (!rs.length) return '';
    const info = c.chapters[name] || Object.values(c.chapters)[ci] || {};
    return `<a class="ch-card" href="${u.recipes(L)}?h=${ci}" style="--ch:${chColor(ci)}">
      <div class="ch-minis">${rs.slice(0, 3).map(r => `<img src="${dishImg(r.id)}" alt="" loading="lazy" width="600" height="600">`).join('')}</div>
      <span class="ch-no">${ROMAN[ci]} · ${ui.recipesIn(rs.length)}</span>
      <h3>${esc(name)}</h3>
      <p class="ch-tagline">${esc(info.tagline || '')}</p>
      <p>${esc(info.intro || '')}</p>
    </a>`;
  }).join('');
  const how = c.how_to.map((h, i) => {
    const ic = [`<span class="big">€</span>`, peppers(2), art.leafIcon(T.vars.leaf), art.knifeIcon(T.vars.ink), art.potIcon(T.vars.ink), art.snowIcon(T.vars.ink)][i] || '';
    return `<div class="how"><div class="how-ic">${ic}</div><div><h4>${esc(h.label)}</h4><p>${esc(h.text)}</p></div></div>`;
  }).join('');
  const body = `
<section class="hero">
  <div class="wrap hero-in">
    <div class="hero-text">
      <p class="kicker">${esc(c.cover_kicker)}</p>
      <h1>${esc(ui.brand[0])}<br><span>${esc(ui.brand[1])}</span></h1>
      <p class="by">${esc(ui.by)}</p>
      <p class="lead">${esc(c.site_intro || c.cover_subtitle)}</p>
      <ul class="badges">${c.cover_badges.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <div class="ctas"><a class="btn" href="${u.recipes(L)}">${ui.cta}</a><a class="btn ghost" href="${u.market(L)}">${ui.ctaMarket}</a></div>
    </div>
    <div class="hero-art"><img src="/img/hero.svg" alt="" width="600" height="600"></div>
  </div>
</section>
<section class="wrap sec">
  <h2 class="sec-title">${ui.chapters}</h2>
  <div class="ch-grid">${chapters}</div>
</section>
<section class="wrap sec foreword">
  <div class="fw-text">
    <p class="eyebrow">${ui.foreword}</p>
    <h2 class="sec-title">${esc(c.foreword_title)}</h2>
    ${c.foreword.map((p, i) => `<p${i === 0 ? ' class="first"' : ''}>${esc(p.replace(/\s+[–-]\s+Bianca$/, ''))}</p>`).join('')}
    <p class="sig">${esc(c.signature || 'Bianca')}</p>
  </div>
  <div class="fw-art"><img src="${dishImg(12)}" alt="" loading="lazy" width="600" height="600"></div>
</section>
<section class="wrap sec">
  <h2 class="sec-title">${ui.howTo}</h2>
  <div class="how-grid">${how}</div>
  <p class="small-note">${esc(c.note_s || '')}</p>
</section>
${dlBlock(L)}
<section class="wrap sec market-teaser">
  <div>
    <p class="eyebrow">${ui.nav.market}</p>
    <h2 class="sec-title">${ui.marketTitle}</h2>
    <p>${ui.marketLead}</p>
    <a class="btn" href="${u.market(L)}">${ui.ctaMarket}</a>
  </div>
  <ul class="chain-chips">${MARKETS.slice(0, 10).map(m => `<li>${esc(m.name)}</li>`).join('')}</ul>
</section>`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'WebSite', name: brand(L), alternateName: LANGS.filter(x => x !== L).map(brand), url: `${SITE}${u.home(L)}`, inLanguage: L,
    description: c.site_intro || c.back_cover_blurb, author: { '@type': 'Person', name: 'Bianca Manuela Seegers' } };
  return layout(L, { title: `${brand(L)} – ${c.cover_kicker}`, desc: c.site_intro || c.back_cover_blurb, body, key: 'home', jsonld });
}

function recipesPage(L) {
  const ui = UI[L], tx = D[L].text;
  const body = `
<section class="wrap sec">
  <p class="eyebrow">${esc(tx.content.toc_title)}</p>
  <h1 class="page-title">${ui.nav.recipes}</h1>
  <form class="filters" role="search" onsubmit="return false">
    <div class="f-row">
      <input type="search" id="q" placeholder="${esc(ui.search)}" aria-label="${esc(ui.search)}">
      <label class="f-sort"><span>${ui.f.sort}</span>
        <select id="sort">${Object.entries(ui.f.sorts).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      </label>
    </div>
    <div class="chips" role="group" aria-label="${ui.chapters}">
      <button type="button" class="chip" data-h="" aria-pressed="true">${ui.all}</button>
      ${tx.chapters.map((c, i) => D[L].list.some(r => r.ci === i) && `<button type="button" class="chip" data-h="${i}" aria-pressed="false" style="--ch:${chColor(i)}">${esc(c)}</button>`).filter(Boolean).join('')}
    </div>
    <div class="chips" role="group">
      <button type="button" class="chip toggle" id="favs" aria-pressed="false">${heart()} ${ui.onlyFavs} <span class="fav-count" data-fav-count></span></button>
      <button type="button" class="chip toggle" id="vega" aria-pressed="false">${art.leafIcon(T.vars.leaf)} ${ui.onlyVega}</button>
      <button type="button" class="chip toggle" id="freeze" aria-pressed="false">${art.snowIcon(T.vars.ink)} ${ui.f.freezeOnly}</button>
    </div>
    <details class="more" id="more">
    <summary>${ui.f.more}<span class="active-n" id="activeN"></span></summary>
    <div class="f-grid">
      <label class="f-field"><span>${ui.f.price} <output id="ppOut" data-fmt="${esc(money(L, '#'))}"></output></span>
        <input type="range" id="pp" min="1.5" max="3" step="0.25" value="3">
      </label>
      <label class="f-field"><span>${ui.f.hours} <output id="hrsOut" data-unit="${ui.f.hoursUnit}" data-none="${esc(ui.f.noLimit)}"></output></span>
        <input type="range" id="hrs" min="2" max="9" step="1" value="9">
      </label>
      <label class="f-field"><span>${ui.f.spice}</span>
        <select id="spice"><option value="3">${ui.anySpice}</option><option value="1">${esc(spiceWord(L, 1))}</option><option value="2">${esc(spiceWord(L, 1))} + ${esc(spiceWord(L, 2))}</option></select>
      </label>
      <label class="f-field"><span>${ui.f.cuisine}</span>
        <select id="cuisine"><option value="">${ui.f.any}</option>${[...new Set(D[L].list.map(r => r.cuisine))].sort((a, b) => ui.cuisines[a].localeCompare(ui.cuisines[b], L)).map(c => `<option value="${c}">${esc(ui.cuisines[c])} (${D[L].list.filter(r => r.cuisine === c).length})</option>`).join('')}</select>
      </label>
      <label class="f-field"><span>${ui.f.protein}</span>
        <select id="protein"><option value="">${ui.f.any}</option>${Object.keys(ui.proteins).map(p => `<option value="${p}">${esc(ui.proteins[p])} (${D[L].list.filter(r => r.protein === p).length})</option>`).join('')}</select>
      </label>
      <label class="f-field"><span>${ui.f.side}</span>
        <select id="side"><option value="">${ui.f.any}</option>${Object.keys(ui.sides).map(p => `<option value="${p}">${esc(ui.sides[p])} (${D[L].list.filter(r => r.side === p).length})</option>`).join('')}</select>
      </label>
    </div>
    </details>
    <div class="f-foot"><p class="count" id="count" data-tpl="${esc(ui.count('#'))}" aria-live="polite">${ui.count(D[L].list.length)}</p><button type="button" class="linkbtn" id="reset">${ui.f.reset}</button></div>
  </form>
  <ul class="cards" id="cards">${D[L].list.map(r => card(L, r)).join('')}</ul>
  <p class="none" id="none" hidden data-none="${esc(ui.none)}" data-nofavs="${esc(ui.noFavs)}">${ui.none}</p>
</section>`;
  return layout(L, { title: `${ui.seo.recipes} – ${brand(L)}`, desc: tx.content.back_cover_blurb, body, key: 'recipes', jsonld: itemList(L, D[L].list) });
}

function buyChips(L, es) {
  const s = STORES[es]; if (!s) return '';
  const ui = UI[L];
  const names = (s.stores || []).map(n => n === 'Overal' ? ui.everywhere : n);
  const tip = s[`tip_${L}`] || '';
  if (!names.length || ((s.stores || []).every(n => n === 'Overal') && !tip)) return '';
  return `<details class="buy"><summary>${names.map(n => `<span class="store">${esc(n)}</span>`).join('')}</summary>${tip || s.aisle_es ? `<p>${s.aisle_es ? `<b>${ui.aisle}:</b> <i lang="es">${esc(s.aisle_es)}</i>. ` : ''}${esc(tip)}</p>` : ''}</details>`;
}

function ingList(L, list, rid, offset = 0) {
  const bu = UI[L].budget;
  return list.map((i, k) => `<li data-role="${i.role || 'basis'}"><label><input type="checkbox" data-k="${rid}-${offset + k}"><span class="q">${nb(i.q)}</span><span class="it">${esc(i.item)}${L !== 'es' && i.es ? `<span class="es" lang="es">${esc(i.es)}</span>` : ''}${i.role === 'extra' || i.role === 'topping' ? `<em class="role">${esc(bu[i.role])}</em>` : ''}</span></label>${i.swap ? `<p class="swap"><b>${esc(bu.tip)}:</b> ${esc(i.swap)}${i.saves ? ` <span class="nw">(${esc(i.saves)})</span>` : ''}</p>` : ''}${buyChips(L, i.es)}</li>`).join('');
}

function recipePage(L, r) {
  const ui = UI[L], tx = D[L].text;
  const grp = r.kind === 'extra' ? D[L].extras : D[L].list;
  const idx = grp.indexOf(r), prev = grp[idx - 1], next = grp[idx + 1];
  const shop = r.ingredients.concat(r.serve).map(i => `${i.q ? i.q + ' ' : ''}${i.item}${L !== 'es' && i.es ? ` (${i.es})` : ''}`).join('\n');
  const lowH = hours(r.low), prepM = parseInt(r.prep, 10) || 15, cookM = lowH ? Math.round(lowH * 60) : 0;
  const jpg = dishJpg(r.id), seo = ui.seo;
  const crumbs = r.kind === 'extra' ? [[ui.more.title, u.more(L)]] : [[ui.nav.recipes, u.recipes(L)]];
  const recipe = {
    '@type': 'Recipe', '@id': `${SITE}${u.recipe(L, r.id)}#recipe`, url: `${SITE}${u.recipe(L, r.id)}`, name: r.title, alternateName: r.name_es || undefined, description: r.intro, inLanguage: L,
    author: { '@type': 'Person', name: 'Bianca Manuela Seegers' }, recipeYield: '4', recipeCategory: tx.chapters[r.ci],
    prepTime: `PT${prepM}M`, cookTime: cookM ? `PT${cookM}M` : undefined, totalTime: `PT${prepM + cookM}M`,
    recipeCuisine: ui.cuisines[r.cuisine] || undefined,
    recipeIngredient: r.ingredients.concat(r.serve).map(i => `${i.q} ${i.item}`.trim()),
    recipeInstructions: r.steps.map(s => ({ '@type': 'HowToStep', text: s })),
    suitableForDiet: r.vega ? 'https://schema.org/VegetarianDiet' : undefined,
    keywords: [...new Set([...seo.words, tx.chapters[r.ci], ui.cuisines[r.cuisine], ui.proteins[r.protein], r.name_es, 'Costa del Sol'].filter(Boolean))].join(', '),
    image: SITE ? [`${SITE}${jpg || dishImg(r.id)}`] : undefined,
  };
  const jsonld = { '@context': 'https://schema.org', '@graph': [recipe, { '@type': 'BreadcrumbList', itemListElement: [[brand(L), u.home(L)], ...crumbs, [r.title, u.recipe(L, r.id)]].map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${href}` })) }] };
  const hasWord = /slow ?cooker|olla lenta|mijoteuse|schongarer/i.test(r.title);
  const body = `
<article class="recipe" style="--ch:${chColor(r.ci)}" data-guid="${r.guid}">
  <div class="wrap">
    <nav class="crumbs">${r.kind === 'extra' ? `<a href="${u.more(L)}">${esc(ui.more.title)}</a>` : `<a href="${u.recipes(L)}">${ui.nav.recipes}</a> <span>›</span> <a href="${u.recipes(L)}?h=${r.ci}">${esc(tx.chapters[r.ci])}</a>`}</nav>
    <header class="r-head">
      <div class="r-text">
        <p class="r-no">${r.kind === 'extra' ? esc(ui.more.title) : `Nº ${r.nn} · ${esc(tx.chapters[r.ci])} · ${ui.persons}`}</p>
        <h1 class="r-title">${esc(r.title)}</h1>
        ${r.name_es && L !== 'es' ? `<p class="r-es">${esc(ui.inSpain)}: <i lang="es">${esc(r.name_es)}</i></p>` : ''}
        <div class="r-actions">${favBtn(L, r, true)}
          <button type="button" class="btn print-btn" data-print title="${esc(ui.pr.printHint)}">${printIco()} ${esc(ui.pr.print)}</button>
          <div class="add-wrap">${addBtn(L, r, true)}<label class="persons"><select data-persons="${r.guid}" aria-label="${esc(ui.list.persons)}">${[2, 3, 4, 5, 6, 8, 10].map(n => `<option value="${n}"${n === 4 ? ' selected' : ''}>${n} ${esc(ui.list.persons)}</option>`).join('')}</select></label></div>
        </div>
        <p class="intro">${esc(r.intro)}</p>
        ${tags(L, r)}
        ${r.ingredients.concat(r.serve).some(i => i.role === 'extra' || i.role === 'topping' || i.swap) ? `<label class="budget-toggle"><input type="checkbox" data-budget="${r.guid}"><span class="bt-ui"></span><span><b>${esc(ui.budget.label)}</b>${r.price_basic ? ` · ${esc(ui.budget.from)} ${price(L, r.price_basic)}` : ''}<small>${esc(ui.budget.hint)}</small></span></label>` : ''}
        <aside class="note r-tip"><h4>${ui.tip}</h4><p>${nb(r.tip)}</p></aside>
      </div>
      <div class="r-art"><img src="${dishImg(r.id)}" alt="${esc(r.title)}" width="600" height="600"></div>
    </header>
    <div class="r-body">
      <section class="ingr" aria-labelledby="h-ing">
        <h2 id="h-ing">${ui.ingredients} <small>${ui.persons}</small></h2>
        <p class="hint">${ui.tickHint}</p>
        <ul class="ing">${ingList(L, r.ingredients, r.id)}</ul>
        ${r.serve.length ? `<h3>${ui.serve}</h3><ul class="ing">${ingList(L, r.serve, r.id, 100)}</ul>` : ''}
        <div class="list-actions">
          <button type="button" class="btn small" data-share="${esc(shop)}" data-title="${esc(r.title)}" data-done="${esc(ui.copied)}" data-label-share="${esc(ui.shareList)}">${ui.copyList}</button>
        </div>
      </section>
      <section class="steps" aria-labelledby="h-steps">
        <h2 id="h-steps">${ui.method}</h2>
        <ol>${r.steps.map((s, i) => `<li${(r.optSteps || [])[i] ? ' class="opt"' : ''}><span class="sn">${i + 1}</span><p>${nb(s)}</p></li>`).join('')}</ol>
        <aside class="note"><h4>${ui.kids}</h4><p>${nb(r.kids)}</p></aside>
      </section>
    </div>
    <p class="print-only print-src">${esc(brand(L))} · ${SITE ? SITE.replace('https://', '') : ''}${u.recipe(L, r.id)}</p>
    <nav class="pager">
      ${prev ? `<a class="prev" href="${u.recipe(L, prev.id)}"><small>← ${ui.prev}</small>${esc(prev.title)}</a>` : '<span></span>'}
      <a class="all" href="${u.recipes(L)}">${ui.back}</a>
      ${next ? `<a class="next" href="${u.recipe(L, next.id)}"><small>${ui.next} →</small>${esc(next.title)}</a>` : '<span></span>'}
    </nav>
  </div>
</article>`;
  return layout(L, { title: hasWord ? `${r.title} – ${brand(L)}` : `${r.title} – ${seo.recipe} | ${brand(L)}`, desc: r.intro, body, key: 'recipe', id: r.id, jsonld,
    ogImage: jpg || undefined, ogSize: jpg ? [1200, 1200] : undefined });
}

function marketPage(L) {
  const ui = UI[L];
  // ingredients derived from the recipes, keyed by Spanish supermarket name
  const map = new Map();
  D[L].list.forEach(r => r.ingredients.concat(r.serve).forEach(i => {
    if (!i.es) return;
    if (!map.has(i.es)) map.set(i.es, { es: i.es, name: cleanItem(i.item), recipes: [] });
    const e = map.get(i.es); if (!e.recipes.includes(r)) e.recipes.push(r);
  }));
  const rows = [...map.values()].map(e => ({ ...e, s: STORES[e.es] || {} }))
    .sort((a, b) => (a.s.aisle_es || 'zz').localeCompare(b.s.aisle_es || 'zz', 'es') || a.name.localeCompare(b.name, L));
  const groups = [];
  rows.forEach(r => { const g = r.s.aisle_es || '—'; if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, rows: [] }); groups[groups.length - 1].rows.push(r); });
  const chains = MARKETS.map(m => `<li class="chain"><h3>${esc(m.name)} <small>${esc(m.type || '')}</small></h3><p><b>${ui.goodFor}:</b> ${esc(m[`good_for_${L}`] || m.good_for_nl || '')}</p>${m[`tip_${L}`] ? `<p class="ct"><b>${ui.expatTip}:</b> ${esc(m[`tip_${L}`])}</p>` : ''}</li>`).join('');
  const body = `
<section class="wrap sec">
  <p class="eyebrow">${ui.nav.market}</p>
  <h1 class="page-title">${ui.marketTitle}</h1>
  <p class="lead narrow">${ui.marketLead}</p>
  ${chains ? `<h2 class="sec-title">${ui.chains}</h2><ul class="chains">${chains}</ul>` : ''}
  <h2 class="sec-title" id="ingredienten">${ui.ingredients}</h2>
  <input type="search" id="mq" class="msearch" placeholder="${esc(ui.searchIng)}" aria-label="${esc(ui.searchIng)}">
  <div class="mtable" id="mtable">
    ${groups.map(g => `<section class="mgroup"><h3 lang="es">${esc(g.g)}</h3>
      <ul>${g.rows.map(r => {
        const stores = (r.s.stores || []).map(n => `<span class="store">${esc(n === 'Overal' ? ui.everywhere : n)}</span>`).join('');
        return `<li class="mrow" data-search="${esc((r.name + ' ' + r.es).toLowerCase())}">
          <div class="m-name"><b>${esc(L === 'es' ? r.es : r.name)}</b>${L !== 'es' ? `<i lang="es">${esc(r.es)}</i>` : `<i>${esc(r.name)}</i>`}</div>
          <div class="m-where">${stores}${r.s[`tip_${L}`] ? `<p>${esc(r.s[`tip_${L}`])}</p>` : ''}</div>
          <div class="m-used">${ui.usedIn}: ${r.recipes.slice(0, 3).map(x => `<a href="${u.recipe(L, x.id)}">${esc(x.title)}</a>`).join(', ')}${r.recipes.length > 3 ? ` +${r.recipes.length - 3}` : ''}</div>
        </li>`;
      }).join('')}</ul></section>`).join('')}
  </div>
  <p class="small-note">${ui.assortment}</p>
</section>`;
  return layout(L, { title: `${ui.marketTitle} – ${brand(L)}`, desc: ui.marketLead, body, key: 'market' });
}

function basicsPage(L) {
  const ui = UI[L], tx = D[L].text;
  const body = `
<section class="wrap sec">
  <p class="eyebrow">${esc(tx.content.basics_title)}</p>
  <h1 class="page-title">${ui.basicsTitle}</h1>
  <ol class="basics">${tx.basics.map((b, i) => `<li><span class="bn">${i + 1}</span><div><h3>${esc(b[0])}</h3><p>${nb(b[1])}</p></div></li>`).join('')}</ol>
  <div class="basics-art"><img src="${dishImg(29)}" alt="" loading="lazy" width="600" height="600"></div>
</section>`;
  return layout(L, { title: `${ui.basicsTitle} – ${brand(L)}`, desc: tx.basics.slice(0, 3).map(b => b[1]).join(' '), body, key: 'basics' });
}

function aisleRank(a) {
  const order = ['fruta', 'verdura', 'panader', 'carne', 'carnic', 'charcut', 'pescad', 'marisc', 'refriger', 'lácte', 'lacte', 'huevo', 'congel', 'conserva', 'legumbre', 'arroz', 'pasta', 'harina', 'aceite', 'especia', 'salsa', 'internacional', 'dulce', 'bebida'];
  const s = (a || '').toLowerCase();
  const i = order.findIndex(k => s.includes(k));
  return i < 0 ? 99 : i;
}
function dataJson(L) {
  const recipes = {};
  D[L].all.forEach(r => {
    recipes[r.guid] = { n: r.n, t: r.title, u: u.recipe(L, r.id), img: dishImg(r.id), ing: r.ingredients.concat(r.serve).map(i => [i.q || '', i.item, i.es || '', i.role || 'basis']) };
  });
  const aisles = {};
  Object.entries(STORES).forEach(([es, s]) => { aisles[es] = [s.aisle_es || '', aisleRank(s.aisle_es), (s.stores || []).filter(n => n !== 'Overal')]; });
  return JSON.stringify({ recipes, aisles });
}
const itemList = (L, list) => ({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: list.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${u.recipe(L, r.id)}`, name: r.title })) });
function morePage(L) {
  const ui = UI[L], m = ui.more;
  const body = `
<section class="wrap sec">
  <p class="eyebrow">${esc(m.nav)}</p>
  <h1 class="page-title">${esc(m.title)}</h1>
  <p class="lead narrow">${esc(m.lead)}</p>
  <ul class="cards" id="moreCards">${D[L].extras.map(r => card(L, r)).join('')}</ul>
</section>`;
  return layout(L, { title: `${m.title} – ${brand(L)}`, desc: m.lead, body, key: 'more', jsonld: itemList(L, D[L].extras) });
}
function listPage(L) {
  const ui = UI[L], l = ui.list;
  const strings = { ...l, everywhere: ui.everywhere, lang: L, budgetLabel: ui.budget.label };
  const body = `
<section class="wrap sec shoplist" data-strings="${esc(JSON.stringify(strings))}" data-src="/data/${L}.json?v=${V.data}">
  <p class="eyebrow">${ui.nav.recipes} · ${esc(l.nav)}</p>
  <h1 class="page-title">${esc(l.title)}</h1>
  <p class="lead narrow">${esc(l.lead)}</p>
  <div class="sl-empty" id="slEmpty" hidden><p>${esc(l.empty)}</p><a class="btn" href="${u.recipes(L)}">${esc(l.browse)}</a></div>
  <div class="sl-grid" id="slGrid" hidden>
    <aside class="sl-dishes">
      <h2>${esc(l.dishes)}</h2>
      <ul id="slDishes"></ul>
      <a class="linkbtn" href="${u.recipes(L)}">+ ${esc(l.browse)}</a>
    </aside>
    <div class="sl-items">
      <div class="sl-head"><h2>${esc(l.items)}</h2><p class="count" id="slCount"></p></div>
      <div class="sl-tools">
        <label class="sl-toggle"><input type="checkbox" id="slHide"> ${esc(l.hideDone)}</label>
        <button type="button" class="linkbtn" id="slAll">${esc(l.checkAll)}</button>
        <button type="button" class="linkbtn" id="slNone">${esc(l.uncheckAll)}</button>
      </div>
      <div id="slList"></div>
      <form class="sl-own" id="slOwn"><input type="text" id="slOwnInput" placeholder="${esc(l.addOwnPh)}" aria-label="${esc(l.addOwnPh)}"><button class="btn small" type="submit">${esc(l.addOwn)}</button></form>
      <div class="sl-export">
        <button type="button" class="btn" id="slShare">${esc(l.share)}</button>
        <button type="button" class="btn ghost" id="slKeep">${esc(l.keep)}</button>
        <button type="button" class="btn ghost" id="slCopy">${esc(l.copy)}</button>
        <a class="btn ghost" id="slWa" href="#" target="_blank" rel="noopener">${esc(l.whatsapp)}</a>
        <button type="button" class="btn ghost" id="slTxt">${esc(l.download)}</button>
        <button type="button" class="btn ghost" data-print>${esc(l.print)}</button>
      </div>
      <p class="sl-help" id="slHelp" hidden>${esc(l.keepHelp)}</p>
      <button type="button" class="linkbtn danger" id="slClear">${esc(l.clear)}</button>
    </div>
  </div>
</section>`;
  return layout(L, { title: `${l.title} – ${brand(L)}`, desc: l.lead, body, key: 'list', noindex: true });
}

function contactPage(L) {
  const c = UI[L].contact;
  const strings = { sending: c.sending, send: c.send, ok: c.ok, bad: c.bad, bot: c.bot, err: c.err };
  const body = `
<section class="wrap sec contact">
  <p class="eyebrow">${esc(brand(L))}</p>
  <h1 class="page-title">${esc(c.title)}</h1>
  <p class="lead narrow">${esc(c.lead)}</p>
  <form class="contact-form" id="contactForm" method="post" action="/api/contact" data-strings="${esc(JSON.stringify(strings))}">
    <input type="hidden" name="lang" value="${L}">
    <label class="cf-field"><span>${esc(c.name)}</span><input type="text" name="name" required maxlength="100" autocomplete="name"></label>
    <label class="cf-field"><span>${esc(c.email)}</span><input type="email" name="email" required maxlength="200" autocomplete="email"></label>
    <label class="cf-field"><span>${esc(c.message)}</span><textarea name="message" required maxlength="5000" rows="7"></textarea></label>
    <label class="cf-hp" aria-hidden="true">Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
    <div class="cf-turnstile" data-sitekey="${esc(TURNSTILE_KEY)}" data-language="${L}"></div>
    <p class="cf-status" id="contactStatus" role="status" aria-live="polite"></p>
    <button type="submit" class="btn">${esc(c.send)}</button>
    <p class="cf-privacy">${esc(c.privacy)}</p>
  </form>
</section>`;
  return layout(L, { title: `${c.title} – ${brand(L)}`, desc: c.lead, body, key: 'contact', noindex: !CONTACT_LIVE,
    head: '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' });
}

// llms.txt: korte, platte samenvatting van de site voor AI-assistenten (https://llmstxt.org)
function llmsTxt() {
  const en = D.en, line = r => `- [${r.title}](${SITE}${u.recipe('en', r.id)})${r.name_es ? ` (Spanish: ${r.name_es})` : ''}: ${r.intro}`;
  return `# ${LANGS.map(brand).join(' / ')}

> Affordable, mild slow cooker family recipes (4 servings: 2 adults, 2 children) by Bianca Manuela Seegers, for families and expats on the Costa del Sol, Spain. Every ingredient lists its Spanish supermarket name, aisle and the chains where you find it, with realistic 2026 Spanish prices and a budget version.

The site is available in Dutch (source), Spanish, English, German and French; every recipe exists in all five languages.

## Main pages
${LANGS.map(L => `- [${brand(L)} (${UI[L].langName})](${SITE}${u.home(L)}): ${UI[L].seo.recipes}`).join('\n')}
- [Supermarket guide, Costa del Sol](${SITE}${u.market('en')}): where to find each ingredient in Spanish supermarkets
- [Slow cooker basics](${SITE}${u.basics('en')})
${PDF ? `- [Cookbook PDF (Dutch)](${SITE}${PDF.url})\n` : ''}
## Recipes
${en.list.map(line).join('\n')}

## More from the slow cooker
${en.extras.map(line).join('\n')}
`;
}

function rootPage() {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${brand('nl')} · ${LANGS.filter(x => x !== 'nl').map(brand).join(' · ')}</title>
${LANGS.map(L => `<link rel="alternate" hreflang="${L}" href="${SITE}/${L}/">`).join('')}<link rel="alternate" hreflang="x-default" href="${SITE}/nl/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link href="${T.fonts}" rel="stylesheet"><link rel="stylesheet" href="/css/site.css?v=${V.css}">
<script>(function(){try{var s=localStorage.getItem('lang');var l=s||((navigator.languages||[navigator.language||'nl'])[0]||'nl').slice(0,2).toLowerCase();if(['nl','es','en','de','fr'].indexOf(l)<0)l=/^(ca|eu|gl)$/.test(l)?'es':'en';location.replace('/'+l+'/');}catch(e){location.replace('/nl/');}})();</script>
</head><body class="theme-${T.key} page-root"><main class="root-choose wrap">
<img src="/img/hero.svg" alt="" width="260" height="260"><h1>${esc(UI.nl.brand[0])} <span>${esc(UI.nl.brand[1])}</span></h1>
<p>${LANGS.map(L => `<a class="btn ghost" href="/${L}/" lang="${L}">${UI[L].langName}</a>`).join(' ')}</p></main></body></html>`;
}

function notFound() {
  const L = 'nl';
  const body = `<section class="wrap sec nf"><h1 class="page-title">404</h1>${LANGS.map(x => `<p lang="${x}">${UI[x].notFound} <a href="${u.recipes(x)}">${UI[x].notFoundCta}</a></p>`).join('')}</section>`;
  return layout(L, { title: `404 – ${brand(L)}`, desc: '', body, key: 'home', noindex: true }).replace('<html lang="nl">', '<html lang="nl">');
}

// ---------- assets ----------
function writeFile(rel, content) { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }

function sceneFor(id) { return SCENES[id] || autoScene(NL_RECIPES.find(r => r.id === id)); }
function dishFile(id) {
  const sc = { ...sceneFor(id), id };
  const svg = art.renderDish(sc, { ...T.art, bg: null });
  const ci = CHIDX[id];
  const bg = T.bg(id, chColor(ci));
  return svg.replace(/(<svg[^>]*>)/, `$1${bg}`).replace('<svg ', '<svg width="600" height="600" ');
}
function heroFile() {
  const items = [
    { id: 2, x: 120, y: 120, s: 270 }, { id: 26, x: 482, y: 118, s: 260 }, { id: 4, x: 105, y: 478, s: 250 }, { id: 28, x: 492, y: 482, s: 250 },
    { id: 10, x: 300, y: 590, s: 200 }, { id: 13, x: 300, y: 18, s: 190 }, { id: 1, x: 300, y: 300, s: 400 },
  ];
  const inner = items.map(it => art.renderDish({ ...SCENES[it.id], id: it.id }, { ...T.art, bg: null }).replace('<svg ', `<svg x="${it.x - it.s / 2}" y="${it.y - it.s / 2}" width="${it.s}" height="${it.s}" overflow="visible" `)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600"><defs><clipPath id="hc"><circle cx="300" cy="300" r="296"/></clipPath></defs><g clip-path="url(#hc)">${T.bg(900, T.vars.accent)}${inner}</g><circle cx="300" cy="300" r="296" fill="none" stroke="${T.vars.ink}" stroke-opacity=".3" stroke-width="2"/></svg>`;
}
function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="34" r="26" fill="${T.vars.accent}"/><rect x="2" y="29" width="10" height="10" rx="3" fill="${T.vars.accent}"/><rect x="52" y="29" width="10" height="10" rx="3" fill="${T.vars.accent}"/><circle cx="32" cy="34" r="19" fill="${T.vars.bg}"/><circle cx="26" cy="30" r="4" fill="#EE8A2A"/><circle cx="38" cy="37" r="4" fill="#EE8A2A"/><circle cx="34" cy="27" r="3" fill="#3B8C40"/><circle cx="28" cy="40" r="3.4" fill="#F1D387"/></svg>`;
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  // static files
  const pub = path.join(ROOT, 'public');
  if (fs.existsSync(pub)) fs.cpSync(pub, OUT, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, 'site.css'), 'utf8')
    .replace(/\/\*VARS\*\//, Object.entries(T.vars).map(([k, v]) => `--${k}:${v};`).join(''))
    + '\n' + T.css;
  const js = fs.readFileSync(path.join(__dirname, 'site.js'), 'utf8');
  V.css = hash(css); V.js = hash(js); V.data = hash(LANGS.map(dataJson).join(''));
  writeFile('css/site.css', css);
  writeFile('js/site.js', js);
  for (const r of NL_RECIPES) writeFile(`img/dish/${r.id}.svg`, dishFile(r.id));
  writeFile('img/hero.svg', heroFile());
  writeFile('favicon.svg', favicon());
  // pages
  writeFile('index.html', rootPage());
  writeFile('404.html', notFound());
  const urls = [];
  for (const L of LANGS) {
    const put = (url, html) => { writeFile(path.join(url, 'index.html'), html); urls.push(url); };
    put(u.home(L), home(L));
    put(u.recipes(L), recipesPage(L));
    put(u.market(L), marketPage(L));
    put(u.basics(L), basicsPage(L));
    writeFile(path.join(u.list(L), 'index.html'), listPage(L));  // persoonlijke lijst: niet in de sitemap
    writeFile(`data/${L}.json`, dataJson(L));
    D[L].all.forEach(r => put(u.recipe(L, r.id), recipePage(L, r)));
    put(u.more(L), morePage(L));
    if (CONTACT_LIVE) put(u.contact(L), contactPage(L)); else writeFile(path.join(u.contact(L), 'index.html'), contactPage(L));  // verborgen: niet in de sitemap
  }
  if (SITE) {
    writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(x => `<url><loc>${SITE}${x}</loc></url>`).join('')}</urlset>`);
    writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
    writeFile('llms.txt', llmsTxt());
  } else writeFile('robots.txt', 'User-agent: *\nAllow: /\n');
  console.log(`Built ${urls.length} pages (${LANGS.join(', ')}) with theme ${T.key} → dist/`);
}

build();
