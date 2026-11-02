# Afspraken – Smaakvol Koken / KokenMetBianca

Dit bestand legt vast wat we hebben afgesproken. Lees het voordat je verder bouwt. Nieuwe afspraken voeg je onderaan toe, met datum.

## Project
- **Wat:** kookboek en website "Smaakvol Koken met Bianca Manuela Seegers": betaalbare, milde slowcooker-gezinsrecepten (4 personen: 2 volwassenen + 2 kinderen), gericht op gezinnen en expats aan de **Costa del Sol**, met ingrediënten uit de Spaanse supermarkt.
- **Map:** `F:\Koken`. Het is geen game, dus het hoort niet in `F:\GameDev`.
- **Repo:** https://github.com/fergers1987/KokenMetBianca (privé, branch `main`).
- **Hosting:** Cloudflare Workers (static assets) via Git-koppeling. Elke push naar `main` rolt automatisch uit. Build `npm run build`, deploy `npx wrangler deploy`, zie `wrangler.jsonc`.
- **Domein:** **slowcookerspain.com**, gekocht via Cloudflare en gekoppeld aan de Worker `kokenmetbianca`. Staat in `site.config.json` → `siteUrl`. De Worker-naam in `wrangler.jsonc` moet `kokenmetbianca` blijven.
- **Geen verzonnen biografische feiten over Bianca.**

## Website
- **Stijl:** A "Linnen & Inkt", voorlopig de enige (`site.config.json` → `"theme": "a"`). De stijlen B–D bestaan in `src/themes.js` en `tools/pdf/`.
- **Talen:** NL (bron), ES, EN, DE, FR. Elke recept-URL heeft een eigen slug per taal.
- **Titels (2026-11-02):** de receptnaam staat volledig in de eigen taal, met de Spaanse gerechtnaam als ondertitel.
- **Merknaam per taal:** Smaakvol Koken, Cocina con Sabor, Flavourful Cooking, Genussvoll Kochen, Cuisine Savoureuse (`src/i18n.js` → `brand`).
- **Per ingrediënt:** de Spaanse supermarktnaam (`es`), en via `src/data/stores.json` de winkel, afdeling en tip. Daarnaast is er een supermarktgids met ketens aan de Costa del Sol.
- **Filters:**
  - prijs p.p. en slowcookertijd (schuifbalken)
  - keuken, hoofdingrediënt, bijgerecht en pittigheid
  - vega, invriesbaar en favorieten
  - sorteren
- **Favorieten:** in `localStorage`, met een cookie als terugval, op basis van een **vaste, unieke `guid` per recept**. Die guid nooit wijzigen.
- **Boodschappenlijst:**
  - meerdere gerechten, met het aantal personen per gerecht
  - samengevoegd en geschaald, per Spaanse supermarktafdeling
  - afvinken en eigen artikelen toevoegen
  - export: delen (Google Keep op mobiel), "Naar Google Keep" (kopiëren + plakken), kopiëren, WhatsApp, .txt, print
- **Cache:** CSS, JS en data laden met `?v=<inhoudshash>`, en HTML krijgt `max-age=0` (`public/_headers`). Een nieuwe release is dus direct zichtbaar.
- **Illustraties:** gegenereerd. Een handgemaakte scène in `src/scenes.js` heeft voorrang, anders maakt `src/autoscene.js` er automatisch een.

## Recepten
- **Aantal:** 110 gerechten (ids 1–110). De oorspronkelijke 30 komen uit het kookboek, 80 nieuwe zijn op 2026-11-02 door 4 koks-agents geschreven (20 per kok), met bronnen in `docs/bronnen-*.md`. Drie dubbele recepten (79, 81 en 94) zijn vervangen door nieuwe gerechten, met dezelfde ids.
- **Hoofdstukken:** Hollands & Europees, Spaans & Mediterraan, Wereldgerechten, Vis & Garnalen, Budgetfavorieten, Vegetarisch, Zoet uit de slowcooker.
- **Kwaliteitsregels:**
  - mild, met pit pas aan tafel
  - room, zuivel en vis op het eind
  - maïzena met koud water in het laatste halfuur
  - kip 75 °C
  - max ¾ vol
  - peulvruchten uit pot
  - realistische Spaanse prijzen (2026)
- **Afgesproken 2026-11-02, budgetversie:** elk ingrediënt krijgt `role`:
  - `basis`: verplicht, inclusief goedkope smaakmakers en technische ingrediënten
  - `extra`: maakt het lekkerder
  - `topping`: garnering
  - Optioneel komt er een budgetvervanger bij (`swap` + `saves`), en per recept een `price_basic`.
  - Op de site komt een schakelaar "Budgetversie", ook in de boodschappenlijst.
  - Optionele stappen krijgen het label "Optioneel:".
  - Uitgangspunt: vervangen bespaart meer dan weglaten. De goedkope smaakmakers blijven basis.
- **Afgesproken 2026-11-02, "Meer uit de slowcooker":** een aparte sectie met 12 extra's, zoals brood, yoghurt, bouillon, appelmoes en jam (ids 111–122, `kind: "extra"`). Ze staan **niet** in het gewone receptenoverzicht ("wat eten we vanavond?"), maar hebben een eigen menu-item. Ze gebruiken wel dezelfde receptpagina, favorieten en boodschappenlijst.

## Volgorde van werken (afgesproken)
1. Eerst indelen in basis, extra en topping (en de extra's schrijven), **dan pas vertalen**, zodat we niet twee keer vertalen.
2. Werk in batches. Na elke batch: bouwen, controleren (geen dode links, geldige SVG's) en dan **commit + push**.
3. Vertalen met 1 agent per taal (ES, EN, DE, FR), daarna de supermarktinfo aanvullen voor nieuwe Spaanse namen (`tools/merge_new.py` maakt `src/data/new/missing-stores.txt`).
4. Lokaal testen met `npm start` (http://localhost:8080) vóór de push.

## Kookboek-PDF's
- **Opties:** 4 opties (A–D) in `F:\Koken\pdf`. Die staan niet in git, omdat ze te groot zijn. Opnieuw maken kan met `tools/pdf/render.py`.
- **Fonts:** worden als statische TrueType ingesloten (geen Type3), anders geeft Adobe Reader fouten.
- **Inhoud (bijgewerkt 2026-11-02):** de PDF bevat alle 122 recepten in het Nederlands, per hoofdstuk (inclusief "Meer uit de slowcooker"). Stijl A staat als download op de site (`public/downloads/smaakvol-koken.pdf`), met een link naar de site op de cover en op elke receptpagina, en een QR-code op de achterkant.
- **Lengte:** elk recept past op 1 pagina. Lange recepten krijgen automatisch een compactere opmaak.

## Werkwijze met de gebruiker
- Het tegoed van de gebruiker kan beperkt zijn. Zeg vooraf wat veel kost (vertalingen en grote agent-rondes), en commit tussendoor zodat er niets verloren gaat.
- De gebruiker wil dat ideeën uitgedaagd worden: kom met tegenargumenten en een advies, niet alleen met uitvoering.
