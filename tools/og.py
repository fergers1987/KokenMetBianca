"""Maakt public/img/og.png (deelafbeelding 1200x630) uit de gebouwde hero. Draai na `npm run build`."""
import pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
hero = (root / 'dist' / 'img' / 'hero.svg').read_text(encoding='utf-8').replace('<svg ', '<svg class="art" ', 1)
html = f'''<html><head><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Jost:wght@500&display=swap" rel="stylesheet">
<style>body{{margin:0;width:1200px;height:630px;background:#F6F1E7;display:flex;align-items:center;font-family:'Cormorant Garamond';color:#2B2622}}
.t{{padding:0 0 0 80px;flex:1}} h1{{font-size:120px;line-height:.86;margin:0 0 24px;font-style:italic;font-weight:500}} h1 span{{font-style:normal;font-weight:600}}
p{{font-size:34px;font-style:italic;margin:0 0 18px}} small{{font-family:Jost;font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#B4462E}}
.art{{width:560px;height:560px;margin-right:50px;flex:none}}</style></head><body><div class="t"><small>NL · ES · EN · DE · FR</small><h1>Smaakvol<br><span>Koken</span></h1>
<p>30 slowcookerrecepten · Costa del Sol</p><small>met Bianca Manuela Seegers</small></div>{hero}</body></html>'''
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.set_content(html); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
    pg.screenshot(path=str(root / 'public' / 'img' / 'og.png')); b.close()
print('public/img/og.png')
