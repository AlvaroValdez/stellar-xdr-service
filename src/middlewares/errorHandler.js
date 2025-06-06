// src/middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('🚨 Error capturado en middleware:', err);

  // Si el error ya trae status, lo usamos; si no, asumimos 500
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  return res.status(status).json({ error: message });
}

module.exports = { errorHandler };