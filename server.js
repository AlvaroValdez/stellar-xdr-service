// server.js
require('dotenv').config();           // ← ¡Debe ir LO PRIMERO!
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server, TransactionBuilder, Networks, Operation, Asset } = require('stellar-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Endpoint de generación de XDR
app.post('/generate', async (req, res) => {

  console.log('🔍 [DEBUG] Payload recibido en /generate:', JSON.stringify(req.body, null, 2));


  try {
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;
    if (!source || !destination || !amount || !network) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    // Elige el servidor correcto
    const horizonUrl = network === 'public'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';
    const server = new Server(horizonUrl);
    const sourceAccount = await server.loadAccount(source);
    const networkPassphrase = network === 'public' 
      ? Networks.PUBLIC 
      : Networks.TESTNET;

    // Define asset
    const asset = asset_code && asset_issuer
      ? new Asset(asset_code, asset_issuer)
      : Asset.native();

    // Construye la transacción
    const tx = new TransactionBuilder(sourceAccount, {
      fee: (await server.fetchBaseFee()).toString(),
      networkPassphrase
    })
      .addOperation(Operation.payment({
        destination,
        asset,
        amount: parseFloat(amount).toFixed(2).toString()
      }))
      .setTimeout(30)
      .build();

    const xdr = tx.toXDR();
    return res.status(200).json({ xdr, network });
  } catch (error) {
    console.error('❌ Error al generar XDR:', error);
    // Muestra el error completo para depurar
    return res.status(500).json({
      error: error.message,
      detail: error.response?.data || error.stack
    });
  }
});

// Health‐check
app.get('/', (_req, res) => {
  res.send('✅ Servicio Stellar XDR listo.');
});

// Arranca
app.listen(PORT, () => {
  console.log(`🚀 Servicio XDR corriendo en puerto ${PORT}`);
});