require('dotenv').config();
const MaterialOrder = require('../models/MaterialOrder');

// 1. ดึงข้อมูลใบสั่งของทั้งหมดมาโชว์ที่หน้าเว็บ
exports.getMaterialOrders = async (req, res) => {
    try {
        const list = await MaterialOrder.find().sort({ createdAt: 1 });
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. 🛠️ ฟังก์ชันบันทึกตัวเลขและหน่วยวัตถุดิบทั้งหมดที่แก้ไขจากมือถือ (ตัวนี้แหละที่ทำใหเซฟได้จริง!)
exports.updateItemsQuantity = async (req, res) => {
    try {
        const { items } = req.body;
        const updated = await MaterialOrder.findByIdAndUpdate(
            req.params.id,
            { items },
            { returnDocument: 'after' }
        );
        if (!updated) return res.status(404).json({ error: "ไม่พบใบสั่งซื้อร้านนี้" });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 3. ฟังก์ชันสร้างบิลใหม่ (คงไว้เผื่อระบบเก่าเรียกใช้)
exports.createMaterialOrder = async (req, res) => {
    try {
        const newOrder = new MaterialOrder(req.body);
        const saved = await newOrder.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 4. อัปเดตสถานะบิลหลัก
exports.updateMaterialStatus = async (req, res) => {
    try {
        const updated = await MaterialOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 5. ลบใบสั่งซื้อ
exports.deleteMaterialOrder = async (req, res) => {
    try {
        await MaterialOrder.findByIdAndDelete(req.params.id);
        res.json({ message: "ลบสำเร็จ" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};