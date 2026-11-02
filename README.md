# Smaakvol Koken – met Bianca Manuela Seegers

Statische website met 30 betaalbare slowcooker-gezinsrecepten, gemaakt voor gezinnen en expats aan de Costa del Sol.

- **Talen:** Nederlands, Spaans, Engels, Duits en Frans (`/nl/`, `/es/`, `/en/`, `/de/`, `/fr/`). Op `/` wordt de taal van de browser gekozen.
- **Per ingrediënt:** de Spaanse supermarktnaam, plus waar je het aan de Costa del Sol het makkelijkst koopt (Mercadona, Lidl, MAS, de mercado municipal …).
- **Filters:** keuken, hoofdingrediënt, bijgerecht, pittigheid, prijs per persoon (schuifbalk), tijd in de slowcooker (schuifbalk), vega, invriesbaar en favorieten. Sorteren kan op prijs, tijd en pittigheid. Filters staan in de URL, dus een gefilterde lijst is te delen.
- **Favorieten:** opgeslagen in de browser (`localStorage`, met een cookie als terugval) op basis van de vaste `guid` per recept. Ze gelden daardoor in alle talen.
- **Op elke receptpagina:**
  - ingrediënten afvinken (wordt onthouden)
  - boodschappenlijst kopiëren of delen (bijv. via WhatsApp)
  - een printweergave
  - Schema.org-`Recipe`-data, zodat Google rijke resultaten kan tonen
- **Geen dependencies:** de build is puur Node.js (≥ 18). Alle illustraties worden in code gegenereerd (`src/art.js`).

## Lokaal draaien

```bash
npm run build   # bouwt dist/
npm run serve   # http://localhost:8080/
npm start       # beide in één keer
```

## Online zetten via Cloudflare (gratis)

Het makkelijkst is **Workers & Pages → Create → Import a repository**:

1. Kies de GitHub-repo `fergers1987/KokenMetBianca` en de branch `main`.
2. Cloudflare herkent `wrangler.jsonc`. Vul in (meestal al ingevuld):
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
3. Deploy. Je krijgt een adres als `kokenmetbianca.<account>.workers.dev`.
4. **Eigen domein:** ga naar het project, dan *Settings → Domains & Routes → Add → Custom domain*. Het domein moet in hetzelfde Cloudflare-account staan.
5. Zet daarna het domein in `site.config.json`, bijvoorbeeld `"siteUrl": "https://www.jouwdomein.nl"`, en push. Dan krijg je canonical-links, `og:image`, `sitemap.xml` en `robots.txt` met de juiste adressen.

Elke push naar `main` bouwt en publiceert de site automatisch opnieuw.

**Liever Cloudflare Pages?** Kies dan bij *Create* het tabblad Pages, met als build command `npm run build` en als output directory `dist`. Beide werken; de Workers-route is wat Cloudflare nu aanraadt.

## Structuur

| Pad | Inhoud |
|---|---|
| `src/data/recipes.json` | De 30 recepten (NL, de bron), met `guid`, `cuisine`, `protein`, `side` en Spaanse namen (`es`) |
| `src/data/recipes.{es,en,de,fr}.json` | Vertalingen (zelfde `id`, eigen `slug`) |
| `src/data/i18n-source.{taal}.json` | Teksten: voorwoord, hoofdstukken, basics, uitleg van de labels |
| `src/data/stores.json` | Per Spaanse ingrediëntnaam: winkels, afdeling en tip in 5 talen |
| `src/data/supermarkets.json` | De supermarktgids (ketens en markten aan de Costa del Sol) |
| `src/i18n.js` | Interfaceteksten, URL-namen en de merknaam per taal (`brand`: Smaakvol Koken, Cocina con Sabor, Flavourful Cooking, Genussvoll Kochen, Cuisine Savoureuse) |
| `src/themes.js` | De 4 stijlen uit de kookboek-PDF's; `site.config.json` → `"theme": "a"` |
| `src/art.js`, `src/scenes.js` | Generator van de illustraties en de scène per gerecht |
| `src/build.js`, `src/site.css`, `src/site.js` | De sitegenerator, de stijl en de interactie |
| `public/` | Wordt 1-op-1 gekopieerd (o.a. `_headers`, deelafbeeldingen `img/og-<taal>.png`; opnieuw maken met `python tools/og.py`) |
| `tools/pdf/` | Bouwt de 4 kookboek-PDF's (`python tools/pdf/render.py a --pdf uit.pdf`; vereist Playwright) |

## Een recept toevoegen of aanpassen

1. Pas het recept aan in `src/data/recipes.json`. Een nieuw recept krijgt een nieuwe, unieke `guid`, die je daarna nooit meer wijzigt, anders raken bezoekers hun favoriet kwijt. Voeg in `src/scenes.js` ook een scène toe voor de illustratie.
2. Voer dezelfde wijziging door in de vertalingen.
3. Nieuwe Spaanse ingrediëntnaam? Voeg die toe aan `src/data/stores.json`.
4. Bekijk het resultaat met `npm start`.
