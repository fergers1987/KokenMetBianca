"""Voegt nieuwe receptbatches uit src/data/new/recipes-*.json toe aan src/data/recipes.json en meldt ontbrekende winkelinfo."""
import json, glob, uuid, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data'
R = json.loads((root / 'recipes.json').read_text(encoding='utf-8'))
have = {r['id'] for r in R}; guids = {r['guid'] for r in R}
spec = json.loads((root / 'new' / '_spec.json').read_text(encoding='utf-8'))
need = set(spec['schema_example'].keys())
added = []
import sys
SKIP = {int(x) for x in sys.argv[1:]}  # ids die (nog) niet mee mogen
for f in sorted(glob.glob(str(root / 'new' / 'recipes-*.json'))):
    for r in json.loads(pathlib.Path(f).read_text(encoding='utf-8')):
        if r['id'] in have or r['id'] in SKIP: continue
        for k in ('ingredients', 'serve'):  # sommige agents schrijven losse strings
            r[k] = [i if isinstance(i, dict) else {'q': '', 'item': str(i), 'es': ''} for i in r.get(k, [])]
        miss = need - set(r)
        if miss: print('SKIP', r.get('id'), 'mist', miss); continue
        assert r['chapter'] in spec['chapters'], (r['id'], r['chapter'])
        if not r.get('guid') or r['guid'] in guids: r['guid'] = str(uuid.uuid4())
        guids.add(r['guid']); have.add(r['id']); R.append(r); added.append(r['id'])
R.sort(key=lambda r: r['id'])
(root / 'recipes.json').write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8')
stores = json.loads((root / 'stores.json').read_text(encoding='utf-8'))
missing = sorted({i['es'] for r in R for i in r['ingredients'] + r['serve'] if i.get('es') and i['es'] not in stores})
(root / 'new' / 'missing-stores.txt').write_text('\n'.join(missing), encoding='utf-8')
print('toegevoegd', len(added), added, '| totaal', len(R), '| ontbrekende winkelinfo', len(missing))
