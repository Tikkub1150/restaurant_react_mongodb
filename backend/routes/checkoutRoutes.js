const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');


router.put('/close/:tableId', checkoutController.closeOrder);

module.exports = router;