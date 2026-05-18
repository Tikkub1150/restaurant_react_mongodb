const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    order: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
        default: '#4B5563' // สีเทาเข้มเป็นค่าเริ่มต้น
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);