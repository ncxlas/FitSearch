import { solicitar } from './api.js';

// Derechos sobre los datos (SC-42): descargar una copia y eliminar la cuenta.
export async function descargarMisDatos() {
  const blob = await solicitar('/perfil/mis-datos', { descargar: true });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `fitsearch-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function eliminarCuenta({ password, credencial }) {
  return solicitar('/perfil/cuenta', {
    metodo: 'DELETE',
    cuerpo: { confirmacion: 'ELIMINAR', ...(password && { password }), ...(credencial && { credencial }) },
  });
}
