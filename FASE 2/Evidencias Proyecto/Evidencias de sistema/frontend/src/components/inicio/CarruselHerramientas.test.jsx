import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import CarruselHerramientas from './CarruselHerramientas.jsx';

let animaciones, preferencia, interseccion;
beforeEach(() => {
  animaciones = [];
  preferencia = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preferencia);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { interseccion = callback; }
    observe() {} disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () { return this.children.length * 300; });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function () { return [...(this.parentElement?.children ?? [])].indexOf(this) * 300; });
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    constructor(nombre, opciones) { super(nombre, opciones); Object.assign(this, { pointerId: opciones?.pointerId ?? 1, isPrimary: opciones?.isPrimary ?? true, pointerType: opciones?.pointerType ?? 'mouse' }); }
  });
  HTMLElement.prototype.animate = vi.fn(() => {
    const animacion = { currentTime: 0, play: vi.fn(), pause: vi.fn(), cancel: vi.fn() };
    animaciones.push(animacion); return animacion;
  });
});
afterEach(() => { delete HTMLElement.prototype.animate; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function preparar() {
  const pulsar = vi.fn((evento) => evento.preventDefault());
  const vista = render(<CarruselHerramientas>{['Profesionales', 'Comidas', 'Asistente IA'].map((nombre) => <article key={nombre}><h3>{nombre}</h3><a href="#herramienta" onClick={pulsar}>Explorar {nombre}</a></article>)}</CarruselHerramientas>);
  const raiz = screen.getByRole('region', { name: 'Herramientas de FitSearch' });
  const ventana = raiz.querySelector('.carrusel-herramientas__ventana');
  const fila = raiz.querySelector('.portada__herramientas');
  ventana.scrollTo = vi.fn();
  act(() => interseccion([{ isIntersecting: true }]));
  return { ...vista, ventana, fila, pulsar, animacion: animaciones.at(-1) };
}

test('inicia una cinta continua lineal e infinita al entrar en pantalla', () => {
  const { animacion, fila } = preparar();
  expect(fila.animate).toHaveBeenCalledWith([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-900px,0,0)' }], { duration: 20000, iterations: Infinity, easing: 'linear' });
  expect(animacion.play).toHaveBeenCalled();
  expect(screen.getAllByRole('link')).toHaveLength(3);
  const copias = fila.querySelectorAll('[data-copia-herramienta]');
  expect(copias).toHaveLength(3);
  for (const copia of copias) {
    expect(copia).toHaveAttribute('aria-hidden', 'true');
    expect(copia.querySelector('a')).toHaveAttribute('tabindex', '-1');
  }
});

test('retirar el mouse no reanuda mientras el foco siga dentro', () => {
  const { ventana, animacion } = preparar();
  fireEvent.pointerEnter(ventana, { pointerType: 'mouse' });
  fireEvent.focus(screen.getByRole('link', { name: 'Explorar Comidas' }));
  animacion.play.mockClear();
  fireEvent.pointerLeave(ventana, { pointerType: 'mouse' });
  expect(animacion.play).not.toHaveBeenCalled();
  expect(animacion.currentTime).toBeCloseTo(20000 / 3);
  fireEvent.blur(screen.getByRole('link', { name: 'Explorar Comidas' }), { relatedTarget: document.body });
  expect(animacion.play).toHaveBeenCalledTimes(1);
});

test('pausa y reanuda sin reiniciar; se detiene fuera de pantalla y en pestaña oculta', () => {
  const { animacion } = preparar();
  animacion.currentTime = 7000;
  fireEvent.click(screen.getByRole('button', { name: 'Pausar carrusel de herramientas' }));
  expect(screen.getByRole('button', { name: 'Reanudar carrusel de herramientas' })).toHaveAttribute('aria-pressed', 'true');
  expect(animacion.pause).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reanudar carrusel de herramientas' }));
  expect(animacion.currentTime).toBe(7000);
  expect(animacion.play).toHaveBeenCalled();
  animacion.pause.mockClear();
  act(() => interseccion([{ isIntersecting: false }]));
  expect(animacion.pause).toHaveBeenCalledTimes(1);
  act(() => interseccion([{ isIntersecting: true }]));
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  expect(animacion.pause).toHaveBeenCalledTimes(2);
});

test('las flechas recorren y cierran el ciclo en ambos sentidos', () => {
  const { ventana, animacion } = preparar();
  fireEvent.click(screen.getByRole('button', { name: 'Ver herramientas anteriores' }));
  expect(animacion.currentTime).toBeCloseTo(40000 / 3);
  fireEvent.click(screen.getByRole('button', { name: 'Ver herramientas siguientes' }));
  expect(animacion.currentTime).toBeCloseTo(0);
  fireEvent.keyDown(ventana, { key: 'ArrowRight' });
  expect(animacion.currentTime).toBeCloseTo(20000 / 3);
});

test('arrastra la cinta sin abrir un enlace al soltar y después permite pulsarlo', () => {
  const { ventana, fila, animacion, pulsar } = preparar();
  fireEvent.pointerDown(ventana, { clientX: 300, clientY: 10 });
  fireEvent.pointerMove(ventana, { clientX: 210, clientY: 12 });
  expect(animacion.currentTime).toBeCloseTo(2000);
  expect(ventana).toHaveClass('carrusel-herramientas__ventana--arrastrando');
  fireEvent.pointerUp(ventana, { clientX: 210, clientY: 12 });
  const enlace = fila.querySelector('[data-copia-herramienta="1"] a');
  fireEvent.click(enlace);
  expect(pulsar).not.toHaveBeenCalled();
  fireEvent.pointerDown(enlace);
  fireEvent.pointerUp(enlace);
  fireEvent.click(enlace);
  expect(pulsar).toHaveBeenCalledTimes(1);
});

test('con movimiento reducido conserva el recorrido manual sin animación ni copias', () => {
  preferencia.matches = true;
  const { ventana, fila } = preparar();
  expect(fila.animate).not.toHaveBeenCalled();
  expect(fila.children).toHaveLength(3);
  expect(screen.queryByRole('button', { name: 'Pausar carrusel de herramientas' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver herramientas siguientes' }));
  expect(ventana.scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'auto' });
});

test('conserva la fase al redimensionar y libera animación, copias y observadores al desmontar', () => {
  const { animacion, fila, unmount } = preparar();
  animacion.currentTime = 5000;
  fireEvent.resize(window);
  expect(animacion.cancel).toHaveBeenCalled();
  expect(animaciones.at(-1).currentTime).toBeCloseTo(5000);
  expect(fila.children).toHaveLength(6);
  const ultima = animaciones.at(-1);
  unmount();
  expect(ultima.cancel).toHaveBeenCalled();
  expect(fila.children).toHaveLength(3);
});

test('cambiar la preferencia de movimiento cancela la cinta y elimina las copias', () => {
  const { animacion, fila } = preparar();
  preferencia.matches = true;
  act(() => preferencia.addEventListener.mock.calls.find(([nombre]) => nombre === 'change')[1]());
  expect(animacion.cancel).toHaveBeenCalled();
  expect(fila.children).toHaveLength(3);
  expect(screen.queryByRole('button', { name: 'Pausar carrusel de herramientas' })).not.toBeInTheDocument();
});
