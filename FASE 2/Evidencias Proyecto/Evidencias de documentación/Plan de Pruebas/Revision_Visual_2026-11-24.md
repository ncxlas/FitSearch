# Revisión visual de las pantallas nuevas (24-11-2026)

El Product Owner pidió revisar las pantallas de las mejoras del 24-11-2026 antes de cerrar.

- **Qué se revisó:** las pantallas de los bloques 2 a 6.
- **Cómo:** auditoría técnica (accesibilidad, rendimiento, tema, adaptación al celular y coherencia) y una pasada de pulido.
- **Con qué:** capturas reales de la aplicación, tomadas con un navegador automatizado y un detector de diseño.

**Datos de la revisión**

| Dato | Valor |
|---|---|
| Rama | `feat/pulido-visual` (sobre `feat/planes-por-chat`, PR #90) |
| Caso de prueba | **CP-281** |
| Defectos | **57** y **58** (cerrados) |
| Capturas | [Revision_Visual_2026-11-24](Revision_Visual_2026-11-24/) |

## Cómo se hizo

1. **Aplicación levantada:** backend en el puerto 3001 y Vite en el 5174, para no tocar el servidor de desarrollo, contra la base MySQL local.
2. **Datos de demostración:**
   - Dos cuentas de prueba: una persona y un nutricionista.
   - Para la persona: perfil, salud, una semana de comidas, 15 pesajes con meta, un plan de comidas propio y una cita pasada.
   - Para el nutricionista: un chat con la persona, permiso para ver cuatro categorías y dos planes enviados.
   - Las cuentas se borran al terminar.
3. **Recorrido:**
   - Las pantallas se recorrieron como persona y como profesional.
   - Cada una se revisó a 1366 px y a 390 px de ancho, con el tema claro y con el oscuro.
   - Se probaron guardar un plan, el enlace a Comidas y los diálogos.
4. **Detector de diseño:** se pasó sobre los 15 archivos de interfaz cambiados y no hubo hallazgos.

## Puntaje de la auditoría

| # | Dimensión | Antes | Después | Hallazgo principal |
|---|---|---|---|---|
| 1 | Accesibilidad | 2 | 3 | Contraste 2,47:1 de verde y rojo en el modo oscuro y títulos invisibles (defecto 58) |
| 2 | Rendimiento | 3 | 3 | Sin problemas; el gráfico de peso es SVG liviano |
| 3 | Tema | 2 | 3 | Colores fijos heredados del panel del perfil; los diálogos siguen claros en el modo oscuro hasta el PR #84 |
| 4 | Adaptación al celular | 2 | 3 | Pestañas de la ficha apiladas, tabla que no cabía y fecha y hora cortadas en el registro de accesos |
| 5 | Coherencia de la implementación | 3 | 4 | Tarjeta del plan anidada en la burbuja del chat; detector sin hallazgos |
| | **Total** | **12/20** | **16/20** | De «aceptable» a «bueno» |

## Hallazgos y correcciones

| Prioridad | Dónde | Qué pasaba | Corrección |
|---|---|---|---|
| P1 | Privacidad y datos (oscuro) | Títulos y nombre del profesional casi invisibles: heredaban un color fijo oscuro | Los bloques toman `--color-texto` (defecto 58) |
| P1 | Chat y Privacidad (oscuro) | Verde «Guardado» y rojo «Eliminar cuenta» con contraste 2,47:1 | En oscuro, #7fd1a6 (8,8:1) y #f2b8b5 (9,4:1) |
| P1 | Ficha del cliente | Códigos crudos («femenino», «7_8») y meta sin su código para el gráfico | Etiquetas de `shared/reglas.json`; la meta trae código y etiqueta (defecto 57) |
| P2 | Chat | La tarjeta del plan iba dentro de la burbuja: tarjeta dentro de tarjeta | La burbuja con plan es una sola superficie neutra y el plan va bajo una línea |
| P2 | Chat | Sin mensaje del profesional, el texto automático repetía la tarjeta | El adjunto marca `automatico` y el chat no repite el texto (sigue en la lista de chats) |
| P2 | Chat | «Guardar en mis planes» de 48 px y en dos líneas en el celular | Botón compacto de 40 px y «Ver en…» en su propia línea |
| P2 | Ficha del cliente | Pesajes en mosaicos que cortaban fecha y kilos | El mismo gráfico del historial de peso («Su peso») más la lista de pesajes |
| P2 | Ficha del cliente (celular) | Pestañas en tres filas; la columna Agua se cortaba | Pestañas en una fila deslizable; el % de la meta va bajo las calorías |
| P2 | Diálogos | El botón principal ocupaba todo el ancho y dejaba «Volver» o «Dejar de compartir» solo arriba | En escritorio los botones miden su texto; en el celular siguen a todo el ancho |
| P2 | Privacidad y datos | Bloques con borde dentro del panel: tarjetas anidadas que en el celular apretaban el texto | Secciones separadas por una línea; ícono más chico en el celular |
| P2 | Registro de accesos | «08:40 a. m.» se cortaba en dos líneas | Hora de 24 horas; en el celular la fecha va sobre el texto |
| P2 | Enviar plan de macronutrientes | «Carbohidratos (%)» en dos líneas desalineaba los campos | «Reparto de las calorías (%)» en el título; campos alineados |
| P3 | Plan de comidas | La presentación se estiraba junto a una lista más alta | `align-self: start` |

## Lo que queda fuera (no es de estos bloques)

- **Diálogos en el modo oscuro:** se ven claros porque se dibujan fuera de `.app`. El PR #84 (borrador del PO) ya propaga el tema al documento con `data-tema`. Los ajustes oscuros nuevos incluyen el selector `:root[data-tema="oscuro"]` para quedar listos.
- **Botón «Registrar comida» en el modo oscuro:** su texto blanco sobre azul claro tiene poco contraste. Es parte del tema general que corrige el PR #84.
- **Panel «Mensajes» flotante:** tapa el borde inferior derecho del contenido en algunas pantallas. Es un componente general, anterior a estos bloques.
- **Prueba inestable `Despedida`:** la prueba de foco con Tab falló una vez bajo carga. Está anotada en la evidencia del bloque 6.

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend `npm test` | 695/695 |
| `npm run test:mysql:compartir` | 20/20 (sexo con su nombre) |
| `npm run test:mysql:planes-chat` | 18/18 (texto automático marcado) |
| Frontend `npm test` | 539/539 (nueva: peso en la ficha del cliente) |
| Lint, build y detector de diseño | Sin errores ni hallazgos |

## Capturas

| Archivo | Qué muestra |
|---|---|
| `01_chat_persona_planes_recibidos.png` | Chat de la persona con un plan de comidas (con mensaje) y uno de macronutrientes (sin mensaje, sin texto repetido) |
| `02_dialogo_compartir_progreso.png` | Diálogo para compartir el progreso, con el aviso de la salud |
| `03_privacidad_y_datos.png` | Privacidad y datos con secciones separadas, accesos y registro |
| `04_historial_de_peso.png` | Historial de peso con su gráfico |
| `05_plan_de_comidas_oscuro.png` | Plan de comidas en el modo oscuro, con el plan recibido del nutricionista |
| `06_chat_movil_oscuro.png` y `07_privacidad_movil_oscuro.png` | El celular en el modo oscuro |
| `08_ficha_cliente_perfil.png` y `09_ficha_cliente_peso.png` | Progreso compartido en la ficha del cliente |
| `10_chat_profesional.png`, `11_enviar_plan_elegir.png` y `12_enviar_plan_macros_suma.png` | Chat y diálogo del profesional para enviar un plan, con el aviso de la suma |
