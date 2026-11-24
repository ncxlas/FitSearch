export function avisoDeOperacion(ruta, metodo) {
  const camino = ruta.split('?')[0];
  if (['GET', 'HEAD'].includes(metodo)) return null;
  if (['/perfil', '/perfil/objetivos', '/perfil/salud'].includes(camino)) return 'Cambios guardados.';
  if (/^\/favoritos\/\d+$/.test(camino)) return metodo === 'DELETE' ? 'Profesional quitado de favoritos.' : 'Profesional guardado en favoritos.';
  if (/^\/comidas\/\d+$/.test(camino)) return metodo === 'DELETE' ? 'Comida eliminada.' : 'Comida actualizada.';
  if (/^\/agua(?:\/\d+)?$/.test(camino)) return metodo === 'DELETE' ? 'Registro de agua eliminado.' : 'Agua registrada.';
  if (/^\/asistente\/conversaciones\/\d+$/.test(camino)) return metodo === 'DELETE' ? 'Conversación eliminada.' : 'Conversación actualizada.';
  if (/^\/profesionales\/\d+\/lista-espera$/.test(camino)) return metodo === 'DELETE' ? 'Saliste de la lista de espera.' : 'Te anotaste en la lista de espera.';
  if (camino === '/reservas' && metodo === 'POST') return 'Reserva enviada.';
  if (camino.startsWith('/administrador/')) return metodo === 'DELETE' ? 'Registro eliminado.' : 'Cambios guardados.';
  return null;
}

export function avisarOperacion(ruta, metodo) {
  const texto = avisoDeOperacion(ruta, metodo);
  if (texto) window.dispatchEvent(new CustomEvent('fitsearch:guardado', { detail: texto }));
}
