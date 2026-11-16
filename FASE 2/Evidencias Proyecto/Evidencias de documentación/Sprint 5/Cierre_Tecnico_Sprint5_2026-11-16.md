# Revisión técnica y preparación del cierre del Sprint 5

Fecha de corte: 16-11-2026. El período planificado del Sprint 5 es del 02 al 22-11-2026. Este corte no declara una reunión ya celebrada ni reemplaza la aceptación del Product Owner.

## Observaciones del equipo y resolución

| Revisión | Observación | Corrección y evidencia |
| --- | --- | --- |
| #61, Luis | Marcador con dirección anterior si falla la búsqueda; inestabilidad de Portada | 85f7d48, integrado con #61. Pruebas de FormularioFicha y Portada. CP-230 a CP-232, defectos 47 y 48. |
| #61, Nicolás y Luis | Un punto de Argentina se aceptaba como Chile; respuesta anterior sobrescribía el último movimiento | #67, b433d58, integrado. Validación country_code y región; descarte de la consulta anterior y uso de las coordenadas consultadas. CP-238/239 y defectos 53/54, además de los casos de perfil ya registrados. |
| #62, Nicolás | Fotos de autores en reseñas, id de cuenta en enlaces y carga de imágenes por reserva | #70 fusionado, 66e9c4d. CP-233 a CP-236; defectos 49 a 51 corregidos. |
| #63, Luis y Nicolás | Estado congelado y cancelación abierta después de comenzar | Luis corrigió el reloj de la agenda en 2aedfe0; #71 (22c3b277) completa Mis citas y la cancelación abierta. CP-237 con reservas pendientes y confirmadas y CP-248 para los períodos. |
| #66, Luis | Tab y Shift+Tab permiten salir de los filtros y accionar el fondo | #72 fusionado, a33f13a4. Fondo inerte, foco circular y retorno al botón. CP-241 y defecto 55. |

Los cambios se verificaron juntos antes de publicar. No se requirieron migraciones nuevas. Las revisiones pendientes de los integrantes no se consideran aprobadas por el hecho de haber integrado el código.

## Verificaciones y documentación

- Jest: 59 suites, 628 pruebas aprobadas.
- Vitest: 51 archivos, 489 pruebas aprobadas. Se mantienen advertencias de act en pruebas anteriores; no hubo fallos.
- ESLint correcto en frontend y backend; compilación del frontend correcta.
- MySQL real: plan de alimentación 75/75 y concurrencia de especialidades 7/7, con datos temporales propios eliminados. Agenda 55/55 y mejoras de agenda, clientes, reportes y chat 86/86: 223 verificaciones MySQL en total. Los avisos SMTP de agenda fueron rechazados por el entorno; no se acredita entrega de correo.
- Planilla: 248 casos continuos (CP-001 a CP-248), 246 aprobados y 2 no revisados: CP-024/025, que necesitan interacción real con Google.
- Se completaron CP-151 y CP-157 a CP-159; CP-233 a CP-237; CP-240 a CP-248. Los casos de evidencias históricas lo indican expresamente.
- Docker: se recuperaron las versiones de Nicolás desde Drive. El caso de servicios externos pasó de CP-178 a CP-240; el CP-178 de carga conserva su identidad. No se repitió Docker en esta sesión; WSL no permite enumerar distribuciones desde este entorno.
- Registro: 55 defectos, todos en estado Corregido tras el registro de esta consolidación. Esto no elimina mejoras futuras ni equivale a certificación de ausencia de errores.
- DAS 1.35 y Plan de Pruebas 1.0.2. Se conserva la Guía 2.4 enviada.
- Miro: se sincronizan 02, 03, 04, 07, 08 y 16 desde las fuentes actuales; el encabezado corresponde al DAS 1.35. Se preservan los marcos históricos.

## Revisión del sprint lista para validar

| Entregable | Resultado demostrado | Validación pendiente |
| --- | --- | --- |
| Clientes y Reportes (FS-HU-27/28) | Integrados, criterios y casos existentes; correcciones de fotos integradas | Aceptación del PO |
| Experiencia/configuración (FS-HU-29) y Mensajes (FS-HU-31) | Integrados y probados según sus evidencias | Aceptación del PO |
| Plan de alimentación (FS-HU-32) | Implementación y evidencia disponibles; 75 comprobaciones MySQL reales | Confirmación de criterios SC-39 y aceptación del PO |
| SC-35 a SC-38 | Solicitudes registradas; implementaciones y correcciones integradas | Confirmación del PO sobre el resultado final |
| Planilla, Registro, DAS y Plan de Pruebas | Consolidados con trazabilidad | Revisión visual final de documentos Word/Excel en su aplicación y subida manual a Drive |
| Sprint Backlog y burndown | Se preservan estimaciones y gráfico existentes | Horas reales por día o reconstrucción documentada autorizada |

## Criterios propuestos de FS-HU-32 para confirmación del PO

Texto propuesto: «Como usuario, necesito elegir un plan de alimentación según mi meta, guardar planes personalizados y definir una meta de peso, para organizar mi alimentación y seguir mi objetivo sin perder el historial».

1. Con el perfil completo, «Según tu meta» calcula calorías y macronutrientes a partir del objetivo vigente; con perfil incompleto explica qué falta y no muestra cantidades ficticias.
2. Se pueden guardar hasta diez planes personalizados con nombre y porcentajes que sumen 100; elegir, editar y eliminar únicamente planes propios. Si se elimina el elegido, se vuelve al plan de la meta.
3. Un cambio rige desde el día correspondiente; los días anteriores conservan el reparto aplicable a su fecha.
4. Se puede guardar, ajustar y quitar una meta de peso con ritmo semanal; se rechazan objetivos incompatibles con el perfil o su dirección y se explica el motivo.
5. La pantalla muestra el plan vigente y el progreso hacia la meta de peso; la orientación no sustituye la atención profesional.

Estado: propuesta pendiente de confirmación expresa. SC-39 queda reservada; no se altera la especificación aprobada ni se marca la historia aceptada por inferencia.

## Retrospectiva para completar con el equipo

Hechos para conversar: las observaciones de revisión detectaron fallos de ubicación, privacidad, reloj y foco; la integración fue anterior al cierre de algunos registros; hubo colisión de un ID entre Docker y carga y diferencias entre Drive y GitHub.

Acciones propuestas: un único responsable de edición de archivos Office; reservar IDs antes de usarlos; comprobar observaciones de todos los PR antes del cierre; mantener una matriz PR → corrección → prueba → documento; separar integración de código de aceptación del PO.

Pendientes personales: Rodrigo Cárcamo Rojas, Luis Méndez y Nicolás Silva deben aportar o confirmar sus observaciones, acuerdos y horas. No se atribuyen opiniones ni asistencia a reuniones que no estén documentadas.

## Mejoras de seguimiento

Se conservan como mejoras pendientes de decisión: límite de la cola y caché de 404 de Nominatim; protección de cambios sin guardar al cambiar de sección; confirmación del alcance público de la biografía; unificar etiquetas de estados; aclarar si Reservas del día debe incluir canceladas. Las pruebas de períodos y de la hora exacta ya se cubren en el PR #71.

## Condiciones que faltan para declarar el cierre formal

1. Aceptación o rechazo expreso del PO y confirmación del texto de FS-HU-32.
2. Horas por día y aportes de los integrantes a la retrospectiva; actualizar el burndown sin datos inventados ni fechas futuras consumidas.
3. CP-024/025 con Google real, o excepción explícitamente aceptada por el PO. Completar las comprobaciones estándar de QA que no tengan evidencia suficiente.
4. Validar visualmente los documentos editados y subir a Drive los archivos de la entrega preparada, reemplazando los existentes para conservar sus IDs.

No se marca el Sprint 5 como cerrado mientras estas condiciones sigan pendientes.
