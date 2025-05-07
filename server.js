// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server, TransactionBuilder, Networks, Operation, Asset } = require('stellar-sdk');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// POST /generate
// Recibe { source, destination, amount, asset_code?, asset_issuer?, network }
// Devuelve { xdr, network }
app.post('/generate', async (req, res) => {
  try {
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;
    console.log('📦 Payload recibido:', req.body);

    // Validaciones básicas
    if (!source || !destination || !amount || !network) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    // Elegir URL de Horizon según la red
    const horizonUrl =
      network === 'public'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';

    const server = new Server(horizonUrl);
    const sourceAccount = await server.loadAccount(source);

    // Elegir passphrase según la red
    const networkPassphrase =
      network === 'public' ? Networks.PUBLIC : Networks.TESTNET;

    // Definir el asset (nativo o personalizado)
    const asset = asset_code && asset_issuer
      ? new Asset(asset_code, asset_issuer)
      : Asset.native();

    // Construir la transacción
    const baseFee = await server.fetchBaseFee();
    const tx = new TransactionBuilder(sourceAccount, {
      fee: baseFee.toString(),
      networkPassphrase,
    })
      .addOperation(Operation.payment({
        destination,
        asset,
        amount: parseFloat(amount).toFixed(2).toString(),
      }))
      .setTimeout(30)
      .build();

    const xdr = tx.toXDR();
    console.log('✅ XDR generado:', xdr);

    return res.status(200).json({ xdr, network });
  } catch (error) {
    console.error('❌ Error al generar XDR:', error);
    return res.status(500).json({
      error: error.message,
      detail: error.response?.data || error.stack,
    });
  }
});

// GET /
// Health­check
app.get('/', (req, res) => {
  res.send('✅ Servicio Stellar XDR listo.');
});

app.listen(PORT, () => {
  console.log(`🚀 Servicio XDR corriendo en puerto ${PORT}`);
});