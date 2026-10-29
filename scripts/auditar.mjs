// Audita la web de cada lead "nuevo": detecta defectos con evidencia y saca datos de contacto públicos.
// Uso: node scripts/auditar.mjs [--max 80] [--id <placeId>]
import { perfil, cargarLeads, guardarLeads, marcar, args } from './lib/db.mjs';

const p = perfil();
const a = args();
const leads = cargarLeads();
const max = Number(a.max ?? 80);
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANIO = new Date().getFullYear();

// Orden de prioridad: el primero que aparezca es el "defecto principal".
const PRIORIDAD = [
  'sin_web', 'caida', 'no_segura', 'plantilla_gratis', 'sin_contacto_rapido', 'desactualizada',
  'lenta', 'resenas_ocultas', 'sin_turnos', 'no_movil', 'mail_personal'
];

const TEXTOS = {
  es: {
    sin_web: () => 'No tienen web, así que quien los busca en Google no tiene dónde ver sus servicios ni pedir turno',
    caida: (e) => `La web no abre (${e})`,
    no_segura: () => 'Chrome muestra "sitio no seguro" al entrar',
    plantilla_gratis: (e) => `Es una web gratuita de plantilla, sin dominio propio (${e})`,
    sin_contacto_rapido: () => 'No hay botón de WhatsApp ni de llamar: para contactarlos hay que copiar el número a mano',
    desactualizada: (e) => `Parece abandonada: ${e}`,
    lenta: (e) => `Tarda ${e} en abrir en el celular`,
    resenas_ocultas: (e) => `Tiene ${e} reseñas buenas en Google y la web no muestra ninguna`,
    sin_turnos: () => 'No hay forma de pedir turno o presupuesto desde la web',
    no_movil: () => 'En el celular se ve la versión de computadora, chiquita',
    mail_personal: (e) => `Usa un mail personal (${e}) en vez de uno con su dominio`
  },
  en: {
    sin_web: () => "There's no website, so people who find you on Google have nowhere to see your services or request a quote",
    caida: (e) => `The website doesn't load (${e})`,
    no_segura: () => 'Chrome shows a "Not secure" warning',
    plantilla_gratis: (e) => `It's a free template site without its own domain (${e})`,
    sin_contacto_rapido: () => 'No tap-to-call or text button: visitors have to copy the number by hand',
    desactualizada: (e) => `It looks abandoned: ${e}`,
    lenta: (e) => `It takes ${e} to load on a phone`,
    resenas_ocultas: (e) => `They have ${e} great Google reviews and the site shows none`,
    sin_turnos: () => 'There is no form to request an estimate',
    no_movil: () => 'On a phone it shows the tiny desktop version',
    mail_personal: (e) => `Uses a personal email (${e}) instead of one on their domain`
  }
};

async function bajar(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8' }, redirect: 'follow', signal: c.signal });
    const html = await r.text();
    return { ok: r.ok, status: r.status, url: r.url, html };
  } catch (e) {
    return { ok: false, status: 0, error: e.cause?.code || e.name || String(e) };
  } finally { clearTimeout(t); }
}

async function pagespeed(url) {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance${k ? `&key=${k}` : ''}`;
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const j = await r.json();
    const lcp = j.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue;
    return { puntaje: Math.round((j.lighthouseResult?.categories?.performance?.score ?? 0) * 100), lcp: lcp ? +(lcp / 1000).toFixed(1) : null };
  } catch { return null; }
}

function contactos(html) {
  const emails = [...new Set((html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .map((m) => m.toLowerCase())
    .filter((m) => !/\.(png|jpe?g|webp|gif|svg)$/.test(m) && !/(sentry|wixpress|example|domain|email\.com|godaddy|wordpress)/.test(m)))];
  const ig = html.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})/i)?.[1];
  const wa = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)\+?(\d{8,15})/i)?.[1];
  return {
    email: emails[0] || null,
    instagram: ig && !['p', 'reel', 'explore', 'accounts'].includes(ig.toLowerCase()) ? ig : null,
    whatsapp_web: wa || null
  };
}

async function auditar(lead) {
  const idioma = lead.idioma || 'es';
  const d = {};          // defecto -> evidencia
  let contacto = {};

  if (!lead.web) {
    d.sin_web = 'Sin web en su ficha de Google Maps';
  } else if (/instagram\.com|facebook\.com|linktr\.ee|wa\.me/i.test(lead.web)) {
    d.sin_web = `En Maps tiene cargado ${lead.web} en lugar de una web`;
    const ig = lead.web.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)?.[1];
    if (ig) contacto.instagram = ig;
  } else {
    const r = await bajar(lead.web);
    if (!r.ok) {
      d.caida = r.status ? `responde error ${r.status}` : `no responde: ${r.error}`;
    } else {
      const h = r.html;
      const bajo = h.toLowerCase();
      contacto = contactos(h);
      if (!r.url.startsWith('https://')) d.no_segura = `La dirección final es ${r.url}`;
      const gratis = r.url.match(/(wixsite\.com|webnode\.\w+|jimdofree\.com|blogspot\.com|business\.site|weebly\.com|wordpress\.com|negocio\.site)/i);
      if (gratis) d.plantilla_gratis = gratis[1];
      const tieneWa = /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(h);
      const tieneTel = /href=["']tel:/i.test(h);
      if (!tieneWa && !tieneTel) d.sin_contacto_rapido = 'Sin links wa.me ni tel: en la página';
      const anios = [...h.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => +m[1]).filter((x) => x > 1995 && x <= ANIO);
      const ultimo = anios.length ? Math.max(...anios) : null;
      if (ultimo && ANIO - ultimo >= 3) d.desactualizada = idioma === 'es' ? `el último año que figura es © ${ultimo}` : `the latest year shown is © ${ultimo}`;
      else if (/en construcci[oó]n|pr[oó]ximamente|under construction|coming soon|lorem ipsum/i.test(h)) d.desactualizada = idioma === 'es' ? 'tiene textos de "en construcción" o de plantilla' : 'it still has "under construction" or placeholder text';
      if (!/<meta[^>]+name=["']viewport/i.test(h)) d.no_movil = 'Falta la etiqueta viewport';
      const muestraResenas = /rese[ñn]as|opiniones|testimonio|reviews|testimonial|elfsight|trustindex|google-reviews/i.test(bajo);
      if (!muestraResenas && lead.resenas >= 20) d.resenas_ocultas = String(lead.resenas);
      if (!/<form|calendly|turnos|agend|booking|reserv|estimate|quote|presupuesto/i.test(bajo)) d.sin_turnos = 'Sin formulario ni agenda online';
      if (contacto.email && /@(gmail|hotmail|yahoo|outlook|live)\./.test(contacto.email)) d.mail_personal = contacto.email;
      // PageSpeed solo si no hay ya un defecto grave (ahorra tiempo y cupo).
      if (!d.caida && !d.no_segura && !d.plantilla_gratis) {
        const ps = await pagespeed(r.url);
        if (ps) {
          lead.pagespeed = ps;
          if (ps.lcp && ps.lcp >= 4) d.lenta = idioma === 'es' ? `${ps.lcp} segundos` : `${ps.lcp} seconds`;
        }
      }
    }
  }

  lead.email ||= contacto.email || null;
  lead.instagram ||= contacto.instagram || null;
  if (!lead.whatsapp && contacto.whatsapp_web) lead.whatsapp = contacto.whatsapp_web;

  const claves = PRIORIDAD.filter((k) => k in d);
  lead.defectos = claves.map((k) => ({ clave: k, texto: TEXTOS[idioma][k](d[k]), evidencia: d[k] }));
  lead.defecto_principal = lead.defectos[0]?.texto || null;
  lead.gravedad = ['sin_web', 'caida', 'no_segura'].includes(claves[0]) ? 'alta' : claves.length ? 'media' : null;

  // Puntaje de oportunidad 0-100: más reseñas, mejor puntaje, más defectos y canales de contacto.
  const resenas = Math.min(30, Math.log10((lead.resenas || 1) + 1) * 12);
  const estrellas = Math.max(0, ((lead.estrellas || 4) - 4) * 15);
  const defectos = Math.min(25, claves.length * 6) + (lead.gravedad === 'alta' ? 15 : 0);
  const canales = (lead.email ? 6 : 0) + (lead.whatsapp ? 6 : 0) + (lead.instagram ? 3 : 0);
  lead.puntaje = Math.round(Math.min(100, resenas + estrellas + defectos + canales));
  lead.auditado = new Date().toISOString().slice(0, 10);

  const contactable = lead.email || lead.whatsapp || lead.instagram;
  if (!claves.length) marcar(lead, 'descartado', 'La web no tiene defectos claros');
  else if (!contactable) marcar(lead, 'descartado', 'Sin email, WhatsApp ni Instagram público');
  else marcar(lead, 'auditado', lead.defecto_principal);
}

const cola = a.id ? [leads[a.id]].filter(Boolean) : Object.values(leads).filter((l) => l.estado === 'nuevo').slice(0, max);
let hechos = 0;
for (let i = 0; i < cola.length; i += 4) {
  await Promise.all(cola.slice(i, i + 4).map(auditar));
  hechos += cola.slice(i, i + 4).length;
  guardarLeads(leads);
}
const auditados = cola.filter((l) => l.estado === 'auditado');
console.log(JSON.stringify({
  auditados: hechos,
  con_defecto_y_contacto: auditados.length,
  descartados: hechos - auditados.length,
  mejores: auditados.sort((x, y) => y.puntaje - x.puntaje).slice(0, 5).map((l) => `${l.puntaje} · ${l.nombre} (${l.ciudad}): ${l.defecto_principal}`)
}, null, 2));
