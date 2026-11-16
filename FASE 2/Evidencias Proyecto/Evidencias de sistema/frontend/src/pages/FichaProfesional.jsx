import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import { Calificacion } from '../components/Calificacion.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import BotonFavorito from '../components/profesionales/BotonFavorito.jsx';
import Resenas from '../components/profesionales/Resenas.jsx';
import ReservarHora from '../components/reservas/ReservarHora.jsx';
import MapaLugar from '../components/profesionales/MapaLugar.jsx';
import PestanasFicha from '../components/profesionales/PestanasFicha.jsx';
import { etiquetaAtiende, precioCLP, URL_SUPERSALUD } from '../components/profesional/experiencia.js';
import { etiquetaModalidad, iniciales } from '../services/formato.js';
import { obtenerProfesional } from '../services/profesional.service.js';
import './Profesionales.css';
import { CATEGORIAS } from '../components/establecimientos/categorias.js';

// Ficha de un profesional con sus datos públicos, favorito y reseñas (FS-HU-23, FS-HU-24).
// Con "vistaPrevia" la ve el propio profesional desde su perfil: sin favorito y volviendo a su perfil (DAS, D25).
export default function FichaProfesional({ idProfesional, vistaPrevia = false }) {
  const { id: idRuta } = useParams();
  const id = idProfesional ?? idRuta;
  const { state } = useLocation();
  // "Volver" regresa a la misma búsqueda desde la que se abrió la ficha. Revisión del PR #47: si se abrió desde la ficha
  // de un centro de salud o gimnasio (FS-HU-25), regresa a ese establecimiento, con su nombre en el botón, y desde ahí
  // su propio «Volver» sigue llevando a la búsqueda de establecimientos de la que se partió (desdeOrigen).
  const desde = typeof state?.desde === 'string' ? state.desde : '';
  const desdeEstablecimiento = !vistaPrevia && Object.values(CATEGORIAS).some(({ ruta }) => new RegExp(`^${ruta}/\\d+$`).test(desde));
  let volverA = '/profesionales';
  let textoVolver = 'Volver a profesionales';
  if (vistaPrevia) {
    volverA = '/profesional/perfil';
    textoVolver = 'Volver a mi perfil';
  } else if (desdeEstablecimiento) {
    volverA = desde;
    textoVolver = `Volver a ${typeof state.origen === 'string' && state.origen ? state.origen : 'la ficha del establecimiento'}`;
  } else if (desde.startsWith('/profesionales')) {
    volverA = desde;
  }
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState(null);
  const clave = `${id}-${intento}`;
  const cargando = datos?.clave !== clave;

  useEffect(() => {
    let activo = true;
    obtenerProfesional(id)
      .then((respuesta) => activo && setDatos({ clave, ...respuesta }))
      .catch((error) => activo && setDatos({ clave, error }));
    return () => { activo = false; };
  }, [clave, id]);

  const volver = (
    <Link className="volver" to={volverA} state={desdeEstablecimiento && typeof state.desdeOrigen === 'string' ? { desde: state.desdeOrigen } : undefined}>
      <Icono nombre="flechaIzquierda" tamano={18} /> {textoVolver}
    </Link>
  );
  if (cargando) return <>{volver}<p className="texto-secundario" role="status">Cargando ficha…</p></>;
  if (datos.error) {
    return (
      <>
        {volver}
        {[400, 404].includes(datos.error.estado) ? (
          <EstadoVacio nivel={1} icono="profesional" titulo="No encontramos este profesional"
            accion={<Link to="/profesionales" className="boton boton--secundario boton--compacto">Ver profesionales</Link>}>
            Puede que la ficha ya no esté disponible.
          </EstadoVacio>
        ) : (
          <div className="buscador__estado">
            <Alerta>{datos.error.message}</Alerta>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        )}
      </>
    );
  }

  const { profesional, resumenResenas, miResena, puedeResenar, motivoSinResena } = datos;
  const { nombre, especialidad, comuna, region, modalidad, verificado, calificacion, aniosExperiencia, presentacion } = profesional;
  const presencial = modalidad !== 'online';
  const actualizarResenas = (resumen, resena) => setDatos({
    ...datos, resumenResenas: resumen, miResena: resena,
    profesional: { ...profesional, calificacion: { promedio: resumen.promedio, total: resumen.total } },
  });
  // «Reservar una hora» lleva a las horas disponibles, que quedan destacadas más abajo (15-11-2026).
  const irAHoras = () => {
    const horas = document.getElementById('horas');
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    horas?.scrollIntoView?.({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
    horas?.focus({ preventScroll: true });
  };

  // Pedido del PO del 15-11-2026: la ficha se ordena en presentación, menú con su información, horas destacadas y, al
  // final, calificaciones y reseñas. El lugar de atención con el mapa solo aparece si atiende presencial o de ambas formas.
  const pestanas = [
    { id: 'informacion', titulo: 'Información', icono: 'info', contenido: <InformacionFicha profesional={profesional} /> },
    { id: 'formacion', titulo: 'Formación', icono: 'birrete', contenido: <FormacionFicha profesional={profesional} /> },
    { id: 'certificaciones', titulo: 'Certificaciones', icono: 'escudo', contenido: <CertificacionesFicha profesional={profesional} /> },
    ...(presencial ? [{ id: 'lugar', titulo: 'Lugar de atención', icono: 'pin', contenido: <LugarFicha profesional={profesional} /> }] : []),
  ];

  return (
    <article className="ficha">
      {volver}
      {vistaPrevia && (
        <p className="ficha__vista-previa"><Icono nombre="ojo" tamano={18} /> Así ven tu ficha las personas que buscan profesionales en FitSearch.</p>
      )}
      <header className="ficha__cabecera">
        <span className="ficha__avatar" aria-hidden="true">{iniciales(nombre)}</span>
        <div className="ficha__identidad">
          <span className="tarjeta-profesional__especialidad">{especialidad}</span>
          <h1>{nombre}</h1>
          <div className="ficha__datos">
            <Calificacion promedio={calificacion.promedio} total={calificacion.total} />
            <span><Icono nombre={presencial ? 'pin' : 'video'} tamano={16} /> {presencial ? [comuna || 'Comuna por confirmar', region].filter(Boolean).join(', ') : 'Atención online'}</span>
            <span className="tarjeta-profesional__modalidad">{etiquetaModalidad(modalidad)}</span>
            {verificado && <span className="ficha__verificado"><Icono nombre="escudo" tamano={16} /> Verificado</span>}
            {aniosExperiencia > 0 && <span>{aniosExperiencia} {aniosExperiencia === 1 ? 'año' : 'años'} de experiencia</span>}
          </div>
          {!vistaPrevia && (
            <button type="button" className="boton boton--principal boton--compacto ficha__ir-horas" onClick={irAHoras}>
              <Icono nombre="calendario" tamano={18} /> Reservar una hora
            </button>
          )}
        </div>
        {!vistaPrevia && <BotonFavorito profesional={profesional} className="ficha__favorito" />}
      </header>

      {presentacion ? (
        <section className="ficha__presentacion" aria-labelledby="titulo-presentacion">
          <h2 id="titulo-presentacion">Conoce a {nombre}</h2>
          <p>{presentacion}</p>
        </section>
      ) : vistaPrevia && (
        <p className="ficha__vista-previa">
          <Icono nombre="info" tamano={18} /> Aún no escribes tu presentación. Agrégala en «Información personal» de{' '}
          <Link to="/profesional/perfil">tu perfil</Link> para que los usuarios te conozcan.
        </p>
      )}

      <PestanasFicha etiqueta={`Información de ${nombre}`} pestanas={pestanas} />

      {vistaPrevia ? (
        <section className="ficha__seccion ficha__horas" aria-labelledby="titulo-horas">
          <h2 id="titulo-horas">Reservar una hora</h2>
          <p className="texto-secundario">Aquí los usuarios ven tus horas disponibles y las reservan.</p>
        </section>
      ) : (
        <div id="horas" className="ficha__horas" tabIndex={-1}><ReservarHora profesional={profesional} /></div>
      )}

      <Resenas profesionalId={profesional.id} nombre={nombre} resumen={resumenResenas} miResena={miResena}
        puedeResenar={puedeResenar} motivoSinResena={motivoSinResena} onCambio={actualizarResenas} />
    </article>
  );
}

// Pestaña «Información»: su atención, especialidad, modalidad, a quiénes atiende, experiencia y precio referencial.
function InformacionFicha({ profesional }) {
  const { descripcion, especialidad, modalidad, atiendeA = [], aniosExperiencia, precioDesde } = profesional;
  return (
    <div className="ficha-pestanas__contenido">
      <h3>Sobre su atención</h3>
      <p className="ficha__descripcion">{descripcion || 'Este profesional todavía no ha añadido una descripción de sus servicios.'}</p>
      <dl className="ficha__datos-lista">
        <div><dt>Especialidad</dt><dd>{especialidad}</dd></div>
        <div><dt>Modalidad</dt><dd>{etiquetaModalidad(modalidad)}</dd></div>
        {atiendeA.length > 0 && <div><dt>Atiende a</dt><dd>{atiendeA.map(etiquetaAtiende).join(', ')}</dd></div>}
        {aniosExperiencia != null && (
          <div><dt>Experiencia</dt><dd>{aniosExperiencia === 0 ? 'Menos de un año' : `${aniosExperiencia} ${aniosExperiencia === 1 ? 'año' : 'años'}`}</dd></div>
        )}
        {precioDesde != null && (
          <div><dt>Consulta desde</dt><dd>{precioCLP(precioDesde)}<small>Valor referencial: se paga directamente al profesional.</small></dd></div>
        )}
      </dl>
    </div>
  );
}

// Pestaña «Formación»: títulos, especializaciones y cursos que registró en su perfil (FS-HU-29).
function FormacionFicha({ profesional }) {
  const { formacion = [] } = profesional;
  if (!formacion.length) return <p className="texto-secundario">Este profesional todavía no ha agregado su formación.</p>;
  return (
    <ul className="formacion experiencia-publica__formacion">
      {formacion.map((f, i) => (
        <li key={`${f.titulo}-${i}`}>
          <Icono nombre="birrete" tamano={20} />
          <span><strong>{f.titulo}</strong><small>{f.institucion}{f.anio ? ` · ${f.anio}` : ''}</small></span>
        </li>
      ))}
    </ul>
  );
}

// Pestaña «Certificaciones»: si FitSearch revisó sus documentos (los archivos son privados) y su registro en la
// Superintendencia de Salud, que cualquiera puede comprobar.
function CertificacionesFicha({ profesional }) {
  const { verificado, registroSis } = profesional;
  return (
    <div className="ficha-pestanas__contenido">
      <p className={verificado ? 'ficha__certificado ficha__certificado--si' : 'ficha__certificado'}>
        <Icono nombre="escudo" tamano={22} />
        <span>
          <strong>{verificado ? 'Verificado por FitSearch' : 'Aún sin verificar'}</strong>
          {verificado
            ? 'El equipo de FitSearch revisó los documentos que acreditan su profesión.'
            : 'Este profesional todavía no completa la revisión de sus documentos en FitSearch.'}
        </span>
      </p>
      {registroSis && (
        <dl className="ficha__datos-lista">
          <div>
            <dt>Superintendencia de Salud</dt>
            <dd>
              Registro N.º {registroSis}
              <a href={URL_SUPERSALUD} target="_blank" rel="noopener noreferrer" className="experiencia-publica__verificar">
                Comprobar en el registro <Icono nombre="flecha" tamano={14} /><span className="solo-lector"> (se abre en una pestaña nueva)</span>
              </a>
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

// Pestaña «Lugar de atención»: la dirección, la comuna y la región, el mapa de FitSearch y, aparte y discreto, un enlace
// para abrir el lugar en Google Maps.
function LugarFicha({ profesional }) {
  const { nombre, modalidad, comuna, region, direccion, establecimiento, ubicacionLat, ubicacionLng } = profesional;
  const conMapa = ubicacionLat != null && ubicacionLng != null;
  const calle = direccion || establecimiento?.direccion;
  return (
    <div className="ficha-pestanas__contenido ficha__lugar-pestana">
      <p className="ficha__lugar">
        <strong>{establecimiento?.nombre || calle || 'Dirección por confirmar'}</strong>
        {establecimiento?.nombre && calle && <span>{calle}</span>}
        <span>{[comuna, region].filter(Boolean).join(', ') || 'Consulta la dirección exacta directamente con el profesional.'}</span>
        {modalidad === 'ambas' && <span>También atiende online.</span>}
      </p>
      {conMapa && <MapaLugar lat={ubicacionLat} lng={ubicacionLng} nombre={nombre} />}
      {conMapa && (
        <a className="ficha__google-maps" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
          target="_blank" rel="noopener noreferrer" aria-label={`Abrir la ubicación de ${nombre} en Google Maps (nueva pestaña)`}>
          Abrir en Google Maps <Icono nombre="flecha" tamano={14} />
        </a>
      )}
    </div>
  );
}
