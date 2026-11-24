# Revisión de navegación, tema y perfiles — 23-11-2026

Base: integración del PR #82, commit `2285469ed6cc8259873ae27f69557790140601db`. Cambios preparados en la rama `fix/tema-navegacion-perfiles`; no se declara aceptación del PO ni cierre de sprint.

## Comportamiento preparado

- Escritorio: marca anclada a la columna del nav. Contraída muestra el logo; desplegada muestra también FitSearch. Marca, secciones y cuenta comparten el estado de despliegue. El contenido conserva su posición. En pantallas táctiles grandes el menú se mantiene completo.
- Móvil: encabezado compacto con marca centrada y botón de menú, barra inferior con íconos y panel lateral completo. «Más» se ancla al bloque de cuenta. Se incluyen los radios Claro/Oscuro en el recorrido de Tab y se conservan Escape y el retorno del foco.
- Tema: paleta oscura en superficies, campos, bordes, textos, estados, diálogos y avisos. Los colores claros se mantienen mediante `light-dark()`. El tema también se hereda en los portales montados en el cuerpo del documento.
- Perfiles del usuario y del profesional: identidad centrada. Menú y barra inferior usan la foto vigente de la cuenta, con iniciales cuando falta o falla; el guardado de foto actualiza ambos accesos.
- Notificaciones: campana rellena y marcada mientras el panel está abierto. Panel limitado a 20rem de ancho y 24rem de alto, adaptado al espacio de la pantalla; ya no ocupa todo su alto.
- Asistente: se retira el bloque Categorías y el enlace duplicado Pedir recomendación del nav. Se conservan las tarjetas de acción, las sugerencias, los consejos y las rutas de inicio de pregunta.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Suite frontend completa | 56 archivos, 513 pruebas aprobadas |
| Regresión de Tab sobre los radios del tema | Aprobada; antes volvía a Cerrar menú |
| Estado activo de la campana al abrir/cerrar | Aprobado |
| Foto compartida entre nav y barra, actualización y fallo de imagen | Aprobado |
| Ausencia de Categorías y Pedir recomendación en las vistas correspondientes | Aprobada |
| Persistencia del tema y propagación `data-tema` | Aprobada |
| ESLint | Sin errores; permanece una advertencia de Fast Refresh en Mensajes.jsx del PR #82 |
| Compilación Vite | Aprobada; permanece la advertencia de tamaño del paquete principal |
| Vista y API local por puerto 5182 | HTTP 200 en `/` y `/api/especialidades` |

Las pruebas de interfaz usan JSDOM y servicios simulados. La respuesta de la API local comprueba conectividad; no acredita una nueva ejecución completa contra MySQL ni el envío de correos. No se modificaron los resultados de los CP oficiales, las horas, las aceptaciones o los documentos Office.

## Revisión visual pendiente

El control nativo de Chrome devolvió errores de geometría y lecturas lentas. No se completó el recorrido visual de todas las vistas en móvil y escritorio ni se acredita contraste medido en todos los estados. Se mantiene el PR como borrador hasta esa comprobación.

Recorrer con tema claro y oscuro: Inicio, Profesionales y su ficha/filtros, Centros de salud y su ficha, Gimnasios y su ficha, Asistente, Comidas, Mi perfil (cuatro secciones), Favoritos, Mis citas y Mensajes. Revisar además las cuatro secciones del perfil profesional. A 390px comprobar encabezado, menú lateral, Más, radios de tema, notificaciones y barra inferior; a 1280px comprobar logo contraído/desplegado, foto del perfil y ausencia de desplazamiento del contenido. Incluir pantalla táctil grande y movimiento reducido.

Esta evidencia complementa SC-40 sin asignar nuevos identificadores a las planillas oficiales. El registro de SC-40 y CP-249/250 en sus Excel, preparado antes de integrar #80/#81, debe conciliarse con las versiones vigentes en una tarea documental posterior.
