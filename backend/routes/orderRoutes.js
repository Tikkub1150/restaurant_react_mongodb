const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/table/:tableId', orderController.getOrdersByTable);
router.delete('/item/:itemId', orderController.deleteOrderItem);
router.post('/', orderController.upsertOrder);
router.put('/close/:tableId', orderController.closeOrder);
router.get('/history', orderController.getHistory);
router.put('/move/:tableId', orderController.moveTable);
router.put('/confirm-print/:orderId', orderController.confirmOrderPrinting); // สั่งดันข้อมูลไป Python
router.put('/update-note/:tableId', orderController.updateTableNoteOnly);

// ✅ เพิ่มเส้นนี้เพื่อให้ Python ยิงกลับมาอัปเดตสถานะเมื่อพิมพ์เสร็จจริง
router.patch('/update-print-status', orderController.handlePythonPrintCallback);

router.put('/item/:itemId', orderController.updateOrderItem);
router.post('/item/add', orderController.addOrderItem);

// admin routes
router.get('/report/monthly', orderController.getMonthlyReport);

module.exports = router;