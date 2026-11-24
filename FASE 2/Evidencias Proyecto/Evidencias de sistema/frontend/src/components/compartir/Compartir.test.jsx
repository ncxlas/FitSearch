import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { SESION, simularApi } from '../../tests/utilidades.jsx';
import { AccesosCompartidos, BotonCompartir } from './CompartirProgreso.jsx';
import ProgresoCliente from './ProgresoCliente.jsx';

// Progreso compartido (SC-45): el botón del chat, los accesos en Privacidad y datos y la vista del profesional.
const CATEGORIAS = [
  { clave: 'perfil', titulo: 'Perfil y objetivos', incluye: 'Edad, sexo…' },
  { clave: 'salud', titulo: 'Información de salud', incluye: 'Condiciones médicas…', sensible: true },
  { clave: 'comidas', titulo: 'Comidas y agua', incluye: 'Lo que registras…' },
  { clave: 'peso', titulo: 'Peso', incluye: 'Tus pesajes…' },
  { clave: 'planes', titulo: 'Planes', incluye: 'Tu plan…' },
];
const NADA = { perfil: false, salud: false, comidas: false, peso: false, planes: false };
const lista = (permisos = NADA, registro = []) => ({
  categorias: CATEGORIAS, registro,
  profesionales: [{ id: 9, nombre: 'Matías Rojas', especialidad: 'Nutrición', fotoUrl: null, permisos, desde: null }],
});
const llamadas = (fetch, metodo, ruta) => fetch.mock.calls.filter(([u, o = {}]) => u === ruta && (o.method || 'GET') === metodo);

beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

describe('Botón del chat', () => {
  test('CP-275: elige categorías, avisa que la salud es sensible y guarda', async () => {
    const usuario = userEvent.setup();
    const fetch = simularApi({ '/api/compartir': (_u, o) => [200, o.method === 'PUT' ? lista({ ...NADA, salud: true, comidas: true }) : lista()] });
    render(<BotonCompartir profesionalId={9} />);
    await usuario.click(await screen.findByRole('button', { name: 'Compartir mi progreso' }));
    const dialogo = screen.getByRole('dialog', { name: 'Compartir tu progreso con Matías Rojas' });
    expect(within(dialogo).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await usuario.click(within(dialogo).getByRole('checkbox', { name: /Comidas y agua/ }));
    await usuario.click(within(dialogo).getByRole('checkbox', { name: /Información de salud/ }));
    expect(within(dialogo).getByRole('note')).toHaveTextContent('Es información sensible: al marcarla autorizas a Matías Rojas a verla.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(llamadas(fetch, 'PUT', '/api/compartir/9')[0][1].body)).toEqual({ ...NADA, salud: true, comidas: true });
    expect(screen.getByRole('button', { name: 'Compartes tu progreso: Salud, Comidas. Cambiar' })).toBeInTheDocument();
  });

  test('sin chat con ese profesional no aparece el botón', async () => {
    simularApi({ '/api/compartir': lista() });
    render(<BotonCompartir profesionalId={99} />);
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });
});

describe('Privacidad y datos › accesos', () => {
  test('CP-275: lista quién tiene acceso, el registro de accesos y permite dejar de compartir', async () => {
    const usuario = userEvent.setup();
    const registro = [
      { id: 2, accion: 'consulto', categorias: ['comidas'], fecha: '2026-11-24T15:00:00Z', profesional: 'Matías Rojas' },
      { id: 1, accion: 'otorgo', categorias: ['comidas'], fecha: '2026-11-24T14:00:00Z', profesional: 'Matías Rojas' },
    ];
    const fetch = simularApi({ '/api/compartir': (_u, o) => [200, o.method === 'DELETE' ? lista(NADA, registro) : lista({ ...NADA, comidas: true }, registro)] });
    render(<AccesosCompartidos />);
    const seccion = (await screen.findByRole('heading', { name: 'Profesionales con acceso a tu progreso' })).closest('section');
    expect(seccion).toHaveTextContent('Matías Rojas · NutriciónVe: Comidas');
    await usuario.click(within(seccion).getByText('Registro de accesos (2)'));
    expect(within(seccion).getByText(/Matías Rojas miró tu progreso/)).toBeInTheDocument();
    expect(within(seccion).getByText(/Empezaste a compartir con Matías Rojas/)).toBeInTheDocument();
    await usuario.click(within(seccion).getByRole('button', { name: 'Cambiar' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dejar de compartir' }));
    expect(await screen.findByText('Dejaste de compartir tu progreso con Matías Rojas.')).toBeInTheDocument();
    expect(llamadas(fetch, 'DELETE', '/api/compartir/9')).toHaveLength(1);
    expect(seccion).toHaveTextContent('No compartes tu progreso con nadie.');
  });
});

describe('Vista del profesional', () => {
  test('CP-276: sin permiso explica cómo compartir; con permiso muestra solo las categorías permitidas', async () => {
    simularApi({ '/api/profesional/progreso/7': () => [403, { error: 'Esta persona no comparte su progreso contigo' }] });
    const { unmount } = render(<ProgresoCliente usuarioId={7} nombre="Ana Pérez" />);
    expect(await screen.findByText(/Ana Pérez no comparte su progreso contigo/)).toBeInTheDocument();
    unmount();

    const usuario = userEvent.setup();
    simularApi({
      '/api/profesional/progreso/7': {
        cliente: { id: 7, nombre: 'Ana Pérez' }, hoy: '2026-11-24',
        categorias: [CATEGORIAS[1], CATEGORIAS[2]],
        secciones: {
          salud: { condiciones: ['Diabetes'], tomaMedicamentos: false, medicamentos: [], alergias: ['Alimentarias'] },
          comidas: { metaCalorias: 2000, dias: [{ fecha: '2026-11-24', calorias: 1500, proteinasG: 90, carbohidratosG: 180, grasasG: 45, aguaMl: 750 }] },
        },
      },
    });
    render(<ProgresoCliente usuarioId={7} nombre="Ana Pérez" />);
    const grupo = await screen.findByRole('group', { name: 'Qué comparte' });
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Información de salud', 'Comidas y agua']);
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
    expect(screen.getByText('No toma')).toBeInTheDocument();
    await usuario.click(within(grupo).getByRole('button', { name: 'Comidas y agua' }));
    const fila = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(fila).toHaveTextContent('1.500 kcal 75 %');
    expect(fila).toHaveTextContent('750 ml');
  });
});
