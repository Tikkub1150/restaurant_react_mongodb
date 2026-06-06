const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');


router.put('/close/:tableId', checkoutController.closeOrder);
router.post('/split/:tableId', checkoutController.splitCheckout);

module.exports = router;