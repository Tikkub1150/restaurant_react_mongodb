const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');


// admin routes
router.get('/monthly', reportController.getMonthlyReport);

module.exports = router;