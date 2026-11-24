import { expect, test } from 'vitest';
import { posicionNotificaciones } from './posicionNotificaciones.js';

test('el panel sigue la posición de la campana en un nav contraído o desplegado', () => {
  const panel = { width: 320, height: 180 };
  const pantalla = { width: 1280, height: 800 };
  expect(posicionNotificaciones({ left: 16, right: 64, top: 430, bottom: 478 }, panel, pantalla)).toEqual({ left: 74, top: 430 });
  expect(posicionNotificaciones({ left: 16, right: 240, top: 430, bottom: 478 }, panel, pantalla)).toEqual({ left: 250, top: 430 });
});

test('cerca del borde inferior desplaza el panel hacia arriba sin sacarlo de pantalla', () => {
  expect(posicionNotificaciones({ left: 16, right: 64, top: 690, bottom: 738 }, { width: 320, height: 200 }, { width: 1280, height: 768 })).toEqual({ left: 74, top: 556 });
});

test('en móvil abre debajo o encima del botón según el espacio disponible', () => {
  const panel = { width: 320, height: 180 };
  const pantalla = { width: 390, height: 700 };
  expect(posicionNotificaciones({ left: 16, right: 300, top: 300, bottom: 348 }, panel, pantalla)).toEqual({ left: 16, top: 358 });
  expect(posicionNotificaciones({ left: 16, right: 300, top: 560, bottom: 608 }, panel, pantalla)).toEqual({ left: 16, top: 370 });
});
