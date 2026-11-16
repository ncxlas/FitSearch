import { fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, test, expect, vi } from 'vitest';
import { renderizarApp, simularApi, SESION, SESION_PROFESIONAL } from '../tests/utilidades.jsx';
import { SesionProvider } from '../context/SesionContext.jsx';
import AgendaProfesional from './Agenda.jsx';
const h = { id: 2, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00', ocupado: false };
const r = { id: 4, estado: 'pendiente', mensaje: 'Necesito orientación nutricional', horario: h, usuario: { id: 1, nombre: 'Ana' }, profesional: { id: 3, nombre: 'Juan' } };
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));
afterEach(() => vi.useRealTimers());
// Fecha del sistema fija (solo Date, los temporizadores siguen reales) para que el calendario abra en octubre de 2099.
const fijarHoy = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
// Desde el 09-11-2026 /profesional/agenda muestra el calendario semanal (AgendaSemanal.test.jsx). El formulario de
// publicar con calendario del mes y la lista de reservas siguen en Agenda.jsx (la pestaña Horarios del perfil los usa).
const renderizarAgendaClasica = () => render(
  <StrictMode><MemoryRouter><SesionProvider><AgendaProfesional /></SesionProvider></MemoryRouter></StrictMode>,
);
const dia = (nombre) => within(screen.getByRole('group', { name: /octubre 2099|noviembre 2099/ })).getByRole('button', { name: nombre });

test('editar avisa actualización; eliminar el bloque editado limpia el formulario sin afirmar historial', async () => {
  let horarios = [h];
  simularApi({
    '/api/disponibilidades/2': (_u,o) => {
      if (o.method === 'DELETE') { horarios=[]; return [200,{id:2}]; }
      return [200,{horario:h}];
    },
    '/api/disponibilidades': () => [200,{horarios}],
    '/api/reservas': { reservas:[] },
  });
  renderizarAgendaClasica();
  await userEvent.click(await screen.findByRole('button',{name:'Editar horario'}));
  // El calendario salta al mes del horario, marca su día y el foco queda en la hora de inicio.
  expect(screen.getByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
  expect(dia('jueves 15 de octubre, 1 horario publicado')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Hora de inicio')).toHaveFocus();
  await userEvent.click(screen.getByRole('button',{name:'Guardar horario'}));
  expect(await screen.findByText('Horario actualizado.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Editar horario'}));
  await userEvent.click(screen.getByRole('button',{name:'Retirar horario'}));
  await userEvent.click(screen.getByRole('button',{name:'Confirmar retiro'}));
  expect(await screen.findByText('Horario eliminado.')).toBeInTheDocument();
  expect(screen.getByText('Elige un día en el calendario')).toBeInTheDocument();
  expect(screen.getByLabelText('Hora de inicio')).toHaveValue('');
  expect(screen.queryByRole('button',{name:'Cancelar edición'})).not.toBeInTheDocument();
});

test('retira un bloque con historial cancelado solo tras confirmar y mantiene la reserva en historial', async () => {
  let horarios = [{ ...h, conHistorial: true }];
  const fetch = simularApi({
    '/api/disponibilidades/2': (_u, o) => {
      expect(o.method).toBe('DELETE');
      horarios = [];
      return [200, { id: 2, retirado: true }];
    },
    '/api/disponibilidades': () => [200, { horarios }],
    '/api/reservas': { reservas: [{ ...r, estado: 'cancelada', horario: { ...h, retirado: true } }] },
  });
  renderizarAgendaClasica();
  expect(await screen.findByRole('button', { name: 'Editar horario' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Retirar horario' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'DELETE')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  expect(await screen.findByText(/Horario retirado/)).toBeInTheDocument();
  expect(await screen.findByText('Aún no has publicado horarios disponibles.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Todas e historial' }));
  expect(await screen.findByText(r.mensaje)).toBeInTheDocument();
});
test('publica un horario eligiendo el día en el calendario y la duración rápida', async () => {
  fijarHoy('2099-10-10T15:00:00Z');
  let horarios = [{ ...h, id: 7, horaInicio: '11:00', horaFin: '12:00' }];
  const fetch = simularApi({ '/api/disponibilidades': (_u, o) => {
    if (o.method === 'POST') { horarios = [...horarios, h]; return [201, { horario: h }]; }
    return [200, { horarios }];
  } });
  renderizarAgendaClasica();
  expect(await screen.findByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
  expect(dia('jueves 1 de octubre, día pasado')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Publicar horario' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '1 h' })).toBeDisabled();

  await userEvent.click(await screen.findByRole('button', { name: 'jueves 15 de octubre, 1 horario publicado' }));
  expect(screen.getByText('jueves 15 de octubre')).toBeInTheDocument();
  expect(screen.getByText('Ya publicaste: 11:00–12:00')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
  await userEvent.click(screen.getByRole('button', { name: '1 h' }));
  expect(screen.getByLabelText('Hora de término')).toHaveValue('10:00');
  expect(screen.getByRole('button', { name: '1 h' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Publicar horario' }));

  expect(await screen.findByText('Horario publicado.')).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method === 'POST')[1].body)).toEqual({ fecha: h.fecha, horaInicio: '09:00', horaFin: '10:00' });
  expect(await screen.findByRole('button', { name: 'jueves 15 de octubre, 2 horarios publicados' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
  expect(screen.getByRole('heading', { name: 'noviembre 2099' })).toBeInTheDocument();
});
test('no envía un horario que termina antes de empezar y lo avisa', async () => {
  fijarHoy('2099-10-10T15:00:00Z');
  const fetch = simularApi({ '/api/disponibilidades': { horarios: [] } });
  renderizarAgendaClasica();
  await userEvent.click(await screen.findByRole('button', { name: 'jueves 15 de octubre, sin horarios publicados' }));
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '10:00' } });
  fireEvent.change(screen.getByLabelText('Hora de término'), { target: { value: '09:30' } });
  await userEvent.click(screen.getByRole('button', { name: 'Publicar horario' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La hora de término debe ser posterior a la hora de inicio.');
  expect(fetch.mock.calls.some(([, o]) => o.method === 'POST')).toBe(false);
});
test('cancelar requiere confirmación explícita y actualiza el historial', async () => {
  let estado = 'pendiente';
  const fetch = simularApi({ '/api/reservas/4': () => { estado = 'cancelada'; return [200, { reserva: { ...r, estado } }]; }, '/api/reservas': () => [200, { reservas: [{ ...r, estado }] }] });
  // Desde el 15-11-2026 la lista de reservas recibidas va en la pestaña «Reservas» de la agenda.
  renderizarApp('/profesional/agenda?vista=reservas');
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'PATCH')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  expect(await screen.findByText(/Reserva cancelada/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Todas e historial' }));
  expect(within(await screen.findByRole('article')).getByText('Cancelada')).toBeInTheDocument();
});
test('la confirmación aparece dentro de la tarjeta elegida (no al final de la lista) y al volver el foco regresa al botón', async () => {
  const otra = { ...r, id: 5, usuario: { id: 2, nombre: 'Bruno' }, horario: { ...h, id: 3, horaInicio: '11:00', horaFin: '12:00' } };
  simularApi({ '/api/reservas': { reservas: [r, otra] } });
  renderizarApp('/profesional/agenda?vista=reservas');
  const tarjetaBruno = (await screen.findByRole('heading', { name: 'Bruno' })).closest('article');
  const cancelar = within(tarjetaBruno).getByRole('button', { name: 'Cancelar reserva' });
  await userEvent.click(cancelar);
  const pregunta = within(tarjetaBruno).getByRole('group', { name: '¿Cancelar esta reserva?' });
  expect(pregunta).toHaveFocus();
  expect(within(tarjetaBruno).queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('heading', { name: 'Ana' }).closest('article')).queryByRole('group')).not.toBeInTheDocument();

  await userEvent.click(within(pregunta).getByRole('button', { name: 'Volver' }));
  expect(cancelar).toHaveFocus();

  await userEvent.click(cancelar);
  await userEvent.keyboard('{Escape}');
  expect(within(tarjetaBruno).queryByRole('group')).not.toBeInTheDocument();
  expect(cancelar).toHaveFocus();
});

// Pedido del PO del 15-11-2026: buscador, filtros por estado y fecha, y el historial de la cita más reciente a la más antigua.
const reservaDe = (id, nombre, estado, fecha, horaInicio = '09:00') => ({
  ...r, id, estado, usuario: { id: id + 10, nombre }, profesional: { id: 3, nombre: nombre === 'Ana' ? 'Juan Soto' : 'Marta Ríos' },
  horario: { id: id + 20, fecha, horaInicio, horaFin: '10:00', ocupado: true },
});
const VARIAS = [
  reservaDe(41, 'Diego Lagos', 'pendiente', '2099-09-20'),
  reservaDe(42, 'José Núñez', 'cancelada', '2099-10-01'),
  reservaDe(43, 'Carla Soto', 'confirmada', '2099-10-05'),
  reservaDe(44, 'Ana', 'pendiente', '2099-10-15'),
  reservaDe(45, 'Bruno Díaz', 'confirmada', '2099-10-20', '11:00'),
];
const nombres = () => screen.queryAllByRole('article').map((a) => within(a).getByRole('heading').textContent);

test('las reservas recibidas se buscan por nombre y se filtran por estado y fecha; el historial va de la más reciente a la más antigua', async () => {
  fijarHoy('2099-10-12T13:00:00Z');
  simularApi({ '/api/reservas': { reservas: VARIAS } });
  renderizarApp('/profesional/agenda?vista=reservas');

  await screen.findByRole('search', { name: 'Buscar reservas' });
  expect(nombres()).toEqual(['Ana', 'Bruno Díaz']);
  expect(screen.getByText('2 reservas')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Todas e historial' }));
  expect(nombres()).toEqual(['Bruno Díaz', 'Ana', 'Carla Soto', 'José Núñez', 'Diego Lagos']);
  expect(screen.getByText('5 reservas, de la más reciente a la más antigua')).toBeInTheDocument();
  expect(within(screen.getAllByRole('article')[2]).getByText('Realizada')).toBeInTheDocument();
  expect(within(screen.getAllByRole('article')[4]).getByText('No realizada')).toBeInTheDocument();

  // Sin importar tildes ni mayúsculas.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'jose nu');
  expect(nombres()).toEqual(['José Núñez']);
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(nombres()).toHaveLength(5);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'realizada');
  expect(nombres()).toEqual(['Carla Soto']);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'todos');

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fecha de la cita' }), 'mesPasado');
  expect(nombres()).toEqual(['Diego Lagos']);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fecha de la cita' }), 'rango');
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2099-10-01' } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2099-10-10' } });
  expect(nombres()).toEqual(['Carla Soto', 'José Núñez']);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'cancelada');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'carla');
  expect(nombres()).toEqual([]);
  expect(screen.getByRole('heading', { name: 'No hay reservas con esos filtros' })).toBeInTheDocument();

  // En «Próximas» no hay canceladas ni «Mes pasado»: esos filtros vuelven a «todos».
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' }));
  expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('todos');
  expect(within(screen.getByRole('combobox', { name: 'Estado' })).queryByRole('option', { name: 'Cancelada' })).not.toBeInTheDocument();
});

test('en «Mis citas» la persona busca por el nombre del profesional', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  fijarHoy('2099-10-12T13:00:00Z');
  simularApi({ '/api/reservas': { reservas: VARIAS } });
  renderizarApp('/citas');
  await userEvent.click(await screen.findByRole('button', { name: 'Todas e historial' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'juan');
  expect(nombres()).toEqual(['Juan Soto']);
  expect(screen.getByText('1 cita, de la más reciente a la más antigua')).toBeInTheDocument();
});
// La reserva desde la ficha (calendario, horas, mensaje y límite por profesional) se prueba en components/reservas/ReservarHora.test.jsx.
