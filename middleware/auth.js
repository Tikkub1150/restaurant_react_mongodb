// middleware/auth.js
exports.adminAuth = (req, res, next) => {
    const adminPassword = req.headers['x-admin-password'];
    // ตั้งรหัสผ่านที่พี่ต้องการตรงนี้
    if (adminPassword === '1234') {
        next();
    } else {
        res.status(401).json({ error: 'สิทธิ์ไม่ถูกต้อง' });
    }
};