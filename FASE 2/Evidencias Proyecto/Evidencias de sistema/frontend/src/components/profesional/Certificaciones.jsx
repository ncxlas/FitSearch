import { useEffect, useState } from 'react';
import { solicitar } from '../../services/api.js';
import { descargarDocumento } from '../../services/documentos.js';
import Icono from '../Icono.jsx';
import './Certificaciones.css';
const TIPOS_DOCUMENTO = [
  { tipo: 'identidad', nombre: 'Documento de identidad', obligatorio: true },
  { tipo: 'titulo', nombre: 'Título profesional', obligatorio: true },
  { tipo: 'antecedentes', nombre: 'Certificado de antecedentes', obligatorio: false },
];
const ESTADOS = {
  sin_solicitud: 'Sin solicitud enviada',
  pendiente: 'En revisión',
  verificado: 'Verificado',
  rechazado: 'Rechazado',
};
function formatearRut(valor) {
  const limpio = valor.replace(/[.\s-]/g, '').toUpperCase();
  return limpio.length > 1
    ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}`
    : limpio;
}
export function Documentos({ documentos, onError }) {
  function lista(versiones) {
    return (
      <ul>
        {versiones.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() =>
                descargarDocumento(d).catch((e) => onError(e.message))
              }
            >
              {d.tipo}: {d.nombre}
            </button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="documentos-versiones">
      {TIPOS_DOCUMENTO.map(({ tipo }) => {
        const versiones = documentos
          .filter((d) => d.tipo === tipo)
          .sort(
            (a, b) =>
              (Date.parse(b.fechaCreacion) || 0) -
                (Date.parse(a.fechaCreacion) || 0) || b.id - a.id,
          );
        if (!versiones.length) return null;
        return <div key={tipo}>{lista(versiones.slice(0, 1))}</div>;
      })}
    </div>
  );
}
const EVENTOS = {
  documento: { nombre: 'Documento actualizado', icono: 'documento' },
  solicitud: { nombre: 'Solicitud enviada', icono: 'escudo' },
  aprobar: { nombre: 'Solicitud aprobada', icono: 'check', tono: 'exito' },
  rechazar: { nombre: 'Solicitud rechazada', icono: 'info', tono: 'aviso' },
  revocar: { nombre: 'Verificación revocada', icono: 'reloj', tono: 'aviso' },
  cambio_especialidad: { nombre: 'Especialidad cambiada: hay que verificar de nuevo', icono: 'medico', tono: 'aviso' },
};

// Historial de verificación: lo que ha pasado con la verificación (documentos subidos, solicitudes enviadas y las
// decisiones del administrador), con su fecha. Desde el 16-11-2026 va plegado: el estado y el motivo ya se ven arriba.
function Historial({ movimientos = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [completo, setCompleto] = useState(false);
  const ordenados = movimientos.map((movimiento, indice) => ({ ...movimiento, indice }))
    .sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0) || b.indice - a.indice);
  const visibles = completo ? ordenados : ordenados.slice(0, 3);
  return (
    <section className="certificaciones__historial" aria-labelledby="titulo-historial-verificacion">
      <button type="button" className="certificaciones__plegable" aria-expanded={abierto} aria-controls="historial-verificacion"
        onClick={() => setAbierto(!abierto)}>
        <span id="titulo-historial-verificacion">Historial de verificación</span>
        <span className="certificaciones__contador" aria-label={`${ordenados.length} ${ordenados.length === 1 ? 'movimiento' : 'movimientos'}`}>{ordenados.length}</span>
        <Icono nombre="chevron" tamano={17} />
      </button>
      {abierto && (
        <div id="historial-verificacion" className="certificaciones__historial-contenido">
          <p>
            {!ordenados.length
              ? 'Aún no hay movimientos.'
              : 'Lo que ha pasado con tu verificación: documentos subidos, solicitudes enviadas y las decisiones del administrador.'}
          </p>
          <ul id="historial-verificacion-lista">
            {visibles.map((h) => {
              const evento = EVENTOS[h.accion] || { nombre: h.accion.replaceAll('_', ' '), icono: 'info' };
              return (
                <li key={h.indice} className={`certificaciones__evento${evento.tono ? ` certificaciones__evento--${evento.tono}` : ''}`}>
                  <Icono nombre={evento.icono} tamano={18} />
                  <div><strong>{evento.nombre}</strong>{h.motivo && <small>{h.motivo}</small>}</div>
                  <time dateTime={h.fecha}>{new Date(h.fecha).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </li>
              );
            })}
          </ul>
          {ordenados.length > 3 && (
            <button type="button" className="certificaciones__ver-historial" aria-expanded={completo}
              aria-controls="historial-verificacion-lista" onClick={() => setCompleto(!completo)}>
              {completo ? 'Ver menos' : 'Ver historial completo'} <Icono nombre="chevron" tamano={17} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// Certificaciones del profesional (FS-HU-12). Desde el 16-11-2026, compacta para verla sin bajar tanto: el estado en
// una línea, cada documento en una fila corta (nombre, si es obligatorio, si está adjunto y cómo subirlo), los datos de
// la solicitud lado a lado y el historial plegado.
export default function Certificaciones() {
  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalles, setDetalles] = useState({});
  const [aviso, setAviso] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [archivos, setArchivos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let vigente = true;
    solicitar('/verificaciones/mi-solicitud')
      .then(({ solicitud: datos }) => {
        if (vigente) {
          setSolicitud(datos);
          setRut((valor) => valor || datos?.rut || '');
          setTelefono((valor) => valor || datos?.telefono || '');
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vigente) {
          setError(e.message);
          setCargando(false);
        }
      });
    return () => {
      vigente = false;
    };
  }, [revision]);
  async function enviar(e, tipo) {
    const formulario = e.currentTarget;
    e.preventDefault();
    setError('');
    setDetalles({});
    setAviso('');
    setGuardando(true);
    try {
      if (tipo) {
        const archivo = archivos[tipo];
        if (!archivo || archivo.size > 5 * 1024 * 1024)
          throw new Error('Selecciona un PDF, JPG o PNG de hasta 5 MB');
        const { documento } = await solicitar(
          `/verificaciones/documentos?${new URLSearchParams({ tipo, nombre: archivo.name })}`,
          { metodo: 'POST', archivo },
        );
        setSolicitud((anterior) => ({
          ...anterior,
          estado: anterior.estado === 'pendiente' ? 'sin_solicitud' : anterior.estado,
          documentos: [
            ...anterior.documentos.filter((d) => d.tipo !== tipo),
            documento,
          ],
        }));
        setArchivos((anteriores) => ({ ...anteriores, [tipo]: null }));
        formulario.reset();
        setAviso('Documento adjuntado.');
      } else {
        const rutFormateado = formatearRut(rut);
        setRut(rutFormateado);
        if (
          !['identidad', 'titulo'].every((tipo) =>
            solicitud.documentos.some((d) => d.tipo === tipo),
          )
        )
          throw new Error(
            'Adjunta el documento de identidad y el título profesional antes de enviar esta solicitud.',
          );
        await solicitar('/verificaciones/mi-solicitud', {
          metodo: 'POST',
          cuerpo: { rut: rutFormateado, telefono },
        });
        setAviso('Solicitud enviada para revisión.');
      }
      if (!tipo) setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
      setDetalles(e.detalles || {});
    } finally {
      setGuardando(false);
    }
  }
  if (cargando) return <p role="status">Cargando certificaciones…</p>;
  const editable = solicitud?.estado !== 'verificado';
  return (
    <section className="certificaciones">
      {error && (
        <div role="alert" className="certificaciones__error">
          <p>{error}</p>
          {Object.keys(detalles).length > 0 && (
            <ul>
              {Object.entries(detalles).map(([campo, mensaje]) => (
                <li key={campo}>{mensaje}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {aviso && <p role="status" className="certificaciones__aviso">{aviso}</p>}
      {solicitud && (
        <>
          <div className={`certificaciones__estado certificaciones__estado--${solicitud.estado}`}>
            <p>
              Estado:{' '}
              <strong>{ESTADOS[solicitud.estado] ?? solicitud.estado}</strong>
            </p>
            {solicitud.motivo && <p>Motivo: {solicitud.motivo}</p>}
          </div>
          {solicitud.estado === 'rechazado' && (
            <p className="certificaciones__correccion">
              Tu solicitud fue rechazada o tu verificación dejó de estar
              vigente. Adjunta nuevamente el documento de identidad y el título
              profesional, corrige lo indicado en el motivo y envía una nueva
              solicitud.
            </p>
          )}
          <ul className="certificaciones__documentos">
            {TIPOS_DOCUMENTO.map(({ tipo, nombre, obligatorio }) => {
              const adjuntados = solicitud.documentos.filter(
                (documento) => documento.tipo === tipo,
              );
              const accion = adjuntados.length ? 'Reemplazar documento' : 'Adjuntar documento';
              return (
                <li className="certificaciones__documento" key={tipo} aria-labelledby={`titulo-documento-${tipo}`}>
                  <div className="certificaciones__info">
                    <h4 id={`titulo-documento-${tipo}`}>
                      {nombre}
                      <span className="certificaciones__etiqueta">{obligatorio ? 'Obligatorio' : 'Opcional'}</span>
                    </h4>
                    <div className={`certificaciones__indicador${adjuntados.length ? ' certificaciones__indicador--adjuntado' : ''}`}>
                      <Icono nombre={adjuntados.length ? 'check' : 'info'} tamano={15} />
                      <span>{adjuntados.length ? 'Adjuntado' : 'Sin adjuntar'}</span>
                      <Documentos documentos={adjuntados} onError={setError} />
                    </div>
                  </div>
                  {editable && (
                    <form className="certificaciones__subir" onSubmit={(e) => enviar(e, tipo)}>
                      <label className="certificaciones__elegir">
                        <Icono nombre="documento" tamano={16} />
                        <span>{archivos[tipo] ? archivos[tipo].name : 'Elegir archivo'}</span>
                        <input
                          className="solo-lector"
                          aria-label={`Seleccionar archivo: ${nombre}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                          disabled={guardando}
                          onChange={(e) =>
                            setArchivos((anteriores) => ({
                              ...anteriores,
                              [tipo]: e.target.files[0],
                            }))
                          }
                        />
                      </label>
                      <button disabled={guardando || !archivos[tipo]} aria-label={`${accion}: ${nombre}`}>
                        {adjuntados.length ? 'Reemplazar' : 'Adjuntar'}
                      </button>
                      {archivos[tipo] && (
                        <p className="certificaciones__ayuda">
                          Archivo seleccionado. Pulsa «{adjuntados.length ? 'Reemplazar' : 'Adjuntar'}» para subirlo.
                        </p>
                      )}
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="certificaciones__nota">
            <Icono nombre="candado" tamano={15} /> PDF, JPG o PNG de hasta 5 MB (hasta 10 subidas por documento). Son privados:
            solo tú y el administrador pueden descargarlos.
          </p>
          {editable && (
            <form className="certificaciones__solicitud" onSubmit={(e) => enviar(e)}>
              <h4>Datos para la solicitud</h4>
              <div className="certificaciones__campos">
                <label>
                  RUT
                  <input
                    required
                    value={rut}
                    maxLength={12}
                    placeholder="12345678-5"
                    aria-invalid={Boolean(detalles.rut)}
                    aria-describedby="ayuda-rut-verificacion"
                    onChange={(e) => setRut(e.target.value)}
                    onBlur={() => setRut(formatearRut(rut))}
                  />
                </label>
                <label>
                  Teléfono (opcional)
                  <input
                    value={telefono}
                    maxLength={20}
                    aria-invalid={Boolean(detalles.telefono)}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </label>
              </div>
              <div className="certificaciones__envio">
                <p id="ayuda-rut-verificacion" className="certificaciones__ayuda">
                  Puedes escribir tu RUT sin puntos ni guion. Antes de enviar, adjunta el documento de identidad y el título profesional.
                </p>
                <button className="certificaciones__enviar" disabled={guardando}>
                  Enviar solicitud a revisión
                  <Icono nombre="flecha" tamano={18} />
                </button>
              </div>
            </form>
          )}
          <Historial movimientos={solicitud.historial} />
        </>
      )}
    </section>
  );
}
