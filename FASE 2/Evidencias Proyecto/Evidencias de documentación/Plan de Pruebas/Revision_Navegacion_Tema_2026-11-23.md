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
| Suite frontend completa | 58 archivos, 524 pruebas aprobadas |
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


## Ajustes posteriores de la misma revisión

El nav y la barra móvil comparten ahora el fondo del cuerpo sin separadores. Las opciones se centran verticalmente en escritorio y Más permanece al pie. El recuadro al pasar el mouse usa el mismo tono que la opción marcada, tanto en claro como en oscuro.

El panel de notificaciones se ancla al rectángulo real de la campana: abre a su lado si hay espacio, o debajo/encima en móvil. Se mantiene dentro de la pantalla y recalcula al desplegar el menú, desplazarlo, cambiar el tamaño de ventana o variar el tamaño del panel. Los íconos laterales son de 26px, la barra móvil y Más de 28px, y la foto de acceso al perfil de 28px.

Comprobación de esta ronda: 20 pruebas focalizadas aprobadas (incluyen posición en nav contraído/desplegado, borde inferior y móvil), lint sin errores con la advertencia ya registrada y compilación aprobada. La última suite completa de la ronda anterior fue de 513 aprobadas; no se declara una nueva suite completa por sumar estos tres casos. Se conserva la revisión visual pendiente.


## Carrusel de herramientas de la portada

En la portada pública, «Más herramientas para tu bienestar» es una cinta horizontal de movimiento continuo y vuelta sin corte: muestra una tarjeta en móvil, dos desde 40rem, tres desde 64rem y cuatro desde 90rem. Avanza a 45px/s en ventanas del carrusel menores de 900px y a 70px/s en las mayores. Se puede arrastrar o recorrer con las flechas y pausar/reanudar. Se detiene con el foco dentro de la cinta, fuera de pantalla y en pestañas ocultas; con movimiento reducido solo se recorre manualmente. Conserva las cinco herramientas y sus destinos. Las copias visuales completan el ciclo sin repetir opciones para lectores de pantalla ni para Tab, y sus enlaces activan la herramienta correspondiente.

Se ejecutó de nuevo la suite completa: 58 archivos/524 pruebas aprobadas. Ocho casos del carrusel comprueban la animación lineal infinita, las pausas independientes de mouse/foco, Pausar/Reanudar y visibilidad, flechas y vuelta del ciclo, arrastre sin navegación accidental y enlaces de las copias, movimiento reducido, conservación de fase al redimensionar y limpieza, y cambio de preferencia durante la reproducción. Portada.test.jsx conserva la comprobación de las cinco herramientas y sus destinos. Compilación aprobada; lint sin errores con la advertencia de Fast Refresh ya indicada. La versión por intervalos queda sustituida por el movimiento continuo. No se acredita una revisión visual nueva.

El perfil del nav quedó debajo de Notificaciones. La tipografía general se amplió a 106,25%, moderando el texto del nav a .95rem. Las planillas oficiales y sus resultados permanecen sin cambios.


## Distribución de la portada — 24-11-2026

Después del hero, las secciones y el pie aprovechan el ancho de la ventana con márgenes laterales fluidos de 1rem a 4rem, sin el límite anterior de 1240px. En escritorio, los encabezados de especialidades y herramientas reparten título y descripción entre ambos lados; el asistente combina texto a la izquierda con una conversación más amplia a la derecha, y el bloque profesional sitúa el ejemplo a la izquierda y sus beneficios a la derecha. Desde 80rem, Cómo funciona distribuye su introducción y los tres pasos en dos columnas. En móvil se conserva la lectura vertical y el desplazamiento horizontal queda dentro de los carruseles.

Ajuste de dos hojas CSS. Comprobación de esta ronda: 22 pruebas de Portada y CarruselHerramientas aprobadas, y compilación correcta con la advertencia de tamaño del paquete ya registrada. La última suite completa continúa siendo de 58 archivos/524 pruebas; no se declara otra ejecución completa por este ajuste de distribución. Hoja de estilos local servida por el puerto 5182 con HTTP 200. El host de acceso al navegador permanece no disponible; sigue pendiente la comprobación visual de escritorio y móvil.


En el hero se retiraron los bordes dorados de ambas hojas, responsables de la línea central al entrar. Las hojas se solapan ligeramente para evitar una rendija de redondeo entre píxeles. La apertura conserva su comportamiento. Se recompiló después de este ajuste CSS; la revisión visual continúa pendiente.


### Movimiento y contorno del header — 24-11-2026

Las animaciones de la portada continúan al pasar el cursor: se retiró la pausa por hover de la cinta decorativa, la vitrina de objetivos y el carrusel de herramientas. Se conservan la pausa manual, la pausa al enfocar controles o enlaces y la preferencia de movimiento reducido. Las opciones del header y el acceso Iniciar sesión muestran un contorno tenue al pasar el mouse, sin subrayado; el foco de teclado mantiene su contorno visible.

Comprobación de esta ronda: 24 pruebas focalizadas de Portada, CarruselHerramientas y VitrinaObjetivos aprobadas. Las regresiones ahora comprueban que entrar o salir con el cursor no detiene la animación y que el foco conserva su pausa. Lint sin errores, con la advertencia heredada de Mensajes.jsx; compilación correcta, con la advertencia de tamaño del paquete ya registrada. La última suite completa registrada sigue siendo de 58 archivos/524 pruebas; no se declara una nueva suite completa. Revisión visual pendiente.
