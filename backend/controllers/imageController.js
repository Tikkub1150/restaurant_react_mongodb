const Image = require('../models/Image');

// ดึงข้อมูลรูปภาพและบัญชีทั้งหมดไปแสดงที่แท็บชำระเงิน
exports.getQrImages = async (req, res) => {
    try {
        // ดึงทั้งหมด และสามารถเรียงลำดับได้ตามต้องการ
        const qrImages = await Image.find({ folder: 'money' });
        res.json(qrImages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};