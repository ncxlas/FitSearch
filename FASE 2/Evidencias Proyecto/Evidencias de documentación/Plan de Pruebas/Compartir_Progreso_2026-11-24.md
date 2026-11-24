# Compartir el progreso con un profesional (24-11-2026)

Idea propuesta el 24-11-2026 y **aceptada por el Product Owner** (Rodrigo Cárcamo Rojas), que dijo que ya la tenía pensada. Es el bloque 5 de las mejoras de ese día: la persona comparte con su profesional, por categoría y con consentimiento revocable, y queda un registro de cada consulta.

- Solicitud de cambio: **SC-45**.
- Casos de prueba: **CP-273 a CP-276**.
- Documento de Arquitectura: versión **1.40** (QS10, D46 y tablas `permisos_compartir` y `accesos_compartidos`).
- Migración: `20261124150000_compartir_progreso` (aplicada en la base local), con la restricción CHECK de las acciones.
- Rama: `feat/compartir-progreso` (sobre `feat/plan-de-comidas`, PR #88).

## Reglas

- **A quién:** solo se comparte con un profesional con el que la persona tiene un chat. El chat se crea al tener una cita.
- **Qué se comparte:**

  | Categoría | Qué incluye |
  |---|---|
  | Perfil y objetivos | Edad, sexo, estatura, peso, actividad, objetivo, comidas al día y horas de sueño |
  | Información de salud | Condiciones, medicamentos y alergias |
  | Comidas y agua | Los últimos 7 días, contra la meta diaria |
  | Peso | Pesajes de 90 días y meta de peso |
  | Planes | Plan de macronutrientes y plan de comidas en uso |

- **La salud es aparte:** es un dato sensible según la Ley 21.719, así que se marca por separado y el diálogo avisa que al marcarla se autoriza al profesional a verla.
- **El profesional solo mira:** no cambia nada.
- **La persona decide:** cambia las categorías o deja de compartir cuando quiere. Sin ninguna categoría, el permiso se borra.
- **Registro de accesos,** que solo ve la persona:
  - Guarda «empezaste a compartir», «cambiaste lo que compartes», «dejaste de compartir» y «miró tu progreso».
  - Las consultas se anotan como máximo una vez cada 30 minutos, para no llenar el registro al navegar entre pestañas.
- **Mi cuenta (SC-42):** la descarga incluye los permisos y el registro, y eliminar la cuenta los borra. Si se elimina una cuenta profesional, se borran los permisos que le dieron.

## Rutas

| Quién | Ruta | Qué hace |
|---|---|---|
| Persona | `GET /api/compartir` | Profesionales con chat, sus permisos, las categorías y los últimos 50 eventos del registro. |
| Persona | `PUT /api/compartir/:profesionalId` | `{ perfil, salud, comidas, peso, planes }` (sí o no). Sin chat: 404. |
| Persona | `DELETE /api/compartir/:profesionalId` | Deja de compartir. |
| Profesional | `GET /api/profesional/progreso` | Clientes que le comparten y qué categorías. |
| Profesional | `GET /api/profesional/progreso/:usuarioId` | Las secciones permitidas. Sin permiso: 403. Registra la consulta. |

## Interfaz

- **Chat (persona):**
  - Botón con el ícono de gráfico en la cabecera.
  - Si ya comparte, se marca en azul y su nombre accesible dice qué comparte.
  - Abre el diálogo «Compartir tu progreso con {profesional}», con una tarjeta por categoría, el aviso de la salud, la nota del registro de accesos y los botones «Guardar» y «Dejar de compartir».
- **Mi perfil › Privacidad y datos:**
  - Bloque «Profesionales con acceso a tu progreso», que muestra lo que ve cada profesional («Ve: Comidas, Peso»), con «Cambiar».
  - «Registro de accesos (N)», con fecha y hora en palabras.
- **Espacio del profesional › Clientes › ficha:**
  - Sección «Progreso compartido» con una pestaña por categoría permitida.
  - Cada categoría tiene su vista:

    | Categoría | Cómo se muestra |
    |---|---|
    | Perfil | Datos del perfil |
    | Salud | Listas con nombres |
    | Comidas | Tabla de 7 días con kcal, % de la meta, macros y agua |
    | Peso | Meta y últimos pesajes |
    | Planes | Plan de macronutrientes y detalle del plan de comidas en uso |

  - Sin permiso, explica que el cliente puede compartir desde el chat.
- Todo usa los tokens del tema, para verse bien también en modo oscuro.

## Casos de prueba

| Caso | Qué se comprueba | Resultado |
|---|---|---|
| CP-273 | Dar, cambiar y quitar permisos; solo con chat; registro; validación y roles | Aprobado |
| CP-274 | El profesional ve solo lo permitido; sin permiso 403; consultas registradas cada 30 minutos | Aprobado |
| CP-275 | Diálogo del chat con aviso de salud; lista de accesos y registro; dejar de compartir | Aprobado |
| CP-276 | Ficha del cliente con y sin permiso | Aprobado |

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 693/693 (`compartir.api.test.js` 2) |
| `npm run test:mysql:compartir` | 20/20 (también en la CI) |
| Frontend `npm test` | 533/533 (`Compartir.test.jsx` 4) |
| Lint y build | Sin errores |
