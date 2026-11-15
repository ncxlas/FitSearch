# Mejoras de los perfiles y de la ficha pública del profesional

15-11-2026. Pedidos del Product Owner (Rodrigo Cárcamo) sobre los perfiles editables del PR #59 y la ficha pública del profesional. Rama `feat/perfiles-mejoras`, que parte de la rama del PR #57 (filtro por región, lista de comunas) porque usa sus regiones. Se registrará como **SC-36** en la Matriz de control de cambios, con los casos **CP-200 a CP-207** en la Planilla, después de fusionar los PR #57 y #60, que ya modifican esas planillas. La SC-35 y el CP-199 son del cambio del panel de filtros, que se trabaja aparte.

## Qué cambia

| Pedido | Cómo quedó |
| --- | --- |
| Al cambiar la foto, el botón de la cuenta (junto a la campanita) debe mostrarla en vez de las iniciales, para usuarios y profesionales | El botón muestra la foto propia en cuanto se acepta, sin recargar, y también al abrir la aplicación. Sin foto, o para el administrador, que no tiene perfil, siguen las iniciales. La foto vive solo en memoria y se olvida al cerrar sesión. |
| Confirmar la foto antes de guardarla y quitar el mensaje «Foto actualizada» | Al elegirla se abre un cuadro con la vista previa recortada: «¿Usar esta foto de perfil?», con «Aceptar foto» y «Cancelar». Solo al aceptarla se envía. El cuadro avisa que la foto se actualiza, por eso se quitó el mensaje. «Cancelar» o Escape la descartan, y si no se puede guardar el error queda en el cuadro. |
| Quitar el requerimiento calórico diario de «Mi perfil» | Ya no aparece en «Mi perfil». Se sigue viendo al terminar el asistente inicial y en el plan de alimentación de Comidas. |
| El cuadro «Perfil completo» solo cuando falte algo | Con el perfil completo no se muestra. Si falta una sección, aparece «Completa tu perfil» con un acceso a cada sección pendiente. |
| El perfil del profesional con el mismo flujo que el del usuario | Cuatro secciones, una a la vez: Información personal, Especialidad y lugar de atención, Experiencia y formación, y Certificaciones. Al elegir una se desmarca la anterior. Si aún no tiene ficha, abre directamente en la sección para completarla. |
| Un cuadro donde el profesional se presente | En Información personal, «Tu presentación» (hasta 500 caracteres, el mismo «Sobre mí» de la cuenta), con el aviso de que se muestra en su perfil público. |
| Ficha pública menos saturada: presentación, menú con su información, horas destacadas y, al final, calificaciones y reseñas | En ese orden. La cabecera muestra la comuna y la región, y un botón «Reservar una hora» que lleva a las horas. «Conoce a…» muestra la presentación. Un menú de pestañas (Información, Formación, Certificaciones y Lugar de atención) muestra una a la vez y se recorre con las flechas, Inicio y Fin. Las horas van en un recuadro destacado y las reseñas al final. En el celular las pestañas van en dos columnas, todas a la vista. |
| Lugar de atención en el mapa, sin esa opción si atiende solo online, y un botón pequeño para Google Maps | La pestaña «Lugar de atención» muestra la dirección, la comuna y la región, el mapa de FitSearch con el marcador y, debajo y discreto, «Abrir en Google Maps». Si atiende solo online la pestaña no existe. |
| Al mover el marcador de la dirección, que cambien la comuna y la dirección, y agregar la región | Al mover el marcador (arrastrándolo, con un clic o con las flechas), tras una pausa de 0,6 s la API busca la dirección de ese punto (`GET /api/profesionales/mi-ficha/ubicacion/punto`, búsqueda inversa de Nominatim, con el mismo turno de una consulta por segundo y la misma caché de un día). La comuna y la dirección se actualizan y la región aparece bajo la comuna. Si el profesional escribe en esos campos antes de que llegue la respuesta, gana lo escrito. Al guardar justo después de mover el marcador, primero se espera la dirección. |
| Listado de regiones y comunas entregado por el PO | Coincidía con `shared/regiones.json` (16 regiones y 346 comunas), salvo cuatro nombres: Llaillay, Tiltil, Marchihue y San Pedro de la Paz. Se usan esos nombres, se agregó el nombre completo de cada región («Región de Valparaíso») y las formas anteriores («Llay-Llay», «Til Til», «Marchigüe») se siguen reconociendo, también al filtrar. |

## Casos de prueba reservados

| Caso | Comprobación | Evidencia |
| --- | --- | --- |
| CP-200 | Foto con confirmación: vista previa, «Aceptar foto» guarda; «Cancelar» y Escape no envían nada; el error queda en el cuadro; sin «Foto actualizada» | PerfilEditable.test.jsx y Edge real |
| CP-201 | El botón de la cuenta muestra la foto en vez de las iniciales al aceptarla y al cargar, para usuario y profesional | PerfilEditable.test.jsx y Edge real, también tras recargar |
| CP-202 | «Mi perfil» sin requerimiento calórico ni «Perfil completo»; «Completa tu perfil» si falta una sección | PerfilEditable.test.jsx, Perfil.test.jsx y Edge real |
| CP-203 | Perfil del profesional en cuatro secciones, una a la vez, con «Tu presentación» | PerfilProfesional.test.jsx y Edge real |
| CP-204 | Ficha pública en orden: presentación, pestañas, horas destacadas y reseñas; pestañas con teclado; «Reservar una hora» lleva a las horas | FichaProfesional.test.jsx, MejorasUsuario.test.jsx y Edge real |
| CP-205 | Lugar de atención con mapa, comuna, región y enlace discreto a Google Maps; no aparece si atiende solo online | FichaProfesional.test.jsx y Edge real |
| CP-206 | Mover el marcador actualiza la comuna, la dirección y la región; lo escrito gana; guardar espera la dirección | FormularioFicha.test.jsx, geocodificacion.api.test.js y Edge real con Nominatim |
| CP-207 | Nombres del listado del PO, nombre completo de la región y formas anteriores reconocidas al filtrar | regiones.test.js y los modelos de profesionales y establecimientos |

## Resultados

- **Frontend (Vitest):** 448/448. Lint y compilación correctos.
- **Backend (Jest):** 605/605 y lint correcto. Pruebas nuevas de la búsqueda inversa con respuestas reales de Nominatim (Providencia, San Antonio y Puente Alto) y de la ficha pública con presentación y región.
- **Edge real** (sin interfaz, con la API, MySQL y Nominatim reales), con cuentas temporales de usuario y profesional que se borraron al terminar:
  - «Mi perfil» sin calorías ni «Perfil completo». La foto se acepta en el cuadro y aparece en el perfil y en el botón de la cuenta, también al recargar.
  - El perfil del profesional muestra las cuatro secciones y abre en Información personal.
  - Un clic en el mapa de la ficha (San Antonio) cambió la dirección de «Avenida Barros Luco 1575» a «3 Norte», con la comuna San Antonio y la Región de Valparaíso.
  - La ficha pública sigue el orden pedido. La pestaña del lugar muestra el mapa con el marcador y el enlace a Google Maps.
  - En celular (390 px) no hay desborde horizontal y las cuatro pestañas se ven completas.

## Pendiente

- Registrar la SC-36 y CP-200 a CP-207 en la Matriz y la Planilla, y el endpoint de la dirección de un punto en el DAS (vista de desarrollo y decisión D36), después de fusionar los PR #57 y #60.
- La aceptación del PO.

## Capturas

- `Perfiles_Mejoras_2026-11-15_perfil_usuario_1280.png` y `..._perfil_usuario_celular.png`: «Mi perfil» sin calorías ni «Perfil completo».
- `Perfiles_Mejoras_2026-11-15_aceptar_foto_1280.png` y `..._aceptar_foto_celular.png`: cuadro para aceptar la foto.
- `Perfiles_Mejoras_2026-11-15_foto_en_cuenta_1280.png`: la foto en el perfil y en el botón de la cuenta.
- `Perfiles_Mejoras_2026-11-15_profesional_secciones_1280.png`: perfil del profesional con sus cuatro secciones y su presentación.
- `Perfiles_Mejoras_2026-11-15_mapa_actualiza_direccion_1280.png`: la comuna, la dirección y la región actualizadas al mover el marcador.
- `Perfiles_Mejoras_2026-11-15_ficha_publica_1280.png`: ficha pública completa.
- `Perfiles_Mejoras_2026-11-15_ficha_lugar_1280.png` y `..._ficha_lugar_celular.png`: pestaña «Lugar de atención» con el mapa.
