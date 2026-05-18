const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
    table_name: { type: String, required: true },
    table_status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'cleaning', 'hidden'],
        default: 'available'
    },
    display: {
        sort: { type: Number, default: 0 },
        hide: { type: Boolean, default: false },
        zone: { type: String, default: 'Main' }
    },
    session: {
        shift: { type: String, enum: ['morning', 'afternoon'], default: 'morning' },
        temp_table_name: { type: String, default: '' }
    },
    printing: {
        print_receipt_status: { type: Boolean, default: false },
        printer_receipt_name: { type: String, default: 'Default' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Table', TableSchema);