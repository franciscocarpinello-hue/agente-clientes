// Arma el plan de contactos del día: emails nuevos, seguimientos, WhatsApp a un toque e Instagram.
// No manda nada: escribe salida/<fecha>/plan.json y lista-del-dia.txt para que el agente ejecute.
// Uso: node scripts/plan.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { perfil, cargarLeads, guardarLeads, hoy, diasDesde, marcar, ruta } from './lib/db.mjs';
import { email, whatsapp, instagram } from '../plantillas/mensajes.mjs';

const p = perfil();
const leads = cargarLeads();
const L = p.limites_diarios;
const [d1, d2] = p.seguimientos_dias;
const fecha = hoy();

const ctx = (lead) => ({ lead, perfil: p, rubro: p.rubros[lead.rubro], maqueta: lead.maqueta || null });
const ultimoContacto = (l) => [...(l.historial || [])].reverse().find((h) => ['contactado', 'seguimiento1', 'seguimiento2'].includes(h.estado))?.fecha;
const porPuntaje = (x, y) => (y.puntaje || 0) - (x.puntaje || 0);
const todos = Object.values(leads);

// Seguimientos (solo por email: en WhatsApp e Instagram el seguimiento lo decide Francisco).
const seguimientos = [];
for (const l of todos.filter((x) => x.canal === 'email')) {
  const dias = diasDesde(ultimoContacto(l));
  if (l.estado === 'contactado' && dias >= d1) seguimientos.push({ id: l.id, tipo: 'seguimiento1', para: l.email, hilo: l.hilo_gmail || null, ...email.seguimiento1(ctx(l)) });
  else if (l.estado === 'seguimiento1' && dias >= d2 - d1) seguimientos.push({ id: l.id, tipo: 'seguimiento2', para: l.email, hilo: l.hilo_gmail || null, ...email.seguimiento2(ctx(l)) });
  else if (l.estado === 'seguimiento2' && dias >= d2 - d1) marcar(l, 'perdido', 'Sin respuesta después del último seguimiento');
}
// WhatsApp e Instagram sin respuesta en 10 días: se cierran solos.
for (const l of todos.filter((x) => x.canal !== 'email' && x.estado === 'contactado')) {
  if (diasDesde(ultimoContacto(l)) >= 10) marcar(l, 'perdido', `Sin respuesta por ${l.canal} en 10 días`);
}

const listos = todos.filter((l) => l.estado === 'auditado').sort(porPuntaje);
const conMaquetaPrimero = (x, y) => (y.maqueta ? 1 : 0) - (x.maqueta ? 1 : 0) || porPuntaje(x, y);

const emails = listos.filter((l) => l.email).sort(conMaquetaPrimero).slice(0, L.emails_nuevos)
  .map((l) => ({ id: l.id, tipo: 'primero', para: l.email, ...email.primero(ctx(l)) }));
const usados = new Set(emails.map((e) => e.id));

const wa = listos.filter((l) => l.whatsapp && !usados.has(l.id) && p.mercados[l.mercado].canales.includes('whatsapp'))
  .sort(conMaquetaPrimero).slice(0, L.whatsapp)
  .map((l) => { const m = whatsapp(ctx(l)); return { id: l.id, nombre: l.nombre, ciudad: l.ciudad, link: `https://wa.me/${l.whatsapp}?text=${encodeURIComponent(m.cuerpo)}`, ...m }; });
wa.forEach((x) => usados.add(x.id));

const ig = listos.filter((l) => l.instagram && !usados.has(l.id)).sort(conMaquetaPrimero).slice(0, L.instagram)
  .map((l) => ({ id: l.id, nombre: l.nombre, ciudad: l.ciudad, perfil: `https://instagram.com/${l.instagram}`, ...instagram(ctx(l)) }));

const plan = { fecha, modo_prueba: p.modo_prueba, emails, seguimientos, whatsapp: wa, instagram: ig };
const dir = ruta('salida', fecha);
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/plan.json`, JSON.stringify(plan, null, 2));

// Lista para Francisco: se le manda por email y la abre en el celular.
const bloques = [
  `Tu lista de hoy (${fecha}). Tocá cada link: se abre WhatsApp con el mensaje escrito, solo apretás enviar.\nCuando termines, respondé este mail con "listo" (o "listo menos 3 y 7" si alguno no lo mandaste).`
];
if (wa.length) bloques.push('WHATSAPP\n\n' + wa.map((x, i) => `${i + 1}. ${x.nombre} (${x.ciudad})\n${x.link}`).join('\n\n'));
if (ig.length) bloques.push('INSTAGRAM (abrí el perfil, copiá el texto y mandalo por DM)\n\n' + ig.map((x, i) => `${wa.length + i + 1}. ${x.nombre}: ${x.perfil}\n${x.cuerpo}`).join('\n\n'));
const lista = wa.length || ig.length ? bloques.join('\n\n') : '';
writeFileSync(`${dir}/lista-del-dia.txt`, lista + '\n');

guardarLeads(leads);
console.log(JSON.stringify({
  fecha,
  emails_nuevos: emails.length,
  seguimientos: seguimientos.length,
  whatsapp: wa.length,
  instagram: ig.length,
  archivo: `salida/${fecha}/plan.json`
}, null, 2));
