// Configuración de la aplicación Express (sin levantar el servidor, para poder probarla con Supertest).
const express = require('express');
const helmet = require('helmet');
const config = require('./config/env');
const rutas = require('./routes');
const { rutaNoEncontrada, manejoErrores } = require('./middlewares/manejoErrores');

const app = express();

// Con nginx delante (Docker), la IP del cliente llega en X-Forwarded-For; el límite de intentos la necesita (SC-41).
app.set('trust proxy', config.confiarProxy);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.use('/api', rutas);
app.use(rutaNoEncontrada);
app.use(manejoErrores);

module.exports = app;
