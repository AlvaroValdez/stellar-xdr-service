// src/routes/xdr.js
const express = require('express');
const router = express.Router();
const { generateXdr } = require('../controllers/xdrController');

// Ruta POST /api/xdr/generate
router.post('/generate', generateXdr);

module.exports = router;