# Pruebas de carga: rendimiento (QS1) y concurrencia de reservas (QS5)

Fecha: 11-11-2026. Rama `test/pruebas-de-carga`, sobre `801878c` (`main` con los PR #40 a #48 y #43 fusionados). Responde a la tarea del Plan de Pruebas «rendimiento (QS1)» del Sprint 5 y a los ítems 4.2 (rendimiento) y 6.3 (pruebas de carga) del control Capstone.

## Metas (DAS y Plan de Pruebas)

- **QS1:** el 95 % de las búsquedas de profesionales responde en menos de 2 segundos con al menos 500 profesionales de prueba, sin contar la carga del mapa.
- **Desempeño del DAS:** la autenticación, el perfil, el listado y la búsqueda responden en menos de 2 segundos.
- **QS5:** ningún horario queda con más de una reserva activa (pendiente o confirmada) en las pruebas de concurrencia.

## Cómo se ejecutó

- Script nuevo `backend/scripts/probar-carga.js` (`npm run test:carga`), sin dependencias adicionales.
  - Mide la API en ejecución con varias conexiones simultáneas durante 20 segundos por escenario.
  - Calcula los percentiles p50, p95 y p99, las peticiones por segundo y los errores.
  - Con `--guardar-evidencia`, guarda el resultado en un JSON de esta carpeta.
- Datos temporales creados por el script: 500 profesionales (con las 5 especialidades del catálogo, 10 comunas y las 3 modalidades), 100 establecimientos y 833 reseñas. En la base quedaron 512 profesionales activos.
  - Todo se borró al terminar: 571 cuentas y 100 establecimientos eliminados, 0 cuentas restantes en cada ejecución.
- Entorno: GitHub Codespaces de 2 núcleos, API Node.js 24 (`node src/server.js`) y MySQL 8.4 en un contenedor. El generador de carga corrió en la misma máquina, así que los tiempos son conservadores.
- Se hicieron dos ejecuciones: con 20 conexiones simultáneas y con 5.

## Resultados

| Escenario | 20 conexiones: p95 (p50) | 20 conexiones: peticiones/s | 5 conexiones: p95 (p50) | Errores | Meta p95 < 2000 ms |
|---|---|---|---|---|---|
| Búsqueda sin filtros (QS1) | 272 ms (176) | 107 | 68 ms (42) | 0 | Cumple |
| Búsqueda por texto (QS1) | 200 ms (141) | 134 | 58 ms (35) | 0 | Cumple |
| Búsqueda por especialidad y comuna (QS1) | 82 ms (47) | 391 | 21 ms (12) | 0 | Cumple |
| Búsqueda por cercanía a 10 km, orden por distancia (QS1) | 191 ms (133) | 142 | 53 ms (33) | 0 | Cumple |
| Ficha de un profesional | 95 ms (59) | 313 | 26 ms (15) | 0 | Cumple |
| Inicio de sesión | **2185 ms** (1665) | 13 | 652 ms (411) | 0 | No cumple con 20; cumple con 5 |

**QS5:** 50 personas reservaron el mismo horario al mismo tiempo, en las dos ejecuciones. Resultado: 1 respuesta 201 y 49 respuestas 409, con 1 sola reserva activa en el horario. **Cumple.**

Detalle completo: `Carga_QS1_QS5_2026-11-11_20conexiones.json` y `Carga_QS1_QS5_2026-11-11_5conexiones.json`.

## Casos de prueba

| Caso | Qué se prueba | Resultado esperado | Resultado |
|---|---|---|---|
| CP-178 | QS1: búsqueda de profesionales con 512 profesionales y 20 conexiones simultáneas | p95 menor a 2 s y sin errores en los 4 tipos de búsqueda | Aprobado (p95 máximo: 272 ms) |
| CP-179 | Ficha de un profesional bajo carga | p95 menor a 2 s, sin errores | Aprobado (95 ms) |
| CP-180 | Inicio de sesión bajo carga | p95 menor a 2 s, sin errores | Aprobado con 5 conexiones (652 ms). No cumple con 20 (2185 ms) |
| CP-181 | QS5: 50 reservas simultáneas sobre el mismo horario | Una sola reserva activa; las demás reciben 409 | Aprobado |

## Análisis

- **La búsqueda cumple QS1 con amplio margen.**
  - Incluso la consulta más pesada, la búsqueda sin filtros que ordena por verificación y calificación, quedó bajo 300 ms en p95 con 20 usuarios simultáneos.
  - Por ahora no hace falta el índice espacial que el DAS dejó como mejora condicionada a estas pruebas (D23).
- **El inicio de sesión depende de la CPU**, porque bcrypt se calcula con costo 10 en cada intento.
  - Con 2 núcleos, la API atendió unas 12 a 13 sesiones por segundo en las dos ejecuciones.
  - Con 20 inicios de sesión al mismo tiempo, las solicitudes esperan en cola y el p95 sube a 2,2 s. Con 5 simultáneos, queda en 0,65 s.
  - No hubo errores: todas las sesiones se iniciaron.
  - 20 inicios de sesión en el mismo segundo superan el uso esperado del proyecto. Aun así, queda registrado como observación.
  - Opciones para discutir con el PO:
    - medir en el equipo de la presentación, que tiene más núcleos;
    - agregar un límite de intentos de inicio de sesión, que además protege contra fuerza bruta;
    - revisar el costo de bcrypt sin bajar de un valor seguro.
- **La transacción con bloqueo del profesional y del horario evita las reservas duplicadas (QS5)** también con 50 solicitudes simultáneas, 25 veces más que la comprobación de dos solicitudes del 12-10-2026.

Los casos CP-178 a CP-181 usan una numeración provisional y se agregan a la Planilla de Casos de Prueba al consolidar la documentación después de la fusión del PR.

## Ajustes de la revisión del PR #51 y nueva medición (14-11-2026)

Luis Méndez pidió tres cambios en `probar-carga.js` al revisar el PR #51. Se corrigieron en la rama `fix/probar-carga`, después de fusionar el #51 en `main`.

1. **La limpieza borra solo lo creado en esa ejecución.**
   - Antes, los centros se borraban por nombre y dirección («Centro de carga …», «Dirección ficticia …»), así que podía borrar centros que no eran suyos.
   - Ahora el script anota el ID de cada centro apenas lo crea y borra solo esos IDs. Las cuentas se siguen borrando por la marca de sus correos, que es única en cada ejecución.
   - La evidencia informa también los centros que hayan quedado (`establecimientosRestantes`).
2. **QS5 exige el resultado exacto:** 1 respuesta 201 y 49 respuestas 409, sin errores de red ni otros estados, y una sola reserva activa en el horario. Antes bastaba con una respuesta 201 y una reserva activa.
3. **El comando termina con error si algo no cumple.**
   - Con «NO CUMPLE», «ERROR», una limpieza que falla o que deja datos, o una evidencia que no se pudo guardar, el código de salida es 1.
   - Igual limpia y guarda la evidencia antes de terminar.
   - Antes, la ejecución con 20 conexiones del 11-11 dio «NO CUMPLE» y el comando terminó con código 0.

**Pruebas unitarias:** `backend/tests/unit/probar-carga.test.js` (9 pruebas, sin API ni base de datos) cubre las reglas de QS5, el código de salida y la limpieza por IDs. Backend: 577/577 y ESLint correcto.

**Nueva medición.**
- **Entorno:** computador del equipo con 12 núcleos y Windows, Node.js 24 y MySQL 8 local.
- **API:** `npm run start` de la copia de trabajo principal, en la rama `feat/filtro-region`, que es `main` más el filtro por región del PR #57. Las consultas medidas no usan ese filtro.
- **Datos:** 515 profesionales activos durante la prueba.
- **Comprobación de la limpieza:** antes de correr se creó un centro señuelo con el mismo nombre y la misma dirección ficticia que usa la prueba («Centro de carga 999»).
  - Siguió en la base después de las tres ejecuciones; con la limpieza anterior se habría borrado. Luego se borró a mano por su ID.
  - En cada ejecución se eliminaron 571 cuentas y 100 centros, y quedaron 0 cuentas y 0 centros de la prueba.
  - Al final, los conteos de usuarios, profesionales, centros, horarios, reservas y reseñas eran iguales a los de antes de empezar.

| Escenario | 5 conexiones: p95 (p50) | 20 conexiones: p95 (p50) | 50 conexiones: p95 (p50) | Errores |
|---|---|---|---|---|
| Búsqueda sin filtros (QS1) | 18 ms (13) | 52 ms (37) | 121 ms (94) | 0 |
| Búsqueda por texto (QS1) | 11 ms (7) | 28 ms (22) | 64 ms (55) | 0 |
| Búsqueda por especialidad y comuna (QS1) | 6 ms (4) | 18 ms (13) | 44 ms (32) | 0 |
| Búsqueda por cercanía a 10 km (QS1) | 14 ms (9) | 36 ms (28) | 82 ms (72) | 0 |
| Ficha de un profesional | 14 ms (5) | 17 ms (13) | 40 ms (34) | 0 |
| Inicio de sesión | 294 ms (261) | 1121 ms (1029) | **2753 ms** (2561) | 0 |
| Resultado y código de salida | CUMPLE, 0 | CUMPLE, 0 | NO CUMPLE, 1 | |

- **QS5:** en las tres ejecuciones hubo 1 respuesta 201 y 49 respuestas 409, con una sola reserva activa en el horario. **Cumple.**
- **Con 50 conexiones** solo el inicio de sesión supera los 2 s. Pasa lo mismo que con 20 conexiones en el Codespace de 2 núcleos: bcrypt depende de la CPU (unas 20 sesiones por segundo).
  - El comando terminó con código 1, como se pidió, y aun así guardó la evidencia y limpió todo.
- **Con una API que no responde,** el resultado es «ERROR», no crea datos y termina con código 1.
- **Detalle:** `Carga_QS1_QS5_2026-11-14_5conexiones.json`, `Carga_QS1_QS5_2026-11-14_20conexiones.json` y `Carga_QS1_QS5_2026-11-14_50conexiones.json`.

| Caso | Qué se prueba | Resultado esperado | Resultado |
|---|---|---|---|
| CP-182 | La limpieza de la prueba de carga borra solo lo que creó, con un centro de otro origen que tiene el mismo nombre | El otro centro sigue en la base; quedan 0 cuentas y 0 centros de la prueba | Aprobado |
| CP-183 | Código de salida de `npm run test:carga` | 0 solo si todo cumple y la limpieza no deja datos; 1 con «NO CUMPLE» o «ERROR», después de limpiar y guardar la evidencia | Aprobado (0 con 5 y 20 conexiones; 1 con 50 conexiones y con la API detenida) |

CP-182 y CP-183 también usan numeración provisional, igual que CP-178 a CP-181.
