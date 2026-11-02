"""Vervangt recepten per id in alle talen vanuit een replace-*.json (zie docs/AFSPRAKEN.md) en vult stores.json aan.
Gebruik: python tools/apply_replacements.py src/data/new/replace-79-81-94.json"""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data'
rep = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
for lang, fname in [('nl', 'recipes.json'), ('es', 'recipes.es.json'), ('en', 'recipes.en.json'), ('de', 'recipes.de.json'), ('fr', 'recipes.fr.json')]:
    f = root / fname
    R = json.loads(f.read_text(encoding='utf-8'))
    new = {r['id']: r for r in rep[lang]}
    R = [new.get(r['id'], r) for r in R]
    f.write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8')
    print(lang, 'vervangen:', sorted(new))
stores = json.loads((root / 'stores.json').read_text(encoding='utf-8'))
added = [k for k in rep.get('stores', {}) if k not in stores]
stores.update({k: v for k, v in rep.get('stores', {}).items() if k not in stores})
(root / 'stores.json').write_text(json.dumps(stores, ensure_ascii=False, indent=1), encoding='utf-8')
print('winkelinfo toegevoegd:', len(added))
