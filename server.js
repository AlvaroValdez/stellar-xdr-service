// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {
  Server,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
} = require('stellar-sdk');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Endpoints de Horizon
// choose horizon per network
function horizonFor(net) {
  return net === 'public'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

// Health‐check
app.get('/', (_req, res) => {
  res.send('✅ Stellar XDR service activo');
});

// POST /generate
// Genera y devuelve el XDR de una transacción de pago
app.post('/generate', async (req, res) => {
  const { source, destination, amount, asset_code, asset_issuer, network } = req.body;
  if (!source || !destination || !amount || !asset_code || !network) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  try {
    console.log('[DEBUG] Payload recibido en /generate:', req.body);
    const server = new Server(horizonFor(network));
    // this is where invalid account_id would blow up
    const account = await server.loadAccount(source);
    const fee     = await server.fetchBaseFee();
    const asset   =
      asset_code === 'XLM'
        ? Asset.native()
        : new Asset(asset_code, asset_issuer);
    const tx = new TransactionBuilder(account, {
      fee,
      networkPassphrase:
        network === 'public' ? Networks.PUBLIC : Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset,
          amount,
        })
      )
      .setTimeout(30)
      .build();
    return res.json({ xdr: tx.toXDR(), network });
  } catch (err) {
    console.error('Error al generar XDR:', err);
    return res.status(500).json({
      error: err.name,
      detail: err.message,
    });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`XDR service listening on ${PORT}`));