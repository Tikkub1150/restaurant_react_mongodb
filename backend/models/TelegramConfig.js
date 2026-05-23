const mongoose = require('mongoose');

const TelegramConfigSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        token: String,
        enum: ['checkout', 'general'] // checkout = แจ้งเตือนเช็คบิล, general = แจ้งเตือนทั่วไป (ลบ/แก้ไข/อื่นๆ)
    },
    chat_id: { type: String, required: true },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('TelegramConfig', TelegramConfigSchema);