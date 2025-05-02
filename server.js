const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server, TransactionBuilder, Networks, Operation, Asset } = require('stellar-sdk');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.post('/generate', async (req, res) => {
  try {
    const { source, destination, amount, asset_code, asset_issuer, network } = req.body;

    console.log('📦 Payload recibido:', JSON.stringify(req.body, null, 2));

    if (!source || !destination || !amount || !network) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    const horizonURL = network === 'public'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';

    const server = new Server(horizonURL);
    const sourceAccount = await server.loadAccount(source);

    const networkPassphrase = network === 'public' ? Networks.PUBLIC : Networks.TESTNET;

    const asset = asset_code && asset_issuer
      ? new Asset(asset_code, asset_issuer)
      : Asset.native();

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
    console.log('✅ XDR generado:', xdr);

    return res.status(200).json({ xdr, network });
  } catch (error) {
    console.error('❌ Error al generar XDR:', error);
    return res.status(500).json({
      error: 'Bad Request',
      detail: error.message || error.stack
    });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Servicio Stellar XDR listo.');
});

app.listen(PORT, () => {
  console.log(`🚀 Servicio XDR corriendo en puerto ${PORT}`);
});
