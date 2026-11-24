import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import CarruselHerramientas from './CarruselHerramientas.jsx';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function preparar() {
  render(<CarruselHerramientas>{['Profesionales', 'Comidas', 'Asistente IA'].map((nombre) => <article key={nombre}><h3>{nombre}</h3><a href="#herramienta">Explorar {nombre}</a></article>)}</CarruselHerramientas>);
  const raiz = screen.getByRole('region', { name: 'Herramientas de FitSearch' });
  const fila = raiz.querySelector('.portada__herramientas');
  Object.defineProperties(fila, { clientWidth: { value: 600 }, scrollWidth: { value: 1200 }, scrollLeft: { value: 0, writable: true } });
  [...fila.children].forEach((tarjeta, indice) => Object.defineProperty(tarjeta, 'offsetLeft', { value: indice * 300 }));
  fila.scrollTo = vi.fn(({ left }) => { fila.scrollLeft = left; });
  fireEvent.resize(window);
  return { raiz, fila, scroll: fila.scrollTo };
}

test('avanza automáticamente por las tarjetas y vuelve al inicio al llegar al final', () => {
  const { fila, scroll } = preparar();
  act(() => vi.advanceTimersByTime(4500));
  expect(scroll).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
  act(() => vi.advanceTimersByTime(4500));
  expect(fila.scrollLeft).toBe(600);
  act(() => vi.advanceTimersByTime(4500));
  expect(fila.scrollLeft).toBe(0);
  expect(screen.getAllByRole('link')).toHaveLength(3);
});

test('retirar el mouse no reanuda mientras el foco siga dentro', () => {
  const { raiz, scroll } = preparar();
  const enlace = screen.getByRole('link', { name: 'Explorar Comidas' });
  fireEvent.mouseEnter(raiz);
  fireEvent.focus(enlace);
  fireEvent.mouseLeave(raiz);
  act(() => vi.advanceTimersByTime(9000));
  expect(scroll).not.toHaveBeenCalled();
  fireEvent.blur(enlace, { relatedTarget: document.body });
  act(() => vi.advanceTimersByTime(4500));
  expect(scroll).toHaveBeenCalledTimes(1);
});

test('permite pausar y reanudar, y se detiene con la pestaña oculta', () => {
  const { scroll } = preparar();
  fireEvent.click(screen.getByRole('button', { name: 'Pausar carrusel de herramientas' }));
  act(() => vi.advanceTimersByTime(9000));
  expect(scroll).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reanudar carrusel de herramientas' }));
  act(() => vi.advanceTimersByTime(4500));
  expect(scroll).toHaveBeenCalledTimes(1);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  fireEvent(document, new Event('visibilitychange'));
  act(() => vi.advanceTimersByTime(9000));
  expect(scroll).toHaveBeenCalledTimes(1);
});

test('con movimiento reducido solo se recorre manualmente', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { scroll } = preparar();
  act(() => vi.advanceTimersByTime(9000));
  expect(scroll).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Pausar carrusel de herramientas' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver herramientas siguientes' }));
  expect(scroll).toHaveBeenLastCalledWith({ left: 300, behavior: 'auto' });
});
