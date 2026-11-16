// Ficha del profesional con favorito y reseñas (FS-HU-23, FS-HU-24).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { fichaProfesional, FILTROS, listado, llamadasA, MI_FICHA, renderizarApp, SESION, SESION_PROFESIONAL, simularApi } from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const RESUMEN = { promedio: 4.5, total: 2, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } };
const resenaDe = (sobrescribir = {}) => ({ id: 9, autor: 'Valeria D.', puntaje: 5, comentario: 'Muy clara al explicar el plan.', fecha: '2026-10-01T15:00:00.000Z', propia: false, ...sobrescribir });
const fichaApi = (sobrescribir = {}) => ({
  profesional: fichaProfesional({ calificacion: { promedio: 4.5, total: 2 } }), resumenResenas: RESUMEN, miResena: null, puedeResenar: true, ...sobrescribir,
});

function simular({ ficha = fichaApi(), resenas = [resenaDe(), resenaDe({ id: 10, autor: 'Martín D.', puntaje: 4, comentario: null })], guardar, eliminar } = {}) {
  return simularApi({
    '/api/profesionales/1/resenas': (url, { method = 'GET' }) => {
      if (method === 'PUT') return guardar ? guardar(url) : [201, { resena: resenaDe({ id: 20, autor: 'Ana P.', puntaje: 4, comentario: 'Excelente atención', propia: true }), resumenResenas: { promedio: 4.3, total: 3, distribucion: { 5: 1, 4: 2, 3: 0, 2: 0, 1: 0 } } }];
      if (method === 'DELETE') return eliminar ? eliminar() : [200, { resumenResenas: RESUMEN }];
      return [200, { resenas, pagina: 1, total: resenas.length, totalPaginas: 1 }];
    },
    '/api/profesionales/1': () => (ficha.estado ? [ficha.estado, { error: 'No encontramos este profesional' }] : [200, ficha]),
    '/api/profesionales/filtros': FILTROS,
    '/api/profesionales/mi-ficha': { ficha: { ...MI_FICHA, id: 1 } },
    '/api/profesionales': listado(),
  });
}
const cuerpo = (llamada) => JSON.parse(llamada[1].body);

describe('Ficha', () => {
  // Pedido del PO del 15-11-2026: si atiende solo online, la ficha no tiene «Lugar de atención» (ni mapa ni Google Maps).
  test('solo online no ofrece lugar de atención, dirección, comuna ni enlace a Maps aunque haya datos antiguos', async () => {
    simular({ ficha: fichaApi({ profesional: fichaProfesional({ modalidad: 'online', comuna: 'Comuna antigua', direccion: 'Dirección antigua 123' }) }) });
    renderizarApp('/profesionales/1');
    const pestanas = within(await screen.findByRole('tablist', { name: 'Información de Ana Demo' }));
    expect(pestanas.getAllByRole('tab').map((pestana) => pestana.textContent.trim())).toEqual(['Información', 'Formación', 'Certificaciones']);
    expect(screen.getByText('Atención online')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Google Maps/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Dirección antigua|Comuna antigua/)).not.toBeInTheDocument();
  });
  test('muestra los datos públicos, el resumen de calificaciones y las reseñas', async () => {
    simular(); renderizarApp('/profesionales/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Demo' })).toBeInTheDocument();
    expect(screen.getAllByText('Presencial y online').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: 'Lugar de atención' }));
    const lugar = within(screen.getByRole('tabpanel', { name: 'Lugar de atención' }));
    expect(lugar.getByText('Consulta Demo')).toBeInTheDocument();
    // Google Maps queda como un enlace discreto bajo el mapa de FitSearch (15-11-2026).
    expect(lugar.getByRole('link', { name: /Abrir la ubicación de Ana Demo en Google Maps/ }))
      .toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-33.686%2C-71.215');
    expect(lugar.getByText('Cargando mapa…')).toBeInTheDocument();
    expect(screen.getByText('2 reseñas')).toBeInTheDocument();
    expect(await screen.findByText('Muy clara al explicar el plan.')).toBeInTheDocument();
    expect(screen.getByText('Martín D.')).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  test('"Volver a profesionales" regresa a la misma búsqueda desde la que se abrió', async () => {
    simular(); renderizarApp('/profesionales?q=nutri');
    await userEvent.click(await screen.findByRole('link', { name: 'Ana Demo' }));
    await screen.findByRole('heading', { level: 1, name: 'Ana Demo' });
    await userEvent.click(screen.getByRole('link', { name: 'Volver a profesionales' }));
    expect(await screen.findByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('nutri');
  });

  // Revisión del PR #47: desde la ficha de un centro de salud o gimnasio, «Volver» regresa a ese establecimiento.
  test('abierta desde un centro de salud, «Volver» regresa a ese centro con su nombre', async () => {
    simular();
    renderizarApp({ pathname: '/profesionales/1', state: { desde: '/centros-salud/3', origen: 'Centro Médico Demo', desdeOrigen: '/centros-salud?comuna=%C3%91u%C3%B1oa' } });
    await screen.findByRole('heading', { level: 1, name: 'Ana Demo' });
    expect(screen.getByRole('link', { name: 'Volver a Centro Médico Demo' })).toHaveAttribute('href', '/centros-salud/3');
    expect(screen.queryByRole('link', { name: 'Volver a profesionales' })).not.toBeInTheDocument();
  });

  test('un origen que no es una búsqueda ni un establecimiento vuelve a profesionales', async () => {
    simular();
    renderizarApp({ pathname: '/profesionales/1', state: { desde: '/admin/usuarios', origen: 'Otra cosa' } });
    await screen.findByRole('heading', { level: 1, name: 'Ana Demo' });
    expect(screen.getByRole('link', { name: 'Volver a profesionales' })).toHaveAttribute('href', '/profesionales');
  });

  test('si el profesional no existe lo indica con una salida', async () => {
    simular({ ficha: { estado: 404 } }); renderizarApp('/profesionales/1');
    expect(await screen.findByRole('heading', { name: 'No encontramos este profesional' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver profesionales' })).toHaveAttribute('href', '/profesionales');
  });

  test('el lugar de atención muestra la dirección que el profesional indicó en su ficha, con su comuna y su región (SC-24)', async () => {
    simular({ ficha: fichaApi({ profesional: fichaProfesional({ direccion: 'Av. Ortúzar 120', establecimiento: null, region: 'Región Metropolitana de Santiago' }) }) });
    renderizarApp('/profesionales/1');
    expect(await screen.findByText('Melipilla, Región Metropolitana de Santiago', { selector: '.ficha__datos span' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Lugar de atención' }));
    const lugar = within(screen.getByRole('tabpanel', { name: 'Lugar de atención' }));
    expect(lugar.getByText('Av. Ortúzar 120')).toBeInTheDocument();
    expect(lugar.getByText('Melipilla, Región Metropolitana de Santiago')).toBeInTheDocument();
    expect(lugar.getByText('También atiende online.')).toBeInTheDocument();
  });

  test('si atiende solo online y no indicó dirección, no pide consultarla (SC-24)', async () => {
    simular({ ficha: fichaApi({ profesional: fichaProfesional({ modalidad: 'online', direccion: null, establecimiento: null }) }) });
    renderizarApp('/profesionales/1');
    expect(await screen.findByText('Atención online', { selector: '.ficha__datos span' })).toBeInTheDocument();
    expect(screen.queryByText(/Consulta la dirección exacta/)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Lugar de atención' })).not.toBeInTheDocument();
  });

  // Pedido del PO del 15-11-2026: presentación, menú con su información, horas destacadas y, al final, las reseñas.
  test('abre con la presentación del profesional y sigue con el menú, las horas y las reseñas, en ese orden', async () => {
    simular({ ficha: fichaApi({ profesional: fichaProfesional({ calificacion: { promedio: 4.5, total: 2 }, presentacion: 'Soy Ana, nutricionista deportiva. Me encanta correr.' }) }) });
    renderizarApp('/profesionales/1');
    const presentacion = await screen.findByRole('region', { name: 'Conoce a Ana Demo' });
    expect(presentacion).toHaveTextContent('Soy Ana, nutricionista deportiva. Me encanta correr.');
    const menu = screen.getByRole('tablist', { name: 'Información de Ana Demo' });
    const horas = screen.getByRole('heading', { name: 'Reservar una hora' });
    const resenas = screen.getByText('2 reseñas');
    const despues = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(despues(presentacion, menu) && despues(menu, horas) && despues(horas, resenas)).toBe(true);
    // «Reservar una hora», en la cabecera, lleva a las horas disponibles.
    await userEvent.click(screen.getByRole('button', { name: 'Reservar una hora' }));
    expect(document.getElementById('horas')).toHaveFocus();
  });

  test('sin presentación no muestra el recuadro vacío', async () => {
    simular(); renderizarApp('/profesionales/1');
    await screen.findByRole('heading', { level: 1, name: 'Ana Demo' });
    expect(screen.queryByRole('region', { name: /^Conoce a/ })).not.toBeInTheDocument();
  });

  test('el menú se recorre con las flechas y muestra una pestaña a la vez', async () => {
    simular({ ficha: fichaApi({ profesional: fichaProfesional({
      verificado: true, registroSis: '93952', formacion: [{ titulo: 'Nutricionista', institucion: 'Universidad de Chile', anio: 2016 }],
    }) }) });
    renderizarApp('/profesionales/1');
    const informacion = await screen.findByRole('tab', { name: 'Información' });
    expect(informacion).toHaveAttribute('aria-selected', 'true');
    // Desde el 16-11-2026 no repite «Sobre su atención»: la presentación va en «Conoce a…».
    expect(screen.getByRole('tabpanel', { name: 'Información' })).toHaveTextContent('EspecialidadNutrición');
    expect(screen.queryByText('Sobre su atención')).not.toBeInTheDocument();

    informacion.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Formación' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Formación' })).toHaveTextContent('Universidad de Chile · 2016');
    expect(screen.queryByRole('tabpanel', { name: 'Información' })).not.toBeInTheDocument();

    await userEvent.keyboard('{ArrowRight}');
    const certificaciones = screen.getByRole('tabpanel', { name: 'Certificaciones' });
    expect(certificaciones).toHaveTextContent('Verificado por FitSearch');
    expect(certificaciones).toHaveTextContent('Registro N.º 93952');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Lugar de atención' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(informacion).toHaveFocus();
  });
});

describe('Calificar (FS-HU-24)', () => {
  test('escenario 1: publica una reseña con estrellas y comentario y actualiza el resumen', async () => {
    const fetch = simular(); renderizarApp('/profesionales/1');
    expect(await screen.findByRole('heading', { name: 'Califica a Ana Demo' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '4 estrellas' }));
    await userEvent.type(screen.getByLabelText('Comentario (opcional)'), '  Excelente atención  ');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar reseña' }));

    expect(await screen.findByText('¡Gracias! Tu reseña fue publicada.')).toBeInTheDocument();
    expect(cuerpo(llamadasA(fetch, '/api/profesionales/1/resenas').find(([, opciones]) => opciones.method === 'PUT')))
      .toEqual({ puntaje: 4, comentario: 'Excelente atención' });
    expect(screen.getByText('3 reseñas')).toBeInTheDocument();
    expect(screen.getByText('Tu reseña', { selector: '.resena__etiqueta' })).toBeInTheDocument();
  });

  test('escenario 2: sin estrellas o con un comentario muy corto no envía la reseña', async () => {
    const fetch = simular(); renderizarApp('/profesionales/1');
    await screen.findByRole('heading', { name: 'Califica a Ana Demo' });
    await userEvent.click(screen.getByRole('button', { name: 'Publicar reseña' }));
    expect(screen.getByText('Elige una calificación de 1 a 5 estrellas')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await userEvent.type(screen.getByLabelText('Comentario (opcional)'), 'Bien');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar reseña' }));
    expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales/1/resenas').some(([, opciones]) => opciones.method === 'PUT')).toBe(false);
  });

  test('escenario 3: edita y elimina su propia reseña, con confirmación', async () => {
    const propia = resenaDe({ id: 20, autor: 'Ana P.', puntaje: 3, comentario: 'Atención correcta.', propia: true });
    const fetch = simular({
      ficha: fichaApi({ miResena: propia }),
      guardar: () => [200, { resena: { ...propia, puntaje: 5 }, resumenResenas: RESUMEN }],
    });
    renderizarApp('/profesionales/1');

    const tarjeta = (await screen.findByText('Tu reseña', { selector: '.resena__etiqueta' })).closest('.resena');
    expect(within(tarjeta).getByText('Atención correcta.')).toBeInTheDocument();
    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('radio', { name: '3 estrellas' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar reseña' }));
    expect(await screen.findByText('Tu reseña fue actualizada.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText('Tu reseña fue eliminada.')).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales/1/resenas').some(([, opciones]) => opciones.method === 'DELETE')).toBe(true);
    expect(await screen.findByRole('heading', { name: 'Califica a Ana Demo' })).toBeInTheDocument();
  });

  test('en la vista previa de su propia ficha, el profesional ve las reseñas pero no puede calificar ni guardarse en favoritos', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
    simular({ ficha: fichaApi({ puedeResenar: false }) });
    renderizarApp('/profesional/perfil/publico');
    expect(await screen.findByText('Solo las cuentas de usuario pueden calificar a profesionales.')).toBeInTheDocument();
    expect(screen.getByText('Así ven tu ficha las personas que buscan profesionales en FitSearch.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar reseña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /favoritos/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a mi perfil/ })).toHaveAttribute('href', '/profesional/perfil');
    await waitFor(() => expect(screen.getByText('Valeria D.')).toBeInTheDocument());
  });

  test('sin reseñas invita a dejar la primera', async () => {
    simular({ ficha: fichaApi({ resumenResenas: { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } }), resenas: [] });
    renderizarApp('/profesionales/1');
    expect(await screen.findByText('Este profesional aún no tiene reseñas')).toBeInTheDocument();
    expect(screen.getByText('¡Sé la primera persona en dejar una reseña!')).toBeInTheDocument();
  });
});
