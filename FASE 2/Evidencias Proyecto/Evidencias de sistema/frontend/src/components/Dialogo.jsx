import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Dialogo.css';

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Cuadro de diálogo modal reutilizable (24-11-2026; eliminar la cuenta, planes y compartir el progreso). Mientras está
// abierto el resto de la página queda inerte, el foco parte en el primer campo (o en `enfocarPrimero`), Tab recorre solo
// el cuadro, Escape lo cierra salvo mientras `ocupado`, y al cerrarse el foco vuelve a donde estaba.
export default function Dialogo({ titulo, descripcion, children, onCerrar, ocupado = false, ancho = 'normal', tono, enfocarPrimero }) {
  const capa = useRef(null);
  const tarjeta = useRef(null);
  const id = useId();

  useEffect(() => {
    const anterior = document.activeElement;
    const fondo = [...document.body.children].filter((el) => el !== capa.current && !el.hasAttribute('inert'));
    fondo.forEach((el) => el.setAttribute('inert', ''));
    const inicial = enfocarPrimero?.current
      || tarjeta.current?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      || tarjeta.current?.querySelector(ENFOCABLES);
    inicial?.focus();
    return () => {
      fondo.forEach((el) => el.removeAttribute('inert'));
      if (anterior instanceof HTMLElement && document.contains(anterior)) anterior.focus();
    };
    // Solo al abrir y cerrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const alPresionar = (evento) => {
      if (evento.key === 'Escape') { if (!ocupado) { evento.preventDefault(); onCerrar(); } return; }
      if (evento.key !== 'Tab' || !tarjeta.current) return;
      const enfocables = [...tarjeta.current.querySelectorAll(ENFOCABLES)];
      if (!enfocables.length) { evento.preventDefault(); return; }
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      const activo = document.activeElement;
      const afuera = !tarjeta.current.contains(activo);
      if (evento.shiftKey ? afuera || activo === primero : afuera || activo === ultimo) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus();
      }
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [ocupado, onCerrar]);

  return createPortal(
    <div ref={capa} className="dialogo" onMouseDown={(e) => { if (e.target === capa.current && !ocupado) onCerrar(); }}>
      <div ref={tarjeta} className={`dialogo__tarjeta dialogo__tarjeta--${ancho}${tono ? ` dialogo__tarjeta--${tono}` : ''}`}
        role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} aria-describedby={descripcion ? `${id}-descripcion` : undefined}>
        <header className="dialogo__cabecera">
          <h2 id={`${id}-titulo`}>{titulo}</h2>
          <button type="button" className="dialogo__cerrar" aria-label="Cerrar" disabled={ocupado} onClick={onCerrar}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {descripcion && <p id={`${id}-descripcion`} className="dialogo__descripcion">{descripcion}</p>}
        <div className="dialogo__cuerpo">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
