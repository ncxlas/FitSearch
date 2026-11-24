import NotificacionFlotante from './NotificacionFlotante.jsx';

export default function Alerta({ tipo = 'error', children, flotante = tipo === 'exito' }) {
  if (!children) return null;
  if (flotante) return <NotificacionFlotante tipo={tipo}>{children}</NotificacionFlotante>;
  return (
    <div className={`alerta alerta--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
