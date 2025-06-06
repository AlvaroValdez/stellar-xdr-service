// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SECRET_JWT; // Debe coincidir con remesas-api y signing-service

if (!JWT_SECRET) {
  console.error('🔴 ERROR: SECRET_JWT no está definido en .env');
  process.exit(1);
}

function verifyJwt(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ error: 'Falta token de autorización' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    // Adjuntamos el contenido del JWT al request para posibles auditorías
    req.user = payload;
    next();
  });
}

module.exports = { verifyJwt };
