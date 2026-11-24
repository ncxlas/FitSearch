import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import NotificacionFlotante from './NotificacionFlotante.jsx';

afterEach(() => vi.useRealTimers());

test('desaparece después de seis segundos y no toma el foco', () => {
  vi.useFakeTimers();
  render(<><input aria-label="Nombre" /><NotificacionFlotante>Cambios guardados.</NotificacionFlotante></>);
  const campo = screen.getByLabelText('Nombre');
  campo.focus();
  act(() => vi.advanceTimersByTime(5999));
  expect(screen.getByRole('status')).toHaveTextContent('Cambios guardados.');
  expect(campo).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('pausa el cierre mientras el usuario lee o usa el botón con el teclado', () => {
  vi.useFakeTimers();
  render(<NotificacionFlotante>Datos guardados.</NotificacionFlotante>);
  const cerrar = screen.getByRole('button', { name: 'Cerrar notificación' });
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.mouseEnter(cerrar.parentElement);
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.focus(cerrar);
  fireEvent.mouseLeave(cerrar.parentElement);
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.blur(cerrar);
  act(() => vi.advanceTimersByTime(4000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('muestra solo el aviso más reciente y permite cerrarlo', () => {
  render(<NotificacionFlotante>Primer guardado.</NotificacionFlotante>);
  render(<NotificacionFlotante>Segundo guardado.</NotificacionFlotante>);
  expect(screen.queryByText('Primer guardado.')).not.toBeInTheDocument();
  expect(screen.getAllByRole('status')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('mantiene el aviso más reciente al repetir los efectos en StrictMode', () => {
  render(<StrictMode><NotificacionFlotante>Primer guardado.</NotificacionFlotante><NotificacionFlotante>Cambios guardados.</NotificacionFlotante></StrictMode>);
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Cambios guardados.');
});
