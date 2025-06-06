// src/controllers/xdrController.js
const StellarSdk = require('stellar-sdk');
const { server, networkPassphrase, TransactionBuilder, Asset, BASE_FEE } = require('../services/horizonClient');

// Helper para validar que vengan los campos mínimos
function validarPayload(body) {
  const { sourcePublicKey, operations } = body;
  if (!sourcePublicKey) {
    const err = new Error('sourcePublicKey es obligatorio');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    const err = new Error('operations debe ser un arreglo no vacío');
    err.status = 400;
    throw err;
  }
}

async function generateXdr(req, res, next) {
  try {
    validarPayload(req.body);

    const { sourcePublicKey, memo, operations } = req.body;

    // 1) Cargar la cuenta fuente para obtener secuencia
    let accountRecord;
    try {
      accountRecord = await server.loadAccount(sourcePublicKey);
    } catch (loadErr) {
      const err = new Error('No se encontró la cuenta en Horizon');
      err.status = 404;
      throw err;
    }

    // 2) Iniciar TransactionBuilder
    const txBuilder = new TransactionBuilder(accountRecord, {
      fee: BASE_FEE,
      networkPassphrase,
    });

    // 3) Si viene memo, agregarlo (solo texto por simplicidad)
    if (memo) {
      txBuilder.addMemo(StellarSdk.Memo.text(memo));
    }

    // 4) Iterar sobre cada operación y anexar
    operations.forEach((op) => {
      // Por simplicidad, asumimos que op tiene: { type, destination, asset: { code, issuer }, amount }
      if (op.type !== 'payment') {
        const err = new Error(`Tipo de operación no soportado: ${op.type}`);
        err.status = 400;
        throw err;
      }
      let assetObj;
      if (op.asset.code === 'XLM') {
        assetObj = Asset.native();
      } else {
        assetObj = new Asset(op.asset.code, op.asset.issuer);
      }
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: op.destination,
          asset: assetObj,
          amount: op.amount,
        })
      );
    });

    // 5) Fijar timeout y construir
    const transaction = txBuilder.setTimeout(180).build();

    // 6) Devolver XDR listo para firmar
    return res.status(200).json({ xdr: transaction.toXDR() });
  } catch (err) {
    return next(err);
  }
}

module.exports = { generateXdr };