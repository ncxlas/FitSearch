# Actualización de perfiles del PR 59

14-11-2026. Preparé la ampliación de los perfiles de usuario y profesional en el PR #59: https://github.com/rodriacr/FitSearch/pull/59. Se fusionó en main el 15-11-2026 (e5b7621) y no modifica la aceptación histórica de las historias ni sus horas registradas.

La ampliación corresponde a FS-HU-02, FS-HU-04, FS-HU-15, FS-HU-19 y FS-HU-29. Agregué edición por secciones, foto propia, contacto y redes y confirmación de identidad al cambiar correo. Conservé las funciones existentes y corregí el bloqueo del botón al guardar.

Actualicé localmente el DAS 1.32, el diccionario de datos_cuenta, las relaciones y componentes de la edición y el flujo 16. Los modelos completos 02, 03 y 04 reflejan el schema de main: 27 tablas, con datos_cuenta incorporada por este PR. Las imágenes del DAS son resúmenes del cambio y enlazan a esas fuentes completas.

En las planillas incorporé CP-184 a CP-195, el defecto 45 y la propuesta SC-34. Agregué notas al Product Backlog y al control del proyecto y marqué la ampliación de las tareas del Sprint 5. Se mantienen las notas originales, fórmulas, estimaciones y horas existentes. Falta registrar las horas reales adicionales.

La validación del código dio 583 pruebas del backend y 434 del frontend aprobadas, lint correcto en ambas capas y compilación correcta. El detalle de cada comprobación está en ../Plan de Pruebas/Perfiles_Editables_PR59_2026-11-14.md.

Drive y Miro todavía no se actualizan. Con el PR fusionado, falta sincronizar el DAS, las fuentes e imágenes de los diagramas y las planillas.

15-11-2026. Corregí la numeración por la revisión de Rodrigo en el PR #59: los casos de perfiles son CP-184 a CP-195, sin reutilizar los casos de Docker o carga. El PO aceptó la SC-34; la aprobación técnica y la fusión siguen pendientes tras esta corrección.

15-11-2026. Rodrigo Cárcamo aprobó el PR #59 y se fusionó en main (e5b7621). El DAS 1.33 registra el cierre.
