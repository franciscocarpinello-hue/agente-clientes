// Arma la portada de muestra de un lead con sus datos reales de Google (nombre, reseñas, fotos, horarios).
// Uso: node scripts/maqueta.mjs --id <placeId>      (una)
//      node scripts/maqueta.mjs --mejores 5         (los auditados con más puntaje y sin maqueta)
// Resultado: maquetas/<slug>/index.html, listo para publicar en Netlify como <slug>-demo.netlify.app
import { writeFileSync, mkdirSync } from 'node:fs';
import { perfil, cargarLeads, guardarLeads, cargarEstado, guardarEstado, consumir, ruta, slug, args } from './lib/db.mjs';
import { detalle, urlFoto } from './lib/places.mjs';

const p = perfil();
const a = args();
const leads = cargarLeads();
const estado = cargarEstado();

const esc = (t = '') => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iniciales = (n) => n.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const COPY = {
  es: {
    cta: (r) => r.accion === 'pedir turno' ? 'Pedí tu turno por WhatsApp' : 'Pedí tu presupuesto',
    llamar: 'Llamar', servicios: 'Servicios', opiniones: 'Lo que dicen nuestros pacientes',
    opinionesGen: 'Lo que dicen nuestros clientes', donde: 'Dónde estamos', horarios: 'Horarios',
    enGoogle: (n) => `${n} reseñas en Google`, verMapa: 'Cómo llegar',
    hero: (l, r) => `${r.nombre} en ${l.ciudad}. Atención cercana, turnos rápidos y la confianza de ${l.resenas} reseñas en Google.`,
    aviso: `Maqueta de muestra preparada por ${p.nombre}. No es la web oficial del negocio.`,
    fotos: 'Fotos y reseñas: Google'
  },
  en: {
    cta: () => 'Get a free estimate', llamar: 'Call now', servicios: 'Services', opiniones: 'What our clients say',
    opinionesGen: 'What our clients say', donde: 'Visit us', horarios: 'Hours',
    enGoogle: (n) => `${n} Google reviews`, verMapa: 'Get directions',
    hero: (l, r) => `Trusted ${r.nombre.replace(/\s*\(.*\)/, '').toLowerCase()} in ${l.ciudad}, rated ${l.estrellas} stars across ${l.resenas} Google reviews.`,
    aviso: `Sample homepage prepared by ${p.nombre}. Not the business's official website.`,
    fotos: 'Photos and reviews: Google'
  }
};

async function enriquecer(lead) {
  if (lead.detalle) return;
  const d = await detalle(lead.id, lead.idioma);
  consumir(estado, 'maps');
  const fotos = [];
  for (const f of (d.photos || []).slice(0, 4)) {
    try { fotos.push(await urlFoto(f.name)); consumir(estado, 'maps'); } catch { /* sin foto */ }
  }
  lead.detalle = {
    resenas: (d.reviews || [])
      .filter((r) => (r.rating ?? 0) >= 4 && (r.text?.text || '').length > 40)
      .slice(0, 3)
      .map((r) => ({ autor: r.authorAttribution?.displayName, texto: r.text.text.slice(0, 280), estrellas: r.rating })),
    fotos,
    horarios: d.regularOpeningHours?.weekdayDescriptions || [],
    resumen: d.editorialSummary?.text || null
  };
}

function html(lead) {
  const r = p.rubros[lead.rubro];
  const c = COPY[lead.idioma];
  const pal = r.paleta;
  const det = lead.detalle || { resenas: [], fotos: [], horarios: [] };
  const wa = lead.whatsapp ? `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(lead.idioma === 'es' ? `Hola! Quiero ${r.accion}.` : 'Hi! I would like a free estimate.')}` : null;
  const tel = lead.telefono ? `tel:${lead.telefono.replace(/[^\d+]/g, '')}` : null;
  const ctaHref = wa || tel || '#contacto';
  const icono = wa ? ICONO_WA : ICONO_TEL;
  const hero = det.fotos[0];
  const estrellas = '★★★★★'.slice(0, Math.round(lead.estrellas || 5));

  return `<!doctype html>
<html lang="${lead.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(lead.nombre)} · ${esc(lead.ciudad)}</title>
<meta name="description" content="${esc(c.hero(lead, r))}">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--p:${pal.primario};--a:${pal.acento};--f:${pal.fondo};--t:${pal.tinta};--m:color-mix(in srgb,var(--t) 62%,white);--r:18px}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{font:400 17px/1.6 Inter,system-ui,sans-serif;color:var(--t);background:var(--f);-webkit-font-smoothing:antialiased}
a{color:inherit}
.w{width:min(1120px,100% - 40px);margin-inline:auto}
.aviso{background:var(--t);color:#fff;font-size:13px;text-align:center;padding:8px 16px;opacity:.92}
header{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--f) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid color-mix(in srgb,var(--t) 8%,transparent)}
header .w{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.logo{display:flex;align-items:center;gap:12px;font:600 18px/1.1 Fraunces,serif;text-decoration:none}
.logo i{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--p);color:#fff;font:600 15px Inter;font-style:normal;letter-spacing:.5px}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 22px;border-radius:999px;font-weight:600;text-decoration:none;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-1px)}
.btn-p{background:var(--p);color:#fff;box-shadow:0 10px 30px -10px var(--p)}
.btn-g{background:#fff;color:var(--t);border:1px solid color-mix(in srgb,var(--t) 12%,transparent)}
.btn svg{width:20px;height:20px}
header .btn{padding:10px 18px;font-size:15px}
.hero{position:relative;padding:72px 0 88px;overflow:hidden}
.hero .w{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center}
.chip{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid color-mix(in srgb,var(--t) 10%,transparent);font-size:14px;font-weight:500}
.chip b{color:#F5A524;letter-spacing:1px}
h1{font:700 clamp(40px,6vw,68px)/1.02 Fraunces,serif;letter-spacing:-.02em;margin:22px 0 18px}
h1 em{font-style:normal;color:var(--p)}
.lead{font-size:19px;color:var(--m);max-width:34ch}
.acciones{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.foto{position:relative;aspect-ratio:4/5;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,var(--p),var(--a));box-shadow:0 40px 80px -30px color-mix(in srgb,var(--p) 60%,transparent)}
.foto img{width:100%;height:100%;object-fit:cover}
.foto .sello{position:absolute;left:18px;bottom:18px;right:18px;background:rgba(255,255,255,.94);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px;font-size:14px}
.foto .sello strong{font:700 26px Fraunces,serif;color:var(--p)}
.hero:before{content:"";position:absolute;inset:auto -20% -40% auto;width:620px;height:620px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 35%,transparent),transparent);z-index:-1}
section{padding:88px 0}
h2{font:700 clamp(30px,4vw,44px)/1.1 Fraunces,serif;letter-spacing:-.015em;margin-bottom:36px}
.serv{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.serv div{background:#fff;border-radius:var(--r);padding:26px;border:1px solid color-mix(in srgb,var(--t) 7%,transparent);font-weight:600;display:flex;gap:14px;align-items:center}
.serv span{flex:none;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--a) 22%,white);color:var(--p);font-size:15px}
.opin{background:var(--t);color:#fff}
.opin h2{color:#fff}
.resenas{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.resenas figure{background:color-mix(in srgb,white 7%,transparent);border:1px solid color-mix(in srgb,white 14%,transparent);border-radius:var(--r);padding:26px;display:flex;flex-direction:column;gap:16px}
.resenas b{color:#F5A524;letter-spacing:2px}
.resenas blockquote{font-size:16px;line-height:1.65;opacity:.92}
.resenas figcaption{margin-top:auto;font-weight:600;font-size:15px;opacity:.85}
.galeria{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:40px}
.galeria img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px}
.contacto .w{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.card{background:#fff;border-radius:24px;padding:32px;border:1px solid color-mix(in srgb,var(--t) 7%,transparent)}
.card h3{font:600 22px Fraunces,serif;margin-bottom:14px}
.card ul{list-style:none;padding:0;color:var(--m);font-size:15px}
.card li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed color-mix(in srgb,var(--t) 10%,transparent)}
.card p{color:var(--m);margin-bottom:22px}
footer{padding:36px 0 120px;color:var(--m);font-size:14px;text-align:center}
.flotante{position:fixed;right:18px;bottom:18px;z-index:9;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:#25D366;color:#fff;box-shadow:0 14px 30px -8px rgba(0,0,0,.35)}
.flotante svg{width:32px;height:32px}
@media (max-width:860px){
  .hero{padding:40px 0 64px}.hero .w{grid-template-columns:1fr;gap:36px}
  .foto{aspect-ratio:4/3}.serv,.resenas,.galeria,.contacto .w{grid-template-columns:1fr}
  .galeria{grid-template-columns:1fr 1fr}.galeria img:nth-child(3){display:none}
  header .btn span{display:none} section{padding:64px 0}
}
</style>
</head>
<body>
<div class="aviso">${esc(c.aviso)}</div>
<header><div class="w">
  <a class="logo" href="#"><i>${esc(iniciales(lead.nombre) || '•')}</i>${esc(lead.nombre)}</a>
  <a class="btn btn-p" href="${esc(ctaHref)}">${icono}<span>${esc(c.cta(r))}</span></a>
</div></header>

<main>
<section class="hero"><div class="w">
  <div>
    <span class="chip"><b>${estrellas}</b> ${String(lead.estrellas).replace('.', lead.idioma === 'es' ? ',' : '.')} · ${esc(c.enGoogle(lead.resenas))}</span>
    <h1>${esc(lead.nombre)}<br><em>${esc(lead.ciudad)}</em></h1>
    <p class="lead">${esc(det.resumen || c.hero(lead, r))}</p>
    <div class="acciones">
      <a class="btn btn-p" href="${esc(ctaHref)}">${icono}${esc(c.cta(r))}</a>
      ${tel ? `<a class="btn btn-g" href="${esc(tel)}">${ICONO_TEL}${esc(c.llamar)}</a>` : ''}
    </div>
  </div>
  <div class="foto">
    ${hero ? `<img src="${esc(hero)}" alt="${esc(lead.nombre)}" fetchpriority="high" onerror="this.remove()">` : ''}
    <div class="sello"><strong>${String(lead.estrellas).replace('.', lead.idioma === 'es' ? ',' : '.')}</strong><div><b style="color:#F5A524">${estrellas}</b><br>${esc(c.enGoogle(lead.resenas))}</div></div>
  </div>
</div></section>

<section><div class="w">
  <h2>${esc(c.servicios)}</h2>
  <div class="serv">${r.servicios.map((s, i) => `<div><span>${String(i + 1).padStart(2, '0')}</span>${esc(s)}</div>`).join('')}</div>
  ${det.fotos.length > 1 ? `<div class="galeria">${det.fotos.slice(1, 4).map((f) => `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.remove()">`).join('')}</div>` : ''}
</div></section>

${det.resenas.length ? `<section class="opin"><div class="w">
  <h2>${esc(r.cliente === 'paciente' ? c.opiniones : c.opinionesGen)}</h2>
  <div class="resenas">${det.resenas.map((x) => `<figure><b>${'★'.repeat(x.estrellas)}</b><blockquote>“${esc(x.texto)}${x.texto.length >= 280 ? '…' : ''}”</blockquote><figcaption>${esc(x.autor)}</figcaption></figure>`).join('')}</div>
</div></section>` : ''}

<section class="contacto" id="contacto"><div class="w">
  <div class="card">
    <h3>${esc(c.donde)}</h3>
    <p>${esc(lead.direccion)}</p>
    <div class="acciones" style="margin-top:0">
      <a class="btn btn-p" href="${esc(ctaHref)}">${icono}${esc(c.cta(r))}</a>
      <a class="btn btn-g" href="${esc(lead.maps)}" target="_blank" rel="noopener">${esc(c.verMapa)}</a>
    </div>
  </div>
  ${det.horarios.length ? `<div class="card"><h3>${esc(c.horarios)}</h3><ul>${det.horarios.map((h) => { const [d, ...rest] = h.split(': '); return `<li><span>${esc(d)}</span><span>${esc(rest.join(': '))}</span></li>`; }).join('')}</ul></div>` : ''}
</div></section>
</main>

<footer>© ${new Date().getFullYear()} ${esc(lead.nombre)} · ${esc(c.fotos)}<br>${esc(c.aviso)}</footer>
${wa ? `<a class="flotante" href="${esc(wa)}" aria-label="WhatsApp">${ICONO_WA}</a>` : ''}
</body>
</html>
`;
}

const ICONO_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';
const ICONO_TEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';

const elegidos = a.id
  ? [leads[a.id]].filter(Boolean)
  : Object.values(leads)
      .filter((l) => l.estado === 'auditado' && !l.maqueta_local)
      .sort((x, y) => y.puntaje - x.puntaje)
      .slice(0, Number(a.mejores ?? p.limites_diarios.maquetas));

const hechas = [];
for (const lead of elegidos) {
  if (process.env.GOOGLE_PLACES_API_KEY) await enriquecer(lead);
  const s = `${slug(lead.nombre)}-${slug(lead.ciudad).slice(0, 12)}`.replace(/-+$/, '');
  const dir = ruta('maquetas', s);
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html(lead));
  lead.maqueta_local = `maquetas/${s}`;
  lead.maqueta_sitio = `${s}-demo`;
  hechas.push({ id: lead.id, nombre: lead.nombre, carpeta: lead.maqueta_local, sitio_netlify: lead.maqueta_sitio });
}
guardarLeads(leads);
guardarEstado(estado);
console.log(JSON.stringify({ maquetas: hechas }, null, 2));
