import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import useMenuDesplegable from './useMenuDesplegable.js';

function Menu() {
  const { desplegado, propiedades } = useMenuDesplegable();
  return <><nav aria-label="Menú de prueba" data-expandido={desplegado} {...propiedades}><button type="button">Perfil</button></nav><button type="button">Contenido</button></>;
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const pasar = (ms) => act(() => vi.advanceTimersByTime(ms));

test('un clic no deja el menú abierto: se contrae al retirar el mouse', () => {
  render(<Menu />);
  const nav = screen.getByRole('navigation');
  const perfil = screen.getByRole('button', { name: 'Perfil' });
  fireEvent.mouseEnter(nav);
  pasar(120);
  expect(nav).toHaveAttribute('data-expandido', 'true');
  fireEvent.mouseDown(perfil);
  act(() => perfil.focus());
  fireEvent.click(perfil);
  fireEvent.mouseLeave(nav);
  expect(nav).toHaveAttribute('data-expandido', 'false');
  expect(perfil).toHaveFocus();
});

test('salir antes de que se abra cancela la apertura pendiente', () => {
  render(<Menu />);
  const nav = screen.getByRole('navigation');
  fireEvent.mouseEnter(nav);
  pasar(60);
  fireEvent.mouseLeave(nav);
  pasar(5000);
  expect(nav).toHaveAttribute('data-expandido', 'false');
  fireEvent.mouseEnter(nav);
  pasar(120);
  expect(nav).toHaveAttribute('data-expandido', 'true');
  fireEvent.mouseLeave(nav);
  expect(nav).toHaveAttribute('data-expandido', 'false');
});

test('el teclado mantiene las opciones visibles mientras el foco siga dentro', () => {
  render(<Menu />);
  const nav = screen.getByRole('navigation');
  const perfil = screen.getByRole('button', { name: 'Perfil' });
  act(() => perfil.focus());
  fireEvent.keyDown(perfil, { key: 'Tab' });
  fireEvent.mouseLeave(nav);
  pasar(3000);
  expect(nav).toHaveAttribute('data-expandido', 'true');
  act(() => screen.getByRole('button', { name: 'Contenido' }).focus());
  expect(nav).toHaveAttribute('data-expandido', 'false');
});

test('usar el mouse después del teclado permite que vuelva a contraerse', () => {
  render(<Menu />);
  const nav = screen.getByRole('navigation');
  const perfil = screen.getByRole('button', { name: 'Perfil' });
  act(() => perfil.focus());
  fireEvent.keyDown(perfil, { key: 'Tab' });
  expect(nav).toHaveAttribute('data-expandido', 'true');
  fireEvent.mouseEnter(nav);
  pasar(120);
  fireEvent.mouseDown(perfil);
  fireEvent.click(perfil);
  fireEvent.mouseLeave(nav);
  expect(nav).toHaveAttribute('data-expandido', 'false');
});
