const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    tableId: { type: String, required: true },
    table_name: String,
    status: {
        type: String,
        enum: ['draft', 'pending', 'printing' , 'printed', 'paid', 'cancelled'],
        default: 'draft'
    },
    totalAmount: { type: Number, default: 0 },

    // --- ระบบสรุปยอดเงินและส่วนลด ---
    discount: { type: Number, default: 0 },       // เปอร์เซ็นต์ %
    discountAmount: { type: Number, default: 0 }, // ยอดเงินที่ลด (บาท)
    cashierName: { type: String },               // ชื่อพนักงานที่กดลด
    cashReceived: { type: Number, default: 0 },   // เงินที่รับมา
    changeGiven: { type: Number, default: 0 },    // เงินทอน

    paymentMethod: { type: String, enum: ['cash', 'promptpay', 'lineman', 'goverment', 'truemoney'] },
    zone: { type: String, enum: ['main', 'delivery', 'lineman', 'vip', 'reserve', 'bamee', 'take_home'] },
    shift: { type: String, enum: ['morning', 'afternoon'] },
    customerName: String,
    items: { type: Array },
    closedAt: { type: Date },
    tableNote: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);