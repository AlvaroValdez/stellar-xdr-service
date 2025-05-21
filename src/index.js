require('dotenv').config();
const express       = require('express');
const { Server, Networks, TransactionBuilder, Operation, Asset } = require('stellar-sdk');

const app = express();
app.use(express.json());

// Configuración
const HORIZON_URL = process.env.HORIZON_URL;
const NETWORK     = process.env.NETWORK === 'mainnet'
  ? Networks.PUBLIC
  : Networks.TESTNET;
const PORT        = process.env.PORT || 3001;

// Simple healthcheck
app.get('/health', (req, res) => res.send({ ok: true }));

// POST /generate  → { xdr }
app.post('/generate', async (req, res) => {
  try {
    const { source, destination, amount, memo, network } = req.body;
    if (!source || !destination || !amount) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    // Escoge la red
    const net = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
    // Construye la transacción básica: pago simple de XLM
    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(source);

    const tx = new TransactionBuilder(account, {
      fee:       (await server.fetchBaseFee()).toString(),
      networkPassphrase: net
    })
      .addOperation(Operation.payment({
        destination,
        asset: Asset.native(),
        amount: amount.toString(),
      }))
      .addMemo(memo ? StellarSdk.Memo.text(memo) : StellarSdk.Memo.none())
      .setTimeout(180)
      .build();

    // Serializa a XDR (sin firmar)
    const xdr = tx.toXDR();
    res.json({ xdr });
  } catch (error) {
    console.error('generate error:', error);
    res.status(500).json({ error: 'Error generando XDR' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 stellar-xdr-service corriendo en http://localhost:${PORT}`);
});