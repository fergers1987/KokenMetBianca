// Procedural top-down "kookboekart" for the 30 dishes, renderable in several styles.
'use strict';

function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour utils ----------
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb2hex([r, g, b]) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); }
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }

const f1 = v => Math.round(v * 10) / 10;

// smooth closed path through points (Catmull-Rom -> Bezier)
function smoothPath(pts) {
  const n = pts.length; let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + 'Z';
}
function blob(x, y, rx, ry, jit, n, rng, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2; const k = 1 + (rng() * 2 - 1) * jit;
    const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
    pts.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]);
  }
  return smoothPath(pts);
}

// ---------- painter: style-aware primitive emitter ----------
function makePainter(style, opts = {}) {
  const ink = opts.ink || '#2b211c';
  const paper = opts.paper || '#fbf6ec';
  const inks = opts.inks || ['#ff665e', '#0078bf', '#ffb511', '#00a95c'];
  const out = [];
  function paint(c, role) {
    if (style === 'outline') return { fill: 'none', stroke: ink, op: 1 };
    if (style === 'line') {
      if (role === 'detail') return { fill: mix(c, paper, .25), stroke: 'none', op: 1 };
      return { fill: mix(c, paper, .5), stroke: ink, op: 1 };
    }
    if (style === 'riso') {
      const [h, s, l] = rgb2hsl(hex2rgb(c));
      // pick nearest ink by hue (desaturated colours -> darkest ink)
      let best = inks[0], bd = 1e9;
      inks.forEach(k => { const [hh, ss] = rgb2hsl(hex2rgb(k)); let d = Math.abs(hh - h); d = Math.min(d, 360 - d); if (s < .18) d = ss < .3 ? 0 : 200 - ss * 50; if (d < bd) { bd = d; best = k; } });
      return { fill: mix(c, best, .28), stroke: 'none', op: 1 };
    }
    if (style === 'water') return { fill: mix(c, '#ffffff', .12), stroke: mix(c, '#000000', .25), op: opts.waterOp ?? .9 };
    return { fill: c, stroke: 'none', op: 1 };
  }
  function attrs(c, role, extra = '') {
    const p = paint(c, role);
    let s = `fill="${p.fill}"`;
    if (p.op !== 1) s += ` fill-opacity="${p.op}"`;
    if (style === 'line' && p.stroke !== 'none') s += ` stroke="${p.stroke}" stroke-width="${role === 'big' ? 2.2 : 1.6}" stroke-linejoin="round" stroke-linecap="round"`;
    if (style === 'outline') s += ` stroke="${ink}" stroke-width="${role === 'detail' ? .9 : role === 'big' ? 1.9 : 1.4}" stroke-linejoin="round" stroke-linecap="round"`;
    if (style === 'water' && role !== 'detail') s += ` stroke="${p.stroke}" stroke-opacity=".35" stroke-width="1.6"`;
    return s + extra;
  }
  function emit(tag, geom, c, role, extra) {
    if (style === 'sketch') {
      if (role === 'detail') { out.push(`<${tag} ${geom} fill="${c}"${extra}/>`); return; }
      out.push(`<g transform="translate(${role === 'big' ? 6 : 3.5} ${role === 'big' ? 5 : 3})"><${tag} ${geom} fill="${mix(c, '#000', .04)}"${extra}/></g>`);
      out.push(`<${tag} ${geom} fill="${mix(c, paper, .3)}" stroke="${ink}" stroke-width="${role === 'big' ? 1.9 : role === 'small' ? 1 : 1.4}" stroke-linejoin="round"${extra}/>`);
      return;
    }
    out.push(`<${tag} ${geom} ${attrs(c, role, extra)}/>`);
  }
  return {
    style, ink, paper,
    raw(s) { out.push(s); },
    path(d, c, role = 'mid', extra = '') { emit('path', `d="${d}"`, c, role, extra); },
    circle(x, y, r, c, role = 'mid', extra = '') { emit('circle', `cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"`, c, role, extra); },
    ellipse(x, y, rx, ry, rot, c, role = 'mid', extra = '') { emit('ellipse', `cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"`, c, role, extra); },
    line(d, c, w, extra = '') {
      let col = c, op = 1;
      if (style === 'line') col = w >= 2.2 ? mix(c, paper, .2) : ink;
      if (style === 'outline') { col = ink; w = Math.min(w, 1.4); }
      if (style === 'sketch') col = w >= 2.2 ? c : ink;
      if (style === 'riso') { const p = paint(c); col = p.fill; op = p.op; }
      out.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op !== 1 ? ` stroke-opacity="${op}"` : ''}${extra}/>`);
    },
    rf(c) { // attributes for raw shapes
      if (style === 'outline') return `fill="none" stroke="${ink}" stroke-width="1.6"`;
      if (style === 'sketch') return `fill="${mix(c, paper, .3)}" stroke="${ink}" stroke-width="1.8"`;
      if (style === 'line') return `fill="${mix(c, paper, .5)}" stroke="${ink}" stroke-width="2"`;
      const p = paint(c); return `fill="${p.fill}"`;
    },
    open(g) { out.push(g); }, close() { out.push('</g>'); },
    toString() { return out.join(''); },
  };
}

// ---------- palette of natural colours ----------
const C = {
  carrot: '#EE8A2A', carrotL: '#F8B86A', potato: '#F1D387', potatoL: '#F9E9B8', potatoD: '#D9B25E',
  beef: '#74391F', beefD: '#53240F', beefL: '#9A5634', chicken: '#D9A061', chickenL: '#F0C98F', chickenD: '#B47534',
  pork: '#B97446', porkL: '#D99A68', meatball: '#86462A', meatballD: '#5F2D17', chorizo: '#B8321F', chorizoFat: '#F3C3A0',
  shrimp: '#F2865E', shrimpL: '#FCC6A8', fish: '#F6F0E4', fishD: '#DCCFBB', chickpea: '#E2BF78', chickpeaD: '#C29A50',
  lentil: '#7E5434', lentilRed: '#E2833F', kidney: '#7A1F2C', kidneyL: '#A9404E', corn: '#F6C744', cornD: '#E0A91F', pea: '#69AD3A', peaL: '#9BD064',
  red: '#D3283A', yellow: '#F2B200', green: '#3E8C31', mushroom: '#D8BB94', mushroomD: '#8D6A48', onion: '#F4E8D6', onionD: '#DCC4A6',
  zucchini: '#4B8A39', zucchiniL: '#D5E8AE', tomato: '#D23A2A', tomatoL: '#F07560', sundried: '#8E2121', spinach: '#2E6B33',
  apricot: '#F09B45', olive: '#3E3D28', oliveG: '#7B8B30', leek: '#9BC46A', leekL: '#EDF4D8', celery: '#8FBE58',
  parsley: '#3B8C40', coriander: '#4E9C2C', thyme: '#6A7E47', bay: '#6C8A3B', cream: '#FFF8EA', lemon: '#F6D33C', lemonL: '#FCEB97', lemonRind: '#E3B000',
  lime: '#8CC04A', limeL: '#D2EAA5', peanut: '#D7A56A', sesame: '#F6ECD6', apple: '#EFE1A2', appleSkin: '#BF3A2A', garlic: '#F3EEDD',
  rice: '#FBF8F0', riceD: '#E9E1CF', pasta: '#F3D27A', pastaD: '#D9B04E', mash: '#F5E3A6', mashD: '#E0BE6B', couscous: '#EFCB6F', tortilla: '#F0D49A', tortillaD: '#C9944E',
  butter: '#FBE07A', yoghurt: '#FBFAF4', cucumber: '#5E9B45', cucumberL: '#D9EDB9', bread: '#D99B57', breadL: '#F4DDB0',
};

// ---------- ingredient drawers: (P, x, y, s, rot, rng) ----------
const deg = r => r * 180 / Math.PI;
const ING = {
  carrot(P, x, y, s, r, g) { P.circle(x, y, 11 * s, C.carrot); P.circle(x, y, 6.5 * s, C.carrotL, 'detail'); P.circle(x, y, 2.2 * s, C.carrot, 'detail'); },
  potato(P, x, y, s, r, g) { P.path(blob(x, y, 15 * s, 13 * s, .14, 7, g, r), C.potato, 'big'); P.path(blob(x - 3 * s, y - 3 * s, 7 * s, 5 * s, .2, 6, g, r), C.potatoL, 'detail'); },
  beef(P, x, y, s, r, g) { P.path(blob(x, y, 19 * s, 15 * s, .25, 8, g, r), C.beef, 'big'); P.path(blob(x - 4 * s, y - 4 * s, 9 * s, 6 * s, .3, 6, g, r), C.beefL, 'detail'); P.path(blob(x + 6 * s, y + 5 * s, 4 * s, 3 * s, .3, 5, g, r), C.beefD, 'detail'); },
  chicken(P, x, y, s, r, g) { P.path(blob(x, y, 20 * s, 14 * s, .22, 8, g, r), C.chicken, 'big'); P.path(blob(x - 4 * s, y - 3 * s, 11 * s, 5 * s, .3, 6, g, r), C.chickenL, 'detail'); P.line(`M${f1(x + 4 * s)},${f1(y + 6 * s)}q${f1(6 * s)},-${f1(2 * s)} ${f1(10 * s)},-${f1(7 * s)}`, C.chickenD, 1.4 * s); },
  pulled(P, x, y, s, r, g) {
    for (let i = 0; i < 7; i++) {
      const a = r + (g() - .5) * .6, l = (16 + g() * 14) * s, ox = x + (g() - .5) * 16 * s, oy = y + (g() - .5) * 16 * s;
      const ex = ox + Math.cos(a) * l, ey = oy + Math.sin(a) * l, cx = (ox + ex) / 2 + (g() - .5) * 10 * s, cy = (oy + ey) / 2 + (g() - .5) * 10 * s;
      P.line(`M${f1(ox)},${f1(oy)}Q${f1(cx)},${f1(cy)} ${f1(ex)},${f1(ey)}`, i % 3 ? C.chickenD : C.chickenL, (3.6 - (i % 3)) * s);
    }
  },
  pulledpork(P, x, y, s, r, g) {
    for (let i = 0; i < 8; i++) {
      const a = r + (g() - .5) * .7, l = (14 + g() * 16) * s, ox = x + (g() - .5) * 18 * s, oy = y + (g() - .5) * 18 * s;
      const ex = ox + Math.cos(a) * l, ey = oy + Math.sin(a) * l, cx = (ox + ex) / 2 + (g() - .5) * 10 * s, cy = (oy + ey) / 2 + (g() - .5) * 10 * s;
      P.line(`M${f1(ox)},${f1(oy)}Q${f1(cx)},${f1(cy)} ${f1(ex)},${f1(ey)}`, i % 3 ? C.pork : C.porkL, (4 - (i % 3)) * s);
    }
  },
  pulledbeef(P, x, y, s, r, g) {
    for (let i = 0; i < 8; i++) {
      const a = r + (g() - .5) * .7, l = (14 + g() * 16) * s, ox = x + (g() - .5) * 18 * s, oy = y + (g() - .5) * 18 * s;
      const ex = ox + Math.cos(a) * l, ey = oy + Math.sin(a) * l, cx = (ox + ex) / 2 + (g() - .5) * 10 * s, cy = (oy + ey) / 2 + (g() - .5) * 10 * s;
      P.line(`M${f1(ox)},${f1(oy)}Q${f1(cx)},${f1(cy)} ${f1(ex)},${f1(ey)}`, i % 3 ? C.beef : C.beefL, (4 - (i % 3)) * s);
    }
  },
  meatball(P, x, y, s, r, g) { P.circle(x, y, 17 * s, C.meatball, 'big'); P.circle(x - 5 * s, y - 5 * s, 6 * s, '#A8613E', 'detail'); for (let i = 0; i < 3; i++) P.circle(x + (g() - .3) * 16 * s, y + (g() - .3) * 16 * s, 1.6 * s, C.meatballD, 'detail'); },
  chorizo(P, x, y, s, r, g) { P.circle(x, y, 12 * s, C.chorizo); for (let i = 0; i < 5; i++) { const a = g() * 6.28, d = g() * 7 * s; P.circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.7 * s, C.chorizoFat, 'detail'); } },
  sausage(P, x, y, s, r, g) { P.circle(x, y, 11 * s, '#A0522D'); P.circle(x, y, 8 * s, '#C98A5B', 'detail'); for (let i = 0; i < 3; i++) { const a = g() * 6.28, d = g() * 5 * s; P.circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.4 * s, '#F2C9A8', 'detail'); } },
  shrimp(P, x, y, s, r, g) {
    const R = 13 * s; const pts = [];
    // C-shaped body as thick arc
    const a0 = r, a1 = r + 4.2;
    const outer = [], inner = [];
    for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10, w = (1 - i / 12) * 8 * s + 2 * s; outer.push([x + Math.cos(a) * (R + w / 2), y + Math.sin(a) * (R + w / 2)]); inner.unshift([x + Math.cos(a) * (R - w / 2), y + Math.sin(a) * (R - w / 2)]); }
    const all = outer.concat(inner); let d = `M${f1(all[0][0])},${f1(all[0][1])}`; all.slice(1).forEach(p => d += `L${f1(p[0])},${f1(p[1])}`); d += 'Z';
    P.path(d, C.shrimp, 'big');
    for (let i = 1; i < 6; i++) { const a = a0 + (a1 - a0) * i / 7; P.line(`M${f1(x + Math.cos(a) * (R - 3 * s))},${f1(y + Math.sin(a) * (R - 3 * s))}L${f1(x + Math.cos(a) * (R + 4 * s))},${f1(y + Math.sin(a) * (R + 4 * s))}`, C.shrimpL, 1.6 * s); }
    const at = a1 + .1; P.path(blob(x + Math.cos(at) * R, y + Math.sin(at) * R, 5 * s, 3 * s, .1, 5, g, at), '#E55C3A', 'detail');
  },
  fish(P, x, y, s, r, g) { P.path(blob(x, y, 24 * s, 17 * s, .12, 8, g, r), C.fish, 'big'); for (let i = -2; i <= 2; i++) { const ox = x + Math.cos(r) * i * 8 * s, oy = y + Math.sin(r) * i * 8 * s; P.line(`M${f1(ox - Math.sin(r) * 11 * s)},${f1(oy + Math.cos(r) * 11 * s)}Q${f1(ox + 3 * s)},${f1(oy)} ${f1(ox + Math.sin(r) * 11 * s)},${f1(oy - Math.cos(r) * 11 * s)}`, C.fishD, 1.4 * s); } },
  chickpea(P, x, y, s, r, g) { P.circle(x, y, 7 * s, C.chickpea); P.line(`M${f1(x - 3 * s)},${f1(y - 4 * s)}q${f1(4 * s)},${f1(3 * s)} ${f1(2 * s)},${f1(8 * s)}`, C.chickpeaD, 1.2 * s); },
  lentil(P, x, y, s, r, g) { P.ellipse(x, y, 4.2 * s, 3 * s, deg(r), C.lentil, 'small'); },
  redlentil(P, x, y, s, r, g) { P.ellipse(x, y, 3.6 * s, 2.6 * s, deg(r), C.lentilRed, 'small'); },
  kidney(P, x, y, s, r, g) { P.path(blob(x, y, 9 * s, 5.5 * s, .08, 8, g, r), C.kidney); P.ellipse(x - 2 * s, y - 1.5 * s, 3 * s, 1.4 * s, deg(r), C.kidneyL, 'detail'); },
  corn(P, x, y, s, r, g) { P.path(blob(x, y, 4.5 * s, 4 * s, .1, 5, g, r), C.corn, 'small'); },
  pea(P, x, y, s, r, g) { P.circle(x, y, 5 * s, C.pea, 'small'); P.circle(x - 1.5 * s, y - 1.5 * s, 1.8 * s, C.peaL, 'detail'); },
  paprika(P, x, y, s, r, g, col) {
    const c = col || [C.red, C.yellow, C.green][Math.floor(g() * 3)];
    const L = 18 * s, ca = Math.cos(r), sa = Math.sin(r);
    const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`;
    P.path(`M${p(-L, 0)}Q${p(0, -10 * s)} ${p(L, 0)}L${p(L - 2 * s, 5 * s)}Q${p(0, -4 * s)} ${p(-L + 2 * s, 5 * s)}Z`, c);
  },
  redpepper(P, x, y, s, r, g) { ING.paprika(P, x, y, s, r, g, C.red); },
  mushroom(P, x, y, s, r, g) {
    const ca = Math.cos(r), sa = Math.sin(r); const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`;
    P.path(`M${p(-14 * s, 0)}C${p(-14 * s, -14 * s)} ${p(14 * s, -14 * s)} ${p(14 * s, 0)}L${p(5 * s, 1 * s)}L${p(5 * s, 12 * s)}Q${p(0, 14 * s)} ${p(-5 * s, 12 * s)}L${p(-5 * s, 1 * s)}Z`, C.mushroom);
    P.line(`M${p(-11 * s, -1 * s)}Q${p(0, -10 * s)} ${p(11 * s, -1 * s)}`, C.mushroomD, 1.5 * s);
  },
  onion(P, x, y, s, r, g) { P.line(`M${f1(x - 12 * s)},${f1(y)}A${f1(12 * s)},${f1(12 * s)} 0 0 1 ${f1(x + 9 * s)},${f1(y - 8 * s)}`, C.onionD, 3 * s, ` transform="rotate(${f1(deg(r))} ${f1(x)} ${f1(y)})"`); },
  zucchini(P, x, y, s, r, g) { P.circle(x, y, 12 * s, C.zucchini); P.circle(x, y, 9.5 * s, C.zucchiniL, 'detail'); for (let i = 0; i < 5; i++) { const a = i * 1.256 + r; P.circle(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, 1.1 * s, '#B5CC86', 'detail'); } },
  tomato(P, x, y, s, r, g) { P.path(blob(x, y, 10 * s, 8 * s, .2, 6, g, r), C.tomato); P.path(blob(x - 2 * s, y - 2 * s, 4 * s, 3 * s, .2, 5, g, r), C.tomatoL, 'detail'); },
  sundried(P, x, y, s, r, g) { P.path(blob(x, y, 13 * s, 7 * s, .35, 9, g, r), C.sundried); },
  spinach(P, x, y, s, r, g) { const ca = Math.cos(r), sa = Math.sin(r); const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`; P.path(`M${p(-16 * s, 0)}Q${p(-2 * s, -12 * s)} ${p(16 * s, 0)}Q${p(-2 * s, 12 * s)} ${p(-16 * s, 0)}Z`, C.spinach); P.line(`M${p(-14 * s, 0)}L${p(13 * s, 0)}`, '#5C9A55', 1.2 * s); },
  apricot(P, x, y, s, r, g) { P.path(blob(x, y, 10 * s, 9 * s, .12, 6, g, r), C.apricot); P.circle(x - 2 * s, y - 2 * s, 3 * s, '#F6BC7A', 'detail'); },
  olive(P, x, y, s, r, g) { P.ellipse(x, y, 7 * s, 5.5 * s, deg(r), C.olive); P.ellipse(x, y, 2.2 * s, 1.8 * s, deg(r), '#9E3B2E', 'detail'); },
  greenolive(P, x, y, s, r, g) { P.ellipse(x, y, 7 * s, 5.5 * s, deg(r), C.oliveG); P.ellipse(x, y, 2.2 * s, 1.8 * s, deg(r), '#D2452E', 'detail'); },
  leek(P, x, y, s, r, g) { P.circle(x, y, 10 * s, C.leek); P.circle(x, y, 7 * s, C.leekL, 'detail'); P.circle(x, y, 4 * s, C.leek, 'detail'); P.circle(x, y, 1.8 * s, C.leekL, 'detail'); },
  celery(P, x, y, s, r, g) { P.line(`M${f1(x - 8 * s)},${f1(y)}a${f1(9 * s)},${f1(7 * s)} 0 0 0 ${f1(16 * s)},0`, C.celery, 4 * s, ` transform="rotate(${f1(deg(r))} ${f1(x)} ${f1(y)})"`); },
  apple(P, x, y, s, r, g) { P.path(blob(x, y, 10 * s, 9 * s, .1, 5, g, r), C.apple); P.line(`M${f1(x - 8 * s)},${f1(y - 6 * s)}q${f1(8 * s)},-${f1(4 * s)} ${f1(16 * s)},0`, C.appleSkin, 2 * s); },
  potatoslice(P, x, y, s, r, g) { P.ellipse(x, y, 16 * s, 12 * s, deg(r), C.potato, 'big'); P.ellipse(x - 3 * s, y - 2 * s, 8 * s, 5 * s, deg(r), C.potatoL, 'detail'); },
  lemonslice(P, x, y, s, r, g) { P.circle(x, y, 15 * s, C.lemonRind, 'big'); P.circle(x, y, 13 * s, C.lemonL, 'detail'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + r; P.path(`M${f1(x)},${f1(y)}L${f1(x + Math.cos(a) * 11 * s)},${f1(y + Math.sin(a) * 11 * s)}A${f1(11 * s)},${f1(11 * s)} 0 0 1 ${f1(x + Math.cos(a + .68) * 11 * s)},${f1(y + Math.sin(a + .68) * 11 * s)}Z`, C.lemon, 'detail'); } },
  limewedge(P, x, y, s, r, g) { const ca = Math.cos(r), sa = Math.sin(r); const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`; P.path(`M${p(-14 * s, 0)}A${f1(14 * s)},${f1(14 * s)} 0 0 0 ${p(14 * s, 0)}Z`, '#6FA534'); P.path(`M${p(-11 * s, 0)}A${f1(11 * s)},${f1(11 * s)} 0 0 0 ${p(11 * s, 0)}Z`, C.limeL, 'detail'); },
  peanut(P, x, y, s, r, g) { P.path(blob(x, y, 4.6 * s, 3.4 * s, .3, 5, g, r), C.peanut, 'small'); P.ellipse(x - 1 * s, y - .8 * s, 1.6 * s, .8 * s, deg(r), '#F0CFA0', 'detail'); },
  sesame(P, x, y, s, r, g) { P.ellipse(x, y, 1.8 * s, 1 * s, deg(r), C.sesame, 'detail'); },
  garlic(P, x, y, s, r, g) { P.path(blob(x, y, 5 * s, 3.5 * s, .1, 6, g, r), C.garlic, 'small'); },
  cornkernels(P, x, y, s, r, g) { ING.corn(P, x, y, s, r, g); },
  cucumber(P, x, y, s, r, g) { P.circle(x, y, 9 * s, C.cucumber, 'small'); P.circle(x, y, 7.5 * s, C.cucumberL, 'detail'); },
  // garnish
  parsley(P, x, y, s, r, g) { for (let i = 0; i < 3; i++) { const a = r + i * 2.1; const cx = x + Math.cos(a) * 4 * s, cy = y + Math.sin(a) * 4 * s; P.path(blob(cx, cy, 5 * s, 4 * s, .35, 7, g, a), C.parsley, 'small'); } },
  coriander(P, x, y, s, r, g) { for (let i = 0; i < 3; i++) { const a = r + i * 2.1; const cx = x + Math.cos(a) * 4.5 * s, cy = y + Math.sin(a) * 4.5 * s; P.path(blob(cx, cy, 5 * s, 4.5 * s, .3, 6, g, a), C.coriander, 'small'); } },
  basil(P, x, y, s, r, g) { const ca = Math.cos(r), sa = Math.sin(r); const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`; P.path(`M${p(-10 * s, 0)}Q${p(0, -9 * s)} ${p(11 * s, 0)}Q${p(0, 9 * s)} ${p(-10 * s, 0)}Z`, '#3F9A3A', 'small'); },
  thyme(P, x, y, s, r, g) { const L = 26 * s, ca = Math.cos(r), sa = Math.sin(r); P.line(`M${f1(x - ca * L / 2)},${f1(y - sa * L / 2)}L${f1(x + ca * L / 2)},${f1(y + sa * L / 2)}`, '#7A6A45', 1.2 * s); for (let i = 0; i < 7; i++) { const t = -L / 2 + i * L / 7 + 2, side = i % 2 ? 1 : -1; P.ellipse(x + ca * t - sa * 2.6 * side * s, y + sa * t + ca * 2.6 * side * s, 2.6 * s, 1.4 * s, deg(r) + 35 * side, C.thyme, 'small'); } },
  bayleaf(P, x, y, s, r, g) { const ca = Math.cos(r), sa = Math.sin(r); const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`; P.path(`M${p(-24 * s, 0)}Q${p(0, -11 * s)} ${p(24 * s, 0)}Q${p(0, 11 * s)} ${p(-24 * s, 0)}Z`, C.bay); P.line(`M${p(-22 * s, 0)}L${p(22 * s, 0)}`, '#A7BC73', 1.2 * s); },
  chili(P, x, y, s, r, g) { const ca = Math.cos(r), sa = Math.sin(r); const p = (u, v) => `${f1(x + u * ca - v * sa)},${f1(y + u * sa + v * ca)}`; P.path(`M${p(-12 * s, -3 * s)}Q${p(4 * s, -6 * s)} ${p(14 * s, 4 * s)}Q${p(2 * s, 2 * s)} ${p(-12 * s, 3 * s)}Z`, C.red); P.path(`M${p(-16 * s, -2 * s)}L${p(-11 * s, -3 * s)}L${p(-11 * s, 3 * s)}L${p(-16 * s, 2 * s)}Z`, C.green, 'detail'); },
  springonion(P, x, y, s, r, g) { P.circle(x, y, 4 * s, '#7DB54A', 'small'); P.circle(x, y, 2.2 * s, '#DDEFC2', 'detail'); },
  teriyaki(P, x, y, s, r, g) { P.path(blob(x, y, 17 * s, 13 * s, .2, 7, g, r), '#9A4A1A', 'big'); P.path(blob(x - 4 * s, y - 4 * s, 8 * s, 4 * s, .3, 6, g, r), '#D88A3C', 'detail'); P.ellipse(x - 5 * s, y - 5 * s, 3 * s, 1.4 * s, deg(r), '#F6C27A', 'detail'); },
  broccoli(P, x, y, s, r, g) { P.line(`M${f1(x)},${f1(y)}l${f1(Math.cos(r) * 12 * s)},${f1(Math.sin(r) * 12 * s)}`, '#8DBF5A', 5 * s); for (let i = 0; i < 5; i++) { const a = i * 1.25 + r; P.circle(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 6 * s, i % 2 ? '#3F8A35' : '#4E9C3E', 'small'); } P.circle(x, y, 5 * s, '#5FAE4A', 'detail'); },
  macaroni(P, x, y, s, r, g) { P.line(`M${f1(x - Math.cos(r) * 6 * s)},${f1(y - Math.sin(r) * 6 * s)}a${f1(7 * s)},${f1(7 * s)} 0 0 1 ${f1(Math.cos(r) * 12 * s)},${f1(Math.sin(r) * 12 * s)}`, C.pasta, 5 * s); },
  parmesan(P, x, y, s, r, g) { P.path(blob(x, y, 2.6 * s, 1.6 * s, .3, 5, g, r), '#FFF6D8', 'detail'); },
  mince(P, x, y, s, r, g) { P.path(blob(x, y, 5.5 * s, 4.5 * s, .35, 6, g, r), g() < .5 ? '#7A3A22' : '#93502F', 'small'); },
  pepperflake(P, x, y, s, r, g) { P.circle(x, y, 1.4 * s, '#2B2622', 'detail'); },
  paprikadust(P, x, y, s, r, g) { P.circle(x, y, 1.6 * s, '#B8321F', 'detail'); },
};

// ---------- scatter ----------
function scatter(n, R, minD, rng, placed, cx, cy) {
  const pts = []; let tries = 0;
  while (pts.length < n && tries < n * 80) {
    tries++;
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * R; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    if (placed.every(p => (p[0] - x) ** 2 + (p[1] - y) ** 2 > ((p[2] + minD) * .5) ** 2 * 1.0) && pts.every(p => (p[0] - x) ** 2 + (p[1] - y) ** 2 > minD * minD)) { pts.push([x, y, minD]); }
  }
  pts.forEach(p => placed.push(p)); return pts;
}
const SIZE = { carrot: 22, potato: 30, beef: 36, chicken: 36, pulled: 34, pulledpork: 36, pulledbeef: 36, meatball: 36, chorizo: 24, sausage: 22, shrimp: 34, fish: 46, chickpea: 14, lentil: 7, redlentil: 6, kidney: 17, corn: 9, pea: 10, paprika: 30, redpepper: 30, mushroom: 28, onion: 22, zucchini: 24, tomato: 18, sundried: 22, spinach: 28, apricot: 18, olive: 14, greenolive: 14, leek: 20, celery: 18, apple: 18, potatoslice: 30, lemonslice: 30, limewedge: 26, peanut: 8, sesame: 3, garlic: 10, cucumber: 18, parsley: 14, coriander: 14, basil: 18, thyme: 20, bayleaf: 40, chili: 26, springonion: 8, pepperflake: 2, paprikadust: 2, mince: 9, teriyaki: 32, broccoli: 26, macaroni: 16, parmesan: 3 };

// ---------- vessels & sides ----------
function drawFill(P, sc, cx, cy, R, g) {
  // sauce/base
  const base = sc.sauce, base2 = sc.sauce2 || mix(base, '#ffffff', .18);
  if (sc.fill === 'ricebase') {
    P.path(blob(cx, cy, R, R, .025, 14, g), C.rice, 'big');
    for (let i = 0; i < 260; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * R * .96; P.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 6, 2.4, g() * 180, C.riceD, 'detail'); }
    P.path(blob(cx + R * .1, cy - R * .05, R * .55, R * .48, .2, 9, g), sc.sauce, 'mid', ' opacity=".9"');
    return;
  }
  if (sc.fill === 'mashwell') {
    P.path(blob(cx, cy, R, R, .03, 14, g), C.mash, 'big');
    for (let k = 0; k < 4; k++) { let d = ''; for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.28, rr = R * (.62 + k * .1) + Math.sin(a * 5 + k) * 4; d += (i ? 'L' : 'M') + f1(cx + Math.cos(a) * rr) + ',' + f1(cy + Math.sin(a) * rr); } P.line(d, C.mashD, 3); }
    P.path(blob(cx, cy, R * .55, R * .5, .12, 10, g), sc.sauce, 'mid');
    P.raw(`<rect x="${cx + R * .62}" y="${cy - R * .7}" width="26" height="26" rx="5" transform="rotate(18 ${cx + R * .62} ${cy - R * .7})" ${P.rf(C.butter)}/>`);
    return;
  }
  if (sc.vessel === 'dish') { const R0 = R / .92, w = R0 * 2.1 - 30, h = R0 * 1.75 - 30; P.raw(`<rect x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="24" ${P.rf(base)}/>`); }
  else P.path(blob(cx, cy, R, R, .025, 14, g), base, 'big');
  if (P.style !== 'line') { for (let i = 0; i < 5; i++) { const a = g() * 6.28, d = g() * R * .55; P.path(blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (.18 + g() * .2), R * (.12 + g() * .15), .3, 7, g, g() * 3), base2, 'detail', ' opacity=".55"'); } }
  if (sc.fill === 'soup' || sc.swirl) {
    // cream swirl
    let d = ''; const turns = 2.2; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * turns * 6.28 + 1, rr = 6 + t * R * .42; d += (i ? 'L' : 'M') + f1(cx - R * .12 + Math.cos(a) * rr) + ',' + f1(cy - R * .08 + Math.sin(a) * rr); }
    P.line(d, C.cream, 5, ' stroke-opacity=".92"');
  }
  if (sc.fill === 'mash') {
    for (let i = 0; i < 40; i++) { const x = cx + (g() - .5) * R * 2, y = cy + (g() - .5) * R * 1.55; P.path(`M${f1(x - 18)},${f1(y + 5)}q18,-26 36,0z`, '#E2AE55', 'detail'); P.line(`M${f1(x - 15)},${f1(y + 3)}q15,-20 30,0`, '#B4772C', 3); }
    const fx = cx + R * .42, fy = cy + R * .38; P.path(blob(fx, fy, R * .36, R * .3, .18, 9, g, .5), '#8A4A2A', 'mid');
    for (let i = 0; i < 22; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * R * .26; ING[i % 3 ? 'mince' : 'pea'](P, fx + Math.cos(a) * d, fy + Math.sin(a) * d, 1.3, g() * 6, g); }
    for (let i = 0; i < 4; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * R * .2; ING.carrot(P, fx + Math.cos(a) * d, fy + Math.sin(a) * d, 1.1, 0, g); }
  }
}
function drawItems(P, sc, cx, cy, R, g) {
  const placed = [];
  // order: small first, big then garnish
  const groups = (sc.items || []).slice().sort((a, b) => (SIZE[a[0]] || 20) - (SIZE[b[0]] || 20));
  const big = groups.filter(it => (SIZE[it[0]] || 20) >= 20).reverse();
  const small = groups.filter(it => (SIZE[it[0]] || 20) < 20);
  const K = sc.k || 1.75;
  small.forEach(([t, n, sz = 1]) => { const k = t === 'lentil' || t === 'redlentil' || t === 'mince' || t === 'corn' ? 1.35 : K; scatter(n, R * .9, SIZE[t] * sz * k * .9, g, [], cx, cy).forEach(([x, y]) => ING[t](P, x, y, sz * k, g() * 6.28, g)); });
  big.forEach(([t, n, sz = 1]) => { scatter(n, R * .8, SIZE[t] * sz * K * .82, g, placed, cx, cy).forEach(([x, y]) => ING[t](P, x, y, sz * K, g() * 6.28, g)); });
  (sc.garnish || []).forEach(([t, n, sz = 1]) => { const k = t === 'pepperflake' || t === 'sesame' ? 1.4 : K * .9; for (let i = 0; i < n; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * R * .82; ING[t](P, cx + Math.cos(a) * d, cy + Math.sin(a) * d, sz * k, g() * 6.28, g); } });
}

function pastaNest(P, cx, cy, R, g) {
  P.path(blob(cx, cy, R * .98, R * .98, .04, 12, g), C.pasta, 'big');
  for (let i = 0; i < 70; i++) {
    const a = g() * 6.28, rr = R * (.15 + g() * .8), sweep = .8 + g() * 1.6;
    const x0 = cx + Math.cos(a) * rr, y0 = cy + Math.sin(a) * rr, x1 = cx + Math.cos(a + sweep) * rr, y1 = cy + Math.sin(a + sweep) * rr;
    P.line(`M${f1(x0)},${f1(y0)}A${f1(rr)},${f1(rr)} 0 0 1 ${f1(x1)},${f1(y1)}`, i % 3 ? C.pastaD : '#F8E3A2', i % 3 ? 2.4 : 3.2);
  }
}
function drawTacos(P, sc, cx, cy, R, g) {
  const meat = sc.meat || 'pulledpork';
  const spots = [[-R * .36, -R * .30, -.35], [R * .34, -R * .22, .3], [0, R * .36, 0]];
  spots.forEach(([dx, dy, a]) => {
    const tx = cx + dx, ty = cy + dy, r = R * .52, ca = Math.cos(a), sa = Math.sin(a);
    const p = (u, v) => `${f1(tx + u * ca - v * sa)},${f1(ty + u * sa + v * ca)}`;
    P.path(`M${p(-r, 0)}A${f1(r)},${f1(r)} 0 0 1 ${p(r, 0)}Z`, C.tortilla, 'big');
    P.path(`M${p(-r * .86, -2)}A${f1(r * .86)},${f1(r * .86)} 0 0 1 ${p(r * .86, -2)}Z`, mix(C.tortilla, '#fff', .25), 'detail');
    for (let i = 0; i < 7; i++) { const u = (g() - .5) * r * 1.5, v = -g() * r * .6; P.path(blob(tx + u * ca - v * sa, ty + u * sa + v * ca, 5, 3.5, .3, 6, g), C.tortillaD, 'detail', ' opacity=".6"'); }
    // filling spilling over the open edge
    for (let i = 0; i < 6; i++) { const u = -r * .75 + i * r * .3, v = 6 + g() * 8; ING[meat](P, tx + u * ca - v * sa, ty + u * sa + v * ca, 1.15, a + (g() - .5) * .6, g); }
    for (let i = 0; i < 7; i++) { const u = (g() - .5) * r * 1.6, v = 10 + g() * 14; const t = ['corn', 'tomato', 'coriander', 'cucumber'][i % 4]; ING[t](P, tx + u * ca - v * sa, ty + u * sa + v * ca, t === 'corn' ? 1.4 : 1.1, g() * 6, g); }
  });
  ING.limewedge(P, cx + R * .55, cy + R * .5, 2, 2.4, g);
}
function drawWraps(P, sc, cx, cy, R, g) {
  const spots = [[-R * .42, -R * .32], [R * .4, -R * .38], [-R * .38, R * .4], [R * .42, R * .34]];
  spots.forEach(([dx, dy], k) => {
    const x = cx + dx, y = cy + dy, r = R * .36;
    P.circle(x, y, r, C.tortilla, 'big');
    P.circle(x, y, r * .82, mix(C.tortilla, '#fff', .3), 'mid');
    P.circle(x, y, r * .72, sc.sauce, 'mid');
    for (let i = 0; i < 5; i++) { const a = g() * 6.28, d = g() * r * .45; ING.pulled(P, x + Math.cos(a) * d, y + Math.sin(a) * d, .8, g() * 6, g); }
    for (let i = 0; i < 5; i++) { const a = g() * 6.28, d = g() * r * .55; ING[['corn', 'cucumber', 'corn', 'coriander', 'tomato'][i]](P, x + Math.cos(a) * d, y + Math.sin(a) * d, .9, g() * 6, g); }
    let d = ''; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * 9 + k, rr = r * .78 - t * r * .25; d += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ',' + f1(y + Math.sin(a) * rr); }
    P.line(d, C.tortillaD, 1.6, ' stroke-opacity=".5"');
  });
  // dollop of yoghurt in the middle
  P.path(blob(cx, cy, R * .17, R * .15, .15, 8, g), C.yoghurt, 'mid'); ING.coriander(P, cx + 4, cy - 2, 1.3, 1, g);
}
function shadow(P, cx, cy, rx, ry) {
  if (P.style === 'line' || P.style === 'outline' || P.style === 'flatns' || P.style === 'sketch') return;
  if (P.style === 'riso') { P.raw(`<ellipse cx="${cx + 9}" cy="${cy + 11}" rx="${rx - 4}" ry="${ry - 2}" fill="#7A3A12" fill-opacity=".28"/>`); return; }
  P.raw(`<ellipse cx="${cx + 8}" cy="${cy + 14}" rx="${rx}" ry="${ry}" fill="#3b2a1d" fill-opacity=".22" filter="url(#soft)"/>`);
}

function vessel(P, kind, cx, cy, R, vc, g) {
  // returns inner radius for the fill
  if (kind === 'pot') {
    shadow(P, cx, cy, R + 36, R + 14);
    // handles
    P.path(`M${cx - R - 34},${cy - 22}h34v44h-34a10,10 0 0 1 -10,-10v-24a10,10 0 0 1 10,-10Z`, vc, 'big');
    P.path(`M${cx + R},${cy - 22}h34a10,10 0 0 1 10,10v24a10,10 0 0 1 -10,10h-34Z`, vc, 'big');
    P.circle(cx, cy, R, vc, 'big');
    P.circle(cx, cy, R - 10, mix(vc, '#000', .25), 'mid');
    P.circle(cx, cy, R - 16, mix(vc, '#fff', .82), 'mid');
    return R - 20;
  }
  if (kind === 'bowl') {
    shadow(P, cx, cy, R + 6, R + 4);
    P.circle(cx, cy, R, vc, 'big');
    P.circle(cx, cy, R - 6, mix(vc, '#000', .08), 'detail');
    P.circle(cx, cy, R - 16, mix(vc, '#fff', .35), 'mid');
    return R - 22;
  }
  if (kind === 'plate') {
    shadow(P, cx, cy, R + 4, R + 2);
    P.circle(cx, cy, R, vc, 'big');
    P.circle(cx, cy, R * .72, mix(vc, '#000', .05), 'mid');
    return R * .7;
  }
  if (kind === 'dish') {
    shadow(P, cx, cy, R + 30, R);
    const w = R * 2.1, h = R * 1.75;
    P.path(`M${cx - w / 2 - 26},${cy - 20}h26v40h-26a8,8 0 0 1 -8,-8v-24a8,8 0 0 1 8,-8Z`, vc, 'big');
    P.path(`M${cx + w / 2},${cy - 20}h26a8,8 0 0 1 8,8v24a8,8 0 0 1 -8,8h-26Z`, vc, 'big');
    P.raw(`<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="34" ${P.rf(vc)}/>`);
    return R * .92;
  }
  return R;
}

function side(P, kind, x, y, g, vc) {
  if (!kind) return;
  const bowl = (r, inner) => { shadow(P, x, y, r + 2, r); P.circle(x, y, r, vc, 'big'); P.circle(x, y, r - 8, mix(vc, '#fff', .4), 'mid'); return r - 12; };
  if (kind === 'rice') { const r = bowl(104); P.circle(x, y, r, C.rice, 'mid'); for (let i = 0; i < 120; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * (r - 5); P.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 4.6, 1.9, g() * 180, C.riceD, 'detail'); } ING.coriander(P, x + 10, y - 8, 1.6, 1, g); }
  if (kind === 'couscous') { const r = bowl(102); P.circle(x, y, r, C.couscous, 'mid'); for (let i = 0; i < 160; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * (r - 4); P.circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.3, '#D9A93F', 'detail'); } ING.parsley(P, x - 6, y + 4, 1.6, 1, g); }
  if (kind === 'mash') { const r = bowl(106); P.circle(x, y, r, C.mash, 'mid'); let d = ''; for (let i = 0; i <= 50; i++) { const t = i / 50, a = t * 12, rr = 4 + t * (r - 14); d += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ',' + f1(y + Math.sin(a) * rr); } P.line(d, C.mashD, 3); P.raw(`<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="4" transform="rotate(20 ${x} ${y})" ${P.rf(C.butter)}/>`); }
  if (kind === 'pasta') { const r = bowl(106); P.circle(x, y, r, C.pasta, 'mid'); for (let i = 0; i < 16; i++) { const a = g() * 6.28, rr = 10 + g() * (r - 20); P.line(`M${f1(x + Math.cos(a) * rr)},${f1(y + Math.sin(a) * rr)}A${f1(rr)},${f1(rr)} 0 0 1 ${f1(x + Math.cos(a + 1.8) * rr)},${f1(y + Math.sin(a + 1.8) * rr)}`, C.pastaD, 2.2); } ING.basil(P, x + 8, y - 6, 1.7, .6, g); }
  if (kind === 'tortillas') { for (let k = 0; k < 3; k++) { const ox = x + k * 6, oy = y - k * 6; shadow(P, ox, oy, 100, 96); P.circle(ox, oy, 100, C.tortilla, 'big'); } for (let i = 0; i < 14; i++) { const a = g() * 6.28, d = Math.sqrt(g()) * 80; P.path(blob(x + 12 + Math.cos(a) * d, y - 12 + Math.sin(a) * d, 7, 5, .3, 6, g), C.tortillaD, 'detail', ' opacity=".7"'); } }
  if (kind === 'bread') { for (let k = 0; k < 2; k++) { const ox = x + k * 26 - 13, oy = y + k * 12; P.path(blob(ox, oy, 66, 50, .06, 10, g, .4), C.bread, 'big'); P.path(blob(ox, oy, 56, 40, .08, 10, g, .4), C.breadL, 'mid'); for (let j = 0; j < 9; j++) P.circle(ox + (g() - .5) * 70, oy + (g() - .5) * 50, 2 + g() * 2, '#E4C48E', 'detail'); } }
  if (kind === 'yoghurt') { const r = bowl(80); P.circle(x, y, r, C.yoghurt, 'mid'); P.line(`M${x - 20},${y}q20,-18 40,0`, '#E6E2D6', 3); ING.coriander(P, x + 6, y + 6, .8, 2, g); }
  if (kind === 'lemon') { ING.lemonslice(P, x, y, 2.4, .3, g); ING.lemonslice(P, x + 52, y + 46, 1.6, 1.2, g); }
  if (kind === 'lime') { ING.limewedge(P, x, y, 2.6, -.6, g); ING.limewedge(P, x + 36, y + 50, 2.2, .9, g); }
}

function spoon(P, x, y, rot, col) {
  const g = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
  P.open(g);
  if (P.style === 'flat' || P.style === 'water' || P.style === 'riso') P.raw(`<ellipse cx="6" cy="10" rx="34" ry="24" fill="#3b2a1d" fill-opacity=".15"/>`);
  P.path('M-30,0 C-30,-22 30,-22 32,0 C30,22 -30,22 -30,0Z', col, 'big');
  P.path('M30,-5 L190,-4 Q198,0 190,5 L30,5Z', col, 'big');
  P.close();
}

function napkin(P, x, y, w, h, rot, col, stripe) {
  P.open(`<g transform="translate(${x} ${y}) rotate(${rot})">`);
  if (P.style === 'line' || P.style === 'outline' || P.style === 'sketch') { P.raw(`<rect x="0" y="0" width="${w}" height="${h}" ${P.style === 'outline' ? `fill="none" stroke="${P.ink}" stroke-width="1.6"` : `fill="${mix(col, P.paper, .6)}" stroke="${P.ink}" stroke-width="1.6"`}/>`); }
  else P.raw(`<rect x="0" y="0" width="${w}" height="${h}" fill="${P.style === 'riso' ? stripe : col}"${P.style === 'riso' ? ' fill-opacity=".25"' : ''}/>`);
  for (let i = 1; i < 8; i++) P.raw(`<rect x="0" y="${i * h / 8 - 3}" width="${w}" height="6" fill="${stripe}" fill-opacity="${P.style === 'line' ? .5 : .55}"/>`);
  P.close();
}

// ---------- scene renderer ----------
function defs(style, id) {
  let d = `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`;
  if (style === 'water') d += `<filter id="wc${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="${id}"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>` +
    `<filter id="wcgrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .25  0 0 0 -1.4 .9"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
  if (style === 'sketch') d += `<filter id="hand${id}"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${id}"/><feDisplacementMap in="SourceGraphic" scale="2.5"/></filter>`;
  if (style === 'riso') d += `<filter id="grain${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="${id}" result="n"/><feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.55 1.18" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
  return `<defs>${d}</defs>`;
}

/**
 * opts: { style: flat|line|riso|water, bg: colour|null, vessel colour, accent, ink, paper, inks, napkin: [col, stripe], spoon colour, size }
 */
function drawScene(sc, opts, style) {
  const id = sc.id;
  const g = rngFrom(id * 7919 + 17);
  const P = makePainter(style, opts);
  const cx = sc.side ? 285 : 300, cy = sc.side ? 318 : 300;
  const vc = sc.vesselColor || opts.vessel || '#C65D3B';
  const sideCol = opts.sideBowl || '#F4EEE3';
  // background decorations
  if (opts.props !== false) {
    if (opts.napkin) napkin(P, -40, 380, 260, 200, -14, opts.napkin[0], opts.napkin[1]);
    (sc.loose || ['thyme', 'bayleaf']).forEach((t, i) => { const pos = (sc.side ? [[548, 330], [70, 80], [70, 470]] : [[530, 90], [70, 80], [548, 330]])[i % 3]; ING[t](P, pos[0], pos[1], t === 'bayleaf' ? 1.9 : 2.6, g() * 6.28, g); });
    if (opts.spoon) spoon(P, 455, 470, 38, opts.spoon);
  }
  const R = sc.side ? 205 : 225;
  const inner = vessel(P, sc.vessel || 'pot', cx, cy, R, vc, g);
  let fr = inner;
  if (sc.fill === 'pasta') { pastaNest(P, cx, cy, inner * 1.02, g); fr = inner * .64; }
  if (sc.fill === 'tacos') drawTacos(P, sc, cx, cy, inner * 1.3, g);
  else if (sc.fill === 'wraps') drawWraps(P, sc, cx, cy, inner * 1.3, g);
  else if (sc.fill === 'mashwell') { drawFill(P, sc, cx, cy, fr, g); drawItems(P, sc, cx, cy, fr * .55, g); }
  else if (sc.fill === 'ricebase') { drawFill(P, sc, cx, cy, fr, g); drawItems(P, sc, cx + fr * .08, cy, fr * .62, g); }
  else { drawFill(P, sc, cx, cy, fr, g); drawItems(P, sc, cx, cy, fr, g); }
  if (sc.side) side(P, sc.side, sc.sidePos ? sc.sidePos[0] : 486, sc.sidePos ? sc.sidePos[1] : 114, g, sideCol);
  return P.toString();
}

function renderDish(sc, opts = {}) {
  const style = opts.style || 'flat', id = sc.id;
  const W = 600, H = 600;
  let body;
  body = drawScene(sc, opts, style);
  if (id % 2 === 0 && opts.mirror !== false) body = `<g transform="translate(600 0) scale(-1 1)">${body}</g>`;
  if (style === 'sketch') body = `<g filter="url(#hand${id})">${body}</g>`;
  if (style === 'water') body = `<g filter="url(#wc${id})"${opts.multiply === false ? '' : ' style="mix-blend-mode:multiply"'}>${body}</g>`;
  if (style === 'riso') {
    const ink2 = (opts.inks || ['#ff665e', '#0078bf'])[1];
    body = `<g filter="url(#grain${id})">${body}</g>` +
      `<g transform="translate(3.5 2.5)" opacity=".13" style="mix-blend-mode:multiply">${body.replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="${ink2}"`)}</g>`;
  }
  const bg = opts.bg ? `<rect width="${W}" height="${H}" fill="${opts.bg}"/>` : '';
  const grain = style === 'water' && opts.grain !== false ? `<rect width="${W}" height="${H}" fill="#fff" filter="url(#wcgrain)" opacity=".35"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="dish-art">${defs(style, id)}${bg}${body}${grain}</svg>`;
}

// ---------- icons for tags ----------
function pepperIcon(filled, col = '#C8322B', empty = '#C9BDAE', stem = '#3E8C31') {
  const c = filled ? col : 'none', s = filled ? 'none' : empty;
  return `<svg viewBox="0 0 24 24" class="ico pep${filled ? ' on' : ''}"><path d="M8.2 6.4c-1.1 4.4 1.6 11.7 10.6 14.4 1 .3 1.5-.6.8-1.3C14.8 15.5 13.6 11 13.7 7.5" fill="${c}" stroke="${filled ? col : s}" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.4 7.2c1.6-1.6 4.8-1.8 6.6.1M10.6 5.8c-.2-1.6.4-3 1.8-3.8" fill="none" stroke="${filled ? stem : s}" stroke-width="1.7" stroke-linecap="round"/></svg>`;
}
function leafIcon(col = '#4E8B3A', vein = '#fff') {
  return `<svg viewBox="0 0 24 24" class="ico leaf"><path d="M4.5 19.5C3.6 11 9 4.4 20.2 3.8c.4 10.6-5.5 16.6-14.3 16" fill="${col}"/><path d="M4 20.5c3.2-4.6 6.8-8 11.5-11" fill="none" stroke="${vein}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}
function clockIcon(col = 'currentColor') { return `<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="8.5" fill="none" stroke="${col}" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round"/></svg>`; }
function potIcon(col = 'currentColor') { return `<svg viewBox="0 0 24 24" class="ico"><path d="M4 10h16v6.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5Z" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 11h2M20 11h2M7 7.5h10M12 5v2.5" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round"/></svg>`; }
function knifeIcon(col = 'currentColor') { return `<svg viewBox="0 0 24 24" class="ico"><path d="M3.5 20.5 15 9l2.5 2.5c-3 4.2-7.6 7.6-14 9Z" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/><path d="m15 9 4.5-4.5a1.8 1.8 0 0 1 2.5 2.5l-4.5 4.5" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/></svg>`; }
function snowIcon(col = 'currentColor') { return `<svg viewBox="0 0 24 24" class="ico"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function personsIcon(col = 'currentColor') { return `<svg viewBox="0 0 24 24" class="ico"><circle cx="8" cy="8" r="3" fill="none" stroke="${col}" stroke-width="1.7"/><circle cx="16.5" cy="9.5" r="2.3" fill="none" stroke="${col}" stroke-width="1.7"/><path d="M2.8 19c.6-3.6 2.6-5.4 5.2-5.4s4.6 1.8 5.2 5.4M13.5 19c.4-2.6 1.6-4 3-4s2.6 1.4 3 4" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round"/></svg>`; }

module.exports = { renderDish, pepperIcon, leafIcon, clockIcon, potIcon, knifeIcon, snowIcon, personsIcon, mix, ING, rngFrom };
