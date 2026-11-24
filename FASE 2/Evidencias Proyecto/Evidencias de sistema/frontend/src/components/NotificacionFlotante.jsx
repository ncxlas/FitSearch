import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icono from './Icono.jsx';
import './NotificacionFlotante.css';

export default function NotificacionFlotante({ children, tipo = 'exito' }) {
  const id = useId();
  const [visible, setVisible] = useState(true);
  const [contenidoAnterior, setContenidoAnterior] = useState(children);
  if (contenidoAnterior !== children) {
    setContenidoAnterior(children);
    setVisible(true);
  }
  const reloj = useRef(null);
  const restante = useRef(6000);
  const inicio = useRef(0);
  const pausado = useRef({ mouse: false, foco: false });

  function iniciar() {
    clearTimeout(reloj.current);
    if (pausado.current.mouse || pausado.current.foco) return;
    inicio.current = Date.now();
    reloj.current = setTimeout(() => setVisible(false), restante.current);
  }
  function pausar(clave) {
    if (!pausado.current.mouse && !pausado.current.foco) {
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
      clearTimeout(reloj.current);
    }
    pausado.current[clave] = true;
  }
  function continuar(clave) {
    pausado.current[clave] = false;
    iniciar();
  }
  useEffect(() => {
    restante.current = 6000;
    const alMostrar = (evento) => setVisible(evento.detail === id);
    window.addEventListener('fitsearch:aviso-visible', alMostrar);
    window.dispatchEvent(new CustomEvent('fitsearch:aviso-visible', { detail: id }));
    inicio.current = Date.now();
    if (!pausado.current.mouse && !pausado.current.foco) {
      reloj.current = setTimeout(() => setVisible(false), 6000);
    }
    return () => {
      clearTimeout(reloj.current);
      window.removeEventListener('fitsearch:aviso-visible', alMostrar);
    };
  }, [children, id]);

  if (!visible || !children) return null;
  return createPortal(
    <div className={`notificacion-flotante notificacion-flotante--${tipo}`}
      onMouseEnter={() => pausar('mouse')} onMouseLeave={() => continuar('mouse')}
      onFocus={() => pausar('foco')} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) continuar('foco'); }}>
      <Icono nombre={tipo === 'exito' ? 'check' : 'info'} tamano={22} />
      <p role="status" aria-live="polite" aria-atomic="true">{children}</p>
      <button type="button" aria-label="Cerrar notificación" onClick={() => setVisible(false)}>
        <Icono nombre="cerrar" tamano={20} />
      </button>
    </div>, document.body,
  );
}
