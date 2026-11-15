# Pruebas de los perfiles editables

14-11-2026. PR #59: https://github.com/rodriacr/FitSearch/pull/59. Implementación comprobada: commit 21a397d. Aprobado por Rodrigo Cárcamo y fusionado en main el 15-11-2026 (e5b7621). No constituye una nueva aceptación de las historias.

Actualicé los perfiles de usuario y profesional con edición por secciones, foto propia, contacto y redes sociales. Conservé el asistente inicial, la información de salud, la ficha profesional, experiencia, certificaciones, agenda, copia del enlace público y ubicación según modalidad. El cambio de correo exige confirmar la identidad y protege las sesiones anteriores.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Backend con Jest y Supertest | 583 pruebas aprobadas en 56 suites. Los servicios externos y los datos se simulan en estas suites. |
| Frontend con Vitest | 434 pruebas aprobadas en 49 archivos. |
| Revisión de código | Lint correcto en backend y frontend. |
| Compilación del frontend | Correcta. Vite conserva su aviso de tamaño del paquete principal. |
| Pruebas locales de cuenta | Guardado, recarga, foto y eliminación comprobados con cuentas temporales de usuario y profesional en la API y MySQL locales. Las cuentas temporales se eliminaron después de comprobarlas. |
| Navegación local | Ambos perfiles revisados en computador y celular. Luis Méndez confirmó el diseño y el funcionamiento de la corrección del guardado. |
| Google | Confirmación de identidad cubierta con el proveedor simulado. El acceso real continúa sujeto a los orígenes autorizados del cliente Google. |

Las pruebas de integración de esta entrega no consultan Groq ni envían correos. No se reejecutaron pruebas de carga del PR #58 para documentar estos perfiles.

## Casos incorporados a la planilla

| Caso | Comprobación | Evidencia principal |
| --- | --- | --- |
| CP-184 | Contacto propio, guardado y recarga | cuentaPerfil.api.test.js, PerfilEditable.test.jsx y comprobación local |
| CP-185 | Asistente inicial y edición del usuario por secciones | Perfil.test.jsx y revisión local |
| CP-186 | Agregar, reemplazar y quitar foto; rechazar archivo no admitido | cuentaPerfil.api.test.js, PerfilEditable.test.jsx y revisión local |
| CP-187 | Identidad para cambiar correo y protección de sesiones | cuentaPerfil.api.test.js con contraseña y Google simulados |
| CP-188 | Validación de contacto, redes y campos ajenos | cuentaPerfil.api.test.js |
| CP-189 | Acceso propio y conflictos de versión de cuenta | cuentaPerfil.api.test.js |
| CP-190 | Información y experiencia, certificaciones y acceso a agenda | PerfilProfesional.test.jsx |
| CP-191 | Ubicación solo para presencial o ambas | PerfilProfesional.test.jsx y FormularioFicha.test.jsx |
| CP-192 | Copia del enlace y alternativa manual | PerfilProfesional.test.jsx |
| CP-193 | Navegación en computador, celular y teclado | Revisión local y pruebas de navegación |
| CP-194 | Guardar sin cambios en online y ambas modalidades | FormularioFicha.test.jsx y confirmación de Luis Méndez |
| CP-195 | Guardar dos modificaciones sin salir del formulario | FormularioFicha.test.jsx |

## Defecto 45

El botón quedaba en "Guardando" después de una respuesta correcta, porque el formulario permanecía montado y solo liberaba el estado al fallar. Lo reproduje mediante una prueba antes de corregirlo. Ahora el bloque finally libera el botón y guardar sin cambios muestra "No hay cambios pendientes" sin enviar PUT. Las tres pruebas nuevas fallaron antes de la corrección y pasaron después. Luis Méndez confirmó que la página funciona correctamente.

## Instalación y seguimiento

Antes de iniciar el backend se ejecutan `npm run db:generate` y `npm run db:migrate`. La migración aditiva `20261114190000_datos_cuenta_perfil` incorpora datos_cuenta, sin borrar las tablas de salud o profesionales.

La matriz registra la SC-34, aceptada por el PO, y el DAS 1.32 documenta D40. Las notas originales de las historias y las horas del Sprint Backlog se conservaron. Las horas adicionales siguen pendientes de registro. Drive y Miro están pendientes de sincronizar.

15-11-2026. Corregí la numeración por la revisión de Rodrigo en el PR #59: los casos de perfiles son CP-184 a CP-195, sin reutilizar los casos de Docker o carga. El PO aceptó la SC-34; la aprobación técnica y la fusión siguen pendientes tras esta corrección.

15-11-2026. Rodrigo Cárcamo aprobó el PR #59 y se fusionó en main (e5b7621). El DAS 1.33 registra el cierre.
