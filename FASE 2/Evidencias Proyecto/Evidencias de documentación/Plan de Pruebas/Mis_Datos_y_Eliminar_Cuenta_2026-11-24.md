# Descargar mis datos y eliminar la cuenta (24-11-2026)

Cambio pedido por el Product Owner (Rodrigo Cárcamo Rojas) el 24-11-2026, bloque 2 de las mejoras de ese día. Responde a la Ley 21.719 de protección de datos personales, vigente desde el 1 de diciembre de 2026: derecho a obtener una copia de los datos propios y a pedir que se borren. FitSearch guarda datos de salud, que la ley trata como sensibles.

- Solicitud de cambio: **SC-42** (Matriz de Control de Cambio).
- Casos de prueba: **CP-259 a CP-263** (Planilla de Casos de Prueba).
- Documento de Arquitectura: versión **1.37** (QS9 y D43; columna `usuarios.eliminado_en`).
- Migración: `20261124120000_cuenta_eliminada` (aditiva, aplicada en la base local).
- Rama: `feat/mis-datos-y-eliminar-cuenta` (sobre `feat/limite-intentos-y-ci`, PR #85).

## Decisiones del PO (24-11-2026)

- Al eliminar la cuenta, **las reseñas y las citas pasadas quedan anónimas** («Usuario eliminado») para que la nota del profesional y su historial no cambien.
- Las citas que aún no ocurren se cancelan y se avisa por correo a la otra parte.

## Cómo funciona

| Acción | Ruta | Qué hace |
|---|---|---|
| Descargar mis datos | `GET /api/perfil/mis-datos` | Archivo JSON adjunto con todo lo que la cuenta guardó. Quita contraseñas, la cuenta de Google y los identificadores internos; las fechas van como texto y los decimales como números. En los chats cada mensaje dice si lo escribió «Tú» o la otra persona. |
| Eliminar mi cuenta | `DELETE /api/perfil/cuenta` | Pide `confirmacion: "ELIMINAR"` y la contraseña o una credencial de la misma cuenta de Google. Tiene el mismo límite de intentos que cambiar el correo (SC-41). |

Al eliminar, en una sola transacción y con la cuenta bloqueada (`FOR UPDATE`):

1. Las citas futuras pendientes o confirmadas (como persona o como profesional) pasan a «cancelada».
2. Se borran el perfil, la salud, los datos de contacto y la foto, las comidas, el agua, el plan de macronutrientes, los planes personalizados, las metas de peso, las conversaciones con el asistente, los favoritos, la lista de espera, los chats y los enlaces de recuperación.
3. En una cuenta profesional, además: documentos de verificación (registros y archivos), bloqueos de agenda, horarios sin reservas, favoritos y chats de sus pacientes, y los datos de la ficha (presentación, RUT, teléfono, ubicación, dirección, formación, registro SIS y precio). La ficha deja de aparecer en el directorio porque la cuenta queda inactiva.
4. La fila de `usuarios` queda **anonimizada**: nombre «Usuario eliminado» o «Profesional eliminado», correo `eliminado-<id>-<azar>@fitsearch.invalid`, sin contraseña ni Google, inactiva, con `eliminado_en` y la versión de sesión aumentada (todas las sesiones se cierran).

Después de guardar se envían los avisos por correo de las citas canceladas (con el nombre que la cuenta tenía antes), se avisa a la lista de espera si se liberaron horas y se borran los archivos de verificación.

El panel del administrador deja de mostrar las cuentas eliminadas (usuarios, profesionales, últimas cuentas y cuentas inactivas). Un administrador no puede eliminarse desde la aplicación (403).

**Por qué anonimizar en vez de borrar la fila:** borrar en cascada quitaba al profesional el historial de sus citas y las reseñas que respaldan su nota. Dejar `reservas.usuario_id` y `resenas.usuario_id` nulos obligaba a cambiar más de 15 consultas (agenda, avisos, chats, reportes). Los datos que quedan ya no identifican a nadie, así que se cumple igual el derecho de supresión (DAS, D43).

## Interfaz

- **Mi perfil › Privacidad y datos** (usuario) y **Configuración › Privacidad y datos** (profesional).
- «Descargar»: descarga el archivo y confirma «Listo: revisa tu carpeta de descargas».
- «Eliminar cuenta» abre el diálogo «¿Eliminar tu cuenta?», que explica qué se borra y qué se conserva. El botón «Eliminar mi cuenta» queda deshabilitado hasta escribir ELIMINAR y la contraseña, o hasta confirmar con Google. Escape o «Cancelar» lo cierran y el foco vuelve al botón que lo abrió.
- Al terminar se olvida la sesión del navegador y la portada muestra «Tu cuenta fue eliminada» con «Crear una cuenta nueva».
- El diálogo es el componente reutilizable `components/Dialogo.jsx`: fondo inerte, foco atrapado, Escape y hoja inferior en celular.

## Casos de prueba

| Caso | Qué se comprueba | Resultado |
|---|---|---|
| CP-259 | La descarga exige sesión y trae todas las secciones, sin contraseñas ni claves internas | Aprobado |
| CP-260 | Sin ELIMINAR, con otra palabra o con campos extra responde 400; con la contraseña correcta, 204; el administrador recibe 403 | Aprobado |
| CP-261 | Con MySQL real: se borran los datos, la cuenta queda anonimizada, la cita futura se cancela, la pasada y la reseña se conservan anónimas y el correo puede registrarse de nuevo; la cuenta profesional pierde su ficha y documentos y su paciente recibe la cancelación; 5 confirmaciones fallidas dan 429 | Aprobado |
| CP-262 | El botón «Descargar» baja el archivo y confirma | Aprobado |
| CP-263 | El diálogo exige ELIMINAR y la contraseña, muestra el error en el campo, Escape devuelve el foco y al eliminar la portada despide; el profesional ve qué se borra de su ficha | Aprobado |

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 664/664 (63 archivos): `miCuenta.service.test.js` (9) y `miCuenta.api.test.js` (4) |
| `npm run test:mysql:cuenta` | 30/30 contra la base local; también se suma a la CI |
| Frontend `npm test` | 515/515 (56 archivos): `PrivacidadDatos.test.jsx` (5) |
| Lint y build | Sin errores |
