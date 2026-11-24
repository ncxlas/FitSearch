import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  cuentaDePrueba, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, SESION_PROFESIONAL, MI_FICHA, simularApi,
} from '../../tests/utilidades.jsx';

// Privacidad y datos (SC-42): descargar mis datos y eliminar la cuenta, desde «Mi perfil» y desde la Configuración
// del profesional.
const llamadasA = (fetch, ruta, metodo = 'GET') => fetch.mock.calls.filter(([u, o = {}]) => u === ruta && (o.method || 'GET') === metodo);

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mis-datos');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

async function abrirPrivacidad() {
  renderizarApp('/perfil');
  await screen.findByRole('heading', { name: 'Mi perfil' });
  await userEvent.click(screen.getByRole('button', { name: 'Privacidad y datos' }));
  return screen.getByRole('heading', { level: 3, name: 'Eliminar mi cuenta' }).closest('.privacidad');
}

describe('«Mi perfil» › Privacidad y datos', () => {
  beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('CP-262: descarga un archivo JSON con los datos de la cuenta', async () => {
    const fetch = simularApi({ '/api/perfil': respuestaPerfil(PERFIL_COMPLETO), '/api/perfil/mis-datos': { cuenta: { nombre: 'Ana' } } });
    const seccion = await abrirPrivacidad();
    await userEvent.click(within(seccion).getByRole('button', { name: 'Descargar' }));
    expect(await within(seccion).findByText(/Listo: revisa tu carpeta de descargas/)).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/perfil/mis-datos')).toHaveLength(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  test('CP-263: eliminar exige escribir ELIMINAR y la contraseña; al terminar cierra la sesión y despide en la portada', async () => {
    const fetch = simularApi({
      '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
      '/api/perfil/cuenta': (_u, o) => (o.method === 'DELETE' ? [204, null] : [200, { cuenta: cuentaDePrueba() }]),
    });
    const seccion = await abrirPrivacidad();
    await userEvent.click(within(seccion).getByRole('button', { name: 'Eliminar cuenta' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar tu cuenta?' });
    const confirmar = within(dialogo).getByRole('button', { name: 'Eliminar mi cuenta' });
    expect(within(dialogo).getByText(/se conservan sin tu nombre, como «Usuario eliminado»/)).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    await userEvent.type(within(dialogo).getByLabelText('Escribe ELIMINAR para confirmar'), 'eliminar');
    expect(confirmar).toBeDisabled();
    await userEvent.type(within(dialogo).getByLabelText('Tu contraseña'), 'ClaveActual123');
    await userEvent.click(confirmar);

    expect(await screen.findByRole('heading', { name: 'Tu cuenta fue eliminada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear una cuenta nueva' })).toHaveAttribute('href', '/registro');
    const [[, opciones]] = llamadasA(fetch, '/api/perfil/cuenta', 'DELETE');
    expect(JSON.parse(opciones.body)).toEqual({ confirmacion: 'ELIMINAR', password: 'ClaveActual123' });
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
  });

  test('CP-263: con la contraseña incorrecta muestra el error en el campo y no cierra la sesión', async () => {
    simularApi({
      '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
      '/api/perfil/cuenta': (_u, o) => (o.method === 'DELETE'
        ? [400, { error: 'Confirma tu identidad para eliminar la cuenta', detalles: { password: 'La contraseña no es correcta' } }]
        : [200, { cuenta: cuentaDePrueba() }]),
    });
    const seccion = await abrirPrivacidad();
    await userEvent.click(within(seccion).getByRole('button', { name: 'Eliminar cuenta' }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.type(within(dialogo).getByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR');
    await userEvent.type(within(dialogo).getByLabelText('Tu contraseña'), 'otra');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar mi cuenta' }));
    expect(await within(dialogo).findByText('La contraseña no es correcta')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).not.toBeNull();
  });

  test('Escape cierra el diálogo y el foco vuelve al botón que lo abrió', async () => {
    simularApi({ '/api/perfil': respuestaPerfil(PERFIL_COMPLETO) });
    const seccion = await abrirPrivacidad();
    const abrir = within(seccion).getByRole('button', { name: 'Eliminar cuenta' });
    await userEvent.click(abrir);
    expect(screen.getByLabelText('Escribe ELIMINAR para confirmar')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(abrir).toHaveFocus();
  });
});

describe('Configuración del profesional › Privacidad y datos', () => {
  test('CP-263: el profesional ve qué se borra de su ficha', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
    simularApi({
      '/api/profesionales/mi-ficha/configuracion': { configuracion: { autoconfirmar: false, avisosCorreo: true, recordatorios: true } },
      '/api/profesionales/mi-ficha': { profesional: MI_FICHA },
    });
    renderizarApp('/profesional/configuracion');
    expect(await screen.findByRole('heading', { level: 2, name: 'Privacidad y datos' })).toBeInTheDocument();
    expect(screen.getByText(/tu ficha pública \(presentación, contacto, ubicación y formación\)/)).toBeInTheDocument();
  });
});
