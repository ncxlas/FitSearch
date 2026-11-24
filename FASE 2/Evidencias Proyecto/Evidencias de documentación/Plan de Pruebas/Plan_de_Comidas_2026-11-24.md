# Plan de comidas y «Plan de macronutrientes» (24-11-2026)

Cambio pedido por el Product Owner (Rodrigo Cárcamo Rojas) el 24-11-2026, bloque 4 de las mejoras de ese día: «crear un apartado en comidas que sea tipo plan de comidas, y el que dice plan de comida actual, cambiarlo a plan de macronutrientes».

- Solicitud de cambio: **SC-44**.
- Casos de prueba: **CP-268 a CP-272**.
- Documento de Arquitectura: versión **1.39** (D45; tablas `planes_comida` y `plan_comida_items`).
- Migraciones: `20261124140000_planes_comida` y `20261124141000_restricciones_planes` (aplicadas en la base local).
- Rama: `feat/plan-de-comidas` (sobre `feat/historial-de-peso`, PR #87).

## Decisiones del PO (24-11-2026)

- Los planes se arman con alimentos del catálogo y sus gramos, para que las calorías y los macros salgan solos, más una nota libre por comida.
- Un plan guardado aparece en el Resumen como «Hoy te toca…» con un botón «Lo comí», que lo registra en el día **solo al confirmarlo**, con los gramos ajustables.
- La persona también puede crear sus propios planes de comidas; los que envíe un profesional (bloque 6) usan el mismo editor.
- La pestaña «Plan de alimentación» pasa a llamarse **«Plan de macronutrientes»**.

## Cómo funciona

| Acción | Ruta | Qué hace |
|---|---|---|
| Listar | `GET /api/comidas/planes-comida` | Los planes con sus días y momentos, el aporte de cada línea, los totales, el promedio de calorías por día y el día de hoy. |
| Crear | `POST /api/comidas/planes-comida` | `{ nombre, tipo, nota?, items, usar? }`. Hasta 10 planes (409 al pasarse). Con `usar`, queda en uso y los demás no. |
| Editar | `PUT /api/comidas/planes-comida/:id` | Reemplaza nombre, tipo, nota y líneas. |
| Eliminar | `DELETE /api/comidas/planes-comida/:id` | Solo los propios (otro: 404). |
| Usar o dejar de usar | `PUT /api/comidas/planes-comida/:id/uso` | `{ enUso }`. Uno en uso a la vez. |
| «Lo comí» | `POST /api/comidas/planes-comida/:id/registrar` | `{ fecha?, momento, items: [{ alimentoId, gramos }] }`. Registra en `registro_comida` con origen «plan»; todo o nada. |

**Validación** (`planComida.service.normalizarPlan`, que también usará el profesional en el bloque 6):

- El nombre tiene hasta 80 caracteres, el tipo es `dia` o `semana` y la nota general hasta 300.
- Cada línea tiene un día válido para el tipo (0, o 1 a 7) y un momento del día.
- Cada línea lleva un alimento activo del catálogo con 1 a 2.000 gramos, o una nota de hasta 200 caracteres.
- Se admiten hasta 12 líneas por comida y 200 por plan.
- Los errores de todas las líneas vuelven juntos.

**Base de datos:** se agregaron restricciones CHECK de tipo, origen, día, momento y línea. Además, el origen de `registro_comida` ahora acepta «plan». La prueba con MySQL real encontró que la restricción anterior solo admitía «manual» y «asistente»; se corrigió con la migración `20261124141000_restricciones_planes`. En esa misma migración entró la restricción del peso de `registros_peso` (20 a 350 kg, SC-43).

## Interfaz

- **Comidas** tiene cinco pestañas: Resumen, Comidas, Plan de comidas, Plan de macronutrientes y Estadísticas.
- **Plan de comidas:**
  - Muestra la lista de planes (con el contador «N de 10») y los chips «En uso», «Un día» o «Semana», las kcal aproximadas al día y, si corresponde, «De {profesional} ({especialidad})».
  - Cada plan tiene las acciones «Usar este plan» o «Dejar de usar», «Ver comidas», «Editar» y «Eliminar», esta última con confirmación.
  - Sin planes, la pestaña invita a crear uno o a pedírselo al nutricionista por el chat.
- **Editor:**
  - Pide el nombre y si el plan es para «Un día (se repite)» o «Una semana».
  - En los planes semanales hay botones de Lun a Dom; un punto marca los días que tienen comidas, y se puede copiar el día elegido a toda la semana.
  - Cada momento del día es un grupo donde se agregan alimentos (buscador del catálogo con kcal por 100 g) o notas.
  - Cada línea tiene sus gramos, sus kcal y un botón para quitarla.
  - Abajo van los totales del día, la nota general y «Usar este plan desde hoy».
- **Hoy te toca…** (Resumen):
  - Muestra las comidas del plan en uso para el día que se está viendo, con un enlace al plan.
  - «Lo comí» abre un diálogo («¿Qué comiste en tu almuerzo?») con casillas, los gramos editables y la suma de kcal.
  - Sin un plan en uso, la tarjeta no aparece.
- En la lista de comidas del día, lo registrado desde el plan lleva la etiqueta «Del plan».
- Todo usa los tokens del tema, para verse bien también en modo oscuro.

## Casos de prueba

| Caso | Qué se comprueba | Resultado |
|---|---|---|
| CP-268 | API: listar, crear con «usar», editar, uso, borrar; validación; plan ajeno 404; más de 10 planes 409; profesional 403 | Aprobado |
| CP-269 | MySQL real: «Lo comí» registra con origen «plan» y los gramos confirmados; lo inválido no registra nada | Aprobado |
| CP-270 | Editor de un día: búsqueda, gramos con calorías, nota, guardar con «usar»; avisos sin nombre o sin líneas | Aprobado |
| CP-271 | Plan semanal con copia a toda la semana; lista con ver, usar, editar y eliminar; plan de un profesional | Aprobado |
| CP-272 | «Hoy te toca…» y «Lo comí» con alimentos desmarcados y gramos ajustados; sin plan en uso no aparece | Aprobado |

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 691/691 (`planComida.service.test.js` 11, `planesComida.api.test.js` 3) |
| `npm run test:mysql:planes-comida` | 12/12 (también en la CI); `test:mysql:cuenta` comprueba que eliminar la cuenta borra los planes |
| Frontend `npm test` | 529/529 (`PlanesComidas.test.jsx` 6; `Comidas.test.jsx` con las pestañas nuevas) |
| Lint y build | Sin errores |
