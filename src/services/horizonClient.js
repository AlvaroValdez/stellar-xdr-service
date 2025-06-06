// src/services/horizonClient.js
require('dotenv').config();
const { Server, Networks, TransactionBuilder, Asset, BASE_FEE } = require('stellar-sdk');

const HORIZON_URL = process.env.HORIZON_URL;
const NETWORK = process.env.NETWORK;

if (!HORIZON_URL) throw new Error('HORIZON_URL no está definida en .env');
if (!NETWORK) throw new Error('NETWORK no está definida en .env');

const server = new Server(HORIZON_URL);
const networkPassphrase = Networks[NETWORK.toUpperCase()]; // “Test SDF Network ; September 2015” para testnet

module.exports = { server, networkPassphrase, TransactionBuilder, Asset, BASE_FEE };