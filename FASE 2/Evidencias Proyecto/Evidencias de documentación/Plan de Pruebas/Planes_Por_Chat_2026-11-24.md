# Planes enviados por el chat (24-11-2026)

Pedido del **Product Owner** (Rodrigo Cárcamo Rojas) del 24-11-2026: que el profesional, por ejemplo un nutricionista, pueda enviar la alimentación de un día o de una semana, y que la persona la guarde con un botón. El profesional también puede enviar un plan de macronutrientes. Es el bloque 6 de las mejoras de ese día.

- Solicitud de cambio: **SC-46**.
- Casos de prueba: **CP-277 a CP-280**.
- Documento de Arquitectura: versión **1.41** (D47 y columnas nuevas de `mensajes_chat`).
- Migración: `20261124160000_planes_por_chat` (aplicada en la base local).
- Rama: `feat/planes-por-chat` (sobre `feat/compartir-progreso`, PR #89).

## Reglas

- **Quién envía:** cualquier profesional que tenga un chat con la persona, el mismo que se crea al tener una cita. La persona no envía planes.
- **Qué se envía:**
  - **Plan de comidas** de un día (se repite) o de una semana, con alimentos del catálogo en gramos y notas, igual que los que arma la persona (SC-44).
  - **Plan de macronutrientes:** nombre (hasta 40 caracteres) y porcentajes enteros de 5 a 80 que suman 100 %. Las calorías salen del perfil de la persona.
- **Cómo llega:** como un mensaje del chat con el plan adjunto. El texto es el mensaje del profesional o, si no escribe nada, «Te envié un plan de…: «nombre»».
- **La persona decide:** guarda el plan con «Guardar en mis planes», y solo una vez. Una pulsación doble no crea dos copias.
  - Si no se puede guardar (por ejemplo, ya tiene 10 planes de comidas), se explica por qué y el plan sigue disponible para guardarlo después.
  - El plan de comidas queda con origen «profesional».
  - El de macronutrientes queda como plan personalizado; si el nombre ya existe, se guarda como «Nombre (2)».
- **Copia fiel:** el chat muestra el plan tal como se envió. Al guardarlo se vuelve a validar contra el catálogo vigente.
- **Mi cuenta (SC-42):** la descarga incluye los planes recibidos y cuándo se guardaron. Eliminar la cuenta borra los chats, y con ellos los planes recibidos.

## Rutas

| Quién | Ruta | Qué hace |
|---|---|---|
| Profesional | `POST /api/chats/:id/planes` | `{ tipo: 'comidas' \| 'macros', plan, texto? }`. Plan inválido: 400. La persona: 403. Otro profesional: 404. |
| Persona | `POST /api/chats/:id/mensajes/:mensajeId/guardar` | Lo guarda en sus planes y responde a qué pestaña ir. Ya guardado: 409. |
| Profesional | `GET /api/profesional/alimentos?q=` | Búsqueda en el catálogo de alimentos para armar el plan. |

## Interfaz

- **Chat (profesional):**
  - Botón «Enviar un plan» (ícono de capas) en la cabecera.
  - El diálogo ofrece «Plan de comidas» o «Plan de macronutrientes».
  - El primero abre el editor de planes de comidas, sin tarjeta ni título repetidos.
  - El segundo pide el nombre, los tres porcentajes (avisa cuánto suman) y un mensaje opcional.
  - En la tarjeta del plan enviado ve «Aún no lo guarda» o «{cliente} lo guardó en sus planes».
- **Chat (persona):**
  - Tarjeta con el tipo de plan y su nombre, las calorías y la nota (o el reparto de macronutrientes), «Ver el detalle» y «Guardar en mis planes».
  - Ya guardado, muestra «Guardado en tus planes · Ver en Plan de comidas» o «Ver en Plan de macronutrientes», que abre esa pestaña de Comidas (`/comidas?seccion=…`).
- Todo usa los tokens del tema, para verse bien también en modo oscuro.

## Casos de prueba

| Caso | Qué se comprueba | Resultado |
|---|---|---|
| CP-277 | Envío de planes de comidas y de macronutrientes; validación; quién puede enviar | Aprobado |
| CP-278 | Guardar una sola vez, pulsación doble, nombre repetido, límite de 10 y quién puede guardar | Aprobado |
| CP-279 | Tarjeta del plan recibido, detalle, guardar, enlace y vista del profesional | Aprobado |
| CP-280 | Diálogo del profesional: suma de 100 % y editor con el catálogo | Aprobado |

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 695/695 (`planesChat.api.test.js` 2) |
| `npm run test:mysql:planes-chat` | 17/17 (también en la CI) |
| Frontend `npm test` | 538/538 (`PlanesPorChat.test.jsx` 5) |
| Lint y build | Sin errores |

**Nota:** en una corrida completa del frontend falló una vez una prueba de la despedida (foco con Tab, `Despedida`), ajena a este bloque. Sola pasó 3 de 3 veces y la corrida siguiente salió 538/538. Es una prueba inestable bajo carga, que queda anotada para revisarla.
