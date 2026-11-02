# Voortgang – nieuwe recepten (gepauzeerd 2026-11-02)

## Klaar en live (na push)
- Website met 30 recepten in NL/ES/EN/DE/FR, filters, favorieten en de supermarktgids.
- **Boodschappenlijst** (`/nl/boodschappenlijst/` e.a.):
  - meerdere gerechten bundelen en het aantal personen per gerecht kiezen
  - ingrediënten samengevoegd en geschaald, gesorteerd per Spaanse supermarktafdeling
  - afvinken, verbergen van afgevinkte artikelen, eigen artikelen toevoegen
  - delen (op de telefoon direct naar Google Keep), "Naar Google Keep" (kopiëren, Keep openen en plakken), kopiëren, WhatsApp, .txt en printen
- 2 nieuwe hoofdstukken staan klaar in `src/data/i18n-source.nl.json`: *Vegetarisch* en *Zoet uit de slowcooker*. Ze worden pas getoond als er recepten in zitten.

## Gepauzeerd: 80 nieuwe recepten (20 per kok)
Gestopt wegens beperkt tegoed. Er was nog **geen** receptbestand weggeschreven; alleen online onderzoek was gedaan.

| Kok | Thema | Ids | Doelbestanden |
|---|---|---|---|
| 1 | Spaans & mediterraan | 31–40 en 71–80 | `src/data/new/recipes-31-40.json`, `recipes-71-80.json` |
| 2 | Wereldgerechten | 41–50 en 81–90 | `recipes-41-50.json`, `recipes-81-90.json` |
| 3 | Hollands/Europees & budget | 51–60 en 91–100 | `recipes-51-60.json`, `recipes-91-100.json` (onderzoek was klaar) |
| 4 | Vegetarisch (5), vis (2), zoet (3) per 10 | 61–70 en 101–110 | `recipes-61-70.json`, `recipes-101-110.json` |

Specificatie voor de koks: `src/data/new/_spec.json` (schema, bestaande titels, toegestane hoofdstukken/keuken/hoofdingrediënt/bijgerecht). Bronnen horen in `docs/bronnen-<ids>.md`.

## Stappen om af te maken
1. Recepten laten schrijven, per batch van 10 (goedkoper en veiliger).
2. Samenvoegen in `src/data/recipes.json`: unieke `guid` per recept, `cuisine`, `protein` en `side` invullen.
3. Vertalen naar `recipes.{es,en,de,fr}.json`. Hoofdstuknamen voor *Vegetarisch* en *Zoet* ook in `i18n-source.{taal}.json`. Tip: begin met ES en EN.
4. Nieuwe Spaanse ingrediëntnamen toevoegen aan `src/data/stores.json`, met de tips in 5 talen.
5. Scènes voor de illustraties toevoegen in `src/scenes.js` (ids 31–110).
6. `npm start`, controleren, dan pushen; Cloudflare rolt automatisch uit.
