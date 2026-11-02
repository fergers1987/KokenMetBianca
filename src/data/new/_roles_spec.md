# Opdracht: ingrediënten indelen (basis / extra / topping) + budgetvervangers

Bron: `F:\Koken\src\data\recipes.json` (array van recepten, Nederlands). Wijzig dat bestand NIET; schrijf een apart patchbestand.

Per recept bepaal je:

1. **role per ingrediënt** (zelfde volgorde als `ingredients`), één van:
   - `"basis"`: zonder dit geen gerecht. Hoort hier ALTIJD bij: de hoofdingrediënten, de goedkope smaakmakers die in de slowcooker essentieel zijn (ui, knoflook, bouillon, zout/peper, kernkruiden, zuur zoals azijn/citroen als de saus erop leunt) en de technische ingrediënten (maïzena/bloem/binding, vocht, olie om aan te bakken, ei in gehaktballen).
   - `"extra"`: maakt het duidelijk lekkerder of rijker, maar het gerecht lukt ook zonder (bijv. room, kaas, wijn, een tweede/derde groente, honing, zongedroogde tomaat, olijven, verse kruiden in de saus).
   - `"topping"`: garnering op het bord (verse peterselie/koriander erover, sesam, geraspte kaas erover, yoghurt-dot).
   Wees streng: twijfel = `"basis"`. Een recept moet met alleen de basis nog een goed, smakelijk gerecht zijn.
2. **swap (optioneel, alleen waar het echt bespaart)** bij dure basis-ingrediënten: een korte budgetvervanger in het Nederlands, max 10 woorden (bijv. `"kipdijfilet in plaats van rundvlees"`, `"helft gehakt vervangen door rode linzen"`, `"kookroom in plaats van room"`) plus `"saves"`: een eerlijke ruwe schatting zoals `"ca. € 2"`. Max 2 swaps per recept; geen swap als het niet zinvol is.
3. **role voor `serve`** (bijgerechten, zelfde volgorde): `"basis"` als het gerecht er echt mee gegeten wordt (rijst bij curry, brood bij soep), anders `"extra"` of `"topping"`.
4. **price_basic**: een eerlijke richtprijs-range in euro voor de hele maaltijd (4 personen) met ALLEEN basis + serve-basis, zonder swaps (bijv. `"6–8"`). Moet ≤ de bestaande `price` zijn.
5. **steps**: kopieer de stappen LETTERLIJK. Alleen als een stap helemaal over een extra/topping-ingrediënt gaat, zet je er `"Optioneel: "` voor. Een stap die basis én extra noemt laat je ongewijzigd en zet je achter de extra-naam `" (optioneel)"`. Verander verder NIETS aan de tekst.

## Uitvoer
Een JSON-array, per recept:
```json
{"id": 1, "price_basic": "7–9",
 "ingredients": [{"role": "basis"}, {"role": "basis", "swap": "kipdijfilet in plaats van rundvlees", "saves": "ca. € 3"}, {"role": "extra"}],
 "serve": [{"role": "basis"}],
 "steps": ["…letterlijke stap…", "Optioneel: …"]}
```
De arrays `ingredients`, `serve` en `steps` moeten exact even lang zijn als in het recept. Valideer met python: alle ids aanwezig, lengtes kloppen, roles uit de lijst, price_basic-ondergrens ≤ price-ondergrens, en stappen zijn gelijk aan het origineel op hoogstens de toegestane "Optioneel: "/" (optioneel)"-toevoegingen na.
