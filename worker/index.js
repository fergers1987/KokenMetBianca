// Smaakvol Koken — Worker: serveert de statische site en verwerkt het contactformulier (POST /api/contact).
// Berichten gaan via Cloudflare Email Routing (binding CONTACT_MAIL) naar het vaste ontvangstadres; Turnstile houdt spam tegen.
import { EmailMessage } from 'cloudflare:email';

const LANGS = ['nl', 'es', 'en', 'de', 'fr'];
const CONTACT_PATH = { nl: 'contact', es: 'contacto', en: 'contact', de: 'kontakt', fr: 'contact' };
const LIMITS = { name: 100, email: 200, message: 5000 };
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return contact(request, env);
    return env.ASSETS.fetch(request);
  },
};

async function contact(request, env) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  const viaFetch = request.headers.get('X-Requested-With') === 'fetch';
  let form;
  try { form = await request.formData(); } catch (e) { return reply(viaFetch, 'nl', 400, 'bad'); }
  const field = k => String(form.get(k) || '').replace(/\r\n?/g, '\n').trim();
  const lang = LANGS.includes(field('lang')) ? field('lang') : 'nl';
  const name = field('name').replace(/\s+/g, ' ').slice(0, LIMITS.name);
  const email = field('email').slice(0, LIMITS.email);
  const message = field('message').slice(0, LIMITS.message);

  // honeypot: echte bezoekers laten dit veld leeg; doe alsof het gelukt is
  if (field('website')) return reply(viaFetch, lang, 200, 'ok');
  if (!name || !message || !EMAIL_RE.test(email)) return reply(viaFetch, lang, 400, 'bad');
  if (!env.TURNSTILE_SECRET || !env.CONTACT_MAIL) return reply(viaFetch, lang, 503, 'err');

  const human = await turnstile(env.TURNSTILE_SECRET, field('cf-turnstile-response'), request.headers.get('CF-Connecting-IP'));
  if (!human) return reply(viaFetch, lang, 403, 'bot');

  try {
    const from = env.MAIL_FROM, to = env.MAIL_TO;
    const raw = mime({
      from: `Smaakvol Koken <${from}>`, to, replyTo: email,
      subject: `Contactformulier: ${name}`,
      body: `${message}\n\n--\nNaam: ${name}\nE-mail: ${email}\nTaal: ${lang.toUpperCase()}\nVerstuurd via ${new URL(request.url).origin}/${lang}/${CONTACT_PATH[lang]}/`,
      domain: from.split('@')[1],
    });
    await env.CONTACT_MAIL.send(new EmailMessage(from, to, raw));
  } catch (e) {
    console.error('contact: verzenden mislukt', e);
    return reply(viaFetch, lang, 502, 'err');
  }
  return reply(viaFetch, lang, 200, 'ok');
}

async function turnstile(secret, token, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret); body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    return (await res.json()).success === true;
  } catch (e) { return false; }
}

// met JavaScript: JSON; zonder JavaScript: terug naar de contactpagina met ?status=
function reply(viaFetch, lang, status, code) {
  if (viaFetch) return Response.json({ ok: code === 'ok', code }, { status });
  return new Response(null, { status: 303, headers: { Location: `/${lang}/${CONTACT_PATH[lang]}/?status=${code}` } });
}

// ---------- eenvoudige MIME-mail (platte tekst, UTF-8) ----------
function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
const header = s => `=?UTF-8?B?${b64(s)}?=`;
function mime({ from, to, replyTo, subject, body, domain }) {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${header(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(body).replace(/.{76}/g, '$&\r\n'),
  ].join('\r\n');
}
