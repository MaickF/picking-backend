const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./API/routes');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Configurar CORS para permitir el frontend de Firebase
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'http://localhost:5174', // Otro puerto común de Vite
    process.env.FRONTEND_URL || 'https://pronutrepicking.web.app' // Tu dominio de Firebase
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Configurar límites de payload ANTES de usar las rutas
app.use(express.json({ 
  limit: '50mb'
}));

app.use(express.urlencoded({ 
  limit: '50mb',
  extended: true 
}));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Ruta de health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Usar las rutas de la API
app.use('/', routes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});

module.exports = app;