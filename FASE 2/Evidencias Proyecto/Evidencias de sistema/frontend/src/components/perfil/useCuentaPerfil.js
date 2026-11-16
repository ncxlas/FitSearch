import { useEffect, useState } from 'react';
import { useSesion } from '../../context/SesionContext.jsx';
import { solicitar } from '../../services/api.js';
import { fijarFotoCuenta } from '../../services/fotoCuenta.js';

export default function useCuentaPerfil() {
  const { sesion, actualizarSesion } = useSesion();
  const usuarioId = sesion?.usuario?.id;
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    solicitar('/perfil/cuenta').then(({ cuenta }) => {
      if (!cuenta) throw new Error('No pudimos cargar los datos de tu cuenta. Intenta nuevamente.');
      if (!vigente) return;
      setEstado({ cuenta });
      fijarFotoCuenta(usuarioId, cuenta.foto);
    }).catch((error) => { if (vigente) setEstado({ error: error.message }); });
    return () => { vigente = false; };
  }, [intento, usuarioId]);
  async function guardar(datos) {
    const respuesta = await solicitar('/perfil/cuenta', { metodo: 'PUT', cuerpo: datos });
    setEstado({ cuenta: respuesta.cuenta });
    // El botón de la cuenta, junto a la campanita, muestra la foto nueva al instante (15-11-2026).
    fijarFotoCuenta(usuarioId, respuesta.cuenta?.foto);
    if (respuesta.usuario && actualizarSesion) {
      actualizarSesion({ ...sesion, token: respuesta.token || sesion.token, usuario: respuesta.usuario });
    }
    return respuesta.cuenta;
  }
  return { ...estado, guardar, reintentar: () => { setEstado({ cargando: true }); setIntento((v) => v + 1); } };
}
