// src/tests/xdr.test.js
require('dotenv').config({ path: '.env' });
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Montamos un mini servidor de prueba
const app = express();
app.use(express.json());

// Mock del middleware JWT para tests
app.use((req, res, next) => {
  req.user = { id: 'test-user' };
  next();
});

// Importa rutas y errorHandler
const xdrRouter = require('../routes/xdr');
const { errorHandler } = require('../middlewares/errorHandler');
app.use('/api/xdr', xdrRouter);
app.use(errorHandler);

describe('POST /api/xdr/generate', () => {
  it('400 si falta sourcePublicKey o operations', async () => {
    const token = jwt.sign({ id: 'u' }, process.env.SECRET_JWT);
    const res = await request(app)
      .post('/api/xdr/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/sourcePublicKey es obligatorio/);
  });

  it('404 si la cuenta no existe en Horizon', async () => {
    const token = jwt.sign({ id: 'u' }, process.env.SECRET_JWT);

    // Payload con cuenta testnet que no está fundida
    const payload = {
      sourcePublicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      operations: [
        { type: 'payment', destination: 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', asset: { code: 'XLM', issuer: null }, amount: '1' }
      ]
    };

    const res = await request(app)
      .post('/api/xdr/generate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/No se encontró la cuenta en Horizon/);
  });

  it('200 y devuelve xdr válido (mock Horizon)', async () => {
    // Reemplazamos server.loadAccount para simular cuenta existente
    jest.mock('../services/horizonClient', () => {
      const StellarSdk = require('stellar-sdk');
      return {
        server: {
          loadAccount: jest.fn().mockResolvedValue({
            accountId: 'GAAAA…',
            sequenceNumber: () => '12345'
          })
        },
        networkPassphrase: StellarSdk.Networks.TESTNET,
        TransactionBuilder: StellarSdk.TransactionBuilder,
        Asset: StellarSdk.Asset,
        BASE_FEE: 100
      };
    });

    // Reconstruimos ruta con mock aplicado
    const { generateXdr } = require('../controllers/xdrController');
    const routerMock = express.Router();
    routerMock.post('/generate', generateXdr);
    const appMock = express();
    appMock.use(express.json());
    appMock.use((req, res, next) => { req.user = { id: 'u' }; next(); });
    appMock.use('/api/xdr', routerMock);
    appMock.use(errorHandler);

    const token = jwt.sign({ id: 'u' }, process.env.SECRET_JWT);
    const payload = {
      sourcePublicKey: 'GAAAA…',
      operations: [
        { type: 'payment', destination: 'GBBBB…', asset: { code: 'XLM', issuer: null }, amount: '1' }
      ]
    };

    const res = await request(appMock)
      .post('/api/xdr/generate')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.xdr).toBe('string');
    expect(res.body.xdr.length).toBeGreaterThan(0);
  });
});