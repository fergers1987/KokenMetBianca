# Voortgang (bijgewerkt 2026-11-02)

Zie ook `docs/AFSPRAKEN.md` voor alle afspraken.

## Live (op GitHub en via Cloudflare)
- **Recepten:** 110 in het Nederlands (30 origineel en 80 nieuw). De andere talen tonen de nieuwe recepten voorlopig in het Nederlands.
- **Functies:** filters, favorieten, de supermarktgids, de boodschappenlijst met Keep-export en cache-busting.

## Bezig
- Indeling basis/extra/topping, swaps en price_basic voor ids 1–110 (agents → `src/data/new/roles-1-55.json` en `roles-56-110.json`).
- 12 extra's "Meer uit de slowcooker" (ids 111–122 → `src/data/new/recipes-111-122.json`).

## Nog te doen (in deze volgorde)
1. **Indeling verwerken:** roles samenvoegen in `recipes.json` en de budgetschakelaar bouwen op de receptpagina en in de boodschappenlijst. De basisprijs tonen als "vanaf".
2. **Nieuwe sectie:** de extra's toevoegen met een eigen menu-item "Meer uit de slowcooker", buiten het receptenoverzicht.
3. **Vertalen:** ES, EN, DE en FR, 1 agent per taal:
   - de nieuwe recepten (31–122) volledig
   - bij de oorspronkelijke 30 alleen de swaps en de "Optioneel:"-stappen
   - de hoofdstukken Vegetarisch, Zoet en Meer uit de slowcooker, plus de bijbehorende UI-teksten
4. **Supermarktgids:** aanvullen voor nieuwe Spaanse namen (`src/data/new/missing-stores.txt`), met tips in 5 talen.
5. **Bezoekers meten:** Cloudflare Web Analytics aanzetten (gebruiker, via het dashboard).

Na elke stap bouwen, controleren, committen en pushen.
