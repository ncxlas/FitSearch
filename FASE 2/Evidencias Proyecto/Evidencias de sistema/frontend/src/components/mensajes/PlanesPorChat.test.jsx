import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SESION, simularApi } from '../../tests/utilidades.jsx';
import { EnviarPlan, PlanAdjunto } from './PlanesPorChat.jsx';

// Planes enviados por el chat (SC-46): la tarjeta del mensaje (guardar en mis planes) y el envío del profesional.
const MOMENTOS = [['desayuno', 'Desayuno'], ['media_manana', 'Media mañana'], ['almuerzo', 'Almuerzo'], ['merienda', 'Merienda'], ['cena', 'Cena']];
const vacio = { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 };
const VISTA = {
  nombre: 'Día liviano', tipo: 'dia', nota: 'Toma agua entre comidas', caloriasPromedio: 404,
  dias: [{
    dia: 0, nombre: 'Todos los días', totales: { ...vacio, calorias: 404 },
    momentos: MOMENTOS.map(([momento, etiqueta]) => ({
      momento, etiqueta, totales: { ...vacio, calorias: momento === 'almuerzo' ? 404 : 0 },
      items: momento === 'almuerzo' ? [{ id: 1, alimentoId: 3, nombre: 'Pechuga de pollo', gramos: 150, nota: null, calorias: 404 }] : [],
    })),
  }],
};
const mensaje = (adjunto, extra = {}) => ({ id: 5, texto: 'Te envié un plan', fecha: '2026-11-24T12:00:00Z', propio: false, leido: true, adjunto, ...extra });
const llamadas = (fetch, metodo, ruta) => fetch.mock.calls.filter(([u, o = {}]) => u === ruta && (o.method || 'GET') === metodo);
const enRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

describe('Plan recibido en el chat', () => {
  test('CP-279: la persona ve el plan de comidas, abre el detalle y lo guarda en sus planes', async () => {
    const usuario = userEvent.setup();
    const fetch = simularApi({ '/api/chats/3/mensajes/5/guardar': () => [201, { mensaje: {}, destino: 'planes-comida' }] });
    const alGuardar = vi.fn();
    const { rerender } = enRouter(<PlanAdjunto chatId={3} mensaje={mensaje({ tipo: 'plan_comidas', plan: VISTA, guardadoEn: null })} puedeGuardar nombreCliente="Matías" onGuardado={alGuardar} />);
    expect(screen.getByText('Día liviano')).toBeInTheDocument();
    expect(screen.getByText('Plan de comidas · un día')).toBeInTheDocument();
    expect(screen.getByText(/404 kcal en el día · Toma agua entre comidas/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Ver el detalle' }));
    expect(screen.getByText(/Pechuga de pollo/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar en mis planes' }));
    await waitFor(() => expect(alGuardar).toHaveBeenCalled());
    expect(llamadas(fetch, 'POST', '/api/chats/3/mensajes/5/guardar')).toHaveLength(1);

    rerender(<MemoryRouter><PlanAdjunto chatId={3} mensaje={mensaje({ tipo: 'plan_comidas', plan: VISTA, guardadoEn: '2026-11-24T12:05:00Z' })} puedeGuardar nombreCliente="Matías" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Guardar en mis planes' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Plan de comidas' })).toHaveAttribute('href', '/comidas?seccion=planes-comida');
  });

  test('CP-279: el plan de macronutrientes muestra su reparto; el profesional ve si su cliente lo guardó', () => {
    const macros = { tipo: 'plan_macros', plan: { nombre: 'Alto en proteína', proteinas: 40, carbohidratos: 35, grasas: 25 }, guardadoEn: null };
    const { rerender } = enRouter(<PlanAdjunto chatId={3} mensaje={mensaje(macros, { propio: true })} puedeGuardar={false} nombreCliente="Ana Pérez" />);
    expect(within(screen.getByRole('list', { name: 'Reparto de calorías' })).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(['40 % proteínas', '35 % carbohidratos', '25 % grasas']);
    expect(screen.getByText('Aún no lo guarda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar en mis planes' })).not.toBeInTheDocument();
    rerender(<MemoryRouter><PlanAdjunto chatId={3} mensaje={mensaje({ ...macros, guardadoEn: '2026-11-24T13:00:00Z' }, { propio: true })} puedeGuardar={false} nombreCliente="Ana Pérez" /></MemoryRouter>);
    expect(screen.getByText('Ana Pérez lo guardó en sus planes')).toBeInTheDocument();
  });

  test('si no se puede guardar, explica por qué', async () => {
    const usuario = userEvent.setup();
    simularApi({ '/api/chats/3/mensajes/5/guardar': () => [409, { error: 'Puedes guardar hasta 10 planes de comidas; elimina uno para agregar otro' }] });
    enRouter(<PlanAdjunto chatId={3} mensaje={mensaje({ tipo: 'plan_comidas', plan: VISTA, guardadoEn: null })} puedeGuardar nombreCliente="Matías" />);
    await usuario.click(screen.getByRole('button', { name: 'Guardar en mis planes' }));
    expect(await screen.findByText(/Puedes guardar hasta 10 planes de comidas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar en mis planes' })).toBeEnabled();
  });
});

describe('El profesional envía un plan', () => {
  test('CP-280: elige plan de macronutrientes, revisa que sume 100 % y lo envía con un mensaje', async () => {
    const usuario = userEvent.setup();
    const fetch = simularApi({ '/api/chats/3/planes': () => [201, { mensaje: { id: 9 } }] });
    const alEnviar = vi.fn();
    enRouter(<EnviarPlan chatId={3} nombreCliente="Ana Pérez" onEnviado={alEnviar} />);
    await usuario.click(screen.getByRole('button', { name: 'Enviar un plan' }));
    const dialogo = screen.getByRole('dialog', { name: 'Enviar un plan a Ana Pérez' });
    await usuario.click(within(dialogo).getByRole('button', { name: /Plan de macronutrientes/ }));
    const enviar = screen.getByRole('button', { name: 'Enviar plan' });
    expect(enviar).toBeDisabled();
    await usuario.type(screen.getByLabelText('Nombre del plan'), 'Alto en proteína');
    const proteinas = screen.getByLabelText('Proteínas');
    await usuario.clear(proteinas);
    await usuario.type(proteinas, '50');
    expect(screen.getByText(/Suman 120 %: ajústalos para llegar a 100 %/)).toBeInTheDocument();
    expect(enviar).toBeDisabled();
    const carbohidratos = screen.getByLabelText('Carbohidratos');
    await usuario.clear(carbohidratos);
    await usuario.type(carbohidratos, '25');
    const grasas = screen.getByLabelText('Grasas');
    await usuario.clear(grasas);
    await usuario.type(grasas, '25');
    await usuario.type(screen.getByLabelText('Mensaje (opcional)'), 'Pruébalo dos semanas');
    await usuario.click(enviar);
    await waitFor(() => expect(alEnviar).toHaveBeenCalled());
    expect(JSON.parse(llamadas(fetch, 'POST', '/api/chats/3/planes')[0][1].body)).toEqual({
      tipo: 'macros', plan: { nombre: 'Alto en proteína', proteinas: 50, carbohidratos: 25, grasas: 25 }, texto: 'Pruébalo dos semanas',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('CP-280: el plan de comidas usa el editor con el catálogo del profesional', async () => {
    const usuario = userEvent.setup();
    const fetch = simularApi({
      '/api/profesional/alimentos': { alimentos: [{ id: 3, nombre: 'Pechuga de pollo', calorias: 165, proteinasG: 31, carbohidratosG: 0, grasasG: 3.6 }] },
      '/api/chats/3/planes': () => [201, { mensaje: { id: 9 } }],
    });
    enRouter(<EnviarPlan chatId={3} nombreCliente="Ana Pérez" />);
    await usuario.click(screen.getByRole('button', { name: 'Enviar un plan' }));
    await usuario.click(screen.getByRole('button', { name: /Plan de comidas/ }));
    expect(screen.getByRole('dialog', { name: 'Enviar un plan de comidas' })).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Nombre del plan'), 'Día liviano');
    await usuario.click(screen.getAllByRole('button', { name: 'Alimento' })[0]);
    await usuario.type(screen.getByLabelText('Buscar alimento para Desayuno'), 'pollo');
    await usuario.click(await screen.findByRole('button', { name: /Pechuga de pollo/ }));
    expect(fetch.mock.calls.some(([u]) => u.startsWith('/api/profesional/alimentos?q=pollo'))).toBe(true);
    await usuario.click(screen.getByRole('button', { name: 'Enviar plan' }));
    await waitFor(() => expect(llamadas(fetch, 'POST', '/api/chats/3/planes')).toHaveLength(1));
    const cuerpo = JSON.parse(llamadas(fetch, 'POST', '/api/chats/3/planes')[0][1].body);
    expect([cuerpo.tipo, cuerpo.plan.nombre, cuerpo.plan.items[0].alimentoId]).toEqual(['comidas', 'Día liviano', 3]);
  });
});
