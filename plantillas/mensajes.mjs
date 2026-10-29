// Textos de contacto. Reglas: corto, su nombre, UN problema concreto, la maqueta ya hecha, sin precio, sin presión.
// Cada función recibe { lead, perfil, rubro, maqueta } y devuelve { asunto?, cuerpo }.

const minus = (t = '') => t.charAt(0).toLowerCase() + t.slice(1);
const estrellas = (n) => String(n ?? '').replace('.', ',');

const sinWeb = (lead) => lead.defectos?.[0]?.clave === 'sin_web';
const CONSECUENCIA = {
  es: (r, lead) => sinWeb(lead)
    ? `Hoy esos ${r.cliente}s terminan yendo a quien sí aparece con web.`
    : `Cada paso de más es un ${r.cliente} que termina yendo a otro lado.`,
  en: (r, lead) => sinWeb(lead)
    ? `Right now those ${r.cliente}s end up calling whoever does have one.`
    : `Every extra step is a ${r.cliente} who ends up calling someone else.`
};

function segundoDato(lead, idioma) {
  const otro = lead.defectos?.[1]?.texto;
  if (otro) return idioma === 'es' ? `Otro detalle que vi: ${minus(otro)}.` : `One more thing I noticed: ${minus(otro)}.`;
  return idioma === 'es'
    ? 'Un dato de Google: si una web pasa de 1 a 3 segundos de carga, la probabilidad de que la gente se vaya sube 32%.'
    : 'A Google stat: when load time goes from 1 to 3 seconds, the chance a visitor leaves goes up 32%.';
}

const firmaEmail = {
  es: (p) => `Saludos,\n${p.nombre}\n\n—\nSi no quieren que les vuelva a escribir, respondan "no" y listo.`,
  en: (p) => `Best,\n${p.nombre}\n\n—\nIf you'd rather not hear from me again, just reply "no".`
};

export const email = {
  primero({ lead, perfil, rubro, maqueta }) {
    const es = lead.idioma === 'es';
    const lineaMaqueta = maqueta
      ? (es ? `\n\nMe tomé un rato y armé cómo podría verse la portada de ustedes:\n${maqueta}` : `\n\nI took some time and mocked up what your homepage could look like:\n${maqueta}`)
      : '';
    return es ? {
      asunto: `Una idea para la web de ${lead.nombre}`,
      cuerpo:
`Hola, ¿cómo están?

Vi ${lead.nombre} en Google: ${estrellas(lead.estrellas)} estrellas con ${lead.resenas} reseñas. Se nota que los recomiendan.

Entré a ${sinWeb(lead) ? 'buscarlos' : 'su web'} desde el celular, que es como los busca la gente, y me encontré con esto: ${minus(lead.defecto_principal)}. ${CONSECUENCIA.es(rubro, lead)}${lineaMaqueta}

Si les interesa verla terminada, reserven 20 minutos cuando les quede cómodo y se la muestro:
${perfil.calendly_url}

${firmaEmail.es(perfil)}`
    } : {
      asunto: `An idea for the ${lead.nombre} website`,
      cuerpo:
`Hi there,

I came across ${lead.nombre} on Google: ${lead.estrellas} stars from ${lead.resenas} reviews. Clearly your clients love your work.

I ${sinWeb(lead) ? 'looked you up' : 'checked your website'} on my phone, the way most people find you, and noticed this: ${minus(lead.defecto_principal)}. ${CONSECUENCIA.en(rubro, lead)}${lineaMaqueta}

If you'd like to see it finished, grab 20 minutes whenever it suits you and I'll walk you through it:
${perfil.calendly_url}

${firmaEmail.en(perfil)}`
    };
  },

  seguimiento1({ lead, perfil, maqueta }) {
    const es = lead.idioma === 'es';
    return es ? {
      cuerpo:
`Hola de nuevo. ${segundoDato(lead, 'es')}
${maqueta ? `\nLa maqueta sigue acá: ${maqueta}\n` : ''}
¿Les sirve que lo veamos en 20 minutos? ${perfil.calendly_url}

${firmaEmail.es(perfil)}`
    } : {
      cuerpo:
`Hi again. ${segundoDato(lead, 'en')}
${maqueta ? `\nThe mockup is still here: ${maqueta}\n` : ''}
Would 20 minutes to go over it help? ${perfil.calendly_url}

${firmaEmail.en(perfil)}`
    };
  },

  seguimiento2({ lead, perfil, maqueta }) {
    const es = lead.idioma === 'es';
    return es ? {
      cuerpo:
`Último mensaje, prometido. Si no es el momento, cero drama.
${maqueta ? `Si más adelante quieren la web, la maqueta queda en ${maqueta}` : 'Si más adelante quieren la web, me escriben por acá.'}

${firmaEmail.es(perfil)}`
    } : {
      cuerpo:
`Last note, I promise. If now isn't the right time, no worries at all.
${maqueta ? `If you want the website later on, the mockup stays at ${maqueta}` : 'If you want the website later on, just reply here.'}

${firmaEmail.en(perfil)}`
    };
  }
};

export function whatsapp({ lead, perfil, maqueta }) {
  return {
    cuerpo:
`Hola, ¿cómo están? Vi ${lead.nombre} en Google, ${estrellas(lead.estrellas)} estrellas con ${lead.resenas} reseñas, ¡muy bien!
Entré desde el celu y ${minus(lead.defecto_principal)}.${maqueta ? `\nLes armé cómo podría verse la portada: ${maqueta}` : ''}
Si les interesa, se la muestro en 20 minutos: ${perfil.calendly_url}
Saludos, ${perfil.nombre.split(' ')[0]}`
  };
}

export function instagram({ lead, perfil, maqueta }) {
  const es = lead.idioma === 'es';
  return {
    cuerpo: es
      ? `Hola! Vi sus reseñas en Google (${estrellas(lead.estrellas)}★, ${lead.resenas}), ¡qué trabajo! Les armé una idea de cómo podría verse su web${maqueta ? `: ${maqueta}` : ''}. Sin compromiso, si les sirve lo vemos en 20 min: ${perfil.calendly_url}`
      : `Hi! Saw your Google reviews (${lead.estrellas}★, ${lead.resenas}), great work! I mocked up an idea for your website${maqueta ? `: ${maqueta}` : ''}. No strings attached, happy to walk you through it in 20 min: ${perfil.calendly_url}`
  };
}

export const avisoLlamada = ({ lead, cita }) => ({
  asunto: `📞 Llamada agendada: ${lead.nombre} · ${cita.cuando}`,
  cuerpo:
`Tenés una llamada con ${cita.invitado || lead.nombre} el ${cita.cuando}.
${cita.link ? `Link: ${cita.link}\n` : ''}
NEGOCIO
${lead.nombre} · ${lead.tipo || lead.rubro} · ${lead.ciudad}
${lead.estrellas}★ con ${lead.resenas} reseñas · ${lead.maps}
Web: ${lead.web || 'no tiene'}
Teléfono: ${lead.telefono || '-'} · Email: ${lead.email || '-'} · Instagram: ${lead.instagram ? '@' + lead.instagram : '-'}

QUÉ LE DIJIMOS
Problema principal: ${lead.defecto_principal}
${(lead.defectos || []).slice(1).map((d) => `· ${d.texto}`).join('\n')}
Maqueta: ${lead.maqueta || 'no se armó'}

LA CONVERSACIÓN
${(lead.conversacion || []).map((m) => `${m.fecha} ${m.de}: ${m.resumen}`).join('\n') || 'Reservó directo desde el primer mensaje.'}
${cita.notas ? `\nLo que escribió al reservar: ${cita.notas}` : ''}

PARA LA LLAMADA
1. Preguntale qué le pasa hoy con ${lead.web ? 'la web' : 'no tener web'} y cómo le llegan los clientes.
2. Mostrale la maqueta y el problema principal.
3. Precio cerrado: ${cita.precio}.
4. Si dice que sí, decime "cerrado ${lead.nombre}" y le mando la propuesta con el link de pago.`
});
