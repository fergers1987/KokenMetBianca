"""Maakt public/img/dish/<id>.jpg (1200x1200) uit de gebouwde illustraties, voor Google (Recipe), deelafbeeldingen en AI-tools.
Draai na `npm run build`, en opnieuw als illustraties veranderen; daarna nog een keer bouwen. Met ids als argument alleen die recepten."""
import pathlib, sys
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
src, out = root / 'dist' / 'img' / 'dish', root / 'public' / 'img' / 'dish'
out.mkdir(parents=True, exist_ok=True)
ids = sys.argv[1:] or sorted((f.stem for f in src.glob('*.svg')), key=int)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 1200})
    for i in ids:
        svg = (src / f'{i}.svg').read_text(encoding='utf-8').replace('width="600" height="600"', 'width="1200" height="1200"', 1)
        pg.set_content(f'<html><body style="margin:0">{svg}</body></html>'); pg.wait_for_timeout(80)
        pg.screenshot(path=str(out / f'{i}.jpg'), type='jpeg', quality=78)
    b.close()
print(f'{len(ids)} afbeeldingen in public/img/dish/')
