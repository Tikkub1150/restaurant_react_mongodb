const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

router.get('/', materialController.getMaterialOrders);
router.post('/', materialController.createMaterialOrder);
router.put('/:id', materialController.updateMaterialStatus);
router.delete('/:id', materialController.deleteMaterialOrder);

// 📌 ท่อทางเดินพิเศษสำหรับส่งข้อมูลที่แก้ไขจำนวนบนโทรศัพท์ไปบันทึก
router.put('/:id/items', materialController.updateItemsQuantity);

module.exports = router;