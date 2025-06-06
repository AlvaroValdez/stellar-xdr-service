// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const xdrRouter = require('./routes/xdr');
const { verifyJwt } = require('./middlewares/authMiddleware');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// 1. Middleware de CORS (ajusta origin si necesitas restringir)
app.use(cors({ origin: '*' }));

// 2. Parseo de JSON
app.use(express.json({ limit: '1mb' }));

// 3. Middleware de logs básicos (petición / body)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// 4. Health check (misma ruta /health que usan otros servicios)
app.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'HEALTH OK' });
});

// 5. Rutas protegidas con JWT (misma lógica que en stellar-signing-service)
app.use('/api/xdr', verifyJwt, xdrRouter);

// 6. Handler de errores centralizado (misma convención que en remesas-api y signing-service)
app.use(errorHandler);

// 7. Levantamos el servidor en el puerto indicado por Railway o .env
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✨ Stellar XDR Service escuchando en puerto ${PORT}`);
});
