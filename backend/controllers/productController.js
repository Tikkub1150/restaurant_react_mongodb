require('dotenv').config();
const Product = require('../models/Product');

// 1. ดึงสินค้าทั้งหมด
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ sort: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. ดึงสินค้าตาม ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "ไม่พบสินค้า" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ 3. เพิ่มสินค้าใหม่
exports.createProduct = async (req, res) => {
    try {
        const { name, price, category, image, sort, printer_name, options, quickTags } = req.body;
        const newProduct = new Product({
            name,
            price: Number(price),
            category,
            image,
            sort: Number(sort),
            printer_name: printer_name || "POS-80C1", // ใส่ค่าเริ่มต้นเป็นเครื่องต้มไว้ให้ครับพี่
            options,
            quickTags
        });
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// ✅ 4. แก้ไขข้อมูลสินค้า
exports.updateProduct = async (req, res) => {
    try {
        const { name, price, category, image, sort, printer_name, options, quickTags } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { name, price: Number(price), category, image, sort: Number(sort), printer_name, options, quickTags },
            { returnDocument: 'after', runValidators: true } // ✨ แก้ตรงนี้
        );
        if (!updatedProduct) return res.status(404).json({ error: "ไม่พบข้อมูลเมนูอาหารชิ้นนี้ครับ" });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 5. ลบข้อมูลสินค้า
exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ error: "ไม่พบข้อมูลเมนูอาหารชิ้นนี้ครับ" });
        res.json({ message: "ลบเมนูอาหารออกจากระบบสำเร็จเรียบร้อยครับพี่!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};