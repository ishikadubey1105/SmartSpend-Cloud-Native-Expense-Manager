const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { exportCSV, exportPDF } = require('../controllers/exportController');

router.use(authenticate);

router.get('/csv', exportCSV);
router.get('/pdf', exportPDF);

module.exports = router;
