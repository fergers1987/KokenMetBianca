// Vier stijlen voor de website, afgeleid van de vier kookboek-opties.
'use strict';
const art = require('./art.js');

function linen(id, col = '#E8DFCF') {
  return `<defs><filter id="weave${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.08" numOctaves="2" seed="${id}"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .48  0 0 0 0 .40  0 0 0 .5 0"/></filter></defs><rect width="600" height="600" fill="${col}"/><rect width="600" height="600" filter="url(#weave${id})" opacity=".5"/>`;
}
function tiles(W, H, seed = 1, t = 72) {
  const g = art.rngFrom(seed);
  let s = `<defs><filter id="tw${seed}"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter></defs><rect width="${W}" height="${H}" fill="#C9A47E"/><g filter="url(#tw${seed})">`;
  for (let y = -t; y < H + t; y += t) for (let x = -t; x < W + t; x += t) {
    const c = art.mix('#B8613C', g() < .5 ? '#8E3F22' : '#D08158', g() * .35);
    s += `<rect x="${x + 2}" y="${y + 2}" width="${t - 4}" height="${t - 4}" rx="3" fill="${c}"/>`;
  }
  return s + '</g>';
}
function tileTable(W, H, accent, id) {
  const t = 100; let s = `<defs><pattern id="tt${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse"><rect width="${t}" height="${t}" fill="#F3E2BF"/><rect x="1" y="1" width="${t - 2}" height="${t - 2}" fill="none" stroke="${accent}" stroke-opacity=".25" stroke-width="2"/>`;
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, x = 50 + Math.cos(a) * 16, y = 50 + Math.sin(a) * 16; s += `<ellipse cx="${x}" cy="${y}" rx="15" ry="9" transform="rotate(${k * 90} ${x} ${y})" fill="${accent}" fill-opacity=".28"/>`; }
  s += `<circle cx="50" cy="50" r="7" fill="#E9B73A" fill-opacity=".6"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#tt${id})"/>`;
  return s;
}

const THEMES = {
  a: {
    key: 'a', name: 'Linnen & Inkt',
    fonts: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@400;500;600&display=swap',
    vars: { bg: '#F6F1E7', ink: '#2B2622', muted: '#7A6F64', accent: '#B4462E', accent2: '#6B7A4B', card: '#FFFCF6', soft: '#E8DFCF', line: 'rgba(43,38,34,.16)',
      display: "'Cormorant Garamond', serif", body: "'EB Garamond', serif", label: "'Jost', sans-serif", dispWeight: 600, radius: '4px', pepOn: '#B4462E', pepOff: '#C9BDAE', leaf: '#6B7A4B' },
    chapters: ['#3D5A78', '#B4462E', '#C4933A', '#4C7C84', '#6B7A4B'],
    art: { style: 'line', ink: '#2B2622', paper: '#F6F1E7', vessel: '#B4462E', napkin: ['#E8DFCF', '#B4462E'], spoon: '#C9925A', sideBowl: '#F4EEE3' },
    bg: (id) => linen(id),
    css: `.hero h1{font-style:italic;font-weight:500}.card-art,.r-art{border-radius:50%}.r-art{box-shadow:0 0 0 1px var(--line),0 0 0 8px var(--bg),0 0 0 9px var(--line)}h1,h2{font-weight:500}.sec-title{font-style:italic}`,
  },
  b: {
    key: 'b', name: 'Mesa de Domingo',
    fonts: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,600;1,400;1,600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter+Tight:wght@400;600;700&display=swap',
    vars: { bg: '#EFE5D4', ink: '#28301F', muted: '#8A7A63', accent: '#A84A2A', accent2: '#C9993F', card: '#FBF6EC', soft: '#FBF6EC', line: 'rgba(40,48,31,.16)',
      display: "'Bodoni Moda', serif", body: "'Newsreader', serif", label: "'Inter Tight', sans-serif", dispWeight: 600, radius: '2px', pepOn: '#A84A2A', pepOff: '#CDBFA8', leaf: '#5E6B34' },
    chapters: ['#2E4A62', '#A84A2A', '#7A3B4E', '#2F6B6A', '#5E6B34'],
    art: { style: 'water', waterOp: 1, multiply: false, vessel: '#9C4526', napkin: ['#FBF6EC', '#2F6B6A'], spoon: '#C9925A', sideBowl: '#F6EEDF' },
    bg: (id) => tiles(600, 600, id),
    css: `.price-medal{display:flex}.hero{background:var(--card)}`,
  },
  c: {
    key: 'c', name: 'Stoofpot Club',
    fonts: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,600..900,0..100,0..1&family=Karla:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600..800&display=swap',
    vars: { bg: '#F6E7C8', ink: '#3B2314', muted: '#7A5A44', accent: '#E2711D', accent2: '#2F7F7A', card: '#FFF8EA', soft: '#F3DCA8', line: 'rgba(59,35,20,.18)',
      display: "'Fraunces', serif", body: "'Karla', sans-serif", label: "'Bricolage Grotesque', sans-serif", dispWeight: 900, radius: '18px', pepOn: '#C8432B', pepOff: 'rgba(59,35,20,.3)', leaf: '#8A9A3B' },
    chapters: ['#E2711D', '#D9485F', '#E9B73A', '#2F7F7A', '#8A9A3B'],
    art: { style: 'riso', inks: ['#E2711D', '#2F7F7A', '#E9B73A', '#8A9A3B', '#C8432B'], vessel: '#E2711D', napkin: ['#F6E7C8', '#2F7F7A'], spoon: '#C9925A', sideBowl: '#F8EEDB' },
    bg: (id, ch) => tileTable(600, 600, ch, id),
    css: `h1,h2,.sec-title{font-variation-settings:'SOFT' 100,'WONK' 1}.card-art,.r-art{border-radius:50%}.r-art{box-shadow:0 0 0 8px var(--bg),0 0 0 13px var(--ch)}.chip,.tag{border-width:2px}.card{box-shadow:5px 5px 0 var(--ink)}`,
  },
  d: {
    key: 'd', name: "Bianca's Keukenschrift",
    fonts: 'https://fonts.googleapis.com/css2?family=Caveat+Brush&family=Caveat:wght@600;700&family=Young+Serif&family=Figtree:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap',
    vars: { bg: '#FBF8F1', ink: '#1F2A44', muted: '#5d6780', accent: '#E5533D', accent2: '#4A90B8', card: '#FFFFFF', soft: '#FFE58A', line: 'rgba(31,42,68,.14)',
      display: "'Caveat Brush', cursive", body: "'Figtree', sans-serif", label: "'Figtree', sans-serif", dispWeight: 400, radius: '6px', pepOn: '#E5533D', pepOff: '#B9C0CF', leaf: '#6FA35A' },
    chapters: ['#F2A541', '#E5533D', '#6FA35A', '#4A90B8', '#B784C9'],
    art: { style: 'sketch', ink: '#1F2A44', paper: '#FBF8F1', vessel: '#E5533D', napkin: ['#FBF8F1', '#4A90B8'], spoon: '#F2A541', sideBowl: '#FFFFFF' },
    bg: () => '<rect width="600" height="600" fill="#fff"/>',
    css: `body{background-image:linear-gradient(#E8EEF3 1px,transparent 1px),linear-gradient(90deg,#E8EEF3 1px,transparent 1px);background-size:20px 20px}.card,.r-art{transform:rotate(-.6deg)}.card:nth-child(even){transform:rotate(.7deg)}.r-art{background:#fff;padding:10px;box-shadow:0 6px 18px rgba(31,42,68,.18)}.r-tip{background:#FFE58A;transform:rotate(-1deg)}h2.sec-title,.r-title{font-family:'Young Serif',serif}`,
  },
};

module.exports = { THEMES };
