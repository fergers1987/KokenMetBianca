"""Verwerkt src/data/new/roles-*.json (basis/extra/topping, swaps, price_basic, optionele stappen) in src/data/recipes.json."""
import json, glob, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data'
R = json.loads((root / 'recipes.json').read_text(encoding='utf-8'))
by = {r['id']: r for r in R}
done = []
for f in sorted(glob.glob(str(root / 'new' / 'roles-*.json'))):
    for p in json.loads(pathlib.Path(f).read_text(encoding='utf-8')):
        r = by.get(p['id'])
        if not r: continue
        for key in ('ingredients', 'serve'):
            src = p.get(key, [])
            if len(src) != len(r[key]): print('lengte wijkt af', r['id'], key); continue
            for ing, role in zip(r[key], src):
                ing['role'] = role.get('role', 'basis')
                for k in ('swap', 'saves'):
                    if role.get(k): ing[k] = role[k]
                    else: ing.pop(k, None)
        if p.get('price_basic'): r['price_basic'] = p['price_basic']
        if p.get('steps') and len(p['steps']) == len(r['steps']): r['steps'] = p['steps']
        done.append(r['id'])
(root / 'recipes.json').write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8')
print('verwerkt', len(done), 'recepten')
