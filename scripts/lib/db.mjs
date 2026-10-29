// Estado del agente en archivos JSON dentro del repo (se commitean después de cada corrida).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ruta = (...p) => join(RAIZ, ...p);

export const ESTADOS = [
  'nuevo',        // salió de Maps, sin auditar
  'descartado',   // web buena, cadena, cerrado o sin forma de contacto
  'auditado',     // tiene defecto: listo para contactar
  'contactado',   // primer mensaje enviado
  'seguimiento1',
  'seguimiento2',
  'respondio',    // contestó, la conversación sigue
  'agendado',     // reservó llamada en Calendly
  'llamada_hecha',
  'propuesta',    // se mandó precio cerrado + link de pago
  'ganado',
  'perdido',      // dijo que no o no respondió después del último seguimiento
  'baja'          // pidió que no le escriban más: nunca volver a contactar
];

function leerJSON(archivo, porDefecto) {
  if (!existsSync(archivo)) return porDefecto;
  return JSON.parse(readFileSync(archivo, 'utf8'));
}

function escribirJSON(archivo, datos) {
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(archivo, JSON.stringify(datos, null, 2) + '\n');
}

export const perfil = () => leerJSON(ruta('config', 'perfil.json'), null);

export const cargarLeads = () => leerJSON(ruta('data', 'leads.json'), {});
export const guardarLeads = (leads) => escribirJSON(ruta('data', 'leads.json'), leads);

export const cargarEstado = () =>
  leerJSON(ruta('data', 'estado.json'), { progreso: {}, consumo: {}, ultima_corrida: null });
export const guardarEstado = (e) => escribirJSON(ruta('data', 'estado.json'), e);

export const hoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export function diasDesde(fechaISO) {
  if (!fechaISO) return Infinity;
  return Math.floor((Date.parse(hoy()) - Date.parse(fechaISO.slice(0, 10))) / 864e5);
}

// Cambia el estado de un lead y deja registro en su historial.
export function marcar(lead, estado, nota = '') {
  if (!ESTADOS.includes(estado)) throw new Error(`Estado desconocido: ${estado}`);
  lead.estado = estado;
  lead.actualizado = hoy();
  (lead.historial ||= []).push({ fecha: hoy(), estado, ...(nota ? { nota } : {}) });
  return lead;
}

export function slug(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 40);
}

// Lleva la cuenta de consultas pagas por día para respetar los topes de perfil.json.
export function consumir(estado, clave, n = 1) {
  const dia = hoy();
  estado.consumo[dia] ||= {};
  estado.consumo[dia][clave] = (estado.consumo[dia][clave] || 0) + n;
  return estado.consumo[dia][clave];
}

export const consumoHoy = (estado, clave) => estado.consumo[hoy()]?.[clave] || 0;

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else out._.push(a);
  }
  return out;
}
