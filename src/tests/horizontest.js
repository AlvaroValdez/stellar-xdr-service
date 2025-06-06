// src/tests/horizontest.js
require('dotenv').config();
const { server } = require('../services/horizonClient');

async function testConnection() {
  try {
    // En lugar de server.root(), consultamos el ledger más reciente
    const response = await server.ledgers().limit(1).order('desc').call();
    console.log('✅ Conexión a Horizon OK. Ledger más reciente:', response.records[0].sequence);
  } catch (e) {
    console.error('❌ Error al conectar a Horizon:', e.message);
    process.exit(1);
  }
}

testConnection();