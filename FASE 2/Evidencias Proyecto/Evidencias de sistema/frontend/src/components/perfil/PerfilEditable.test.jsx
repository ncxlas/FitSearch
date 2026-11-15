import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { cuentaDePrueba, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));
function servidor() {
  let cuenta = cuentaDePrueba();
  const fetch = simularApi({ '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
    '/api/perfil/cuenta': (_url, opciones) => {
      if (opciones.method === 'PUT') cuenta = { ...cuenta, ...JSON.parse(opciones.body) };
      return [200, { cuenta, usuario: { ...SESION.usuario, nombre: cuenta.nombre, correo: cuenta.correo } }];
    },
  });
  return fetch;
}
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
