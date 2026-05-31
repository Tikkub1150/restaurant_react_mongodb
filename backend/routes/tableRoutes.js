const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const orderController = require("../controllers/orderController");

router.get('/', tableController.getTables);
router.get('/:id', tableController.getTableById);
router.put('/:id/status', tableController.updateTableStatus);

router.put('/move/:tableId', tableController.moveTable);

router.get('/table/:tableId', tableController.getOrdersByTable);

module.exports = router;