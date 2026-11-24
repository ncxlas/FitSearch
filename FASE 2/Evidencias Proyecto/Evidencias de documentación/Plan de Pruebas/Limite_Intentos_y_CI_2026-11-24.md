# Límite de intentos e integración continua (24-11-2026)

Cambio pedido por el Product Owner (Rodrigo Cárcamo Rojas) el 24-11-2026, a partir de la revisión de calidad de ese día, que detectó que las rutas de acceso no tenían límite de intentos y que el repositorio no tenía integración continua.

- Solicitud de cambio: **SC-41** (Matriz de Control de Cambio).
- Casos de prueba: **CP-251 a CP-258** (Planilla de Casos de Prueba).
- Documento de Arquitectura: versión **1.36** (QS8, D41 y D42).
- Rama: `feat/limite-intentos-y-ci` (desde `main` 2285469).

En la misma entrega se registraron en las planillas **SC-40** y **CP-249/CP-250** (menú lateral contraído, PR #81), que estaban reservados hasta fusionar el PR #80.

## Límite de intentos

La API responde `429` con la cabecera `Retry-After` y un mensaje que dice cuánto esperar, por ejemplo: «Hiciste demasiados intentos para iniciar sesión. Espera 1 minuto antes de volver a intentarlo.» Las pantallas de acceso ya muestran el mensaje de error que envía la API, así que no fue necesario cambiar el frontend.

| Ruta | Clave | Límite |
|---|---|---|
| `POST /api/auth/login` | correo | 5 fallos libres; después 1, 2, 4, 8 y 15 minutos (máximo) de espera |
| `POST /api/auth/login` | IP | 20 fallos libres, con la misma espera progresiva |
| `PUT /api/perfil/cuenta` con contraseña o credencial de Google | cuenta | 5 fallos libres, con la misma espera progresiva |
| `POST /api/auth/recuperar` | correo / IP | 3 / 10 cada hora |
| `POST /api/auth/restablecer` | IP | 10 cada 15 minutos |
| `POST /api/auth/registro` | IP | 10 cada hora |
| `POST /api/auth/google` | IP | 30 cada 15 minutos |

Detalles del diseño:

- El intento se anota antes de comparar la contraseña y se descuenta si resulta correcto. Así, una ráfaga de intentos simultáneos no pasa completa mientras se comparan las contraseñas.
- Un ingreso correcto borra los fallos del correo, pero en la IP solo descuenta ese intento: entrar a una cuenta propia no sirve para borrar los fallos acumulados contra otras cuentas desde la misma red.
- Una clave se olvida tras 15 minutos sin fallos, **contados desde que terminó su último bloqueo**. La primera versión los contaba desde el último fallo; la prueba unitaria de la espera máxima mostró que, al terminar un bloqueo de 15 minutos, la clave quedaba olvidada al instante y volvía a tener 5 intentos libres. Se corrigió antes de entregar.
- Cada límite guarda como máximo 10.000 claves. Cuando se llena, sale la clave menos usada que no esté bloqueada, para que nadie pueda borrar su propio bloqueo llenando el mapa con claves nuevas.
- Las peticiones mal formadas (400 de validación) no cuentan, porque el límite va después de los validadores.
- Los contadores viven en la memoria de la API: con un solo proceso basta y, si se reinicia, empiezan de cero (los bloqueos duran minutos).
- Con Docker, nginx reenvía `/api` a la API. `TRUST_PROXY=1` (en `docker-compose.yml` y `.env.example`) hace que Express tome la IP real del cliente desde `X-Forwarded-For`. Sin proxy configurado, esa cabecera se ignora.

Archivos: `backend/src/utils/limitador.js`, `backend/src/middlewares/limiteIntentos.js`, `backend/src/routes/auth.routes.js`, `backend/src/routes/perfil.routes.js`, `backend/src/controllers/auth.controller.js`, `backend/src/config/env.js`, `backend/src/app.js`, `docker-compose.yml`, `.env.example` y `backend/.env.example`.

## Casos de prueba

| Caso | Qué se comprueba | Resultado |
|---|---|---|
| CP-251 | Tras 5 fallos el correo queda bloqueado: 429 con `Retry-After: 60` aunque la contraseña sea correcta; el correo con mayúsculas y espacios cuenta como el mismo | Aprobado |
| CP-252 | La espera se duplica con cada fallo nuevo y, al terminar, se entra con la contraseña correcta; un ingreso correcto borra los fallos | Aprobado |
| CP-253 | 20 fallos desde una IP la bloquean aunque cada intento use otro correo; entrar a la cuenta propia no borra esos fallos | Aprobado |
| CP-254 | Recuperar: 3 enlaces por correo y 10 por IP cada hora, exista o no la cuenta; solo salen 3 correos | Aprobado |
| CP-255 | Restablecer (10 cada 15 min), registro (10 cada hora) y Google (30 cada 15 min) por IP | Aprobado |
| CP-256 | 5 confirmaciones de identidad incorrectas bloquean la cuenta; los cambios sin confirmación se guardan igual | Aprobado |
| CP-257 | Con `TRUST_PROXY=1` cada cliente cuenta por separado; sin proxy, `X-Forwarded-For` no sirve para eludir el límite | Aprobado |
| CP-258 | La corrida de GitHub Actions del PR termina en verde | Pendiente: se ejecuta al abrir el PR |

Pruebas automatizadas: `backend/tests/integracion/limiteIntentos.api.test.js` (15 pruebas) y `backend/tests/unit/limitador.test.js` (8 pruebas, con el reloj controlado, sin esperas reales). `backend/tests/setupPorPrueba.js` vacía los contadores antes de cada prueba para que no se afecten entre sí.

## Integración continua

`.github/workflows/pruebas.yml` corre en cada PR hacia `main`, en cada push a `main` y a mano desde GitHub:

| Trabajo | Qué hace |
|---|---|
| Backend (lint y Jest) | `npm ci`, `prisma generate`, `npm run lint` y `jest --ci` |
| Frontend (lint, Vitest y build) | `npm ci`, `npm run lint`, `npm test` y `npm run build` |
| MySQL (migraciones y pruebas con base real) | En un MySQL 8.4 vacío: `prisma migrate deploy`, comparación de la base con `schema.prisma` (`prisma migrate diff --exit-code`), roles (`db:seed`) y los scripts `test:mysql:*` (acceso, agua, agenda, asistente, comidas, especialidades, mejoras y plan) |
| Pruebas completas | Verde solo si los tres anteriores pasaron. Es la comprobación que se marca como obligatoria en la protección de `main` |

Antes de entregar se comprobó en el equipo local que la base de desarrollo, construida con las migraciones, no tiene diferencias con el `schema.prisma` de la rama (`prisma migrate diff`: «No difference detected»).

`.github/pull_request_template.md` hace que cada PR nuevo parta con la Definition of Done (DoD-03 a DoD-15) como lista de casillas.

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 651/651 (61 archivos), antes 628 |
| Backend `npm run lint` | Sin errores |
| Frontend `npm test` | 510/510 (55 archivos), sin cambios en el frontend |
| Frontend `npm run lint` | Sin errores (se mantiene el aviso de Fast Refresh que ya existía) |
| Frontend `npm run build` | Correcto |

## Observación pendiente

`npm audit --omit=dev` del backend informa 3 vulnerabilidades altas en `effect`, una dependencia de la CLI de Prisma 6.19 (`@prisma/config`), con riesgo de ReDoS. No es parte de este cambio, pero choca con DoD-12. `npm audit fix --force` bajaría Prisma a la 6.12, lo que rompe la compatibilidad. Por eso la CI todavía no incluye `npm audit` como comprobación obligatoria. El frontend no tiene vulnerabilidades. Quedó registrado como **defecto 56** (Abierto, severidad Baja: afecta a la CLI de Prisma, no a las rutas de la API).
