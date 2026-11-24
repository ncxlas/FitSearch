import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import MenuLateral from './MenuLateral.jsx';
import BarraInferior from './BarraInferior.jsx';
import { fijarFotoCuenta } from '../../services/fotoCuenta.js';
import { SesionProvider } from '../../context/SesionContext.jsx';
import { SESION, simularApi } from '../../tests/utilidades.jsx';

test('el recorrido con Tab del menú móvil permite alcanzar los selectores de tema', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ '/api/chats/no-leidos': { total: 0 } });
  render(<MemoryRouter><SesionProvider><MenuLateral abierto onCerrar={vi.fn()} tema="claro" onTema={vi.fn()} /></SesionProvider></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar aspecto' }));
  screen.getByRole('button', { name: 'Cambiar aspecto' }).focus();
  await userEvent.tab();
  expect(screen.getByRole('radio', { name: 'Claro' })).toHaveFocus();
});

test('la campana se marca mientras su panel está abierto y se desmarca al cerrarlo', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ '/api/chats/no-leidos': { total: 0 } });
  render(<MemoryRouter><SesionProvider><MenuLateral abierto={false} onCerrar={vi.fn()} /></SesionProvider></MemoryRouter>);
  const campana = screen.getByRole('button', { name: 'Notificaciones' });
  await userEvent.click(campana);
  expect(campana).toHaveAttribute('aria-expanded', 'true');
  expect(campana.querySelector('.icono--activo path[fill="currentColor"]')).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificaciones' }));
  expect(campana).toHaveAttribute('aria-expanded', 'false');
  expect(campana.querySelector('.icono--activo')).toBeNull();
  await userEvent.tab();
  expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveFocus();
});

test('ambos accesos al perfil muestran la foto vigente y las iniciales si la imagen falla', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ '/api/chats/no-leidos': { total: 0 } });
  render(<MemoryRouter initialEntries={['/perfil']}><SesionProvider><MenuLateral abierto={false} onCerrar={vi.fn()} /><BarraInferior /></SesionProvider></MemoryRouter>);
  const menu = within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: 'Mi perfil' });
  const barra = within(screen.getByRole('navigation', { name: 'Navegación inferior' })).getByRole('link', { name: 'Perfil' });
  await waitFor(() => expect(menu.querySelector('.avatar-navegacion')).toHaveTextContent('AP'));
  act(() => fijarFotoCuenta(SESION.usuario.id, '/foto-de-prueba.png'));
  expect(menu.querySelector('img')).toHaveAttribute('src', '/foto-de-prueba.png');
  expect(barra.querySelector('img')).toHaveAttribute('src', '/foto-de-prueba.png');
  act(() => fijarFotoCuenta(SESION.usuario.id, '/foto-actualizada.png'));
  expect(menu.querySelector('img')).toHaveAttribute('src', '/foto-actualizada.png');
  expect(barra.querySelector('img')).toHaveAttribute('src', '/foto-actualizada.png');
  fireEvent.error(menu.querySelector('img'));
  expect(menu.querySelector('.avatar-navegacion')).toHaveTextContent('AP');
});
