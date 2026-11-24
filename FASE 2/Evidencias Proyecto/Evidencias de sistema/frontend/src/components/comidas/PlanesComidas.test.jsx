import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';

// Planes de comidas (SC-44): la pestaña «Plan de comidas», el editor y «Hoy te toca…» en el Resumen.
const MOMENTOS = [['desayuno', 'Desayuno'], ['media_manana', 'Media mañana'], ['almuerzo', 'Almuerzo'], ['merienda', 'Merienda'], ['cena', 'Cena']];
const POLLO = { id: 3, nombre: 'Pechuga de pollo', calorias: 165, proteinasG: 31, carbohidratosG: 0, grasasG: 3.6 };
const ARROZ = { id: 7, nombre: 'Arroz blanco cocido', calorias: 130, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3 };
const vacio = { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 };

// Un plan con la forma que responde la API: días con sus cinco momentos.
function plan({ id = 5, nombre = 'Base', tipo = 'dia', enUso = false, lineas = {}, profesional = null } = {}) {
  const dias = (tipo === 'dia' ? [0] : [1, 2, 3, 4, 5, 6, 7]).map((dia) => {
    const momentos = MOMENTOS.map(([momento, etiqueta]) => {
      const items = (lineas[`${dia}-${momento}`] ?? []).map((l, i) => ({ id: dia * 100 + i + 1, ...l }));
      const calorias = items.reduce((s, i) => s + (i.calorias ?? 0), 0);
      return { momento, etiqueta, items, totales: { ...vacio, calorias } };
    });
    return { dia, nombre: dia === 0 ? 'Todos los días' : ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][dia], momentos, totales: { ...vacio, calorias: momentos.reduce((s, m) => s + m.totales.calorias, 0) } };
  });
  return { id, nombre, tipo, nota: null, origen: profesional ? 'profesional' : 'propio', enUso, profesional, fechaCreacion: '2026-11-24T12:00:00Z', dias, caloriasPromedio: 0 };
}
const ALMUERZO = { '0-almuerzo': [{ alimentoId: 3, nombre: 'Pechuga de pollo', gramos: 150, nota: null, calorias: 248 }, { alimentoId: 7, nombre: 'Arroz blanco cocido', gramos: 120, nota: null, calorias: 156 }], '0-cena': [{ alimentoId: null, nombre: null, gramos: null, nota: 'Ensalada a gusto', calorias: null }] };
const lista = (planes) => ({ planes, max: 10, hoy: '2026-11-24', diaDeHoy: 2 });
const DIA = {
  fecha: '2026-11-24', hoy: '2026-11-24',
  objetivo: { calorias: 2000, proteinasG: 150, carbohidratosG: 225, grasasG: 55, plan: null, perfil: { objetivoPrincipal: 'Mantener peso', pesoKg: 68, alturaCm: 175, actividadFisica: 'Moderada' } },
  consumo: { ...vacio }, momentos: MOMENTOS.map(([momento, etiqueta]) => ({ momento, etiqueta, hora: null, registros: [], totales: { ...vacio } })),
};
const SEMANA = {
  desde: '2026-11-23', hasta: '2026-11-29', objetivoCalorias: 2000,
  dias: Array.from({ length: 7 }, (_, i) => ({ fecha: `2026-11-${23 + i}`, calorias: 0, futuro: i > 1 })),
};
const llamadas = (fetch, metodo, ruta) => fetch.mock.calls.filter(([u, o = {}]) => u === ruta && (o.method || 'GET') === metodo);
const cuerpo = (llamada) => JSON.parse(llamada[1].body);

beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

async function abrirPestana(usuario, rutas) {
  const fetch = simularApi({ '/api/comidas/semana': SEMANA, '/api/comidas?': DIA, '/api/comidas': DIA, ...rutas });
  renderizarApp('/comidas');
  await usuario.click(within(await screen.findByRole('group', { name: 'Secciones de Comidas' })).getByRole('button', { name: 'Plan de comidas' }));
  return fetch;
}

describe('Plan de comidas', () => {
  test('CP-270: sin planes invita a crear uno; el editor busca alimentos, calcula calorías y guarda con «usar»', async () => {
    const usuario = userEvent.setup();
    let creado = null;
    const fetch = await abrirPestana(usuario, {
      '/api/comidas/alimentos': { alimentos: [POLLO, ARROZ] },
      '/api/comidas/planes-comida': (_u, o) => {
        if (o.method === 'POST') { creado = JSON.parse(o.body); return [201, lista([plan({ nombre: creado.nombre, enUso: true, lineas: ALMUERZO })])]; }
        return [200, lista([])];
      },
    });
    expect(await screen.findByText(/Aún no tienes planes de comidas/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Crear plan/ }));
    const editor = screen.getByRole('form', { name: 'Nuevo plan de comidas' });
    await usuario.type(within(editor).getByLabelText('Nombre del plan'), 'Base');
    const almuerzo = within(editor).getByRole('group', { name: 'Almuerzo' });
    await usuario.click(within(almuerzo).getByRole('button', { name: /Alimento/ }));
    await usuario.type(within(almuerzo).getByLabelText('Buscar alimento para Almuerzo'), 'pollo');
    await usuario.click(await within(almuerzo).findByRole('button', { name: /Pechuga de pollo/ }));
    const gramos = within(almuerzo).getByLabelText('Gramos de Pechuga de pollo');
    await usuario.clear(gramos);
    await usuario.type(gramos, '150');
    expect(within(almuerzo).getByText('248 kcal')).toBeInTheDocument();
    const cena = within(editor).getByRole('group', { name: 'Cena' });
    await usuario.click(within(cena).getByRole('button', { name: /Nota/ }));
    await usuario.type(within(cena).getByLabelText('Nota del cena'), 'Ensalada a gusto');
    expect(within(editor).getByText(/248 kcal/, { selector: 'strong' })).toBeInTheDocument();
    await usuario.click(within(editor).getByRole('button', { name: 'Guardar plan' }));

    expect(await screen.findByText('Creaste «Base» y lo usas desde hoy.')).toBeInTheDocument();
    expect(cuerpo(llamadas(fetch, 'POST', '/api/comidas/planes-comida')[0])).toEqual({
      nombre: 'Base', tipo: 'dia', nota: null, usar: true,
      items: [{ dia: 0, momento: 'almuerzo', alimentoId: 3, gramos: 150 }, { dia: 0, momento: 'cena', nota: 'Ensalada a gusto' }],
    });
    expect(screen.getByRole('heading', { name: 'Base' }).closest('li')).toHaveTextContent('En uso');
  });

  test('CP-270: sin nombre o sin líneas avisa antes de enviar', async () => {
    const usuario = userEvent.setup();
    const fetch = await abrirPestana(usuario, { '/api/comidas/planes-comida': lista([]) });
    await usuario.click(await screen.findByRole('button', { name: /Crear plan/ }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ponle un nombre al plan.');
    await usuario.type(screen.getByLabelText('Nombre del plan'), 'Vacío');
    await usuario.click(screen.getByRole('button', { name: 'Guardar plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Agrega al menos un alimento o una nota.');
    expect(llamadas(fetch, 'POST', '/api/comidas/planes-comida')).toHaveLength(0);
  });

  test('CP-271: un plan semanal copia el día a toda la semana y marca los días con comidas', async () => {
    const usuario = userEvent.setup();
    const fetch = await abrirPestana(usuario, {
      '/api/comidas/alimentos': { alimentos: [ARROZ] },
      '/api/comidas/planes-comida': (_u, o) => [o.method === 'POST' ? 201 : 200, lista([])],
    });
    await usuario.click(await screen.findByRole('button', { name: /Crear plan/ }));
    await usuario.type(screen.getByLabelText('Nombre del plan'), 'Semana');
    await usuario.click(screen.getByRole('button', { name: 'Una semana' }));
    const desayuno = screen.getByRole('group', { name: 'Desayuno del lunes' });
    await usuario.click(within(desayuno).getByRole('button', { name: /Alimento/ }));
    await usuario.type(within(desayuno).getByLabelText('Buscar alimento para Desayuno'), 'arroz');
    await usuario.click(await within(desayuno).findByRole('button', { name: /Arroz blanco cocido/ }));
    await usuario.click(screen.getByRole('button', { name: /Copiar el lunes a toda la semana/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Copiaste el lunes a toda la semana.');
    await usuario.click(screen.getByRole('button', { name: 'Domingo' }));
    expect(within(screen.getByRole('group', { name: 'Desayuno del domingo' })).getByText('Arroz blanco cocido')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar plan' }));
    await waitFor(() => expect(llamadas(fetch, 'POST', '/api/comidas/planes-comida')).toHaveLength(1));
    const { items, tipo } = cuerpo(llamadas(fetch, 'POST', '/api/comidas/planes-comida')[0]);
    expect(tipo).toBe('semana');
    expect(items.map((i) => i.dia)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('CP-271: usar, ver, editar y eliminar; un plan del profesional dice de quién es', async () => {
    const usuario = userEvent.setup();
    const deMatias = plan({ id: 8, nombre: 'Plan de Matías', lineas: ALMUERZO, profesional: { id: 9, nombre: 'Matías Rojas', especialidad: 'Nutrición' } });
    const fetch = await abrirPestana(usuario, {
      '/api/comidas/planes-comida': (url, o) => {
        if (url.endsWith('/uso')) return [200, lista([{ ...deMatias, enUso: true }])];
        if (o.method === 'DELETE') return [200, lista([])];
        return [200, lista([deMatias])];
      },
    });
    const tarjeta = (await screen.findByRole('heading', { name: 'Plan de Matías' })).closest('li');
    expect(tarjeta).toHaveTextContent('De Matías Rojas (Nutrición)');
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Ver comidas' }));
    expect(within(tarjeta).getByText('Ensalada a gusto')).toBeInTheDocument();
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Usar este plan' }));
    expect(await screen.findByText('Desde hoy usas «Plan de Matías».')).toBeInTheDocument();
    expect(cuerpo(llamadas(fetch, 'PUT', '/api/comidas/planes-comida/8/uso')[0])).toEqual({ enUso: true });

    await usuario.click(within(screen.getByRole('heading', { name: 'Plan de Matías' }).closest('li')).getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Nombre del plan')).toHaveValue('Plan de Matías');
    expect(screen.getByLabelText('Gramos de Pechuga de pollo')).toHaveValue('150');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    const enLista = screen.getByRole('heading', { name: 'Plan de Matías' }).closest('li');
    await usuario.click(within(enLista).getByRole('button', { name: 'Eliminar' }));
    await usuario.click(within(enLista).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Eliminaste «Plan de Matías».')).toBeInTheDocument();
  });
});

describe('Hoy te toca', () => {
  test('CP-272: el Resumen muestra el plan en uso y «Lo comí» registra lo marcado con los gramos ajustados', async () => {
    const usuario = userEvent.setup();
    const fetch = simularApi({
      '/api/comidas/semana': SEMANA, '/api/comidas?': DIA, '/api/comidas': DIA,
      '/api/comidas/planes-comida': (url) => (url.endsWith('/registrar') ? [201, { registrados: 1, fecha: '2026-11-24', momento: 'almuerzo' }] : [200, lista([plan({ enUso: true, lineas: ALMUERZO })])]),
    });
    renderizarApp('/comidas');
    const tarjeta = (await screen.findByRole('heading', { name: 'Hoy te toca' })).closest('section');
    expect(tarjeta).toHaveTextContent('Pechuga de pollo 150 g · Arroz blanco cocido 120 g');
    expect(tarjeta).toHaveTextContent('Ensalada a gusto');
    expect(within(tarjeta).getAllByRole('button', { name: /Lo comí/ })).toHaveLength(1);
    await usuario.click(within(tarjeta).getByRole('button', { name: /Lo comí/ }));
    const dialogo = screen.getByRole('dialog', { name: '¿Qué comiste en tu almuerzo?' });
    await usuario.click(within(dialogo).getByRole('checkbox', { name: 'Arroz blanco cocido' }));
    const gramos = within(dialogo).getByLabelText('Gramos de Pechuga de pollo');
    await usuario.clear(gramos);
    await usuario.type(gramos, '180');
    expect(within(dialogo).getByText('Suma 298 kcal')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('Registraste tu almuerzo del plan.')).toBeInTheDocument();
    expect(cuerpo(llamadas(fetch, 'POST', '/api/comidas/planes-comida/5/registrar')[0])).toEqual({
      fecha: '2026-11-24', momento: 'almuerzo', items: [{ alimentoId: 3, gramos: 180 }],
    });
  });

  test('sin un plan en uso no aparece la tarjeta', async () => {
    simularApi({ '/api/comidas/semana': SEMANA, '/api/comidas?': DIA, '/api/comidas': DIA, '/api/comidas/planes-comida': lista([plan()]) });
    renderizarApp('/comidas');
    await screen.findByRole('heading', { name: /Calorías/ });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Hoy te toca' })).not.toBeInTheDocument());
  });
});
