const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

router.get('/qr-images', imageController.getQrImages);

module.exports = router;