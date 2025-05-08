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
const HORIZON_URLS = {
  public: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

// Health‐check
app.get('/', (_req, res) => {
  res.send('✅ Stellar XDR service activo');
});

// POST /generate
// Genera y devuelve el XDR de una transacción de pago
app.post('/generate', async (req, res) => {
  try {
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;

    // 1) Validaciones básicas
    if (!source || !destination || !amount || !asset_code || !network) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    if (asset_code !== 'XLM' && !asset_issuer) {
      return res.status(400).json({
        error: 'Para activos no nativos, asset_issuer es obligatorio.',
      });
    }
    if (!['public', 'testnet'].includes(network)) {
      return res.status(400).json({
        error: 'Network debe ser "public" o "testnet".',
      });
    }

    // 2) Conectar a Horizon y cargar cuenta
    const server = new Server(HORIZON_URLS[network]);
    const account = await server.loadAccount(source);

    // 3) Crear el Asset
    const asset =
      asset_code === 'XLM'
        ? Asset.native()
        : new Asset(asset_code, asset_issuer);

    // 4) Construir la transacción
    const fee = await server.fetchBaseFee();
    const tx = new TransactionBuilder(account, {
      fee,
      networkPassphrase:
        network === 'public' ? Networks.PUBLIC : Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset,
          amount: amount.toString(),
        })
      )
      .setTimeout(30)
      .build();

    // 5) Devolver el XDR
    return res.json({ xdr: tx.toXDR(), network });
  } catch (err) {
    console.error('❌ Error al generar XDR:', err);
    return res.status(500).json({
      error: 'Bad Request',
      detail: err.message || err.toString(),
    });
  }
});

// Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Stellar XDR service escuchando en puerto ${PORT}`)
);