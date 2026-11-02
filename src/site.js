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
  var pr = document.querySelector('[data-print]');
  if (pr) pr.addEventListener('click', function () { window.print(); });
})();
