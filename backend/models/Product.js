const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, default: "" },
    sort: { type: Number, default: 0 },
    printer_name: { type: String, default: "kitchen" },
    // ฟิลด์สำหรับตัวเลือกที่บวกราคาเพิ่ม (เช่น ไข่ดาว, พิเศษ)
    options: [{
        label: { type: String },
        extraPrice: { type: Number, default: 0 }
    }],
    // ฟิลด์สำหรับแท็กด่วน (เช่น ไม่ใส่ผัก, เผ็ดน้อย)
    quickTags: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);