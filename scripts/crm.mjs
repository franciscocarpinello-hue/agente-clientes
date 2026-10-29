// CRM por línea de comandos sobre data/leads.json.
//   node scripts/crm.mjs resumen
//   node scripts/crm.mjs buscar <texto>                      (por nombre, email, instagram o teléfono)
//   node scripts/crm.mjs enviado <id> <canal> [hiloGmail]     (canal: email | whatsapp | instagram)
//   node scripts/crm.mjs seguimiento <id> <1|2>
//   node scripts/crm.mjs marcar <id> <estado> [nota]
//   node scripts/crm.mjs set <id> <campo> <valor>
//   node scripts/crm.mjs charla <id> <cliente|agente|francisco> <resumen>
//   node scripts/crm.mjs lista-hecha <fecha> [números salteados, ej: 3,7]
//   node scripts/crm.mjs csv
import { readFileSync, writeFileSync } from 'node:fs';
import { cargarLeads, guardarLeads, marcar, hoy, ruta, ESTADOS } from './lib/db.mjs';

const [cmd, ...r] = process.argv.slice(2);
const leads = cargarLeads();
const lead = (id) => leads[id] || (() => { console.error(`No existe el lead ${id}`); process.exit(1); })();
const ok = (x) => { guardarLeads(leads); console.log(JSON.stringify(x, null, 2)); };
const norm = (t = '') => String(t).toLowerCase().replace(/[^a-z0-9@.]/g, '');

switch (cmd) {
  case 'resumen': {
    const cuenta = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
    for (const l of Object.values(leads)) cuenta[l.estado]++;
    const contactados = Object.values(leads).filter((l) => l.canal);
    const porCanal = {};
    for (const l of contactados) {
      porCanal[l.canal] ||= { contactados: 0, respondieron: 0, agendaron: 0 };
      porCanal[l.canal].contactados++;
      if (l.historial.some((h) => h.estado === 'respondio')) porCanal[l.canal].respondieron++;
      if (l.historial.some((h) => h.estado === 'agendado')) porCanal[l.canal].agendaron++;
    }
    ok({ total: Object.keys(leads).length, por_estado: cuenta, por_canal: porCanal });
    break;
  }
  case 'buscar': {
    const q = norm(r.join(' '));
    const digitos = r.join('').replace(/\D/g, '');
    const hits = Object.values(leads).filter((l) =>
      norm(l.nombre).includes(q) || norm(l.email) === q || norm(l.instagram) === q.replace('@', '') ||
      (digitos.length >= 8 && (l.whatsapp || l.telefono || '').replace(/\D/g, '').endsWith(digitos.slice(-8))));
    console.log(JSON.stringify(hits.map(({ id, nombre, ciudad, estado, email, whatsapp, instagram, canal, maqueta }) =>
      ({ id, nombre, ciudad, estado, email, whatsapp, instagram, canal, maqueta })), null, 2));
    break;
  }
  case 'enviado': {
    const [id, canal, hilo] = r;
    const l = lead(id);
    l.canal = canal;
    if (hilo) l.hilo_gmail = hilo;
    marcar(l, 'contactado', `Primer mensaje por ${canal}`);
    ok({ id, estado: l.estado });
    break;
  }
  case 'seguimiento': {
    const [id, n] = r;
    ok({ id, estado: marcar(lead(id), `seguimiento${n}`, `Seguimiento ${n} por email`).estado });
    break;
  }
  case 'marcar': {
    const [id, estado, ...nota] = r;
    ok({ id, estado: marcar(lead(id), estado, nota.join(' ')).estado });
    break;
  }
  case 'set': {
    const [id, campo, ...valor] = r;
    lead(id)[campo] = valor.join(' ');
    ok({ id, [campo]: lead(id)[campo] });
    break;
  }
  case 'charla': {
    const [id, de, ...resumen] = r;
    (lead(id).conversacion ||= []).push({ fecha: hoy(), de, resumen: resumen.join(' ') });
    ok({ id, mensajes: lead(id).conversacion.length });
    break;
  }
  case 'lista-hecha': {
    const [fecha, saltear = ''] = r;
    const plan = JSON.parse(readFileSync(ruta('salida', fecha, 'plan.json'), 'utf8'));
    const fuera = new Set(saltear.split(',').filter(Boolean).map(Number));
    const items = [...plan.whatsapp.map((x) => [x, 'whatsapp']), ...plan.instagram.map((x) => [x, 'instagram'])];
    const marcados = [];
    items.forEach(([x, canal], i) => {
      if (fuera.has(i + 1) || leads[x.id]?.estado !== 'auditado') return;
      leads[x.id].canal = canal;
      marcar(leads[x.id], 'contactado', `Primer mensaje por ${canal} (lo mandó Francisco)`);
      marcados.push(x.nombre);
    });
    ok({ marcados: marcados.length, salteados: [...fuera] });
    break;
  }
  case 'csv': {
    const cols = ['puntaje', 'estado', 'nombre', 'rubro', 'ciudad', 'estrellas', 'resenas', 'telefono', 'whatsapp', 'email', 'instagram', 'web', 'defecto_principal', 'gravedad', 'canal', 'maqueta', 'maps', 'actualizado'];
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = Object.values(leads).sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0)).map((l) => cols.map((c) => celda(l[c])).join(';'));
    writeFileSync(ruta('salida', 'leads.csv'), '﻿' + [cols.join(';'), ...filas].join('\r\n'));
    console.log(`salida/leads.csv (${filas.length} filas)`);
    break;
  }
  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 11).join('\n'));
}
