import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import iconoLogo from '../assets/logo-fitsearch-icono.png';
import { iniciales, primerNombre } from '../services/formato.js';
import Icono from './Icono.jsx';
import './Bienvenida.css';

export default function Bienvenida({ usuario, onCerrar }) {
  const capa = useRef(null);
  const continuar = useRef(null);

  useEffect(() => {
    const fondo = [...document.body.children]
      .filter((elemento) => elemento !== capa.current && !elemento.hasAttribute('inert'));
    const desplazamiento = document.body.style.overflow;
    fondo.forEach((elemento) => elemento.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden';
    continuar.current?.focus();

    const alPresionar = (evento) => {
      if (evento.key === 'Escape') { onCerrar(); return; }
      if (evento.key !== 'Tab') return;
      const botones = [...(capa.current?.querySelectorAll('button') ?? [])];
      const primero = botones[0];
      const ultimo = botones.at(-1);
      if (!primero) return;
      const activo = document.activeElement;
      const afuera = !capa.current.contains(activo);
      if (evento.shiftKey ? afuera || activo === primero : afuera || activo === ultimo) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus();
      }
    };
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      fondo.forEach((elemento) => elemento.removeAttribute('inert'));
      document.body.style.overflow = desplazamiento;
      document.getElementById('contenido')?.focus();
    };
  }, [onCerrar]);

  return createPortal(
    <div ref={capa} className="bienvenida">
      <section className="bienvenida__tarjeta" role="dialog" aria-modal="true"
        aria-labelledby="titulo-bienvenida" aria-describedby="texto-bienvenida cuenta-bienvenida">
        <div className="bienvenida__marca">
          <button type="button" className="bienvenida__cerrar" aria-label="Cerrar bienvenida" onClick={onCerrar}>
            <Icono nombre="cerrar" tamano={22} />
          </button>
          <span className="bienvenida__logo" aria-hidden="true"><img src={iconoLogo} alt="" /></span>
        </div>
        <div className="bienvenida__contenido">
          <h2 id="titulo-bienvenida">Bienvenido, {primerNombre(usuario.nombre)}</h2>
          <p id="texto-bienvenida">Iniciaste sesión con esta cuenta:</p>
          <div id="cuenta-bienvenida" className="bienvenida__cuenta">
            <span className="bienvenida__iniciales" aria-hidden="true">{iniciales(usuario.nombre)}</span>
            <div><strong>{usuario.nombre}</strong><span>{usuario.correo}</span></div>
          </div>
          <button ref={continuar} type="button" className="boton boton--principal bienvenida__continuar" onClick={onCerrar}>
            Continuar <Icono nombre="flecha" tamano={18} />
          </button>
          <p className="bienvenida__nota">Tu espacio de bienestar está listo.</p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
