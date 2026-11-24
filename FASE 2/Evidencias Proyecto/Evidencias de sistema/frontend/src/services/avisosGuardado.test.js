import { expect, test, vi } from 'vitest';
import { solicitar } from './api.js';
import { avisoDeOperacion } from './avisosGuardado.js';

test('confirma solo operaciones guardadas, incluidas las respuestas sin contenido', async () => {
  const recibir = vi.fn();
  window.addEventListener('fitsearch:guardado', recibir);
  try {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'No guardado' }), { status: 400 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await solicitar('/favoritos/3', { metodo: 'DELETE' });
    expect(recibir).toHaveBeenCalledTimes(1);
    expect(recibir.mock.calls[0][0].detail).toBe('Profesional quitado de favoritos.');
    await expect(solicitar('/favoritos/3', { metodo: 'PUT' })).rejects.toThrow('No guardado');
    await solicitar('/favoritos/3');
    expect(recibir).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('fitsearch:guardado', recibir);
  }
});

test('los mensajes de chat y las consultas no disparan confirmaciones de guardado', () => {
  expect(avisoDeOperacion('/chats/2/mensajes', 'POST')).toBeNull();
  expect(avisoDeOperacion('/asistente/conversaciones/2/mensajes', 'POST')).toBeNull();
  expect(avisoDeOperacion('/agua', 'GET')).toBeNull();
  expect(avisoDeOperacion('/comidas/4', 'PATCH')).toBe('Comida actualizada.');
});
