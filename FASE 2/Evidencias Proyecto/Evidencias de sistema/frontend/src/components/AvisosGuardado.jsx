import { useEffect, useState } from 'react';
import NotificacionFlotante from './NotificacionFlotante.jsx';

export default function AvisosGuardado() {
  const [aviso, setAviso] = useState(null);
  useEffect(() => {
    let id = 0;
    const recibir = (evento) => setAviso({ texto: evento.detail, id: ++id });
    window.addEventListener('fitsearch:guardado', recibir);
    return () => window.removeEventListener('fitsearch:guardado', recibir);
  }, []);
  return aviso && <NotificacionFlotante key={aviso.id}>{aviso.texto}</NotificacionFlotante>;
}
