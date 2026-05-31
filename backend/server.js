require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
global.crypto = crypto;
const models = require('./models');
const app = express();

// app.use(cors({
//     origin: [
//         'http://localhost:3000',
//         'http://tikkubzaza-1234.ddns.net:3000',  // 👈 เพิ่มชื่อเว็บนอกบ้านของพี่เข้าไปตรงนี้
//         'http://tikkubzaza-1234.ddns.net:5000'   // 👈 เพิ่มชื่อเว็บนอกบ้านของพี่เข้าไปตรงนี้ (สำหรับทดสอบ API โดยตรง)
//     ],
//     credentials: true
// }));
app.use(cors())
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/pos_db')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ Connection Error:', err));

// --- ลงทะเบียน Routes แยกไฟล์ตามมาตรฐานของพี่ ---
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes'); // ดึงไฟล์ที่เราเพิ่งแก้ด้านบนมาใช้
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const materialRoutes = require('./routes/materialRoutes'); // ดึงไฟล์ที่เราเพิ่งแก้ด้านบนมาใช้
const imageRoutes = require('./routes/imageRoutes'); // ดึงไฟล์ที่เราเพิ่งแก้ด้านบนมาใช้

//admin
const reportRoutes = require('./routes/reportRoutes');

app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/products', productRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/images', imageRoutes);

//admin
app.use('/api/reports', reportRoutes);

app.listen(5000, '0.0.0.0', () => {
    console.log('🚀 Server running on port 5000 (Open for All Devices)');
});
module.exports = app;