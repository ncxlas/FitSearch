import { useState } from 'react';
import { iniciales } from '../services/formato.js';

// Foto de perfil de una persona en todos los lugares donde aparece (15-11-2026), o sus iniciales si no tiene foto o si
// la imagen no carga. Cada lugar conserva su clase, que define el tamaño y la forma; con foto se agrega «con-foto» para
// que la imagen llene el recuadro. Es decorativa: el nombre ya está escrito al lado.
export default function Avatar({ nombre, fotoUrl, className = 'avatar', texto }) {
  const [fallida, setFallida] = useState(null);
  const conFoto = Boolean(fotoUrl) && fallida !== fotoUrl;
  return (
    <span className={conFoto ? `${className} con-foto` : className} aria-hidden="true">
      {conFoto
        ? <img src={fotoUrl} alt="" loading="lazy" decoding="async" onError={() => setFallida(fotoUrl)} />
        : texto ?? iniciales(nombre)}
    </span>
  );
}
