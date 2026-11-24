// La vitrina continúa con el cursor encima y pausa cuando recibe el foco.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import VitrinaObjetivos from './VitrinaObjetivos.jsx';

beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
afterEach(() => vi.unstubAllGlobals());

const vitrina = () => document.querySelector('.vitrina');
const avanza = () => vitrina().hasAttribute('data-avanza');

test('solo el foco pausa; al salir reanuda aunque el cursor siga dentro', () => {
  render(<MemoryRouter><VitrinaObjetivos /><button type="button">Fuera</button></MemoryRouter>);
  expect(avanza()).toBe(true);

  fireEvent.mouseEnter(vitrina());
  expect(avanza()).toBe(true);
  act(() => screen.getAllByRole('button', { pressed: false })[0].focus());
  expect(avanza()).toBe(false);

  act(() => screen.getByRole('button', { name: 'Fuera' }).focus());
  expect(avanza()).toBe(true);
});

test('entrar y salir con el cursor no detiene la rotación', () => {
  render(<MemoryRouter><VitrinaObjetivos /></MemoryRouter>);
  fireEvent.mouseEnter(vitrina());
  expect(avanza()).toBe(true);
  fireEvent.mouseLeave(vitrina());
  expect(avanza()).toBe(true);
});
