import { useCallback, useEffect, useRef, useState } from 'react';

// Menú lateral de escritorio (18-11-2026, pedido del PO): siempre contraído a solo íconos y se despliega cuando el mouse
// se acerca a los íconos o cuando se recorre con el teclado. Lo usan el usuario, el profesional y el administrador.
// La espera al entrar evita que se abra si el mouse solo cruza la columna. Al salir se contrae de inmediato.
// Con el teclado se mantiene abierto mientras el foco siga dentro del menú.
const ESPERA_ABRIR = 120;

// Solo el foco del teclado despliega el menú: al hacer clic en una opción el foco queda en ella, pero el menú debe
// cerrarse igual cuando el mouse se va.
function focoDeTeclado(elemento) {
  try {
    return elemento.matches(':focus-visible');
  } catch {
    return true;
  }
}

export default function useMenuDesplegable() {
  const [conMouse, setConMouse] = useState(false);
  const [conTeclado, setConTeclado] = useState(false);
  const espera = useRef(null);
  const focoPorMouse = useRef(false);
  useEffect(() => () => clearTimeout(espera.current), []);

  const programar = useCallback((valor, milisegundos) => {
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setConMouse(valor), milisegundos);
  }, []);

  const propiedades = {
    onMouseEnter: () => programar(true, ESPERA_ABRIR),
    onMouseLeave: () => { clearTimeout(espera.current); setConMouse(false); },
    onMouseDownCapture: () => { focoPorMouse.current = true; setConTeclado(false); },
    onKeyDownCapture: () => { focoPorMouse.current = false; setConTeclado(true); },
    onFocus: (evento) => {
      if (focoPorMouse.current) { focoPorMouse.current = false; return; }
      if (focoDeTeclado(evento.target)) setConTeclado(true);
    },
    onBlur: (evento) => {
      if (!evento.currentTarget.contains(evento.relatedTarget)) {
        focoPorMouse.current = false;
        setConTeclado(false);
      }
    },
  };
  return { desplegado: conMouse || conTeclado, propiedades };
}
