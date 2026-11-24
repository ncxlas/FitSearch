import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import BotonGoogle from '../BotonGoogle.jsx';
import Dialogo from '../Dialogo.jsx';
import Icono from '../Icono.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { descargarMisDatos, eliminarCuenta } from '../../services/miCuenta.js';
import './PrivacidadDatos.css';

const BORRA = {
  usuario: 'tu perfil, tu información de salud, tus comidas y el agua, tus planes y metas, tus conversaciones con el asistente, tus favoritos y tus chats',
  profesional: 'tu ficha pública (presentación, contacto, ubicación y formación), tus documentos de verificación, tus horarios libres, tus chats y tu lista de espera',
};

// Privacidad y datos (SC-42): descargar una copia de todo lo que la cuenta guardó y eliminar la cuenta. Eliminar exige
// escribir ELIMINAR y confirmar la identidad con la contraseña o con la cuenta de Google vinculada.
export default function PrivacidadDatos({ cuenta, rol = 'usuario' }) {
  const { cuentaEliminada } = useSesion();
  const navegar = useNavigate();
  const [descarga, setDescarga] = useState({ ocupado: false, error: '' });
  const [abierto, setAbierto] = useState(false);

  async function descargar() {
    setDescarga({ ocupado: true, error: '' });
    try {
      await descargarMisDatos();
      setDescarga({ ocupado: false, error: '', listo: true });
    } catch (error) {
      setDescarga({ ocupado: false, error: error.message });
    }
  }

  async function alEliminar() {
    cuentaEliminada();
    navegar('/', { replace: true });
  }

  return (
    <div className="privacidad">
      <section className="privacidad__bloque" aria-labelledby="privacidad-descargar">
        <span className="privacidad__icono" aria-hidden="true"><Icono nombre="descargar" tamano={20} /></span>
        <div className="privacidad__texto">
          <h3 id="privacidad-descargar">Descargar mis datos</h3>
          <p>Un archivo con todo lo que tu cuenta guardó en FitSearch: {rol === 'profesional' ? 'tu ficha, tu agenda, tus citas, reseñas y chats' : 'tu perfil, tu salud, tus comidas, el agua, tus planes, tus citas, tus chats y tus conversaciones con el asistente'}. No incluye tu contraseña.</p>
          <Alerta>{descarga.error}</Alerta>
          {descarga.listo && <p className="privacidad__listo" role="status"><Icono nombre="check" tamano={16} /> Listo: revisa tu carpeta de descargas.</p>}
        </div>
        <button type="button" className="boton boton--secundario privacidad__accion" disabled={descarga.ocupado} onClick={descargar}>
          {descarga.ocupado ? 'Preparando…' : <><Icono nombre="descargar" tamano={18} /> Descargar</>}
        </button>
      </section>

      <section className="privacidad__bloque privacidad__bloque--peligro" aria-labelledby="privacidad-eliminar">
        <span className="privacidad__icono" aria-hidden="true"><Icono nombre="basura" tamano={20} /></span>
        <div className="privacidad__texto">
          <h3 id="privacidad-eliminar">Eliminar mi cuenta</h3>
          <p>Se borran {BORRA[rol] || BORRA.usuario}. No se puede deshacer.</p>
        </div>
        <button type="button" className="boton privacidad__accion boton--peligro-borde" onClick={() => setAbierto(true)}>
          Eliminar cuenta
        </button>
      </section>

      {abierto && <EliminarCuenta cuenta={cuenta} rol={rol} onCerrar={() => setAbierto(false)} onEliminada={alEliminar} />}
    </div>
  );
}

function EliminarCuenta({ cuenta, rol, onCerrar, onEliminada }) {
  const [confirmacion, setConfirmacion] = useState('');
  const [password, setPassword] = useState('');
  const [credencial, setCredencial] = useState('');
  const [estado, setEstado] = useState({ ocupado: false, error: '', detalles: {} });
  const conPassword = cuenta?.tienePassword ?? true;
  const conGoogle = Boolean(cuenta?.tieneGoogle);
  const escrita = confirmacion.trim().toUpperCase() === 'ELIMINAR';
  const listo = escrita && (password || credencial);

  async function enviar(evento) {
    evento.preventDefault();
    if (!listo) return;
    setEstado({ ocupado: true, error: '', detalles: {} });
    try {
      await eliminarCuenta({ password, credencial });
      onEliminada();
    } catch (error) {
      setEstado({ ocupado: false, error: error.message, detalles: error.detalles || {} });
    }
  }

  return (
    <Dialogo titulo="¿Eliminar tu cuenta?" tono="peligro" ocupado={estado.ocupado} onCerrar={onCerrar}
      descripcion="Esta acción no se puede deshacer.">
      <form onSubmit={enviar} noValidate>
        <ul className="eliminar-cuenta__lista">
          <li>Se borran {BORRA[rol] || BORRA.usuario}.</li>
          <li>Tus citas que aún no ocurren se cancelan y le avisamos a la otra parte por correo.</li>
          <li>Tus citas y reseñas pasadas se conservan sin tu nombre, como «{rol === 'profesional' ? 'Profesional eliminado' : 'Usuario eliminado'}».</li>
          <li>Si quieres guardar una copia, descarga tus datos antes de continuar.</li>
        </ul>
        <label className="campo">
          <span className="campo__etiqueta">Escribe ELIMINAR para confirmar</span>
          <input className="campo__control" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="off" autoCapitalize="characters" spellCheck="false" />
        </label>
        {conPassword && (
          <label className="campo">
            <span className="campo__etiqueta">Tu contraseña</span>
            <input type="password" className="campo__control" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" aria-invalid={Boolean(estado.detalles.password)} />
            {estado.detalles.password && <span className="campo__mensaje" role="alert">{estado.detalles.password}</span>}
          </label>
        )}
        {conGoogle && (
          <div className="eliminar-cuenta__google">
            {credencial
              ? <p className="privacidad__listo" role="status"><Icono nombre="check" tamano={16} /> Cuenta de Google confirmada.</p>
              : <BotonGoogle separador={conPassword ? 'o confirma con Google' : 'Confirma con tu cuenta de Google'} onCredencial={setCredencial} />}
          </div>
        )}
        {!estado.detalles.password && <Alerta>{estado.error}</Alerta>}
        <div className="dialogo__acciones">
          <button type="button" className="boton boton--secundario" disabled={estado.ocupado} onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="boton boton--peligro" disabled={!listo || estado.ocupado}>
            {estado.ocupado ? 'Eliminando…' : 'Eliminar mi cuenta'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
