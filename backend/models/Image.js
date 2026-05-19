const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    folder: { type: String, required: true, default: 'money' },
    title: { type: String, required: true },  // เช่น TrueMoney Wallet, ธนาคารกรุงไทย
    name: { type: String, required: true },   // เช่น ชายสี่ บะหมี่, ชาตรี มณีวรวัฒน์
    filename: { type: String, required: true } // เช่น qr-true.jpg, qr-bank.jpg
}, { timestamps: true });

module.exports = mongoose.model('Images', ImageSchema);