# Voortgang (bijgewerkt 2026-11-02)

Zie ook `docs/AFSPRAKEN.md` voor alle afspraken.

## Live (op GitHub en via Cloudflare)
- **Recepten:** 110 in het Nederlands (30 origineel en 80 nieuw). De andere talen tonen de nieuwe recepten voorlopig in het Nederlands.
- **Functies:** filters, favorieten, de supermarktgids, de boodschappenlijst met Keep-export en cache-busting.

- **Indeling:** basis, extra en topping, met budgettips en de basisprijs, voor alle 122 recepten. Op de receptpagina staat een schakelaar "Budgetversie", en in de boodschappenlijst kun je per gerecht budget kiezen.
- **Meer uit de slowcooker:** 12 extra's (ids 111–122) met een eigen menu-item, buiten het receptenoverzicht.

## Bezig
- Vertalingen ES/EN/DE/FR van de recepten 31–122, plus de swaps en "Optioneel:"-stappen van de recepten 1–30 en de 3 nieuwe hoofdstukken.

## Nog te doen (in deze volgorde)
1. ~~**Indeling verwerken:** roles samenvoegen in `recipes.json` en de budgetschakelaar bouwen op de receptpagina en in de boodschappenlijst. De basisprijs tonen als "vanaf".
2. **Nieuwe sectie:** de extra's toevoegen met een eigen menu-item "Meer uit de slowcooker", buiten het receptenoverzicht.
3. **Vertalen:** ES, EN, DE en FR, 1 agent per taal:
   - de nieuwe recepten (31–122) volledig
   - bij de oorspronkelijke 30 alleen de swaps en de "Optioneel:"-stappen
   - de hoofdstukken Vegetarisch, Zoet en Meer uit de slowcooker, plus de bijbehorende UI-teksten
4. **Supermarktgids:** aanvullen voor nieuwe Spaanse namen (`src/data/new/missing-stores.txt`), met tips in 5 talen.
5. **Bezoekers meten:** Cloudflare Web Analytics aanzetten (gebruiker, via het dashboard).

Na elke stap bouwen, controleren, committen en pushen.
