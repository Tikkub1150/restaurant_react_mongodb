const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    productId: { type: String },
    name: String,
    quantity: { type: Number, default: 1 },
    price: Number,

    options: [{
        label: String,
        extraPrice: Number
    }],

    note: String,
    isEdited: { type: Boolean, default: false },
    oldVersion: {
        name: String,
        quantity: Number,
        note: String,
        options: String
    },

    status: {
        type: String,
        // ✅ เพิ่ม 'pending' และ 'paid' เข้าไปเพื่อให้รองรับลอจิกใน Controller
        enum: ['pending', 'printing', 'printed', 'paid', 'cancelled'],
        default: 'pending'
    },
    printCount: { type: Number, default: 0 },
    printer_name: String
}, { timestamps: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);