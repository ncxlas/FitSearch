# Historial de peso (24-11-2026)

Cambio pedido por el Product Owner (Rodrigo Cárcamo Rojas) el 24-11-2026, bloque 3 de las mejoras de ese día. La «Meta de peso» del 11-11-2026 guardaba el peso inicial y el objetivo, pero el avance usaba solo el peso del perfil: no había pesajes guardados ni gráfico.

- Solicitud de cambio: **SC-43** (Matriz de Control de Cambio).
- Casos de prueba: **CP-264 a CP-267**.
- Documento de Arquitectura: versión **1.38** (D44 y tabla `registros_peso`).
- Migración: `20261124130000_registro_peso` (aplicada en la base local).
- Rama: `feat/historial-de-peso` (sobre `feat/mis-datos-y-eliminar-cuenta`, PR #86).

## Decisión del PO (24-11-2026)

El último pesaje actualiza el peso del perfil, para que el plan de macronutrientes se recalcule con el peso real.

## Cómo funciona

| Acción | Ruta | Qué hace |
|---|---|---|
| Ver el historial | `GET /api/comidas/plan` | Trae `historialPeso`: los pesajes de los últimos 180 días, el ritmo real y la fecha de hoy en Chile. |
| Anotar un pesaje | `POST /api/comidas/plan/pesos` | `{ pesoKg, fecha? }`. Hoy por defecto; no se aceptan días futuros ni de hace más de un año; peso entre 20 y 350 kg, con un decimal. Anotar de nuevo el mismo día lo reemplaza. Responde 201 con el plan completo. |
| Borrar un pesaje | `DELETE /api/comidas/plan/pesos/:id` | Solo los propios (otro o inexistente: 404). Responde el plan completo. |

- **Peso del perfil:** en la misma transacción que anota o borra, el pesaje más reciente **por fecha** se copia a `perfiles_usuario.peso_kg`. Anotar un día anterior no pisa un pesaje más nuevo; borrar el último deja el anterior. Sin pesajes, el perfil conserva su peso.
- **Ritmo real:** con los pesajes de las últimas 8 semanas, una recta de mínimos cuadrados da los kg por semana. Hacen falta al menos dos pesajes separados por una semana. Un pesaje aislado alto o bajo no cambia el ritmo completo.
- **Mi cuenta (SC-42):** los pesajes se incluyen en «Descargar mis datos» y se borran al eliminar la cuenta (`npm run test:mysql:cuenta` pasó a 31 comprobaciones).

## Interfaz: tarjeta «Tu peso» (Comidas › Plan)

- Formulario «Peso (kg)» (acepta coma o punto) y «Día» (hoy por defecto), y el botón «Anotar peso».
- Ritmo real junto al de la meta: «Bajas 0,5 kg por semana en las últimas 8 semanas · tu meta: 0,5 kg por semana».
- **Gráfico de línea**, hecho con la skill de visualización de datos:
  - Un solo eje, en kg, con marcas limpias.
  - «Tu peso» va en línea continua de 2 px con puntos de 8 px, cada uno con un anillo del color de la superficie.
  - «Ritmo de tu meta» va en línea punteada: baja o sube desde el peso inicial al ritmo elegido y se queda en el objetivo.
  - Tiene leyenda y etiquetas directas al final de cada línea, que se separan si quedan encima.
  - Al pasar el mouse, o con las flechas del teclado, aparecen una guía y el detalle del pesaje (día, kg y la meta de ese día). Escape lo oculta.
- **Colores validados** con el verificador de paletas (`validate_palette.js`): en claro `#1565a0` / `#c9500a` sobre blanco y en oscuro `#3f8fd6` / `#d9732c` sobre la superficie del tema oscuro. Ambos pasan todos los controles: banda de luminosidad, croma, separación para daltonismo (ΔE 20,3 y 23,2), separación normal y contraste ≥ 3:1. La línea punteada es la segunda señal además del color.
- **Vista en tabla:** «Ver tus pesajes (N)» abre la lista del más reciente al más antiguo, con un botón para borrar cada uno.
- Sin pesajes, la tarjeta invita a anotar el peso cada semana.
- La nota de «Tu meta de peso» ahora dice que el avance usa el último pesaje.

## Casos de prueba

| Caso | Qué se comprueba | Resultado |
|---|---|---|
| CP-264 | API: anotar responde 201 con el historial; valida rango, formato, día futuro y más de un año; el profesional recibe 403 | Aprobado |
| CP-265 | MySQL real: el perfil toma el pesaje más reciente por fecha, repetir un día lo reemplaza, borrar el último vuelve al anterior, uno ajeno da 404 y la base rechaza dos del mismo día | Aprobado |
| CP-266 | Tarjeta y gráfico: estado vacío, ritmo real contra la meta, leyenda, línea de la meta y detalle con el teclado | Aprobado |
| CP-267 | Anotar con coma decimal en el día elegido, validación, lista ordenada, borrar y flujo completo desde la pestaña del plan | Aprobado |

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 677/677 (`historialPeso.test.js` 9, `pesos.api.test.js` 4) |
| `npm run test:mysql:peso` | 12/12 (también en la CI) |
| Frontend `npm test` | 523/523 (`HistorialPeso.test.jsx` 7 y un caso nuevo en `Comidas.test.jsx`) |
| Lint y build | Sin errores |
