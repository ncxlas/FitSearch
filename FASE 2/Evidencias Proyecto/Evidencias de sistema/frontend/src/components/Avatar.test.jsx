// Foto de perfil en todos los lugares donde aparece una persona (15-11-2026).
import { fireEvent, render } from '@testing-library/react';
import { expect, test } from 'vitest';
import Avatar from './Avatar.jsx';

test('con foto muestra la imagen decorativa y conserva la clase del lugar', () => {
  const { container } = render(<Avatar className="ficha__avatar" nombre="Camila Rojas" fotoUrl="/api/fotos/3/0123456789abcdef" />);
  const avatar = container.firstChild;
  expect(avatar).toHaveClass('ficha__avatar', 'con-foto');
  expect(avatar).toHaveAttribute('aria-hidden', 'true');
  expect(avatar.querySelector('img')).toHaveAttribute('src', '/api/fotos/3/0123456789abcdef');
  expect(avatar.querySelector('img')).toHaveAttribute('alt', '');
});

test('sin foto, o si la imagen no carga, muestra las iniciales', () => {
  const { container, rerender } = render(<Avatar nombre="Camila Rojas" />);
  expect(container.firstChild).toHaveTextContent('CR');
  expect(container.firstChild).toHaveClass('avatar');
  expect(container.firstChild).not.toHaveClass('con-foto');

  rerender(<Avatar nombre="Camila Rojas" fotoUrl="/api/fotos/3/rota" />);
  fireEvent.error(container.querySelector('img'));
  expect(container.firstChild).toHaveTextContent('CR');
  expect(container.querySelector('img')).toBeNull();
  // Si después llega otra foto, se vuelve a intentar.
  rerender(<Avatar nombre="Camila Rojas" fotoUrl="/api/fotos/3/nueva" />);
  expect(container.querySelector('img')).toHaveAttribute('src', '/api/fotos/3/nueva');
});

test('acepta un texto propio en vez de las iniciales (una sola letra en reseñas y clientes)', () => {
  const { container } = render(<Avatar className="avatar avatar--pequeno" nombre="Ana P." texto="A" />);
  expect(container.firstChild).toHaveTextContent(/^A$/);
});
