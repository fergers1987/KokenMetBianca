"""Verwerkt src/data/new/titles-patch.json: volledig vertaalde titels (en slugs) en de Spaanse gerechtnaam (name_es)."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data'
patch = json.loads((root / 'new' / 'titles-patch.json').read_text(encoding='utf-8'))
files = {'nl': 'recipes.json', 'es': 'recipes.es.json', 'en': 'recipes.en.json', 'de': 'recipes.de.json', 'fr': 'recipes.fr.json'}
for lang, fname in files.items():
    f = root / fname; R = json.loads(f.read_text(encoding='utf-8')); n = 0
    for r in R:
        p = patch.get(str(r['id']))
        if not p: continue
        if p.get('name_es'): r['name_es'] = p['name_es']
        if lang in p:
            r['title'] = p[lang].get('title', r['title'])
            if p[lang].get('slug') and lang != 'nl': r['slug'] = p[lang]['slug']
            n += 1
    f.write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8')
    print(lang, 'titels aangepast:', n)
