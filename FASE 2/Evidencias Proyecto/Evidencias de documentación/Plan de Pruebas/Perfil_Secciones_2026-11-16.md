# Perfil del profesional: especialidad en «Información personal», lugar de atención aparte y Certificaciones compacta

16-11-2026. Pedidos del Product Owner (Rodrigo Cárcamo) sobre el perfil del profesional, en dos revisiones del mismo día.

1. «Especialidad y lugar de atención» ocupaba mucho espacio. Primero se separó en dos secciones, «Especialidad» y «Lugar de atención». Después el PO pidió quitar la sección «Especialidad»: el selector de especialidad pasa a «Información personal» y la descripción de la atención se elimina, porque «Tu presentación» ya cumple ese papel. Fuera del perfil, en el buscador y en el mapa, la presentación se muestra resumida.
2. En Certificaciones la letra se veía muy grande y había que bajar mucho para verla entera. El PO preguntó para qué sirve el «Historial de verificación» y pidió dejarlo plegado.
3. «Lugar de atención» debía quedar lo más compacto posible.

La rama `feat/perfil-secciones` parte de `feat/fotos-y-graficos` (PR #62, que a su vez parte del #61), porque ambos cambian el buscador y la ficha pública. El orden de fusión es #57, #61, #62 y este.

Es un ajuste dentro de la **SC-36**, que aún no se fusiona. Agrega los casos **CP-226 a CP-229**.

## Qué cambia

### Información personal
- El selector **«Especialidad (obligatorio)»** va junto al nombre, el teléfono y la presentación. Se guarda con el mismo botón («Guardar datos personales»). Si cambian los datos y la especialidad, el aviso lo dice en una sola frase.
- Con ficha, la especialidad se guarda en ella y el lugar de atención se reenvía tal como está guardado. Si la ubicación guardada no es válida (fichas anteriores a la SC-24), no se guarda y se explica por qué.
- Si el perfil está verificado y se elige otra especialidad, avisa que cambiarla quita la verificación. La API ya la quitaba y pedía documentos de la nueva especialidad; ahora se avisa antes.
- La especialidad que tenía la ficha se sigue ofreciendo aunque el administrador la haya desactivado (FS-HU-30).

### Lugar de atención
- Solo pide la modalidad (presencial, online o ambas), la comuna, la dirección y el mapa.
- En un panel ancho, los campos van a la izquierda y el mapa a la derecha. En una pantalla de 1280 × 900, la sección termina en el píxel 798.
- Al guardar, reenvía la especialidad y la descripción guardadas.
- Una profesional nueva elige primero su especialidad en «Información personal» («Elegiste Nutrición. Se guardará en tu ficha cuando completes «Lugar de atención»»). La ficha se crea aquí, en el **último paso**, que muestra la especialidad elegida con un botón «Cambiar». Sin especialidad no guarda y ofrece ir a elegirla.
- El menú queda así: Información personal, Lugar de atención, Experiencia y formación, y Certificaciones.

### La presentación en lugar de la descripción
- Las tarjetas del buscador y el detalle del mapa muestran la presentación **resumida**: unos 160 caracteres, cortados en una palabra completa y con «…». Completa, solo en el perfil.
- La ficha pública ya no repite «Sobre su atención»: la presentación va en «Conoce a…».
- La búsqueda por palabra clave busca en la presentación, ya no en la descripción. La API no expone la descripción en el listado ni en la ficha pública, pero la conserva en la base de datos.
- En Inicio, la tarea «Agrega una descripción a tu ficha» pasa a ser «Agrega tu presentación».

### Certificaciones
- Usa la misma letra que el resto del perfil.
- El estado va en una línea: «Sin solicitud enviada», «En revisión», «Verificado» o «Rechazado».
- Cada documento es una fila corta: nombre, si es obligatorio, si está adjunto (con el enlace para descargar el último archivo) y los botones «Elegir archivo» y «Adjuntar» o «Reemplazar».
- Las indicaciones de formato y privacidad van en una sola nota.
- El RUT y el teléfono van lado a lado, con el botón «Enviar» al lado de la ayuda.
- En una pantalla de 1280 × 900, la sección termina en el píxel 872.

### Historial de verificación
- Es el registro, con fecha, de lo que ha pasado con la verificación: documentos subidos, solicitudes enviadas y las decisiones del administrador (aprobada, rechazada con su motivo o revocada).
- Ahora va **plegado**, con un botón «Historial de verificación (N)». Al abrirlo explica para qué sirve.
- El movimiento que la API registra al cambiar la especialidad, que antes se veía como «cambio especialidad», ahora se llama «Especialidad cambiada: hay que verificar de nuevo».

## Casos de prueba reservados

| Caso | Comprobación | Evidencia |
| --- | --- | --- |
| CP-226 | «Información personal» incluye la especialidad, sin la descripción, y la guarda con su botón. En la ficha se conserva el lugar de atención. Avisa si el cambio quita la verificación. Una ubicación guardada no válida lo impide y se explica. | PerfilProfesional.test.jsx y Edge real |
| CP-227 | «Lugar de atención» solo pide la modalidad, la comuna, la dirección y el mapa, con el mapa al lado en un panel ancho, y reenvía la especialidad y la descripción guardadas. Una profesional nueva crea ahí su ficha con la especialidad elegida; sin especialidad, se la lleva a elegirla. | FormularioFicha.test.jsx, PerfilProfesional.test.jsx y Edge real |
| CP-228 | El buscador y el mapa muestran la presentación resumida. La ficha pública no repite «Sobre su atención». La palabra clave se busca en la presentación. Inicio sugiere agregar la presentación si falta. | profesional.api.test.js, profesional.service.test.js, profesional.model.test.js, MapaProfesionales.test.jsx, FichaProfesional.test.jsx, EspacioProfesional.test.jsx y Edge real |
| CP-229 | Certificaciones es compacta y cabe en 1280 × 900. El historial empieza plegado, explica para qué sirve y nombra el cambio de especialidad. | Certificaciones.test.jsx y Edge real |

## Resultados

- **Frontend (Vitest):** 465/465 tras unir la corrección del #61 (guardado al mover el marcador), con lint y compilación correctos. Antes: 462/462 sobre la rama combinada con el #62 y 457/457 sin combinar.
- **Backend (Jest):** 614/614 sobre la rama combinada (608/608 antes), con lint correcto. Las pruebas nuevas cubren la presentación resumida en el listado, el resumen en palabras completas y la búsqueda en la presentación (sin la descripción).
- **Edge real** (sin interfaz, con la API, MySQL y Nominatim reales). Se usaron cuentas temporales que se borraron al terminar.
  - El menú mostró las cuatro secciones. «Información personal» trajo la especialidad guardada y no muestra la descripción.
  - Al cambiar a Kinesiología, la ficha conservó San Antonio, «Avenida Barros Luco 1575» y la modalidad «ambas».
  - «Lugar de atención» quedó en dos columnas de 261 y 319 px.
  - Certificaciones midió 617 px, con letra de 14,4 px y el historial plegado. Al abrirlo mostró «Especialidad cambiada: hay que verificar de nuevo».
  - La tarjeta del buscador mostró la presentación resumida, terminada en «cocinar…». La búsqueda «trail running», que solo está en la presentación, encontró a la profesional.
  - La ficha pública no muestra «Sobre su atención» y sí muestra «Conoce a…».
  - Una profesional nueva eligió Nutrición en «Información personal», siguió al último paso, eligió «Online» y la ficha quedó creada.
  - En el celular no hubo desborde horizontal.

## Pendiente

- Registrar los casos CP-226 a CP-229 en la Planilla junto con la SC-36, después de fusionar los PR #57 y #60.
- En el DAS (FS-HU-04), anotar que la descripción de la ficha dejó de pedirse y de mostrarse, y que en su lugar se usa la presentación de la cuenta.
- La aceptación del PO.

## Capturas

- `Perfil_Secciones_2026-11-16_informacion_especialidad_1280.png`: «Información personal» con la especialidad.
- `Perfil_Secciones_2026-11-16_lugar_1280.png`: «Lugar de atención» con el mapa al lado.
- `Perfil_Secciones_2026-11-16_nueva_ultimo_paso_1280.png`: profesional nueva en el último paso.
- `Perfil_Secciones_2026-11-16_certificaciones_1280.png` y `..._certificaciones_celular.png`: Certificaciones compacta, con el historial plegado.
