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

app.post('/generate', async (req, res) => {
  try {
    // 🔥 Asegúrate de que los campos coincidan exactamente
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;

    // 1. Validación mínima
    if (![source, destination, amount, asset_code, asset_issuer, network].every(Boolean)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    if (!['public','testnet'].includes(network)) {
      return res.status(400).json({ error: 'Network debe ser "public" o "testnet".' });
    }

    // 2. Conectar a Horizon
    const server = new Server(HORIZON[network]);

    // 3. Cargar la cuenta “source”
    //    —> si "source" no es una G... entonces aquí fallará con "invalid_field: account_id"
    const account = await server.loadAccount(source);

    // 4. Elegir el activo
    const asset = asset_code === 'XLM'
      ? Asset.native()
      : new Asset(asset_code, asset_issuer);

    // 5. Construir la transacción
    const tx = new TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),                       // BASE_FEE
      networkPassphrase: network === 'public'
        ? Networks.PUBLIC
        : Networks.TESTNET,
    })
      .addOperation(
        // Aquí asumo que es un pago sencillo; ajusta si usas otros ops
        StellarSdk.Operation.payment({
          destination,
          asset,
          amount: amount.toString(),
        })
      )
      .setTimeout(30)
      .build();

    // 6. Devolver el XDR
    return res.json({ xdr: tx.toXDR(), network });

  } catch (err) {
    console.error('❌ Error al generar XDR:', err);
    // Si Horizon rechaza algo, devuelve el mensaje crudo
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