// server.js

const {
  Server, Networks,
  TransactionBuilder,
  Operation, Asset
} = require('stellar-sdk');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// importa todo lo de Stellar que necesitas:
const {
  Server,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
} = require('stellar-sdk');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// define las URLs de Horizon
const HORIZON = {
  public: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

// POST /generate
app.post('/generate', async (req, res) => {
  try {
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;

    // validaciones
    if (![source,destination,amount,asset_code,network].every(Boolean)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    if (asset_code !== 'XLM' && !asset_issuer) {
      return res.status(400).json({ error: 'Para activos custom, asset_issuer es obligatorio.' });
    }
    if (!['public','testnet'].includes(network)) {
      return res.status(400).json({ error: 'Network debe ser "public" o "testnet".' });
    }

    // carga la cuenta
    const server = new Server(HORIZON[network]);
    const account = await server.loadAccount(source);

    // asset
    const asset = asset_code === 'XLM'
      ? Asset.native()
      : new Asset(asset_code, asset_issuer);

    // construye la tx
    const tx = new TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: network === 'public'
        ? Networks.PUBLIC
        : Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination,
        asset,
        amount: amount.toString(),
      }))
      .setTimeout(30)
      .build();

    // responde con XDR
    return res.json({ xdr: tx.toXDR(), network });

  } catch (err) {
    console.error('❌ Error al generar XDR:', err);
    return res.status(500).json({
      error: 'Bad Request',
      detail: err.toString(),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 XDR service escuchando en puerto ${PORT}`));