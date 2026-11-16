import { useEffect, useSyncExternalStore } from 'react';
import { solicitar } from './api.js';

// Foto de la cuenta con sesión (15-11-2026). La comparten el botón de la cuenta, junto a la campanita, y el perfil del
// usuario o del profesional: al aceptar una foto nueva se ve al instante en los dos, sin recargar. Vive solo en
// memoria: no se guarda con la sesión, para no llenar el almacenamiento del navegador con la imagen.
let estado = { usuarioId: null, foto: null, cargada: false };
let version = 0;
let pedido = null;
const oyentes = new Set();

function publicar(nuevo) {
  estado = nuevo;
  oyentes.forEach((oyente) => oyente());
}

const suscribir = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

// La pantalla de perfil la fija al cargar la cuenta y al guardar una foto nueva o quitarla.
export function fijarFotoCuenta(usuarioId, foto) {
  version += 1;
  publicar({ usuarioId, foto: foto || null, cargada: true });
}

// Al cerrar sesión (y entre pruebas) se olvida, para que otra cuenta no vea la foto anterior. No avisa a los
// componentes: el botón de la cuenta se está desmontando, y un aviso forzaría a React a dibujar en medio del cierre de
// sesión, antes de que quede registrado el aviso de despedida.
export function olvidarFotoCuenta() {
  version += 1;
  pedido = null;
  estado = { usuarioId: null, foto: null, cargada: false };
}

// Foto de la cuenta, o null mientras carga o si no tiene: en ese caso se muestran las iniciales.
export function useFotoCuenta(usuarioId, habilitada = true) {
  const actual = useSyncExternalStore(suscribir, () => estado);
  useEffect(() => {
    if (!habilitada || !usuarioId) return;
    if ((estado.usuarioId === usuarioId && estado.cargada) || pedido === usuarioId) return;
    pedido = usuarioId;
    const inicio = version;
    solicitar('/perfil/cuenta')
      // Si mientras tanto el perfil guardó otra foto, esa es la vigente y la respuesta anterior se descarta.
      .then(({ cuenta }) => { if (version === inicio) fijarFotoCuenta(usuarioId, cuenta?.foto); })
      .catch(() => {})
      .finally(() => { if (pedido === usuarioId) pedido = null; });
  }, [usuarioId, habilitada]);
  return actual.usuarioId === usuarioId ? actual.foto : null;
}
