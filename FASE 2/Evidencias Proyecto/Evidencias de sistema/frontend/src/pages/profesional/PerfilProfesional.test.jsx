// "Perfil profesional" (FS-HU-04): ficha propia con su formulario, pestañas y vista previa de la ficha pública.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  cuentaDePrueba, ESPECIALIDADES_DE_PRUEBA, fichaProfesional, MI_FICHA, renderizarApp, respuestaJson, SESION_PROFESIONAL,
} from '../../tests/utilidades.jsx';
// El mapa de la ficha (SC-28) se prueba en FormularioFicha.test.jsx: aquí queda cargando.
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: () => new Promise(() => {}), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));

const NUEVA = {
  especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 2401', modalidad: 'ambas',
  ubicacionLat: -33.4569, ubicacionLng: -70.5976,
};
// Lo que entrega la búsqueda de la ubicación (SC-28): el profesional ya no escribe coordenadas.
const UBICACION = { lat: -33.4569, lng: -70.5976, precision: 'exacta', encontrada: 'Avenida Irarrázaval 2401, Ñuñoa' };
const RESUMEN_VACIO = { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

// Servidor simulado: el catálogo de especialidades (FS-HU-30), la ficha propia (null hasta que se guarda) y su ficha
// pública por id.
function simularServidor({ ficha = null, alGuardar } = {}) {
  const estado = { ficha };
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones = {}) => {
    if (url === '/api/perfil/cuenta') return respuestaJson(200, { cuenta: cuentaDePrueba(SESION_PROFESIONAL.usuario) });
    if (url === '/api/especialidades') return respuestaJson(200, { especialidades: ESPECIALIDADES_DE_PRUEBA });
    if (url.startsWith('/api/profesionales/mi-ficha/ubicacion')) return respuestaJson(200, UBICACION);
    if (url === '/api/profesionales/mi-ficha' && opciones.method === 'PUT') {
      if (alGuardar) return alGuardar();
      estado.ficha = { id: 3, ...JSON.parse(opciones.body) };
      return respuestaJson(200, { ficha: estado.ficha });
    }
    if (url === '/api/profesionales/mi-ficha') return respuestaJson(200, { ficha: estado.ficha });
    if (url === '/api/profesionales/mi-ficha/experiencia') return respuestaJson(200, {
      experiencia: { aniosExperiencia: null, formacion: [], atiendeA: [], registroSis: null, precioDesde: null },
    });
    if (url === `/api/profesionales/${estado.ficha?.id}`) {
      const { id, ...datos } = estado.ficha;
      return respuestaJson(200, {
        profesional: fichaProfesional({ id, nombre: 'Matías Rojas', ...datos, establecimiento: null, calificacion: { promedio: 4.8, total: 5 } }),
        resumenResenas: RESUMEN_VACIO, miResena: null, puedeResenar: false,
      });
    }
    return respuestaJson(404, { error: 'Recurso no encontrado' });
  });
}
const cuerpoPut = (fetch) => JSON.parse(fetch.mock.calls.find(([url, o]) => url === '/api/profesionales/mi-ficha' && o.method === 'PUT')[1].body);
const huboPut = (fetch) => fetch.mock.calls.some(([, opciones = {}]) => opciones.method === 'PUT');

async function completarFicha({ modalidad = 'ambas', direccion = 'Av. Irarrázaval 2401' } = {}) {
  // El catálogo de especialidades llega de la API (FS-HU-30).
  await screen.findByRole('option', { name: 'Nutrición' });
  await userEvent.selectOptions(screen.getByLabelText('Especialidad (obligatorio)'), 'Nutrición');
  await userEvent.type(screen.getByLabelText('Descripción sobre tu atención'), 'Atención nutricional');
  await userEvent.selectOptions(screen.getByLabelText('Modalidad de atención (obligatorio)'), modalidad);
  if (modalidad !== 'online') await userEvent.type(screen.getByLabelText('Comuna (obligatorio)'), 'Ñuñoa');
  if (direccion) await userEvent.type(screen.getByLabelText(/^Dirección de atención/), direccion);
}

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

describe('Sin ficha', () => {
  test('muestra el formulario directamente, sin "Cancelar", y al guardar muestra el perfil', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');

    expect(await screen.findByRole('heading', { name: 'Configura tu perfil profesional' })).toBeInTheDocument();
    expect(screen.getByText('Completa tu ficha para aparecer en el buscador de FitSearch.')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Descripción sobre tu atención').closest('form')).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await completarFicha();
    await userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));

    expect(await screen.findByText('Tu ficha profesional se guardó correctamente.')).toBeInTheDocument();
    expect(cuerpoPut(fetch)).toEqual(NUEVA);
    expect(screen.getByRole('heading', { level: 1, name: 'Mi perfil profesional' })).toBeInTheDocument();
    expect(screen.getByText('Atención nutricional')).toBeInTheDocument();
  });

  test('sin completar los campos obligatorios no guarda y señala cada uno', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');

    await userEvent.click(await screen.findByRole('button', { name: /Guardar perfil/ }));

    // Los mensajes de error se anuncian como alertas (el de la especialidad también es la opción inicial del selector).
    expect(screen.getAllByRole('alert').map((alerta) => alerta.textContent)).toEqual(expect.arrayContaining([
      'Selecciona tu especialidad', 'Selecciona cómo atiendes', 'Ingresa la comuna donde atiendes', 'Ingresa la dirección donde atiendes',
    ]));
    expect(huboPut(fetch)).toBe(false);
  });

  test('si atiende solo online no se pide ni se guarda ubicación', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');
    await screen.findByRole('heading', { name: 'Configura tu perfil profesional' });
    expect(screen.getByLabelText('Dirección de atención (obligatorio)')).toHaveAttribute('autocomplete', 'street-address');

    await completarFicha({ modalidad: 'online', direccion: '' });
    expect(screen.queryByLabelText(/^Dirección de atención/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));

    expect(await screen.findByText('Tu ficha profesional se guardó correctamente.')).toBeInTheDocument();
    expect(cuerpoPut(fetch)).toMatchObject({ modalidad: 'online', comuna: null, direccion: null, ubicacionLat: null, ubicacionLng: null });
  });

  test('los errores de la API se muestran en su campo', async () => {
    simularServidor({ alGuardar: () => respuestaJson(400, { error: 'Revisa los datos ingresados', detalles: { comuna: 'La comuna admite hasta 80 caracteres' } }) });
    renderizarApp('/profesional/perfil');

    await screen.findByRole('heading', { name: 'Configura tu perfil profesional' });
    await completarFicha();
    await userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));

    expect(await screen.findByText('La comuna admite hasta 80 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Revisa los datos ingresados')).toBeInTheDocument();
  });
});

describe('Perfil profesional editable', () => {
  test('conserva la verificación, calificación y el enlace público', async () => {
    simularServidor({ ficha: { ...MI_FICHA, verificado: true } });
    renderizarApp('/profesional/perfil');
    expect(await screen.findByText('Verificado')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Calificación 4,8 de 5, 5 reseñas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver mi perfil público/ })).toHaveAttribute('href', '/profesional/perfil/publico');
    expect(screen.getByRole('link', { name: /Ir a mi agenda/ })).toHaveAttribute('href', '/profesional/agenda');
  });
  test('online no ofrece la ubicación antigua y conserva la modalidad', async () => {
    simularServidor({ ficha: { ...MI_FICHA, modalidad: 'online', comuna: null, direccion: null } });
    renderizarApp('/profesional/perfil');
    expect(await screen.findByLabelText('Modalidad de atención (obligatorio)')).toHaveValue('online');
    expect(screen.getAllByText('Atención online').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Comuna (obligatorio)')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Google Maps/ })).not.toBeInTheDocument();
  });
  test('la ficha presencial permite editar directamente su dirección', async () => {
    simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });
    renderizarApp('/profesional/perfil');
    expect(await screen.findByLabelText('Dirección de atención (obligatorio)')).toHaveValue('Av. Italia 850');
    expect(screen.getByLabelText('Descripción sobre tu atención')).toHaveValue('Entrenamiento funcional y de fuerza.');
  });
  test('información y experiencia siguen juntas y certificaciones se conserva aparte, sin Horarios', async () => {
    simularServidor({ ficha: MI_FICHA });
    renderizarApp('/profesional/perfil');
    const nav = within(await screen.findByRole('navigation', { name: 'Secciones del perfil' }));
    expect(nav.getAllByRole('button').map((b) => b.textContent)).toEqual(['Información y experiencia', 'Certificaciones']);
    await screen.findByLabelText('Especialidad (obligatorio)');
    await userEvent.click(screen.getByText('Experiencia y formación', { selector: 'summary' }));
    expect(await screen.findByRole('button', { name: 'Agregar experiencia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Horarios' })).not.toBeInTheDocument();
  });
  test('las secciones se recorren con el teclado y se activan con Enter', async () => {
    simularServidor({ ficha: MI_FICHA }); renderizarApp('/profesional/perfil');
    const nav = within(await screen.findByRole('navigation', { name: 'Secciones del perfil' }));
    const boton = nav.getByRole('button', { name: 'Certificaciones' });
    boton.focus(); await userEvent.keyboard('{Enter}');
    expect(boton).toHaveFocus(); expect(boton).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Certificaciones' })).toBeInTheDocument();
  });
  test('Cancelar descarta cambios de la ficha sin guardar', async () => {
    const fetch = simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });
    renderizarApp('/profesional/perfil');
    const comuna = await screen.findByLabelText('Comuna (obligatorio)');
    await userEvent.clear(comuna); await userEvent.type(comuna, 'Santiago');
    const form = within(comuna.closest('form'));
    await userEvent.click(form.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Comuna (obligatorio)')).toHaveValue('Providencia');
    expect(huboPut(fetch)).toBe(false);
  });
  test('copia el enlace público y ofrece alternativa manual si falla el portapapeles', async () => {
    const u = userEvent.setup();
    const copiar = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    simularServidor({ ficha: MI_FICHA }); renderizarApp('/profesional/perfil');
    await u.click(await screen.findByRole('button', { name: 'Copiar enlace' }));
    expect(copiar).toHaveBeenCalledWith(`${window.location.origin}/profesionales/${MI_FICHA.id}`);
    expect(await screen.findByText('Enlace de tu perfil copiado.')).toBeInTheDocument();
    copiar.mockRejectedValue(new Error('Sin permiso'));
    await u.click(screen.getByRole('button', { name: 'Enlace copiado' }));
    expect(await screen.findByRole('textbox', { name: /No pudimos copiarlo automáticamente/ })).toHaveValue(`${window.location.origin}/profesionales/${MI_FICHA.id}`);
  });
});
