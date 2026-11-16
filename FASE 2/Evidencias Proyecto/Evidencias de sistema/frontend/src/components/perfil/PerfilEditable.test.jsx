import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SesionProvider } from '../../context/SesionContext.jsx';
import {
  cuentaDePrueba, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, SESION_PROFESIONAL, simularApi,
} from '../../tests/utilidades.jsx';
import PerfilUsuarioEditable from './PerfilUsuarioEditable.jsx';
import { prepararFoto } from './fotoPerfil.js';

// jsdom no dibuja imágenes en un canvas: cuando una prueba necesita una foto ya recortada, la entrega este simulador.
// La validación real (tipo y tamaño) se mantiene para las demás.
vi.mock('./fotoPerfil.js', async (importOriginal) => {
  const real = await importOriginal();
  return { prepararFoto: vi.fn(real.prepararFoto) };
});
// El mapa de la ficha del profesional se prueba en FormularioFicha.test.jsx: aquí queda cargando.
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: () => new Promise(() => {}), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));

const FOTO = 'data:image/jpeg;base64,Rk9UTy1udWV2YQ==';
const OTRA_FOTO = 'data:image/jpeg;base64,T1RSQS1mb3Rv';
const PNG = () => new File(['png'], 'foto.png', { type: 'image/png' });
const botonCuenta = () => screen.getByRole('button', { name: /menú de tu cuenta/ });

beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));
function servidor({ sesion = SESION, foto = null, falla = null, rutas = {} } = {}) {
  let cuenta = { ...cuentaDePrueba(sesion.usuario), foto };
  const fetch = simularApi({ '/api/perfil': respuestaPerfil(PERFIL_COMPLETO), ...rutas,
    '/api/perfil/cuenta': (_url, opciones) => {
      if (opciones.method === 'PUT' && falla) return [400, { error: falla }];
      if (opciones.method === 'PUT') cuenta = { ...cuenta, ...JSON.parse(opciones.body) };
      return [200, { cuenta, usuario: { ...sesion.usuario, nombre: cuenta.nombre, correo: cuenta.correo } }];
    },
  });
  return fetch;
}
const huboPut = (fetch) => fetch.mock.calls.some(([, o]) => o.method === 'PUT');
test('guarda nombre y teléfono, actualiza la sesión y conserva la edición en la misma página', async () => {
  const fetch = servidor(); renderizarApp('/perfil');
  const nombre = await screen.findByLabelText('Nombre completo');
  await userEvent.clear(nombre); await userEvent.type(nombre, 'Ana Actualizada');
  await userEvent.type(screen.getByLabelText('Teléfono de contacto (opcional)'), '+56 9 1234 5678');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar datos personales' }));
  expect(await screen.findByText('Tus datos personales se guardaron correctamente.')).toBeInTheDocument();
  const put = fetch.mock.calls.find(([u, o]) => u === '/api/perfil/cuenta' && o.method === 'PUT');
  expect(JSON.parse(put[1].body)).toEqual({ nombre: 'Ana Actualizada', telefono: '+56 9 1234 5678' });
  expect(JSON.parse(localStorage.getItem('fitsearch_sesion')).usuario.nombre).toBe('Ana Actualizada');
  expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
});
test('Cancelar descarta los campos sin enviar solicitudes de guardado', async () => {
  const fetch = servidor(); renderizarApp('/perfil');
  const nombre = await screen.findByLabelText('Nombre completo');
  await userEvent.clear(nombre); await userEvent.type(nombre, 'No guardar');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(nombre).toHaveValue(SESION.usuario.nombre);
  expect(fetch.mock.calls.some(([, o]) => o.method === 'PUT')).toBe(false);
});
test('el correo se edita explícitamente y solicita confirmar la contraseña actual', async () => {
  servidor(); renderizarApp('/perfil');
  const correo = await screen.findByLabelText('Correo electrónico');
  expect(correo).toHaveAttribute('readonly');
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
  expect(correo).not.toHaveAttribute('readonly');
  expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('type', 'password');
});
test('los enlaces sociales se editan dentro de un apartado y se guardan por sección', async () => {
  const fetch = servidor(); renderizarApp('/perfil');
  await screen.findByLabelText('Nombre completo');
  await userEvent.click(screen.getByText('Redes sociales (opcional)', { selector: 'summary' }));
  await userEvent.type(screen.getByLabelText('Sitio web'), 'https://ana.example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar datos personales' }));
  await waitFor(() => expect(fetch.mock.calls.some(([, o]) => o.method === 'PUT')).toBe(true));
  expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method === 'PUT')[1].body)).toEqual({ sitioWeb: 'https://ana.example.com' });
});
test('rechaza un SVG seleccionado como foto sin intentar subirlo', async () => {
  const fetch = servidor(); renderizarApp('/perfil'); await screen.findByLabelText('Nombre completo');
  await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText('Seleccionar foto de perfil'), new File(['<svg/>'], 'foto.svg', { type: 'image/svg+xml' }));
  expect(await screen.findByText('Selecciona una foto JPG, PNG o WebP.')).toBeInTheDocument();
  expect(fetch.mock.calls.some(([, o]) => o.method === 'PUT')).toBe(false);
});

// Pedido del PO del 15-11-2026: la foto elegida se acepta en un cuadro antes de guardarla, ese cuadro reemplaza el
// mensaje «Foto actualizada» y el botón de la cuenta, junto a la campanita, muestra la foto en vez de las iniciales.
describe('foto de perfil con confirmación', () => {
  test('pide aceptar la foto, solo entonces la guarda y el botón de la cuenta cambia las iniciales por la foto', async () => {
    const fetch = servidor(); renderizarApp('/perfil'); await screen.findByLabelText('Nombre completo');
    expect(botonCuenta()).toHaveTextContent('AP');
    expect(botonCuenta().querySelector('img')).toBeNull();

    prepararFoto.mockResolvedValueOnce(FOTO);
    await userEvent.upload(screen.getByLabelText('Seleccionar foto de perfil'), PNG());
    const cuadro = await screen.findByRole('dialog', { name: '¿Usar esta foto de perfil?' });
    expect(within(cuadro).getByRole('img', { name: 'Vista previa de tu nueva foto de perfil' })).toHaveAttribute('src', FOTO);
    expect(cuadro).toHaveTextContent('Al aceptarla, tu foto de perfil se actualiza');
    expect(within(cuadro).getByRole('button', { name: 'Aceptar foto' })).toHaveFocus();
    expect(huboPut(fetch)).toBe(false);

    await userEvent.click(within(cuadro).getByRole('button', { name: 'Aceptar foto' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method === 'PUT')[1].body)).toEqual({ foto: FOTO });
    expect(screen.getByRole('img', { name: 'Foto de Ana Pérez' })).toHaveAttribute('src', FOTO);
    expect(botonCuenta().querySelector('img')).toHaveAttribute('src', FOTO);
    expect(botonCuenta()).not.toHaveTextContent('AP');
    expect(screen.queryByText('Foto actualizada.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar foto de perfil' })).toHaveFocus();
  });

  test('«Cancelar» y Escape descartan la foto sin enviarla', async () => {
    const fetch = servidor(); renderizarApp('/perfil'); await screen.findByLabelText('Nombre completo');
    prepararFoto.mockResolvedValueOnce(FOTO).mockResolvedValueOnce(FOTO);

    await userEvent.upload(screen.getByLabelText('Seleccionar foto de perfil'), PNG());
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar foto de perfil' })).toHaveFocus();

    await userEvent.upload(screen.getByLabelText('Seleccionar foto de perfil'), PNG());
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
    expect(botonCuenta()).toHaveTextContent('AP');
  });

  test('si no se puede guardar, el error queda en el cuadro para reintentar', async () => {
    servidor({ falla: 'La foto supera el tamaño permitido' }); renderizarApp('/perfil'); await screen.findByLabelText('Nombre completo');
    prepararFoto.mockResolvedValueOnce(FOTO);
    await userEvent.upload(screen.getByLabelText('Seleccionar foto de perfil'), PNG());
    const cuadro = await screen.findByRole('dialog');
    await userEvent.click(within(cuadro).getByRole('button', { name: 'Aceptar foto' }));
    expect(await within(cuadro).findByText('La foto supera el tamaño permitido')).toBeInTheDocument();
    expect(within(cuadro).getByRole('button', { name: 'Aceptar foto' })).toHaveFocus();
    expect(botonCuenta().querySelector('img')).toBeNull();
  });

  test('para un profesional, el botón de la cuenta muestra su foto al cargar y la nueva al aceptarla', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
    servidor({ sesion: SESION_PROFESIONAL, foto: FOTO, rutas: { '/api/profesionales/mi-ficha': { ficha: null } } });
    renderizarApp('/profesional/perfil');
    await waitFor(() => expect(botonCuenta().querySelector('img')).toHaveAttribute('src', FOTO));
    expect(botonCuenta()).not.toHaveTextContent('MR');

    prepararFoto.mockResolvedValueOnce(OTRA_FOTO);
    await userEvent.upload(await screen.findByLabelText('Seleccionar foto de perfil'), PNG());
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Aceptar foto' }));
    await waitFor(() => expect(botonCuenta().querySelector('img')).toHaveAttribute('src', OTRA_FOTO));
    expect(screen.getByRole('img', { name: 'Foto de Matías Rojas' })).toHaveAttribute('src', OTRA_FOTO);
  });
});

// Pedidos del PO del 15-11-2026: «Mi perfil» ya no muestra el requerimiento calórico y el cuadro «Perfil completo»
// solo aparece si falta algo por completar.
describe('estado del perfil del usuario', () => {
  test('no muestra el requerimiento calórico ni el cuadro «Perfil completo»', async () => {
    servidor(); renderizarApp('/perfil');
    await screen.findByRole('heading', { name: 'Mi perfil' });
    for (const seccion of ['Información personal', 'Datos físicos', 'Objetivos y estilo de vida', 'Información de salud']) {
      await userEvent.click(screen.getByRole('button', { name: seccion }));
      expect(screen.queryByText(/kcal/)).not.toBeInTheDocument();
    }
    expect(screen.queryByText('Requerimiento calórico diario estimado')).not.toBeInTheDocument();
    expect(screen.queryByText('Perfil completo')).not.toBeInTheDocument();
    expect(screen.queryByText('Completa tu perfil')).not.toBeInTheDocument();
  });

  test('si al perfil le falta algo, el cuadro lo indica y lleva a la sección pendiente', async () => {
    simularApi({});
    const datos = respuestaPerfil({ ...PERFIL_COMPLETO, salud: null });
    render(<MemoryRouter><SesionProvider><PerfilUsuarioEditable datos={datos} onGuardado={() => {}} /></SesionProvider></MemoryRouter>);
    const cuadro = (await screen.findByText('Completa tu perfil')).parentElement;
    expect(within(cuadro).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['Información de salud']);
    await userEvent.click(within(cuadro).getByRole('button', { name: 'Información de salud' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Información de salud' })).toBeInTheDocument();
  });
});
