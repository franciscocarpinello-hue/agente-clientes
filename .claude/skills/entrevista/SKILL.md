---
name: entrevista
description: Entrevista a Francisco para configurar el agente (qué clientes quiere, rubros, zonas, cuánto cobra, límites, horarios) y guarda las respuestas en config/perfil.json. Usala la primera vez, cuando diga "/entrevista" o cuando quiera cambiar rubro, precio o zonas.
---

# Entrevista de configuración

Leé `config/perfil.json`. Hacé las preguntas **de a una**, mostrando entre paréntesis lo que ya está guardado para que pueda responder "igual". Español rioplatense, corto.

1. **¿Qué clientes querés?** (`clientes_ideales`)
2. **¿Qué rubro trabajamos ahora?** Si es nuevo, armá la entrada en `rubros`: `nombre`, `mercado` (AR o US), 3 a 5 `consultas` como las escribiría un cliente en Google Maps, `cliente` (paciente, cliente, homeowner), `accion` (pedir turno, pedir presupuesto), 6 `servicios` típicos y una `paleta` que quede bien para ese rubro. Mostrale todo y pedí OK.
3. **¿En qué zonas?** Proponé una lista ordenada de más a menos poblada (barrios de ciudades grandes por separado: Maps devuelve hasta 60 resultados por búsqueda). Guardala en `rubros.<id>.zonas`.
4. **¿Cuánto cobrás?** Precio de la web + mantenimiento por mes, por mercado (`mercados.<AR|US>.precio`).
5. **¿El agente puede decir el precio por escrito o solo en la llamada?** (`precio_por_escrito`)
6. **¿Qué filtro de calidad?** Estrellas y reseñas mínimas (`filtro`).
7. **¿Cuántos contactos por día?** Emails, WhatsApp, Instagram (`limites_diarios`). Advertí: más de 10 emails por día desde un Gmail personal arriesga que caigan en spam; con dominio propio se puede subir a 30.
8. **¿Qué días y horarios tenés para llamadas?** Guardalo en `horario_llamadas` y actualizá la disponibilidad del evento en Calendly si cambió.
9. **¿Cómo te presentás?** (`presentacion.es` y `presentacion.en`)

Al terminar: mostrá un resumen de 6 líneas con lo que quedó, poné el rubro elegido en `rubros_activos`, validá que el JSON sea válido (`node -e "JSON.parse(require('fs').readFileSync('config/perfil.json'))"`), y hacé commit y push con el mensaje "Configuración: <qué cambió>".
