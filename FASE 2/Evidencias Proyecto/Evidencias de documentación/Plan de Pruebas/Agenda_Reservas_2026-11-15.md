# Agenda del profesional: estados de las horas pasadas, pestañas y reservas del día

15-11-2026. Pedidos del Product Owner (Rodrigo Cárcamo) al revisar «Mi agenda» del profesional, en dos revisiones del mismo día. La rama `feat/agenda-reservas` parte de `main` y no depende de los PR abiertos. Se registrará como **SC-38** en la Matriz de control de cambios, con los casos **CP-215 a CP-225** en la Planilla, junto con la SC-36 y la SC-37.

## Qué se observó

Con la cuenta de Juanito (profesional), el calendario mostraba en verde, como «Confirmada · ya pasó», una reserva que en la lista de abajo aparecía por confirmar. No era un error de datos: eran tres reservas distintas de la misma persona.

| Fecha | Estado | Cómo se veía |
| --- | --- | --- |
| 11-11 | Pendiente; ya había pasado | «Por confirmar · ya pasó» |
| 14-11 | Confirmada; ya había pasado | Verde, «Confirmada · ya pasó» |
| 24-11 | Pendiente; era futura | Solo en la lista de abajo, porque está en otra semana |

«Ya pasó» significaba que la hora de inicio había pasado, pero no decía si la cita se hizo o no.

## Qué cambia

| Pedido | Cómo quedó |
| --- | --- |
| Que las horas pasadas digan qué pasó, con colores para cada estado | La agenda usa los mismos criterios que Reportes. Una reserva confirmada cuya hora ya comenzó es **Realizada** (verde oscuro). Una que no se confirmó antes de su hora es **No realizada** (rojo). Lo que viene es **Por confirmar** (naranjo), **Confirmada** (verde claro) o **Libre** (celeste). Un día **Bloqueado** va en gris rayado, y un horario pasado sin reservas, apagado. La leyenda muestra los seis colores. El detalle explica el estado («La reserva no se confirmó antes de la hora de la cita») y solo ofrece Confirmar o Cancelar en las horas que vienen. «Mis citas» del usuario y la lista de reservas usan los mismos textos y colores. |
| Achicar el calendario para verlo entero sin desplazarse | El alto de cada hora se calcula según el espacio que queda en la pantalla, entre 24 y 64 px. En una pantalla de 1366 × 768 la semana completa queda a la vista. Si ni con el mínimo cabe (pantallas muy bajas), el calendario se desplaza por dentro y la página queda quieta. El rango base pasó de 07:00–21:00 a 08:00–20:00 (`shared/reglas.json`, `agenda.vistaSemana`). Como antes, se amplía si hay horarios más temprano o más tarde. Los bloques bajos muestran una sola línea; la hora y el estado siguen en la etiqueta para lectores de pantalla, en el texto al pasar el mouse y en el detalle. |
| Separar «Mi agenda» de las reservas, que estaban al final de la página | Junto al título hay dos pestañas: **Calendario** y **Reservas**, con un contador de las que faltan confirmar. La pestaña Reservas muestra la lista de reservas recibidas (Próximas, y Todas e historial). Para el profesional, las por confirmar van primero. La pestaña elegida queda en la dirección (`?vista=reservas`). Las pestañas se recorren con las flechas, Inicio y Fin. |
| Ver todas las reservas del día, sin buscarlas en el calendario, y poder elegir otros días | El costado muestra **Reservas del día**: todas las del día (cualquier estado), ordenadas por hora, con el nombre, el estado y la modalidad, y cuántas reservas y horas libres hay. Empieza en hoy. El día se cambia con las flechas, con el selector de fecha, tocando un día en la cabecera del calendario o con «Ir a hoy». Un día de otra semana lleva el calendario a esa semana. Al tocar una reserva se abre su detalle para confirmarla o cancelarla. En el celular, el calendario ya muestra la lista del día elegido, así que el costado no la repite. |

### Segunda revisión del PO

| Pedido | Cómo quedó |
| --- | --- |
| Con el detalle de una persona abierto, tocar otro día no mostraba sus reservas. Lo mismo pasaba después de tocar una casilla vacía. | Tocar un día en la cabecera del calendario, o en los días del celular, cierra lo que esté abierto (el detalle o el formulario) y muestra de inmediato las reservas de ese día. |
| Marcar con color la casilla que se tocó | La casilla elegida aparece como un bloque «Nuevo horario» en azul, con borde punteado. Sigue lo que dice el formulario: si cambia la hora, el bloque se mueve, y desaparece al publicar o cerrar. La persona elegida lleva un borde azul más grueso. |
| En pantallas más chicas, que las reservas del día y «Por confirmar» suban, como el detalle | Antes, bajo unos 1200 px de ancho (por ejemplo, un notebook con el zoom de Windows al 125 %), el resumen quedaba bajo el calendario. Ahora el costado va siempre arriba. Entre el celular y el escritorio, el resumen va en dos columnas para ocupar poco alto. En el celular, «Por confirmar» queda arriba; la lista del día sigue en el propio calendario. Si el calendario empieza muy abajo, su alto se calcula para verlo entero al bajar hasta él. |
| Historial de la más reciente a la más antigua | «Todas e historial» se ordena por la fecha de la cita, de la más nueva a la más antigua, y el conteo lo dice. «Próximas» sigue de la más cercana a la más lejana, con las por confirmar primero. |
| Buscador y filtro, también por fecha, en Reservas y en «Mis citas» | Hay tres controles: un buscador por nombre (de la persona para el profesional, del profesional para el usuario) que ignora tildes y mayúsculas; un filtro por estado; y un filtro por fecha de la cita (Cualquiera, Hoy, Esta semana, Este mes, Mes pasado o Elegir fechas, con «Desde» y «Hasta»). Se muestra el conteo y el botón «Limpiar filtros». Si no hay resultados, la lista lo dice y ofrece limpiar los filtros. En «Próximas», los estados y períodos que no aplican (canceladas, realizadas, mes pasado) no aparecen y vuelven a «Todos». |

## Casos de prueba reservados

| Caso | Comprobación | Evidencia |
| --- | --- | --- |
| CP-215 | Las horas pasadas se muestran como Realizada (confirmada) o No realizada (no confirmada), con su color, su explicación en el detalle y sin acciones. Ya no aparece «ya pasó». | AgendaSemanal.test.jsx y Edge real |
| CP-216 | La leyenda muestra Libre, Por confirmar, Confirmada, Realizada, No realizada y Bloqueado, y cada horario lleva el color de su estado (también un horario libre de un día bloqueado). | AgendaSemanal.test.jsx y Edge real |
| CP-217 | La semana completa cabe en una pantalla de 1366 × 768 sin desplazarse. En una pantalla más baja, el calendario se desplaza por dentro. | Edge real a 1366 × 768, 1920 × 1000 y 1280 × 640 |
| CP-218 | Las pestañas Calendario y Reservas separan el calendario de la lista. Reservas muestra el contador de por confirmar, deja esas primero y queda en la dirección. Las pestañas funcionan con teclado. | AgendaSemanal.test.jsx, Agenda.test.jsx y Edge real |
| CP-219 | Reservas del día lista todas las reservas del día por hora, con el estado y la modalidad, y las cifras del día. Se cambia de día con la cabecera, las flechas, la fecha o «Ir a hoy». Otro día de otra semana cambia la semana. Al tocar una reserva se abre su detalle. | AgendaSemanal.test.jsx y Edge real |
| CP-220 | En el celular (390 px), la agenda muestra el día con sus colores y la pestaña Reservas, sin desborde horizontal. | Edge real con emulación de celular |
| CP-221 | Con el detalle de una persona o el formulario de una casilla abiertos, tocar un día (en la cabecera o en el celular) los cierra y muestra las reservas de ese día. | AgendaSemanal.test.jsx y Edge real |
| CP-222 | La casilla tocada aparece como «Nuevo horario» y sigue las horas del formulario. La persona elegida lleva un borde más marcado. | AgendaSemanal.test.jsx y Edge real |
| CP-223 | Bajo unos 1200 px de ancho, el detalle, las reservas del día y «Por confirmar» van arriba del calendario (en dos columnas). En el celular, «Por confirmar» va arriba. | Edge real a 1093 × 614 y 390 × 844 |
| CP-224 | El historial va de la cita más reciente a la más antigua. El buscador (sin importar tildes) y los filtros por estado y fecha reducen la lista, con conteo, «Limpiar filtros» y aviso si no hay resultados. En «Próximas» no se ofrecen filtros que no aplican. | Agenda.test.jsx y Edge real |
| CP-225 | En «Mis citas», la persona usa el mismo orden y los mismos filtros, y busca por el nombre del profesional. | Agenda.test.jsx y Edge real |

## Resultados

- **Frontend (Vitest):** 441/441. Hay 7 pruebas nuevas: 5 de la agenda y 2 de la lista de reservas y citas. Se ajustaron 3 existentes: «1 cita» pasa a «1 reserva», la lista de reservas está en la pestaña Reservas y el estado se escribe con mayúscula inicial. Lint y compilación correctos.
- **Backend (Jest):** 583/583. No cambia el código del backend. Solo se probó de nuevo porque `shared/reglas.json` es compartido.
- **Edge real** (sin interfaz, con la API y MySQL reales). Se usaron una profesional y cuatro personas temporales, con reservas en todos los estados esta semana y la próxima, y un día bloqueado. Las horas pasadas se crearon directo en MySQL porque la API no deja reservar en el pasado. Las cuentas se borraron al terminar.
  - **1366 × 768:** el calendario va de 239 a 743 px (26 px por hora, 08:00 a 24:00) y no se desplaza. La semana siguiente va de 239 a 747 px (35 px por hora).
  - **1920 × 1000:** 41 px por hora, con la semana completa a la vista.
  - **1280 × 640:** llega al mínimo de 24 px por hora. El calendario termina en 623 px y se desplaza por dentro.
  - La semana actual mostró Realizada, No realizada, Sin reservas, Por confirmar y Libre. Las reservas del día de hoy aparecieron en orden: «08:30 Valentina, realizada, online» y «22:00 Tomás, por confirmar, presencial».
  - Al elegir el lunes de la semana siguiente, el costado mostró a Josefa (confirmada) y a Martín (por confirmar, primera visita). El viernes bloqueado se vio en gris rayado.
  - La pestaña Reservas mostró las tres por confirmar antes de la confirmada.
  - En el celular no hubo desborde horizontal.
- **Edge real, segunda revisión** (mismos datos temporales, creados de nuevo y borrados al terminar):
  - Con el detalle de Tomás abierto, tocar el martes 10 mostró sus reservas (Valentina, realizada).
  - Una casilla del martes 17 a las 14:00 quedó marcada como «14:00 Nuevo horario» con el formulario abierto. Al tocar el miércoles 18, el formulario se cerró, la marca desapareció y el costado mostró a Valentina, por confirmar.
  - A 1093 × 614, el costado quedó arriba en dos columnas de 371 px.
  - En el historial, las 9 reservas quedaron de la más reciente (18-11) a la más antigua (10-11). El filtro «Realizada» dejó 3.
  - En el celular, «Por confirmar» quedó arriba sin desborde.
  - En «Mis citas» de Valentina, el historial también fue de la más reciente a la más antigua.

## Pendiente

- Registrar la SC-38 y los casos CP-215 a CP-225 en la Matriz y la Planilla, junto con la SC-36 y la SC-37, después de fusionar los PR #57 y #60.
- La aceptación del PO.

## Capturas

- `Agenda_Reservas_2026-11-15_semana_estados_1366.png`: la semana con todos los colores, la leyenda y las reservas de hoy.
- `Agenda_Reservas_2026-11-15_detalle_no_realizada_1366.png`: detalle de una reserva no realizada.
- `Agenda_Reservas_2026-11-15_reservas_del_dia_1366.png`: semana siguiente con el lunes elegido y el día bloqueado.
- `Agenda_Reservas_2026-11-15_pestana_reservas_1366.png`: pestaña Reservas con las por confirmar primero.
- `Agenda_Reservas_2026-11-15_semana_1920.png` y `..._pantalla_baja_1280x640.png`: el calendario en una pantalla grande y en una baja.
- `Agenda_Reservas_2026-11-15_calendario_celular.png` y `..._reservas_celular.png`: celular, con «Por confirmar» arriba y los filtros de Reservas.
- `Agenda_Reservas_2026-11-15_casilla_marcada_1366.png`: casilla elegida marcada como «Nuevo horario», con el formulario abierto.
- `Agenda_Reservas_2026-11-15_dia_tras_formulario_1366.png`: al tocar otro día se cierra el formulario y aparecen sus reservas.
- `Agenda_Reservas_2026-11-15_pantalla_intermedia_1093.png`: costado arriba en dos columnas.
- `Agenda_Reservas_2026-11-15_historial_1366.png` y `..._filtro_realizadas_1366.png`: historial de la más reciente a la más antigua, con buscador y filtros.
- `Agenda_Reservas_2026-11-15_mis_citas_1366.png`: «Mis citas» del usuario con los mismos filtros.
