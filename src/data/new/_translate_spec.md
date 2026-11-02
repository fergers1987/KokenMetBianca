# Vertaalopdracht – recepten en hoofdstukken

**Bron (Nederlands):** `F:\Koken\src\data\recipes.json` (122 recepten, ids 1–122) en `F:\Koken\src\data\i18n-source.nl.json`.
**Doel:** `F:\Koken\src\data\recipes.<taal>.json` en `F:\Koken\src\data\i18n-source.<taal>.json` (bestaande bestanden, die je bijwerkt).

## Recepten
Het bestaande doelbestand bevat al vertalingen van de ids 1–30. Lever het VOLLEDIGE bestand met alle 122 recepten op, in de volgorde van ids:
1. **Ids 1–30:** houd de bestaande vertaling, maar:
   - neem de stappen over volgens de NIEUWE Nederlandse stappen: waar daar `Optioneel: ` voor staat of ` (optioneel)` achter een ingrediënt, doe hetzelfde in de doeltaal (bijv. EN `Optional: ` / ` (optional)`, ES `Opcional: ` / ` (opcional)`, DE `Optional: ` / ` (optional)`, FR `Facultatif : ` / ` (facultatif)`);
   - vertaal bij ingrediënten en serve-regels de velden `swap` en `saves` als die in het Nederlands bestaan (zelfde index). `saves` blijft een bedrag, bijvoorbeeld EN `approx. €3`, ES `aprox. 3 €`, DE `ca. 3 €` of FR `env. 3 €`.
2. **Ids 31–122:** vertaal volledig, zoals bij de bestaande vertalingen:
   - `title`, `chapter` (zie de namen hieronder), `prep`, `low`, `high` (null blijft null), `intro`, `tip`, `kids` en `steps`
   - in `ingredients` en `serve` de velden `q` (eenheden vertalen, getallen gelijk), `item`, `swap` en `saves`
   - voeg `slug` toe: kebab-case ASCII van de vertaalde titel, uniek binnen het bestand
3. Neem ongewijzigd over: `id`, `guid`, `price`, `price_basic`, `spice`, `vega`, `freeze`, `cuisine`, `protein`, `side`, `kind` en **het veld `es` (Spaanse supermarktnaam)**. Het veld `role` mag je weglaten; de site haalt dat uit het Nederlands.
4. Behoud LOW/HIGH, 75 °C en de "–" in bereiken. Gebruik de toon en de woordkeus van de bestaande vertalingen in hetzelfde bestand.

## Hoofdstukken (i18n-source.<taal>.json)
Voeg aan `chapters` de 3 nieuwe namen toe, in deze volgorde: Vegetarisch, Zoet uit de slowcooker, Meer uit de slowcooker. Voeg ze ook toe als sleutel in `content.chapters`, met de vertaalde `tagline` en `intro` uit het Nederlandse bestand. Laat de rest van het bestand ongewijzigd.

| Taal | Vegetarisch | Zoet uit de slowcooker | Meer uit de slowcooker |
|---|---|---|---|
| es | Vegetariano | Dulces de olla lenta | Más de la olla lenta |
| en | Vegetarian | Sweet slow cooker treats | More from the slow cooker |
| de | Vegetarisch | Süßes aus dem Slowcooker | Mehr aus dem Slowcooker |
| fr | Végétarien | Douceurs à la mijoteuse | Plus de la mijoteuse |

## Werkwijze en validatie
- Werk in stukken van ongeveer 20 recepten en schrijf tussendoor weg, zodat er niets verloren gaat bij een onderbreking. Een script dat per stuk aanvult is prima.
- Valideer met python:
  - `json.load`
  - 122 ids in volgorde
  - de `es`-velden gelijk aan het Nederlands
  - de slugs uniek
  - het aantal stappen en ingrediënten gelijk aan het Nederlands
  - de ids 1–30 hebben hun oude titels nog
  - in `i18n-source` 8 hoofdstukken, met de sleutels van `content.chapters` gelijk aan `chapters`
