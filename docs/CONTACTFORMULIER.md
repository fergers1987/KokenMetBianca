# Contactformulier

## Zo werkt het
- De pagina staat op `/nl/contact/`, `/es/contacto/`, `/en/contact/`, `/de/kontakt/` en `/fr/contact/`.
- Het formulier verstuurt naar `/api/contact`. Dat adres wordt afgehandeld door de Worker (`worker/index.js`). Alle andere adressen zijn gewone statische bestanden.
- De Worker controleert:
  - de velden
  - de spamcontrole (Cloudflare Turnstile)
  - een verborgen lokveld voor bots
- Daarna mailt hij het bericht via Cloudflare Email Routing naar het ontvangstadres. Bij "Beantwoorden" in je mail-app gaat je antwoord direct naar de bezoeker.
- Er wordt niets opgeslagen.

## Status (2026-11-02): gebouwd, nog verborgen
- De pagina wordt gebouwd, maar heeft `noindex`, staat niet in de sitemap, en er linkt niets naartoe.
- Zonder mailkoppeling antwoordt het formulier met "probeer het later nog eens".

## Stappen in het Cloudflare-dashboard (gebruiker)
1. **Email Routing aanzetten:**
   - Ga naar slowcookerspain.com → Email → Email Routing → Get started.
   - Laat Cloudflare de voorgestelde DNS-records (MX en SPF) toevoegen.
   - Ga naar Destination addresses en voeg het ontvangstadres toe.
   - Klik op de bevestigingslink in de mail die naar dat adres wordt gestuurd.
   - Let op: als er op slowcookerspain.com al e-mail draait, overleg dan eerst, want de MX-records veranderen.
2. **Turnstile-widget maken:**
   - Ga naar Turnstile → Add widget.
   - Naam: "Contactformulier". Hostname: `slowcookerspain.com`. Mode: Managed.
   - Noteer de **Site key** en de **Secret key**.
3. **Geheim instellen:**
   - Ga naar Workers & Pages → `kokenmetbianca` → Settings → Variables and Secrets → Add.
   - Type: Secret. Naam: `TURNSTILE_SECRET`. Waarde: de Secret key.

## Daarna (Claude)
1. Zet in `wrangler.jsonc` de `send_email`-binding en `MAIL_TO` met het ontvangstadres (het voorbeeld staat als commentaar in het bestand).
2. Zet in `site.config.json` `"turnstileSiteKey": "<Site key>"`.
3. Pushen en een testbericht sturen via het verborgen adres.
4. Pas als de gebruiker dat wil: `"contact": true` in `site.config.json`. Dan komt de pagina in de footer en de sitemap, en vervalt `noindex`.

## Lokaal testen
`npx wrangler dev` draait de Worker met de site. Gebruik:
- een tijdelijke kopie van `wrangler.jsonc` met een `send_email`-binding (lokaal wordt de mail als .eml-bestand in `.wrangler/tmp/email/` gezet)
- de testsleutel van Cloudflare in een env-bestand: `TURNSTILE_SECRET=1x0000000000000000000000000000000AA`
