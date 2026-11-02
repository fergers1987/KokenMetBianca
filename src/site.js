// Smaakvol Koken — kleine, framework-loze interactie: favorieten, filters, afvinken, boodschappenlijst.
(function () {
  'use strict';

  // ---------- opslag: localStorage met cookie als terugval ----------
  var store = {
    get: function (k) {
      try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* private mode */ }
      var m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); return; } catch (e) { /* fall back to cookie */ }
      try { document.cookie = k + '=' + encodeURIComponent(v) + ';path=/;max-age=31536000;SameSite=Lax'; } catch (e) { /* ignore */ }
    }
  };

  // ---------- favorieten (op guid, dus gedeeld tussen de talen) ----------
  var FKEY = 'sk-favs';
  function favs() { try { var a = JSON.parse(store.get(FKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function setFavs(a) { store.set(FKEY, JSON.stringify(a)); }
  function isFav(g) { return favs().indexOf(g) > -1; }
  function toggleFav(g) { var a = favs(), i = a.indexOf(g); if (i > -1) a.splice(i, 1); else a.push(g); setFavs(a); paintFavs(); if (window.__filter) window.__filter(); }
  function paintFavs() {
    var a = favs();
    document.querySelectorAll('[data-fav]').forEach(function (b) {
      var on = a.indexOf(b.getAttribute('data-fav')) > -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('on', on);
      var span = b.querySelector('span'); if (span) span.textContent = on ? b.getAttribute('data-on') : b.getAttribute('data-off');
    });
    document.querySelectorAll('[data-fav-count]').forEach(function (el) { el.textContent = a.length ? String(a.length) : ''; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]');
    if (b) { e.preventDefault(); toggleFav(b.getAttribute('data-fav')); }
  });
  paintFavs();

  // taalkeuze onthouden
  document.querySelectorAll('.langs a, .f-small a[lang]').forEach(function (a) {
    a.addEventListener('click', function () { store.set('lang', a.getAttribute('lang') || a.getAttribute('hreflang')); });
  });

  // ---------- receptenoverzicht: filters ----------
  var cards = document.getElementById('cards');
  if (cards) {
    var $ = function (id) { return document.getElementById(id); };
    var q = $('q'), count = $('count'), none = $('none'), sort = $('sort');
    var toggles = { fav: $('favs'), vega: $('vega'), freeze: $('freeze') };
    var selects = { spice: $('spice'), cuisine: $('cuisine'), protein: $('protein'), side: $('side') };
    var pp = $('pp'), hrs = $('hrs'), ppOut = $('ppOut'), hrsOut = $('hrsOut');
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-h]'));
    var all = Array.prototype.slice.call(cards.querySelectorAll('.card'));
    var h = '';
    function pressed(b) { return b.getAttribute('aria-pressed') === 'true'; }
    function press(b, on) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    function setChip(v) { h = v; chips.forEach(function (c) { press(c, c.getAttribute('data-h') === v); }); }

    // filters uit de URL halen, zodat een gefilterde lijst te delen is
    var params = new URLSearchParams(location.search);
    setChip(params.get('h') || '');
    Object.keys(toggles).forEach(function (k) { if (params.get(k) === '1') press(toggles[k], true); });
    Object.keys(selects).forEach(function (k) { if (params.get(k)) selects[k].value = params.get(k); });
    if (params.get('pp')) pp.value = params.get('pp');
    if (params.get('hrs')) hrs.value = params.get('hrs');
    if (params.get('q')) q.value = params.get('q');
    if (params.get('sort')) sort.value = params.get('sort');

    chips.forEach(function (c) { c.addEventListener('click', function () { setChip(c.getAttribute('data-h')); run(); }); });
    Object.keys(toggles).forEach(function (k) { toggles[k].addEventListener('click', function () { press(toggles[k], !pressed(toggles[k])); run(); }); });
    Object.keys(selects).forEach(function (k) { selects[k].addEventListener('change', run); });
    [pp, hrs].forEach(function (r) { r.addEventListener('input', run); });
    q.addEventListener('input', run); sort.addEventListener('change', run);
    $('reset').addEventListener('click', function () {
      setChip(''); Object.keys(toggles).forEach(function (k) { press(toggles[k], false); });
      Object.keys(selects).forEach(function (k) { selects[k].selectedIndex = 0; });
      pp.value = pp.max; hrs.value = hrs.max; q.value = ''; sort.selectedIndex = 0; run();
    });

    function fmtMoney(v) { var t = (+v).toFixed(2); if (document.documentElement.lang !== 'en') t = t.replace('.', ','); return ppOut.getAttribute('data-fmt').replace('#', t); }
    function run() {
      var term = q.value.trim().toLowerCase(), a = favs(), n = 0;
      var maxPP = +pp.value, maxH = +hrs.value, maxS = +selects.spice.value;
      ppOut.textContent = fmtMoney(maxPP);
      hrsOut.textContent = maxH >= +hrs.max ? hrsOut.getAttribute('data-none') : maxH + ' ' + hrsOut.getAttribute('data-unit');
      all.forEach(function (c) {
        var d = c.dataset;
        var ok = (!h || d.ch === h) &&
          (!pressed(toggles.vega) || d.vega === '1') && (!pressed(toggles.freeze) || d.freeze === '1') &&
          (!pressed(toggles.fav) || a.indexOf(d.guid) > -1) &&
          (+d.spice <= maxS) && (+d.pp <= maxPP + 0.001) && (maxH >= +hrs.max || +d.hrs <= maxH) &&
          (!selects.cuisine.value || d.cuisine === selects.cuisine.value) &&
          (!selects.protein.value || d.protein === selects.protein.value) &&
          (!selects.side.value || d.side === selects.side.value) &&
          (!term || d.search.indexOf(term) > -1);
        c.hidden = !ok; if (ok) n++;
      });
      var key = { n: 'n', price: 'pp', time: 'hrs', spice: 'spice' }[sort.value] || 'n';
      all.slice().sort(function (x, y) { return (+x.dataset[key] - +y.dataset[key]) || (+x.dataset.n - +y.dataset.n); })
        .forEach(function (c) { cards.appendChild(c); });
      count.textContent = count.getAttribute('data-tpl').replace('#', n);
      none.hidden = n > 0;
      none.textContent = pressed(toggles.fav) && !a.length ? none.getAttribute('data-nofavs') : none.getAttribute('data-none');
      var p = new URLSearchParams();
      if (h) p.set('h', h);
      Object.keys(toggles).forEach(function (k) { if (pressed(toggles[k])) p.set(k, '1'); });
      Object.keys(selects).forEach(function (k) { if (selects[k].selectedIndex > 0) p.set(k, selects[k].value); });
      if (+pp.value < +pp.max) p.set('pp', pp.value);
      if (+hrs.value < +hrs.max) p.set('hrs', hrs.value);
      if (term) p.set('q', term);
      if (sort.selectedIndex > 0) p.set('sort', sort.value);
      try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { /* file:// */ }
    }
    var more = $('more'), activeN = $('activeN');
    if (window.matchMedia('(min-width: 821px)').matches) more.open = true;
    function countActive() {
      var n = 0;
      Object.keys(selects).forEach(function (k) { if (selects[k].selectedIndex > 0) n++; });
      if (+pp.value < +pp.max) n++; if (+hrs.value < +hrs.max) n++;
      activeN.textContent = n ? String(n) : '';
      if (n && !more.open && params.toString()) more.open = true;
    }
    var run0 = run; run = function () { run0(); countActive(); };
    Object.keys(selects).forEach(function (k) { selects[k].addEventListener('change', countActive); });
    [pp, hrs].forEach(function (r) { r.addEventListener('input', countActive); });
    window.__filter = run;
    run();
  }

  // ---------- supermarktgids: zoeken ----------
  var mq = document.getElementById('mq');
  if (mq) mq.addEventListener('input', function () {
    var t = mq.value.trim().toLowerCase();
    document.querySelectorAll('.mrow').forEach(function (r) { r.hidden = t && r.getAttribute('data-search').indexOf(t) < 0; });
    document.querySelectorAll('.mgroup').forEach(function (g) { g.hidden = !g.querySelector('.mrow:not([hidden])'); });
  });

  // ---------- recept: afvinken (onthouden), lijst delen, printen ----------
  document.querySelectorAll('.ing input[type=checkbox]').forEach(function (cb) {
    var k = 'sk-tick-' + cb.getAttribute('data-k');
    cb.checked = store.get(k) === '1';
    cb.addEventListener('change', function () { store.set(k, cb.checked ? '1' : '0'); });
  });
  var share = document.querySelector('[data-share]');
  if (share) {
    if (navigator.share) share.textContent = share.getAttribute('data-label-share');
    share.addEventListener('click', function () {
      var text = share.getAttribute('data-title') + '\n\n' + share.getAttribute('data-share');
      if (navigator.share) { navigator.share({ title: share.getAttribute('data-title'), text: text }).catch(function () {}); return; }
      var done = function () { var o = share.textContent; share.textContent = share.getAttribute('data-done'); setTimeout(function () { share.textContent = o; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  }
  document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  // ---------- boodschappenlijst: welke gerechten, voor hoeveel personen ----------
  var LKEY = 'sk-list', CKEY = 'sk-list-checks', OKEY = 'sk-list-own';
  function readJson(k, d) { try { var v = JSON.parse(store.get(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function list() { return readJson(LKEY, {}); }
  function saveList(o) { store.set(LKEY, JSON.stringify(o)); paintList(); }
  function paintList() {
    var o = list(), n = Object.keys(o).length;
    document.querySelectorAll('[data-add]').forEach(function (b) {
      var on = !!o[b.getAttribute('data-add')];
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on);
      var s = b.querySelector('span'); if (s) s.textContent = on ? b.getAttribute('data-on') : b.getAttribute('data-off');
    });
    document.querySelectorAll('[data-persons]').forEach(function (sel) { var p = o[sel.getAttribute('data-persons')]; if (p) sel.value = String(p); });
    document.querySelectorAll('[data-list-count]').forEach(function (el) { el.textContent = n ? String(n) : ''; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault();
    var g = b.getAttribute('data-add'), o = list();
    if (o[g]) delete o[g];
    else { var sel = document.querySelector('[data-persons="' + g + '"]'); o[g] = sel ? +sel.value : 4; }
    saveList(o);
  });
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-persons]'); if (!sel) return;
    var g = sel.getAttribute('data-persons'), o = list();
    if (o[g]) { o[g] = +sel.value; saveList(o); }
  });
  paintList();

  // ---------- budgetversie (per recept, gedeeld met de boodschappenlijst) ----------
  var BKEY = 'sk-budget';
  function budgets() { return readJson(BKEY, {}); }
  function setBudget(g, on) { var b = budgets(); if (on) b[g] = 1; else delete b[g]; store.set(BKEY, JSON.stringify(b)); }
  document.querySelectorAll('[data-budget]').forEach(function (cb) {
    var g = cb.getAttribute('data-budget'), art = cb.closest('.recipe');
    cb.checked = !!budgets()[g]; if (art) art.classList.toggle('budget', cb.checked);
    cb.addEventListener('change', function () { setBudget(g, cb.checked); if (art) art.classList.toggle('budget', cb.checked); });
  });

  // ---------- boodschappenlijst-pagina ----------
  var shop = document.querySelector('.shoplist');
  if (shop) {
    var S = JSON.parse(shop.getAttribute('data-strings')), DATA = null;
    var en = S.lang === 'en';
    var $$ = function (id) { return document.getElementById(id); };
    var FR = { '½': .5, '¼': .25, '¾': .75, '⅓': 1 / 3, '⅔': 2 / 3 };
    function num(t) { // "1½", "1,5", "½" -> number
      var m = String(t).match(/^(\d+)?([½¼¾⅓⅔])?(?:[.,](\d+))?$/); if (!m) return NaN;
      var v = (m[1] ? +m[1] : 0) + (m[2] ? FR[m[2]] : 0) + (m[3] ? +('0.' + m[3]) : 0);
      return m[1] || m[2] ? v : NaN;
    }
    function fmt(v, unit) {
      var u = (unit || '').toLowerCase();
      if (/^(g|gr|ml|gram|grams|gramm)\b/.test(u)) v = v >= 50 ? Math.round(v / 10) * 10 : Math.round(v / 5) * 5 || v;
      else v = Math.round(v * 2) / 2;
      var whole = Math.floor(v), frac = v - whole;
      if (Math.abs(frac - .5) < .01 && !/^(g|ml|kg|l)\b/.test(u)) return (whole || '') + '½';
      var s = String(Math.round(v * 100) / 100);
      return en ? s : s.replace('.', ',');
    }
    var NUMRE = /(\d+(?:[.,]\d+)?[½¼¾]?|[½¼¾⅓⅔])/g;
    function scaleText(q, f) { return f === 1 ? q : q.replace(NUMRE, function (t) { var v = num(t); return isNaN(v) ? t : fmt(v * f, q.slice(q.indexOf(t) + t.length).trim()); }); }
    function parseQ(q) { // simple "500 g" / "2" / "1 el" -> {v, unit}
      var m = String(q).trim().match(/^(\d+(?:[.,]\d+)?[½¼¾]?|[½¼¾⅓⅔])\s*([^\d+()–-]*)$/);
      return m ? { v: num(m[1]), unit: m[2].trim() } : null;
    }
    function cleanName(s) { return s.replace(/\s*\(.*?\)/g, '').split(',')[0].trim(); }
    var checks = function () { return readJson(CKEY, {}); };
    function setCheck(k, on) { var c = checks(); if (on) c[k] = 1; else delete c[k]; store.set(CKEY, JSON.stringify(c)); }
    function own() { var a = readJson(OKEY, []); return Array.isArray(a) ? a : []; }

    function build() {
      var o = list(), rows = {}, dishes = [];
      Object.keys(o).forEach(function (g) {
        var r = DATA.recipes[g]; if (!r) return;
        var f = o[g] / 4, bud = !!budgets()[g]; dishes.push({ g: g, r: r, p: o[g], b: bud });
        r.ing.forEach(function (i) {
          if (bud && (i[3] === 'extra' || i[3] === 'topping')) return;
          var q = i[0], item = i[1], es = i[2], key = (es || cleanName(item)).toLowerCase();
          var row = rows[key] || (rows[key] = { key: key, name: cleanName(item), es: es, parts: [], sums: {}, recipes: [], aisle: DATA.aisles[es] || ['', 99, []] });
          if (row.recipes.indexOf(r.t) < 0) row.recipes.push(r.t);
          if (!q) return;
          var pq = parseQ(q);
          if (pq && !isNaN(pq.v)) { var uk = pq.unit.toLowerCase(); row.sums[uk] = (row.sums[uk] || { v: 0, unit: pq.unit }); row.sums[uk].v += pq.v * f; }
          else row.parts.push(scaleText(q, f));
        });
      });
      Object.keys(rows).forEach(function (k) {
        var row = rows[k];
        var qs = Object.keys(row.sums).map(function (u) { var s = row.sums[u]; return (fmt(s.v, s.unit) + ' ' + s.unit).trim(); });
        row.qty = qs.concat(row.parts).join(' + ');
      });
      return { dishes: dishes.sort(function (a, b) { return a.r.n - b.r.n; }), rows: Object.keys(rows).map(function (k) { return rows[k]; }) };
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function render() {
      var res = build(), c = checks(), hide = $$('slHide').checked, ownItems = own();
      var empty = !res.dishes.length && !ownItems.length;
      $$('slEmpty').hidden = !empty; $$('slGrid').hidden = empty;
      if (empty) return;
      $$('slDishes').innerHTML = res.dishes.map(function (d) {
        return '<li><a href="' + d.r.u + '"><img src="' + d.r.img + '" alt="" width="56" height="56"></a><div><a href="' + d.r.u + '">' + esc(d.r.t) + '</a>' +
          '<div class="stepper"><button type="button" data-step="-1" data-g="' + d.g + '" aria-label="−">−</button><span>' + d.p + ' ' + esc(S.persons) + '</span><button type="button" data-step="1" data-g="' + d.g + '" aria-label="+">+</button>' +
          '<label class="sl-bud"><input type="checkbox" data-sl-budget="' + d.g + '"' + (d.b ? ' checked' : '') + '> ' + esc(S.budgetLabel) + '</label>' +
          '<button type="button" class="linkbtn" data-rm="' + d.g + '">' + esc(S.remove) + '</button></div></div></li>';
      }).join('');
      var groups = {};
      res.rows.forEach(function (r) { var a = r.aisle[0] || S.other; (groups[a] = groups[a] || { name: a, rank: r.aisle[0] ? r.aisle[1] : 100, rows: [] }).rows.push(r); });
      var gs = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return a.rank - b.rank || a.name.localeCompare(b.name); });
      var total = res.rows.length + ownItems.length, done = 0;
      var html = gs.map(function (gr) {
        gr.rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return '<section class="sl-group"><h3 lang="es">' + esc(gr.name) + '</h3><ul>' + gr.rows.map(function (r) {
          var on = !!c[r.key]; if (on) done++;
          return '<li class="' + (on ? 'done' : '') + '"' + (on && hide ? ' hidden' : '') + '><label><input type="checkbox" data-ck="' + esc(r.key) + '"' + (on ? ' checked' : '') + '>' +
            '<span class="sl-q">' + esc(r.qty) + '</span><span class="sl-n">' + esc(r.name) + (S.lang !== 'es' && r.es ? '<i lang="es">' + esc(r.es) + '</i>' : '') +
            '<small>' + esc(S.forRecipes) + ' ' + esc(r.recipes.join(', ')) + (r.aisle[2] && r.aisle[2].length ? ' · ' + esc(r.aisle[2].join(', ')) : '') + '</small></span></label></li>';
        }).join('') + '</ul></section>';
      }).join('');
      if (ownItems.length) html += '<section class="sl-group"><h3>' + esc(S.own) + '</h3><ul>' + ownItems.map(function (t, i) {
        var k = 'own:' + t.toLowerCase(), on = !!c[k]; if (on) done++;
        return '<li class="' + (on ? 'done' : '') + '"' + (on && hide ? ' hidden' : '') + '><label><input type="checkbox" data-ck="' + esc(k) + '"' + (on ? ' checked' : '') + '><span class="sl-n">' + esc(t) + '</span></label><button type="button" class="linkbtn" data-rmown="' + i + '" aria-label="' + esc(S.remove) + '">×</button></li>';
      }).join('') + '</ul></section>';
      $$('slList').innerHTML = html;
      $$('slCount').textContent = S.count.replace('{n}', res.dishes.length).replace('{m}', total) + ' · ' + S.doneOf.replace('{d}', done).replace('{m}', total);
      $$('slWa').href = 'https://wa.me/?text=' + encodeURIComponent(text(true));
    }
    function text(withHeaders) {
      var res = build(), c = checks(), lines = [], last = null;
      res.rows.slice().sort(function (a, b) { return (a.aisle[0] ? a.aisle[1] : 100) - (b.aisle[0] ? b.aisle[1] : 100) || a.name.localeCompare(b.name); }).forEach(function (r) {
        if (c[r.key]) return;
        var head = r.aisle[0] || S.other;
        if (withHeaders && head !== last) { lines.push((lines.length ? '\n' : '') + head.toUpperCase()); last = head; }
        lines.push((withHeaders ? '☐ ' : '') + (r.qty ? r.qty + ' ' : '') + r.name + (S.lang !== 'es' && r.es ? ' (' + r.es + ')' : ''));
      });
      own().forEach(function (t) { if (!c['own:' + t.toLowerCase()]) lines.push((withHeaders ? '☐ ' : '') + t); });
      var title = S.title + (withHeaders ? '\n' + res.dishes.map(function (d) { return '• ' + d.r.t + ' (' + d.p + ' ' + S.persons + ')'; }).join('\n') + '\n' : '');
      return title + '\n' + lines.join('\n');
    }
    function flash(btn, msg) { var o = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1800); }
    function copy(t, btn) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { if (btn) flash(btn, S.copied); }, function () {}); }

    shop.addEventListener('click', function (e) {
      var t = e.target, o = list();
      if (t.closest('[data-step]')) { var b = t.closest('[data-step]'), g = b.getAttribute('data-g'); o[g] = Math.max(1, Math.min(16, (o[g] || 4) + +b.getAttribute('data-step'))); saveList(o); render(); }
      else if (t.closest('[data-rm]')) { delete o[t.closest('[data-rm]').getAttribute('data-rm')]; saveList(o); render(); }
      else if (t.closest('[data-rmown]')) { var a = own(); a.splice(+t.closest('[data-rmown]').getAttribute('data-rmown'), 1); store.set(OKEY, JSON.stringify(a)); render(); }
    });
    shop.addEventListener('change', function (e) {
      var ck = e.target.closest('[data-ck]'); if (ck) { setCheck(ck.getAttribute('data-ck'), ck.checked); render(); }
      var sb = e.target.closest('[data-sl-budget]'); if (sb) { setBudget(sb.getAttribute('data-sl-budget'), sb.checked); render(); }
    });
    $$('slHide').addEventListener('change', render);
    $$('slAll').addEventListener('click', function () { var c = {}; build().rows.forEach(function (r) { c[r.key] = 1; }); own().forEach(function (t) { c['own:' + t.toLowerCase()] = 1; }); store.set(CKEY, JSON.stringify(c)); render(); });
    $$('slNone').addEventListener('click', function () { store.set(CKEY, '{}'); render(); });
    $$('slOwn').addEventListener('submit', function (e) { e.preventDefault(); var i = $$('slOwnInput'), v = i.value.trim(); if (!v) return; var a = own(); a.push(v); store.set(OKEY, JSON.stringify(a)); i.value = ''; render(); });
    $$('slShare').addEventListener('click', function () {
      var t = text(true);
      if (navigator.share) navigator.share({ title: S.title, text: t }).catch(function () {});
      else { copy(t, $$('slShare')); $$('slHelp').hidden = false; }
    });
    $$('slKeep').addEventListener('click', function () {
      var t = text(false);
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ title: S.title, text: t }).catch(function () {}); return; }
      copy(t); $$('slHelp').hidden = false; window.open('https://keep.google.com/', '_blank', 'noopener');
    });
    $$('slCopy').addEventListener('click', function () { copy(text(true), $$('slCopy')); });
    $$('slTxt').addEventListener('click', function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text(true)], { type: 'text/plain;charset=utf-8' }));
      a.download = S.title.replace(/\s+/g, '-').toLowerCase() + '.txt'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    $$('slClear').addEventListener('click', function () { if (confirm(S.confirmClear)) { store.set(LKEY, '{}'); store.set(CKEY, '{}'); store.set(OKEY, '[]'); paintList(); render(); } });

    fetch(shop.getAttribute('data-src')).then(function (r) { return r.json(); }).then(function (d) { DATA = d; render(); })
      .catch(function () { $$('slEmpty').hidden = false; });
  }
})();
