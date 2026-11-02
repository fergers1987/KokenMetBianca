# Voortgang (bijgewerkt 2026-11-02)

Zie ook `docs/AFSPRAKEN.md` voor alle afspraken.

## Live (op GitHub en via Cloudflare, slowcookerspain.com)
- **Recepten:** 122 in totaal: 110 gerechten (30 origineel en 80 nieuw) en 12 extra's onder "Meer uit de slowcooker". Drie dubbele recepten (79, 81 en 94) zijn vervangen.
- **Talen:** NL, ES, EN, DE en FR zijn compleet voor alle recepten, hoofdstukken en UI-teksten. Titels staan in de eigen taal, met de Spaanse gerechtnaam als ondertitel.
- **Indeling:** basis, extra en topping, met budgettips en de basisprijs ("vanaf"), voor alle 122 recepten. Op de receptpagina staat een schakelaar "Budgetversie". In de boodschappenlijst kun je per gerecht budget kiezen.
- **Meer uit de slowcooker:** 12 extra's (ids 111–122) met een eigen menu-item, buiten het receptenoverzicht.
- **Supermarktgids:** compleet. Alle Spaanse ingrediëntnamen hebben een winkel, afdeling en tip.
- **Functies:**
  - filters, favorieten en cache-busting
  - de boodschappenlijst met Keep-export. Eenheden worden correct opgeteld (2 tenen + 1 teen = 3 tenen).
  - een printknop met een printversie in grote letters
  - een deelafbeelding per taal
- **PDF-download:** het hele kookboek in het Nederlands (139 pagina's, stijl A), met een link naar de site en een QR-code.

## Nog te doen
1. **Bezoekers meten:** Cloudflare Web Analytics aanzetten (gebruiker, via het dashboard).
2. **Contactformulier activeren:** gebouwd en verborgen. De gebruiker doet eerst de Cloudflare-stappen (zie `docs/CONTACTFORMULIER.md`), en daarna koppelt Claude het ontvangstadres en de Turnstile-sleutel.
3. **SEO en vindbaarheid via AI:** de bestaande SEO nalopen en aanvullen.

## Mogelijke vervolgstappen (nog niet afgesproken)
- De PDF ook in ES, EN, DE en FR.
- Opruimen: `src/data/new/` bevat tussenbestanden van het samenvoegen, waaronder een verouderde `missing-stores.txt`.

Na elke stap bouwen, controleren, committen en pushen.
