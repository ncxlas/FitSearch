// Carga y valida las variables de entorno necesarias para la API.
require('dotenv').config({ quiet: true });

const obligatorias = ['DATABASE_URL', 'JWT_SECRET'];
const faltantes = obligatorias.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  throw new Error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. Revisa backend/.env (ver .env.example).`);
}

// Valor de «trust proxy» de Express (SC-41): sin proxy delante, la IP es la de la conexión. En Docker, nginx atiende
// al navegador y reenvía a la API, así que TRUST_PROXY=1 hace que el límite de intentos use la IP real del cliente.
function confianzaProxy(valor) {
  const texto = (valor || '').trim();
  if (!texto || texto === 'false' || texto === '0') return false;
  if (texto === 'true') return true;
  return /^\d+$/.test(texto) ? Number(texto) : texto;
}

module.exports = {
  puerto: Number(process.env.PORT) || 3000,
  confiarProxy: confianzaProxy(process.env.TRUST_PROXY),
  jwtSecreto: process.env.JWT_SECRET,
  jwtExpiracion: process.env.JWT_EXPIRES_IN || '8h',
  // Duración de la sesión cuando el usuario marca "Recordarme" (DAS, D17).
  jwtExpiracionRecordar: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  bcryptCosto: Number(process.env.BCRYPT_COST) || 10,
  // Dirección del frontend usada para armar el enlace de recuperación de contraseña.
  urlFrontend: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  recuperacionMinutos: Number(process.env.RECOVERY_TOKEN_MINUTES) || 60,
  // ID de cliente OAuth de Google (FS-HU-16). No es secreto, pero sin él el botón de Google queda desactivado.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Asistente IA (FS-HU-07, DAS D33): cualquier proveedor compatible con la API de OpenAI (Groq por defecto).
  // Sin IA_API_KEY el asistente funciona en modo simulado, con respuestas de ejemplo.
  ia: {
    urlBase: (process.env.IA_URL_BASE || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
    modelo: process.env.IA_MODELO || 'openai/gpt-oss-120b',
    apiKey: process.env.IA_API_KEY || '',
    mensajesPorDia: Number(process.env.IA_MENSAJES_POR_DIA) || 30,
  },
  // Envío de correos por SMTP (DAS, D14). Si faltan datos, el enlace se muestra en la consola del backend.
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    puerto: Number(process.env.SMTP_PORT) || 465,
    usuario: (process.env.SMTP_USUARIO || '').trim(),
    // Gmail muestra la contraseña de aplicación en grupos de cuatro letras: se acepta con o sin los espacios.
    contrasena: (process.env.SMTP_CONTRASENA || '').replace(/\s+/g, ''),
    // Sin SMTP_REMITENTE, los correos salen como «FitSearch <cuenta>».
    remitente: process.env.SMTP_REMITENTE || (process.env.SMTP_USUARIO ? `FitSearch <${process.env.SMTP_USUARIO.trim()}>` : ''),
  },
};
