const mongoose = require('mongoose');

const materialOrderSchema = new mongoose.Schema({
    supplier_name: { type: String, required: true },
    status: { type: String, enum: ['pending', 'ordered', 'received', 'cancelled'], default: 'pending' },
    items: [
        {
            name: { type: String, required: true },
            qty: { type: String, default: "" },          // เก็บตัวเลขจำนวนที่คีย์จากมือถือ
            unit_type: { type: String, default: "โล" },  // เก็บค่าดรอปดาวน์ เช่น โล, กำ, ชุด
            unitPrice: { type: Number, default: 0 },
            comment: { type: String, default: "" },       // เก็บช่องรายละเอียดพิเศษ
            price: { type: String, default: "" }          // ✅ เพิ่มฟิลด์คีย์ยอดเงิน (บาท) ตรงนี้ตามสั่งครับ!
        }
    ]
}, { timestamps: true });

// ล็อกเป้าหมายให้เซฟลงตารางก้อนเดิมของพี่ใน MongoDB
module.exports = mongoose.model('MaterialOrder', materialOrderSchema, 'material_orders');