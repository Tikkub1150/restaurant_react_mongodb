const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.upsertOrder);

router.put('/update-note/:orderId', orderController.updateTableNoteOnly);
router.delete('/item/:itemId', orderController.deleteOrderItem);
router.get('/history', orderController.getHistory);
router.put('/confirm-print/:orderId', orderController.confirmOrderPrinting); // สั่งดันข้อมูลไป Python

router.put('/item/:itemId', orderController.updateOrderItem);
router.post('/item/add', orderController.addOrderItem);

// ✅ เพิ่มเส้นนี้เพื่อให้ Python ยิงกลับมาอัปเดตสถานะเมื่อพิมพ์เสร็จจริง
router.patch('/update-print-status', orderController.handlePythonPrintCallback);

module.exports = router;