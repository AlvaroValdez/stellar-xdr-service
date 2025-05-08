// server.js
require('dotenv').config();          // 1️⃣ Carga .env
const express = require('express');  // 2️⃣ Framework
const bodyParser = require('body-parser');
const cors = require('cors');
const {
  Keypair,
  Asset,
  Networks,
  Server,
  TransactionBuilder,
  BASE_FEE,
} = require('stellar-sdk');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Los endpoints de Horizon para cada red
const HORIZON = {
  public:  'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

// server.js (solo la parte del POST /generate)
app.post('/generate', async (req, res) => {
  try {
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;

    // 1️⃣ Validación mínima
    if (![source, destination, amount, asset_code, network].every(Boolean)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    // Si no es XLM, asset_issuer es obligatorio
    if (asset_code !== 'XLM' && !asset_issuer) {
      return res.status(400).json({ error: 'Para activos custom, asset_issuer es obligatorio.' });
    }
    if (!['public','testnet'].includes(network)) {
      return res.status(400).json({ error: 'Network debe ser "public" o "testnet".' });
    }

    // 2️⃣ Conectar a Horizon
    const server = new Server(HORIZON[network]);

    // 3️⃣ Cargar la cuenta “source”
    const account = await server.loadAccount(source);

    // 4️⃣ Elegir el activo
    const asset = asset_code === 'XLM'
      ? Asset.native()
      : new Asset(asset_code, asset_issuer);

    // 5️⃣ Construir la transacción
    const tx = new TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: network === 'public'
        ? Networks.PUBLIC
        : Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({ destination, asset, amount: amount.toString() })
      )
      .setTimeout(30)
      .build();

    // 6️⃣ Devolver el XDR
    return res.json({ xdr: tx.toXDR(), network });

  } catch (err) {
    console.error('❌ Error al generar XDR:', err);
    return res.status(500).json({
      error: 'Bad Request',
      detail: err.response?.data || err.toString(),
    });
  }
});


// Poner a escuchar
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ XDR-Service escuchando en puerto ${PORT}`);
});