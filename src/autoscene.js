// Maakt automatisch een illustratiescène voor recepten zonder handgemaakte scène in scenes.js.
// Kiest pan/kom/bord, saus en ingrediënten op basis van de (Nederlandse) ingrediëntenlijst en titel.
'use strict';

const RULES = [ // [regex op ingrediënt/titel, ingrediënt-type, aantal, schaal]
  [/gehaktbal|balletje|albóndig/, 'meatball', 8],
  [/garnaal|gamba/, 'shrimp', 9, .95],
  [/heek|kabeljauw|bacalao|zalm|vis\b|visfilet|dorade|zeebaars/, 'fish', 5, .9],
  [/mossel|mejill/, 'olive', 10, 1.2],
  [/pulled|getrokken/, 'pulledpork', 12],
  [/kip|pollo|kalkoen/, 'chicken', 7],
  [/rund|stoofvlees|ossenstaart|wang|carrillada|ternera/, 'beef', 8],
  [/varken|spek|pork|lomo|ribbetje/, 'beef', 7, .9],
  [/chorizo/, 'chorizo', 10],
  [/worst|salchicha|morcilla/, 'sausage', 9],
  [/gehakt/, 'mince', 55],
  [/kikkererwt|garbanzo/, 'chickpea', 34],
  [/rode linzen/, 'redlentil', 60],
  [/linze|lenteja/, 'lentil', 120],
  [/kidney|rode bonen|zwarte bonen/, 'kidney', 18],
  [/witte bonen|alubia blanca|bonen/, 'chickpea', 26, .9],
  [/aardappel|patata|zoete aardappel|batata/, 'potato', 6],
  [/pompoen|calabaza/, 'potato', 6, .9],
  [/wortel|zanahoria/, 'carrot', 7],
  [/paprika|pimiento/, 'paprika', 6],
  [/champignon|paddenstoel|seta/, 'mushroom', 6],
  [/courgette|calabac/, 'zucchini', 6],
  [/aubergine|berenjena/, 'zucchini', 5, 1.1],
  [/spinazie|espinaca|boerenkool|kool/, 'spinach', 6],
  [/prei|puerro/, 'leek', 6, .85],
  [/erwt|guisante|doperwt/, 'pea', 22],
  [/maïs|mais\b|maíz/, 'corn', 22],
  [/olijf|aceituna/, 'olive', 8],
  [/tomaat|tomate|cherry/, 'tomato', 5],
  [/appel|manzana|peer|pera/, 'apple', 8],
  [/abrikoos|pruim|dadel|rozijn/, 'apricot', 6],
  [/citroen|limón/, 'lemonslice', 3, .8],
  [/pinda|cacahuete/, 'peanut', 24],
  [/macaroni|penne|pasta/, 'macaroni', 14],
  [/ui\b|uien|cebolla|sjalot/, 'onion', 4],
];

function autoScene(r) {
  const title = (r.title || '').toLowerCase();
  const ings = (r.ingredients || []).map(i => `${i.item} ${i.es}`.toLowerCase());
  const all = title + ' ' + ings.join(' ');
  const has = re => re.test(all);
  const items = [];
  const used = new Set();
  for (const [re, type, n, s] of RULES) {
    if (used.has(type) || items.length >= 4) continue;
    if (re.test(all)) { items.push(s ? [type, n, s] : [type, n]); used.add(type); }
  }
  const soup = /soep|sopa|crema de|velouté/.test(title);
  const sweet = r.protein === 'sweet';
  const pastaDish = /spaghetti|pasta|lasagne|linguine|tagliatelle/.test(title);
  const curry = has(/kokos|curry|kerrie|masala|coco/);
  // saus-kleur
  let sauce = '#C66A35';
  if (has(/tomaat|tomate|passata|triturado/)) sauce = '#B9452C';
  if (has(/rode wijn|bier|cerveza|vino tinto|stoofvlees|hachee/)) sauce = '#6A3520';
  if (curry) sauce = '#E5B256';
  if (has(/room|nata|crème|yoghurt|melk/) && !has(/tomaat|tomate/) && !curry) sauce = '#EBD6B0';
  if (has(/pompoen|calabaza|zoete aardappel/)) sauce = '#E08A3A';
  if (has(/erwtensoep|doperwt|guisante/) && soup) sauce = '#8EA44A';
  if (has(/spinazie|espinaca/) && soup) sauce = '#6E8F3E';
  if (sweet) sauce = has(/chocola|cacao/) ? '#5A321E' : has(/rijst|arroz|havermout|avena/) ? '#F4EAD2' : '#E3A55C';

  const cuisine = r.cuisine || '';
  const herb = ['mexican', 'thai', 'indian', 'korean', 'chinese', 'caribbean', 'middle_eastern', 'moroccan'].includes(cuisine) ? 'coriander'
    : ['italian', 'mediterranean', 'greek'].includes(cuisine) ? 'basil' : 'parsley';
  const sideMap = { rice: 'rice', pasta: 'pasta', bread: 'bread', tortilla: 'tortillas', couscous: 'couscous', potato: /puree|mash|stamp/.test(JSON.stringify(r.serve || '')) ? 'mash' : null, none: null };

  const sc = { vessel: 'pot', sauce, items, garnish: [[herb, 6]], loose: ['garlic', herb === 'coriander' ? 'limewedge' : 'thyme'], side: sideMap[r.side] ?? null };
  if (soup || curry) { sc.vessel = 'bowl'; sc.vesselColor = curry ? '#2F6F6A' : '#E9E2D2'; }
  if (soup) { sc.fill = 'soup'; sc.items = items.slice(0, 1).map(([t]) => [t, 6, .8]); sc.garnish = [[herb, 6], ['pepperflake', 20]]; }
  if (pastaDish) { sc.vessel = 'plate'; sc.vesselColor = '#F4EFE6'; sc.fill = 'pasta'; sc.items = items.slice(0, 2); sc.side = null; sc.garnish = [[herb, 5], ['parmesan', 30]]; }
  if (sweet) {
    sc.vessel = 'bowl'; sc.vesselColor = '#E9E2D2'; sc.side = null; sc.loose = ['apple', 'thyme'];
    sc.fill = has(/rijst|arroz|havermout|avena|pap/) ? 'soup' : undefined;
    sc.garnish = has(/kaneel|canela/) ? [['paprikadust', 40]] : [['pepperflake', 10]];
    if (!sc.items.length) sc.items = [['apricot', 6]];
  }
  if (r.vega && !sweet) sc.items = sc.items.filter(([t]) => !['chicken', 'beef', 'mince', 'meatball', 'chorizo', 'sausage', 'pulledpork', 'fish', 'shrimp'].includes(t));
  if (!sc.items.length) sc.items = [['carrot', 6], ['potato', 5]];
  return sc;
}

module.exports = { autoScene };
