require('dotenv').config();
const Table = require('../models/Table');
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

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

exports.getOrdersByTable = async (req, res) => {
    try {
        const { tableId } = req.params;
        const { status } = req.query;
        let query = { tableId };
        if (status) {
            query.status = { $in: status.split(',') };
        }
        const orders = await Order.find(query).lean();
        const data = await Promise.all(orders.map(async (order) => {
            const items = await OrderItem.find({ orderId: order._id });
            return { ...order, items };
        }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ แก้ไขฟังก์ชัน moveTable ให้ตรงกับค่าพารามิเตอร์หน้าบ้านของพี่อลิส
exports.moveTable = async (req, res) => {
    try {
        // ดึงค่า tableId ออกมาตรงๆ ตามที่ตั้งไว้ใน orderRoutes.js (:tableId)
        const { tableId } = req.params;
        const { newTableId, newTableName } = req.body;

        // 🎯 1. สั่งย้ายออเดอร์ทั้งหมดที่ยังไม่ได้เช็คบิล (รวมทั้งบิลที่พิมพ์ออกครัวไปแล้วด้วย)
        // อิงฟิลด์ใน Database ของพี่คือ tableId (ไอตัวใหญ่) และ table_name
        await Order.updateMany(
            {
                tableId: tableId,
                status: { $in: ['draft', 'pending', 'printing', 'printed'] }
            },
            {
                $set: {
                    tableId: newTableId,
                    table_name: newTableName
                }
            }
        );

        // 🎯 2. สลับเปลี่ยนสถานะโต๊ะในระบบโมเดล Table ให้ถูกต้องลื่นไหล
        const sourceTable = await Table.findById(tableId);
        const targetTable = await Table.findById(newTableId);

        if (sourceTable && targetTable) {
            // โอนย้ายสถานะและโน้ตโต๊ะ (temp_table_name) ไปที่โต๊ะใหม่
            targetTable.table_status = 'occupied';
            if (sourceTable.session && sourceTable.session.temp_table_name) {
                targetTable.session = targetTable.session || {};
                targetTable.session.temp_table_name = sourceTable.session.temp_table_name;
                sourceTable.session.temp_table_name = '';
            }

            // เคลียร์โต๊ะเก่าให้ว่างพร้อมรับลูกค้าใหม่
            sourceTable.table_status = 'available';

            await targetTable.save();
            await sourceTable.save();
        } else {
            // ลอจิกสำรองดั้งเดิม เผื่อกรณีดัก Object เช็คโมเดลไม่เจอ
            await Table.findByIdAndUpdate(tableId, { table_status: 'available' });
            await Table.findByIdAndUpdate(newTableId, { table_status: 'occupied' });
        }

        res.json({ message: "ย้ายโต๊ะและออเดอร์อาหารเรียบร้อยแล้วครับพี่" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
