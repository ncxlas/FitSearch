# Fotos de perfil en toda la aplicación y detalle en los gráficos de Reportes

15-11-2026. Pedidos del Product Owner (Rodrigo Cárcamo) tras revisar el PR #61:

1. La foto de perfil no aparecía en Mensajes, ni para el usuario ni para el profesional. Debe aparecer en todos los lugares donde se muestra a una persona.
2. Los gráficos de Reportes del profesional, como «Reservas por semana», no se entendían. Deben dar el detalle al pasar el mouse o al tocarlos, como los demás gráficos de la aplicación.

El PO pidió un PR aparte para mantener el orden. La rama `feat/fotos-y-graficos` parte de `feat/perfiles-mejoras` (PR #61) y se fusiona después de los PR #57 y #61.

Se registrará como **SC-37** en la Matriz de control de cambios, con los casos **CP-208 a CP-214** en la Planilla, junto con la SC-36, después de fusionar los PR #57 y #60.

## Qué cambia

| Pedido | Cómo quedó |
| --- | --- |
| La foto en Mensajes, para el usuario y para el profesional | En la lista de conversaciones y en la cabecera del chat, cada persona ve la foto de la otra. Sin foto, o si la imagen no carga, se muestran las iniciales como antes. |
| La foto en todos los lugares donde aparece una persona | Se usa un mismo componente `Avatar` en todos esos lugares. **Usuario:** tarjetas del buscador y de Favoritos, detalle en el mapa, cabecera de la ficha pública (también en la vista previa del profesional), cuadro para reservar una hora, profesionales de un centro o gimnasio, y autores de las reseñas. **Profesional:** lista de Clientes e historial de cada cliente. **Administrador:** cola de verificaciones y últimas cuentas del dashboard, y los listados de usuarios, profesionales y verificaciones. |
| Que las listas no se vuelvan pesadas con las fotos | Las listas no llevan la foto, solo su dirección: `/api/fotos/<id>/<clave>`. La clave son los primeros 16 caracteres del SHA-256 de la imagen, así que cambia cuando cambia la foto. La ruta es pública, igual que la ficha. Responde la imagen con caché de un año (`immutable`). Responde 404 si la clave no coincide, si la cuenta no tiene foto o si la imagen guardada no es JPG, PNG ni WebP. El buscador y la ficha calculan la clave en MySQL (`LEFT(SHA2(foto, 256), 16)`), sin traer la imagen. El dashboard del administrador lee solo las fotos de las 5 fichas que muestra. |
| «Reservas por semana» con detalle al pasar el mouse o tocar | Ahora usa el mismo gráfico de columnas apiladas que el administrador. Al pasar el mouse, tocar o enfocar una semana se ve un recuadro con el rango de fechas, la cantidad de cada estado y el total. El eje tiene cantidades, la semana en curso va marcada y la tabla para lectores de pantalla suma la columna Total. El detalle ahora aparece también al tocar o hacer clic (`:focus`), no solo con el teclado (`:focus-visible`), en todos los gráficos de columnas. El anillo de foco sigue siendo solo para el teclado. |
| «Reservas por estado» con detalle | Al pasar el mouse, tocar o enfocar cada estado se ve cuántas reservas son del total y su porcentaje, por ejemplo «Realizadas: 4 de 7 reservas (57 %)». Es el mismo texto que leen los lectores de pantalla. |
| Que el gráfico se lea en el celular | Con 8 semanas o más en poco ancho, el eje nombra una semana sí y otra no (antes se enciman las fechas). Esto aplica desde 8 columnas en lugar de 9, y Reportes ahora es un contenedor de ancho para que la regla funcione ahí. El detalle de cada semana sigue completo en el recuadro y en la tabla. |

## Casos de prueba reservados

| Caso | Comprobación | Evidencia |
| --- | --- | --- |
| CP-208 | `GET /api/fotos/:usuarioId/:clave` entrega la imagen con su tipo y la caché inmutable. Responde 404 con clave errónea o vieja, sin foto, con id o clave inválidos y con un dato que no es imagen. No pide sesión. | foto.api.test.js |
| CP-209 | En Mensajes, cada participante ve la foto del otro en la lista y en la cabecera. Sin foto o si la imagen falla, aparecen las iniciales. | chat.service.test.js, Mensajes.test.jsx, Avatar.test.jsx y Edge real |
| CP-210 | El buscador, la ficha pública, la vista previa, el detalle en el mapa, el cuadro para reservar y las reseñas muestran la foto del profesional o del autor. | profesional.api.test.js, resena.api.test.js, profesional.service.test.js y Edge real |
| CP-211 | Los clientes del profesional, los profesionales de un centro y el panel del administrador muestran la foto. El dashboard lee solo las fotos que muestra. | actividadProfesional.service.test.js, establecimiento.api.test.js, establecimiento.model.test.js, estadisticasAdmin.service.test.js y Edge real (Clientes) |
| CP-212 | «Reservas por semana» muestra el detalle de cada semana (fechas, cada estado y el total) al pasar el mouse, tocar o enfocar. La semana en curso va marcada y la tabla accesible incluye el total. | Reportes.test.jsx y Edge real con mouse |
| CP-213 | «Reservas por estado» muestra la cantidad del total y el porcentaje al pasar el mouse, tocar o enfocar cada estado. | Reportes.test.jsx y Edge real con mouse |
| CP-214 | En el celular (390 px), tocar una semana muestra su detalle, las fechas del eje no se enciman con 8 semanas y no hay desborde horizontal. | Edge real con toque emulado |

## Resultados

- **Backend (Jest):** 611/611 y lint correcto. Las pruebas nuevas cubren la ruta de fotos y la foto del otro participante en los chats. También comprueban que la ficha pública arma la dirección de la foto desde la clave calculada en MySQL.
- **Frontend (Vitest):** 453/453. Lint y compilación correctos. Las pruebas nuevas cubren el componente `Avatar` (foto, iniciales y vuelta a las iniciales si la imagen falla), la foto en Mensajes y el detalle de los gráficos de Reportes.
- **Edge real** (sin interfaz, con la API y MySQL reales). Se usaron cuentas temporales de una profesional y de una usuaria, con fotos de prueba, una reserva y un mensaje. Las cuentas se borraron al terminar.
  - La usuaria ve la foto de la profesional en Mensajes (lista y cabecera), en el buscador y en la ficha.
  - La profesional ve la foto de la usuaria en Mensajes y en Clientes.
  - Todas las imágenes cargaron, sin ninguna rota. Las del buscador que estaban fuera de la pantalla cargan al acercarse (carga diferida) y la ruta respondió 200 con `image/jpeg`.
  - En Reportes, al pasar el mouse por la semana en curso aparece «Semana del 9 nov – 15 nov (en curso)» con cada estado y «Total 1». Al pasar por «Realizadas» aparece «0 de 1 reserva (0 %)».
  - En el celular, tocar la semana muestra el mismo detalle, el eje nombra una semana sí y otra no, y no hay desborde horizontal.

## Pendiente

- Registrar la SC-37 y los casos CP-208 a CP-214 en la Matriz y la Planilla.
- Actualizar el DAS:
  - Ajustar la decisión D40 y la descripción de `PUT /api/perfil/cuenta`, que hoy dicen que la foto «no se incorpora al directorio público». Desde este cambio se muestra a las demás personas mediante su dirección con clave.
  - Agregar `GET /api/fotos/:usuarioId/:clave` a la vista de desarrollo.

  Ambos pasos se harán después de fusionar los PR #57, #60 y #61, que ya modifican esas planillas y el DAS.
- La aceptación del PO.

## Capturas

- `Fotos_Graficos_2026-11-15_mensajes_usuario_1280.png`: Mensajes de la usuaria, con la foto de la profesional en la lista y en la cabecera.
- `Fotos_Graficos_2026-11-15_mensajes_profesional_1280.png` y `..._mensajes_profesional_celular.png`: Mensajes de la profesional, con la foto de la usuaria.
- `Fotos_Graficos_2026-11-15_buscador_1280.png`: tarjetas del buscador con la foto.
- `Fotos_Graficos_2026-11-15_ficha_1280.png`: cabecera de la ficha pública con la foto.
- `Fotos_Graficos_2026-11-15_clientes_1280.png`: lista de Clientes con la foto.
- `Fotos_Graficos_2026-11-15_reportes_semana_1280.png`: detalle de la semana en curso al pasar el mouse.
- `Fotos_Graficos_2026-11-15_reportes_estado_1280.png`: detalle de un estado al pasar el mouse.
- `Fotos_Graficos_2026-11-15_reportes_semana_celular.png`: detalle al tocar la semana en el celular, con el eje sin encimarse.
