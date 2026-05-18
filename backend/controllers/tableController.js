require('dotenv').config();
const Table = require('../models/Table');

// ดึงโต๊ะทั้งหมด
exports.getTables = async (req, res) => {
    try {
        const { shift } = req.query; // รับค่า ?shift=morning หรือ afternoon จาก URL

        let filter = {};
        if (shift) {
            // กรองเฉพาะโต๊ะที่มีกะตรงกับที่ส่งมา
            filter = { "session.shift": shift };
        }

        const tables = await Table.find(filter).sort({ "display.sort": 1 });
        res.json(tables);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ดึงข้อมูลโต๊ะรายตัว
exports.getTableById = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);
        if (!table) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });
        res.json(table);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// อัปเดตสถานะโต๊ะ (เช่น จากว่าง เป็น มีลูกค้า)
exports.updateTableStatus = async (req, res) => {
    try {
        const updatedTable = await Table.findByIdAndUpdate(
            req.params.id,
            { table_status: req.body.table_status },
            { returnDocument: 'after' }
        );
        res.json(updatedTable);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};