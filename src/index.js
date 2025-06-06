// src/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { generateXdr } = require('./controllers/xdrController');
const { NETWORK } = require('./config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para parsear JSON
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  console.log('[Health] Petición recibida en /health');
  res.json({ status: 'ok', network: NETWORK });
});

// Endpoint para generar XDR
app.post('/generate-xdr', generateXdr);

// Catch-all 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejador genérico de errores
app.use((err, _req, res, _next) => {
  console.error('[XDR_SERVICE] Error no manejado:', err);
  res.status(500).json({ error: 'Error interno en el servicio.' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(
    `🚀 Stellar XDR Service corriendo en puerto ${PORT} (network: ${NETWORK})`
  );
});