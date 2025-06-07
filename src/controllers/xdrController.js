// src/controllers/xdrController.js
const { Server, Networks, TransactionBuilder, Asset, Operation, Memo } = require('stellar-sdk');

const HORIZON_URL = process.env.HORIZON_URL;
const NETWORK = process.env.NETWORK;

if (!HORIZON_URL) {
  throw new Error('HORIZON_URL no definido en el entorno');
}
if (!NETWORK) {
  throw new Error('NETWORK no definido en el entorno');
}

const server = new Server(HORIZON_URL);

/**
 * Valida que el payload contenga la información mínima necesaria
 * @param {Object} payload
 * @throws {Error} con status 400 si falta algo
 */
function validarPayload(payload) {
  const { sourceAccount, operations } = payload;
  if (!sourceAccount) {
    const err = new Error('sourceAccount es obligatorio');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    const err = new Error('operations es obligatorio y debe ser un arreglo con al menos una operación');
    err.status = 400;
    throw err;
  }
}

/**
 * Controlador para generar XDR.
 * Espera en req.body: sourceAccount, memo (opcional), operations (array)
 */
async function generateXdr(req, res, next) {
  try {
    validarPayload(req.body);
    const { sourceAccount, memo, operations } = req.body;

    // Cargar cuenta desde Horizon para obtener sequence y fee
    const account = await server.loadAccount(sourceAccount);
    const baseFee = await server.fetchBaseFee();

    // Construcción de la transacción
    let txBuilder = new TransactionBuilder(account, {
      fee: baseFee.toString(),
      networkPassphrase: NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
    });

    // Agregar operaciones
    for (const op of operations) {
      if (op.type === 'payment') {
        const asset = op.asset.issuer
          ? new Asset(op.asset.code, op.asset.issuer)
          : Asset.native();
        txBuilder = txBuilder.addOperation(
          Operation.payment({
            destination: op.destination,
            asset,
            amount: op.amount,
          })
        );
      } else {
        const err = new Error(`Tipo de operación no soportado: ${op.type}`);
        err.status = 400;
        throw err;
      }
    }

    // Agregar memo si existe
    if (memo) {
      txBuilder = txBuilder.addMemo(Memo.text(memo));
    }

    // Construir y enviar el XDR
    const transaction = txBuilder.setTimeout(30).build();
    return res.json({
      xdr: transaction.toXDR(),
      fee: transaction.fee,
      sequence: transaction.sequence,
      network: NETWORK,
    });
  } catch (err) {
    console.error('[XDR_CONTROLLER] Error generando XDR:', err.message || err);
    return next(err);
  }
}

module.exports = { generateXdr };