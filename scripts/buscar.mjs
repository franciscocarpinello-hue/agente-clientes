// Busca negocios en Google Maps por rubro y zona, filtra y guarda los nuevos en data/leads.json.
// Uso: node scripts/buscar.mjs [--rubro odontologia] [--max 60]
// Retoma donde quedó: cada (zona, consulta) hecha queda anotada en data/estado.json.
import { perfil, cargarLeads, guardarLeads, cargarEstado, guardarEstado, consumir, consumoHoy, hoy, marcar, args } from './lib/db.mjs';
import { buscarTexto } from './lib/places.mjs';

const p = perfil();
const a = args();
const rubros = a.rubro ? [a.rubro] : p.rubros_activos;
const tope = Number(a.max ?? p.limites_diarios.busquedas_maps);

const leads = cargarLeads();
const estado = cargarEstado();
const { estrellas_min, resenas_min, max_sucursales } = p.filtro;

const normalizarNombre = (n) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(dr|dra|consultorio|clinica|centro|odontologico|odontologia|sucursal)\b\.?/g, '')
  .replace(/[^a-z0-9]/g, '');

const soloDigitos = (t = '') => t.replace(/\D/g, '');

// En Argentina, Maps escribe los celulares como +54 9 ...; esos se pueden abrir en WhatsApp.
function whatsappDesdeTelefono(internacional, mercado) {
  if (!internacional) return null;
  const d = soloDigitos(internacional);
  if (mercado === 'AR') return d.startsWith('549') ? d : null;
  return null;
}

function ciudadDe(place) {
  const c = place.addressComponents || [];
  const busca = (t) => c.find((x) => x.types?.includes(t))?.longText;
  return busca('locality') || busca('administrative_area_level_2') || busca('administrative_area_level_1') || '';
}

let usadas = consumoHoy(estado, 'maps');
let nuevos = 0, filtrados = 0;
const vistosTel = new Set(Object.values(leads).map((l) => soloDigitos(l.telefono)).filter(Boolean));
const vistosWeb = new Set(Object.values(leads).map((l) => l.web?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')).filter(Boolean));

fuera:
for (const rubroId of rubros) {
  const rubro = p.rubros[rubroId];
  if (!rubro) { console.error(`Rubro desconocido: ${rubroId}`); continue; }
  const mercado = p.mercados[rubro.mercado];
  estado.progreso[rubroId] ||= {};

  for (const zona of rubro.zonas) {
    for (const consulta of rubro.consultas) {
      const clave = `${zona}|${consulta}`;
      if (estado.progreso[rubroId][clave]) continue;

      let pageToken, paginas = 0;
      do {
        if (usadas >= tope) { console.log(`Tope diario de ${tope} consultas a Maps alcanzado.`); break fuera; }
        const r = await buscarTexto({
          consulta: `${consulta} en ${zona}, ${mercado.pais}`,
          region: mercado.region,
          idioma: mercado.idioma,
          pageToken
        });
        usadas = consumir(estado, 'maps');
        paginas++;

        for (const pl of r.places || []) {
          if (leads[pl.id]) continue;
          const web = pl.websiteUri || null;
          const webNorm = web?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
          const tel = soloDigitos(pl.internationalPhoneNumber);
          // Un mismo negocio con dos pines (mismo teléfono o misma web) cuenta una sola vez.
          if ((tel && vistosTel.has(tel)) || (webNorm && vistosWeb.has(webNorm))) continue;

          const ok = pl.businessStatus === 'OPERATIONAL'
            && (pl.rating ?? 0) >= estrellas_min
            && (pl.userRatingCount ?? 0) >= resenas_min;
          if (!ok) { filtrados++; continue; }

          const lead = {
            id: pl.id,
            nombre: pl.displayName?.text,
            rubro: rubroId,
            mercado: rubro.mercado,
            idioma: mercado.idioma,
            ciudad: ciudadDe(pl) || zona,
            zona,
            direccion: pl.formattedAddress,
            estrellas: pl.rating,
            resenas: pl.userRatingCount,
            web,
            telefono: pl.internationalPhoneNumber || pl.nationalPhoneNumber || null,
            whatsapp: whatsappDesdeTelefono(pl.internationalPhoneNumber, rubro.mercado),
            maps: pl.googleMapsUri,
            tipo: pl.primaryTypeDisplayName?.text,
            encontrado: hoy()
          };
          marcar(lead, 'nuevo', `Maps: "${consulta}" en ${zona}`);
          leads[pl.id] = lead;
          if (tel) vistosTel.add(tel);
          if (webNorm) vistosWeb.add(webNorm);
          nuevos++;
        }
        pageToken = r.nextPageToken;
      } while (pageToken && paginas < 3);

      if (usadas < tope || !pageToken) estado.progreso[rubroId][clave] = hoy();
    }
  }
}

// Cadenas: si la misma marca aparece en más sucursales que el tope, se descartan todas.
const porMarca = {};
for (const l of Object.values(leads)) (porMarca[normalizarNombre(l.nombre || '')] ||= []).push(l);
for (const grupo of Object.values(porMarca)) {
  if (grupo.length > max_sucursales) {
    for (const l of grupo) if (l.estado === 'nuevo') marcar(l, 'descartado', `Cadena con ${grupo.length} sucursales`);
  }
}

guardarLeads(leads);
guardarEstado(estado);
console.log(JSON.stringify({ nuevos, filtrados_por_resenas_o_cerrados: filtrados, consultas_maps_hoy: usadas }, null, 2));
