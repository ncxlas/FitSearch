import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderizarApp, simularApi, SESION_PROFESIONAL } from '../../tests/utilidades.jsx';

afterEach(() => vi.useRealTimers());

test.each([
  ['confirmada', 'confirmada', 'realizada', 'Realizada'],
  ['pendiente', 'por confirmar', 'no realizada', 'No realizada'],
  ['libre', 'libre', 'sin reservas', 'Sin reservas'],
])('actualiza un horario %s al comenzar sin recargar la página', async (estado, antes, despues, etiqueta) => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2099-10-12T13:59:00Z'));
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
  const usuario = { id: 4, nombre: 'Ana Pérez' };
  const reserva = estado === 'libre' ? null : { id: 1, usuario, modalidad: 'presencial', primeraVisita: false, mensaje: '' };
  const fetch = simularApi({
    '/api/agenda/semana': {
      desde: '2099-10-12', hasta: '2099-10-18', hoy: '2099-10-12', ahora: '10:59',
      modalidad: 'ambas', listaEspera: 0, bloqueos: [],
      horarios: [{ id: 1, fecha: '2099-10-12', horaInicio: '11:00', horaFin: '12:00',
        pasado: false, bloqueado: false, estado, reserva }],
    },
    '/api/reservas': { reservas: estado === 'pendiente'
      ? [{ id: 1, estado, usuario, horario: { id: 1, fecha: '2099-10-12', horaInicio: '11:00', horaFin: '12:00' } }] : [] },
  });
  renderizarApp('/profesional/agenda');
  const nombre = (texto) => `lunes 12 de octubre, 11:00 a 12:00, ${reserva ? 'Ana Pérez, ' : ''}${texto}`;
  const horario = await screen.findByRole('button', { name: nombre(antes) });
  if (estado === 'pendiente') expect(await screen.findByRole('tab', { name: /Reservas.*1 por confirmar/ })).toBeInTheDocument();
  fireEvent.click(horario);
  const detalle = within(screen.getByRole('region', { name: 'lunes 12 de octubre' }));
  expect(detalle.getByRole('button', { name: reserva ? 'Cancelar reserva' : 'Retirar horario' })).toBeInTheDocument();
  const peticionesAgenda = () => fetch.mock.calls.filter(([url]) => url.startsWith('/api/agenda/semana') || url === '/api/reservas').length;
  const peticiones = peticionesAgenda();
  await act(async () => vi.advanceTimersByTime(60000));
  expect(screen.getByRole('button', { name: nombre(despues) })).toBeInTheDocument();
  expect(detalle.getByText(etiqueta)).toBeInTheDocument();
  expect(detalle.queryByRole('button', { name: /Confirmar|Cancelar reserva|Retirar horario/ })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Reservas' })).toBeInTheDocument();
  expect(peticionesAgenda()).toBe(peticiones);
});
