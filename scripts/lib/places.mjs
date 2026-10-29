// Cliente mínimo de Google Places API (New). Necesita GOOGLE_PLACES_API_KEY en el entorno.
const BASE = 'https://places.googleapis.com/v1';

function clave() {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) {
    console.error('Falta GOOGLE_PLACES_API_KEY. Cargala como variable del entorno en la nube (no en el chat).');
    process.exit(2);
  }
  return k;
}

async function pedir(url, opciones = {}, intentos = 2) {
  for (let i = 0; i <= intentos; i++) {
    const r = await fetch(url, opciones);
    if (r.ok) return r.json();
    const cuerpo = await r.text();
    if (r.status === 429 || r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 2000 * (i + 1)));
      continue;
    }
    throw new Error(`Places ${r.status}: ${cuerpo.slice(0, 300)}`);
  }
  throw new Error('Places: sin respuesta después de reintentar (cupo o caída).');
}

// Campos baratos para la búsqueda; las reseñas y fotos se piden después solo para los elegidos.
const CAMPOS_BUSQUEDA = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents',
  'places.rating', 'places.userRatingCount', 'places.websiteUri', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.businessStatus', 'places.googleMapsUri',
  'places.primaryTypeDisplayName', 'nextPageToken'
].join(',');

export async function buscarTexto({ consulta, region, idioma, pageToken }) {
  return pedir(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': clave(),
      'X-Goog-FieldMask': CAMPOS_BUSQUEDA
    },
    body: JSON.stringify({
      textQuery: consulta,
      regionCode: region,
      languageCode: idioma,
      pageSize: 20,
      ...(pageToken ? { pageToken } : {})
    })
  });
}

const CAMPOS_DETALLE = ['reviews', 'photos', 'regularOpeningHours', 'editorialSummary'].join(',');

export async function detalle(id, idioma) {
  return pedir(`${BASE}/places/${id}?languageCode=${idioma}`, {
    headers: { 'X-Goog-Api-Key': clave(), 'X-Goog-FieldMask': CAMPOS_DETALLE }
  });
}

// Devuelve una URL pública de la foto (googleusercontent) para usar en la maqueta.
export async function urlFoto(nombreFoto, ancho = 1400) {
  const r = await pedir(
    `${BASE}/${nombreFoto}/media?maxWidthPx=${ancho}&skipHttpRedirect=true&key=${clave()}`
  );
  return r.photoUri;
}
