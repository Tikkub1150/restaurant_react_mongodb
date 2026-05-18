const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// ทางเดินดึงข้อมูลเดิม
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// 🚀 ทางเดินข้อมูลที่เพิ่มเข้าไปใหม่เพื่อให้หน้าบ้านใช้งานได้สำเร็จ
router.post('/', productController.createProduct);    // สำหรับ เพิ่มสินค้า
router.put('/:id', productController.updateProduct);   // สำหรับ แก้ไขสินค้าตาม ID
router.delete('/:id', productController.deleteProduct); // สำหรับ ลบสินค้าตาม ID

module.exports = router;