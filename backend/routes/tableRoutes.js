const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

router.get('/', tableController.getTables);
router.get('/:id', tableController.getTableById);
router.put('/:id/status', tableController.updateTableStatus);

module.exports = router;