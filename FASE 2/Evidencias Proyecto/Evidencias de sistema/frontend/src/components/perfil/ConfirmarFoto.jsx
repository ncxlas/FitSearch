import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Alerta from '../Alerta.jsx';

// Antes de guardar una foto de perfil nueva se muestra cómo quedará y se pide aceptarla (15-11-2026). El mismo cuadro
// avisa que al aceptarla se actualiza: al guardarse se cierra y la foto ya se ve en el perfil y en el botón de la
// cuenta, sin otro mensaje. Escape o «Cancelar» la descartan sin enviar nada.
export default function ConfirmarFoto({ foto, guardando, error, onAceptar, onCancelar }) {
  const capa = useRef(null);
  const aceptar = useRef(null);

  // Mientras está abierto, el resto de la aplicación queda inerte y el foco parte en «Aceptar foto».
  useEffect(() => {
    const fondo = [...document.body.children].filter((elemento) => elemento !== capa.current && !elemento.hasAttribute('inert'));
    fondo.forEach((elemento) => elemento.setAttribute('inert', ''));
    aceptar.current?.focus();
    return () => fondo.forEach((elemento) => elemento.removeAttribute('inert'));
  }, []);

  // Si no se pudo guardar, el foco vuelve a «Aceptar foto» para reintentar (mientras guardaba estaba deshabilitado).
  useEffect(() => {
    if (error) aceptar.current?.focus();
  }, [error]);

  // Escape cancela (salvo mientras se guarda) y Tab recorre solo los botones del cuadro.
  useEffect(() => {
    const alPresionar = (evento) => {
      if (evento.key === 'Escape') { if (!guardando) onCancelar(); return; }
      if (evento.key !== 'Tab' || !capa.current) return;
      const enfocables = [...capa.current.querySelectorAll('button:not([disabled])')];
      if (enfocables.length === 0) { evento.preventDefault(); return; }
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      const activo = document.activeElement;
      const afuera = !capa.current.contains(activo);
      if (evento.shiftKey ? afuera || activo === primero : afuera || activo === ultimo) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus();
      }
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [guardando, onCancelar]);

  return createPortal(
    <div ref={capa} className="confirmar-foto">
      <div className="confirmar-foto__tarjeta" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar-foto"
        aria-describedby="texto-confirmar-foto">
        <h2 id="titulo-confirmar-foto">¿Usar esta foto de perfil?</h2>
        <img className="confirmar-foto__vista" src={foto} alt="Vista previa de tu nueva foto de perfil" />
        <p id="texto-confirmar-foto">
          Al aceptarla, tu foto de perfil se actualiza y se verá en tu perfil y en el botón de tu cuenta.
        </p>
        <Alerta>{error}</Alerta>
        <div className="confirmar-foto__acciones">
          <button ref={aceptar} type="button" className="boton boton--principal" disabled={guardando} onClick={onAceptar}>
            {guardando ? 'Guardando…' : 'Aceptar foto'}
          </button>
          <button type="button" className="boton boton--secundario" disabled={guardando} onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
