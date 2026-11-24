// Posición del panel junto a su botón, conservándolo dentro de la pantalla.
export function posicionNotificaciones(ancla, panel, ventana) {
  const margen = 12;
  const separacion = 10;
  const ancho = panel.width;
  const alto = panel.height;
  const limitarX = (x) => Math.max(margen, Math.min(x, ventana.width - ancho - margen));
  const limitarY = (y) => Math.max(margen, Math.min(y, ventana.height - alto - margen));

  if (ancla.right + separacion + ancho <= ventana.width - margen) {
    return { left: ancla.right + separacion, top: limitarY(ancla.top) };
  }
  if (ancla.left - separacion - ancho >= margen) {
    return { left: ancla.left - separacion - ancho, top: limitarY(ancla.top) };
  }
  const debajo = ancla.bottom + separacion;
  const top = debajo + alto <= ventana.height - margen ? debajo : ancla.top - separacion - alto;
  return { left: limitarX(ancla.left), top: limitarY(top) };
}
