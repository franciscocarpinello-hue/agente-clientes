# Agente de clientes

Un agente de Claude que trabaja solo todos los días para conseguirle llamadas de venta a Francisco Carpinello:

1. **Busca** negocios en Google Maps por rubro y zona (4★ o más, 10 reseñas o más).
2. **Audita** su web desde el punto de vista de un celular y anota el defecto principal con la prueba.
3. **Arma una maqueta** de la portada con su nombre, sus reseñas y sus fotos de Google, y la publica en Netlify.
4. **Contacta**: email automático (10 por día) y una lista de WhatsApp e Instagram para que Francisco mande a un toque.
5. **Hace el seguimiento** a los 3 y 7 días y responde las preguntas.
6. **Avisa a Francisco solo cuando hay una llamada reservada** en Calendly, con todo el resumen del negocio.

## Cómo se usa

| Querés | Decile al agente |
| --- | --- |
| Cambiar rubro, zonas, precios o límites | `/entrevista` |
| Correr la rutina ahora | "corré la rutina" |
| Que empiece a mandar de verdad (sale de modo prueba) | "activá el agente" |
| Ver cómo viene | "resumen" |
| Avisar que cerraste una venta | "cerrado <negocio>" |

## Requisitos

- Entorno en la nube con **Network access: Full** y la variable `GOOGLE_PLACES_API_KEY`.
- Conectores: Gmail, Google Calendar, Calendly y Netlify.
- Tarea programada diaria que corre la skill `rutina-diaria`.

El detalle para el agente está en [`CLAUDE.md`](CLAUDE.md).
