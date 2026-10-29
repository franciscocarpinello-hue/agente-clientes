---
name: rutina-diaria
description: Corre la rutina diaria del agente de clientes (llamadas nuevas, respuestas, seguimientos, búsqueda, maquetas, contactos y avisos). Usala cuando la tarea programada diaria arranque o cuando Francisco diga "corré la rutina".
---

# Rutina diaria

Leé `CLAUDE.md` y `config/perfil.json` antes de empezar. Hacé los pasos **en este orden** (lo más urgente primero, por si la corrida se corta). Después de cada paso que cambie datos, guardá con los scripts; al final, commit y push.

## 1. Llamadas nuevas en Calendly

1. `users-get_current_user` → URI del usuario.
2. `meetings-list_events` con `min_start_time` = ahora y `status=active`. Para cada evento, `meetings-list_event_invitees` → email, nombre y respuestas del formulario.
3. Buscá el lead: `node scripts/crm.mjs buscar <email del invitado>` (si no aparece, probá con el dominio del email o el nombre del negocio que escribió).
4. Si el lead **no** está ya en `agendado`:
   - `node scripts/crm.mjs marcar <id> agendado "Llamada <fecha y hora>"`.
   - Mandale a Francisco el aviso **📞 Llamada agendada** (función `avisoLlamada` de `plantillas/mensajes.mjs`, con la hora en hora Argentina, el link de la reunión y el precio del mercado del lead). Este aviso se manda **siempre**, también en `modo_prueba`.
5. Si reservó alguien que no está en el CRM, avisale igual con los datos que haya.
6. Eventos ya pasados con lead en `agendado` → `marcar <id> llamada_hecha`.

## 2. Respuestas de clientes

1. En Gmail, `search_threads` con `in:inbox newer_than:3d -from:me` y quedate con los hilos de emails que estén en el CRM (buscalos con `crm.mjs buscar <email>`).
2. Para cada respuesta nueva (que no esté ya en `conversacion`), clasificala y respondé según `plantillas/respuestas.md`. Registrá con `crm.mjs charla <id> cliente "<resumen en una línea>"` y `crm.mjs charla <id> agente "<lo que respondiste>"`.
3. Respondé en el mismo hilo (`reply`). En `modo_prueba`, creá el borrador (`create_draft` en ese hilo) en lugar de enviar.
4. Si Francisco respondió el mail de la lista del día con "listo" (o "listo menos 3 y 7"): `node scripts/crm.mjs lista-hecha <fecha de esa lista> 3,7`.
5. Si Francisco escribió "cerrado <negocio>" o "pagó <negocio>", seguí la sección "Después de la llamada" de `respuestas.md`.

## 3. Buscar y auditar

```
node scripts/buscar.mjs
node scripts/auditar.mjs
```

Si `buscar.mjs` sale por falta de `GOOGLE_PLACES_API_KEY` o error de cupo, seguí con el resto con los leads que ya hay y mencionalo en el resumen.

## 4. Maquetas

1. `node scripts/maqueta.mjs --mejores <limites_diarios.maquetas>`.
2. Para cada maqueta, publicá la carpeta `maquetas/<slug>/` en Netlify como un sitio nuevo llamado `<maqueta_sitio>` (si el nombre está ocupado, agregá `-2`). Usá el conector de Netlify.
3. Abrí la URL publicada para chequear que carga y guardala: `node scripts/crm.mjs set <id> maqueta https://<sitio>.netlify.app`.
4. Si Netlify falla, seguí sin maqueta: los mensajes funcionan igual.

## 5. Contactar

1. `node scripts/plan.mjs` y leé `salida/<fecha>/plan.json`.
2. **Emails nuevos** (`emails`): por cada uno, `send_message` (o `create_draft` en `modo_prueba`) con `asunto` y `cuerpo` tal cual, en texto plano. Después `node scripts/crm.mjs enviado <id> email <threadId>`. En `modo_prueba` también se marca como enviado, con la nota "borrador".
3. **Seguimientos** (`seguimientos`): respondé en el hilo `hilo` del lead con el `cuerpo`. Después `node scripts/crm.mjs seguimiento <id> <1|2>`. Si el cliente ya respondió en ese hilo, **no** mandes el seguimiento: pasalo a `respondio`.
4. **WhatsApp e Instagram**: no se mandan. Si `lista-del-dia.txt` tiene algo, mandáselo a Francisco con el asunto "Tu lista de hoy: N mensajes para mandar".

## 6. Cierre

1. `node scripts/crm.mjs csv`.
2. Si es lunes, mandale a Francisco el resumen semanal: cuántos negocios se encontraron, contactaron, respondieron y agendaron, por canal, en 5 líneas.
3. En `modo_prueba`, mandale un resumen de los borradores creados hoy para que los revise ("Revisá los borradores en Gmail. Si te gustan, decime 'activá el agente'").
4. `git add -A && git commit -m "Corrida <fecha>" && git push`.

Si Francisco dice **"activá el agente"**, cambiá `modo_prueba` a `false` en `config/perfil.json`, commit y push.
