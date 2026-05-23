require('dotenv').config();
const request = require('supertest');
const assert = require('assert');
const mongoose = require('mongoose');
const app = require('../server');

const { expect } = require('chai');
const {sendTelegramNotification} = require("../services/telegramService"); // กลับมา require ได้ตามปกติร้อยเปอร์เซ็นต์ครับ!

describe('Full RESTful APIs Test for All Models', () => {

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://localhost:27017/pos_db');
        }
    });

    describe('Table API', () => {
        let tempId;

        it('ควรจะสร้างโต๊ะทั้งหมดได้ในครั้งเดียว (Bulk POST)', async () => {
            const tablesData = [
                { "table_name": "1", "display": { "sort": 1, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "2", "display": { "sort": 2, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "3", "display": { "sort": 3, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "4", "display": { "sort": 4, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "5", "display": { "sort": 5, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "6", "display": { "sort": 6, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "7", "display": { "sort": 7, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "8", "display": { "sort": 8, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "9", "display": { "sort": 9, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "10", "display": { "sort": 10, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "11", "display": { "sort": 11, "zone": "Main" }, "session": { "shift": "morning" } },
                { "table_name": "Space_1", "table_status": "hidden", "display": { "sort": 12, "hide": true } },

                { "table_name": "กลับบ้าน A", "display": { "sort": 13, "zone": "Delivery" } },
                { "table_name": "กลับบ้าน B", "display": { "sort": 14, "zone": "Delivery" } },
                { "table_name": "กลับบ้าน C", "display": { "sort": 15, "zone": "Delivery" } },
                { "table_name": "กลับบ้าน D", "display": { "sort": 16, "zone": "Delivery" } },

                { "table_name": "ไลน์แมน A", "display": { "sort": 17, "zone": "Delivery" } },
                { "table_name": "ไลน์แมน B", "display": { "sort": 18, "zone": "Delivery" } },
                { "table_name": "ไลน์แมน C", "display": { "sort": 19, "zone": "Delivery" } },
                { "table_name": "Space_2", "table_status": "hidden", "display": { "sort": 20, "hide": true } },

                { "table_name": "โรบินฮู้ด A", "display": { "sort": 21, "zone": "Delivery" } },
                { "table_name": "ส่งเอง A", "display": { "sort": 22, "zone": "Delivery" } },
                { "table_name": "ส่งเอง B", "display": { "sort": 23, "zone": "Delivery" } },
                { "table_name": "Space_3", "table_status": "hidden", "display": { "sort": 24, "hide": true } },

                { "table_name": "สำรอง A", "display": { "sort": 25, "zone": "Backup" } },
                { "table_name": "สำรอง B", "display": { "sort": 26, "zone": "Backup" } },
                { "table_name": "ร้านพี่เล็ก A", "display": { "sort": 27, "zone": "Partner" } },
                { "table_name": "คุณชาย", "display": { "sort": 28, "zone": "VIP" } },

                { "table_name": "โต๊ะเฮีย", "display": { "sort": 29, "zone": "VIP" } },
                { "table_name": "สบาย เทค", "display": { "sort": 30, "zone": "Partner" } }
            ];

            const res = await request(app)
                .post('/api/tables')
                .send(tablesData); // ส่ง Array ก้อนเดียว
            if (res.status !== 201) {
                console.log("❌ Mongoose บอกว่า:", JSON.stringify(res.body, null, 2));
            }
        });

        it('ควรจะดึงข้อมูลโต๊ะทั้งหมดได้ (GET)', async () => {
            const res = await request(app).get('/api/tables');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(Array.isArray(res.body), true);
            console.log(`จำนวนโต๊ะทั้งหมดในระบบ: ${res.body.length}`);
        });

        it('ควรจะอัปเดตสถานะโต๊ะตัวล่าสุดได้ (PUT)', async () => {
            if (!tempId) return;
            const res = await request(app)
                .put(`/api/tables/${tempId}`)
                .send({ "table_status": "occupied" });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.table_status, "occupied");
        });
    });
    describe('TELEGRAM', () => {
        let tempId;

        it('ควรจะสร้างโต๊ะทั้งหมดได้ในครั้งเดียว (Bulk POST)', async () => {
            const { sendTelegramNotification } = require('../services/telegramService');
            await sendTelegramNotification('general', 'generalDeleteMsg');
        });
        it('เช็คบิล (Bulk POST)', async () => {
            const { sendTelegramNotification } = require('../services/telegramService');
            const checkoutMsg = `
🔔 *เช็คบิลปิดโต๊ะ*
📍 *โต๊ะ:* โต๊ะ 'ทั่วไป'}
💳 *ชำระโดย:*  'โอน (PromptPay)'}
💰 *จำนวนเงินรวม:*`


            // 4. ส่งออกไปที่ห้องแชทเช็คบิล
            await sendTelegramNotification('checkout', 'checkoutMsg');
        });
    });
    describe('confirmOrderPrinting', () => {
        let tempId;

        it('เทส', async () => {
            const { confirmOrderPrinting } = require('../controllers/orderController');

            // 1. สร้าง req object
            const req = {
                params: { orderId: '6a0d4fe6a35962dace5867be' }
            };

            // 2. สร้าง res object จำลอง (Mock) เพื่อให้ดักจับสถานะที่ส่งกลับมาได้
            const res = {
                status: function(code) {
                    this.statusCode = code;
                    return this; // ส่ง return this เพื่อให้สามารถเขียนต่อท้าย .json() ได้
                },
                json: function(data) {
                    this.body = data;
                    return this;
                }
            };

            // 3. ส่งไปทั้ง req และ res
            await confirmOrderPrinting(req, res);

            // ลองปริ้นผลลัพธ์ดูว่า Controller ตอบกลับมาว่าอะไร
            console.log("Response Status Code:", res.statusCode || 200);
            console.log("Response Body:", res.body);
        });
    });

    // --- ส่วน Product, category, Order ก็ทำเหมือนเดิม ---
    describe('Product API', () => {
        it('POST', async () => {
            let data = [
                // --- หมวด ต้ม (ID: 1) ---
                { name: "ต้มเลือดหมู", price: 60, category: "ต้ม", image: "49065_6B05F3B6-A6C7-445F-9E85-619310A33189.jpeg", sort: 99, printer_name: "POS-80C1" },
                { name: "แกงจืดลูกรอก", price: 60, category: "ต้ม", image: "61353_A4E5EE94-6206-4E31-A031-22E314D554FA.png", sort: 99, printer_name: "POS-80C1" },
                { name: "ก๋วยจั๊บ", price: 60, category: "ต้ม", image: "", sort: 99, printer_name: "POS-80C1" },
                { name: "ก๋วยเตี๋ยวเครื่องในหมู", price: 60, category: "ต้ม", image: "", sort: 99, printer_name: "POS-80C1" },
                { name: "ข้าวต้ม", price: 50, category: "ต้ม", image: "", sort: 99, printer_name: "POS-80C1" },
                { name: "ข้าวเปล่า", price: 10, category: "ต้ม", image: "", sort: 99, printer_name: "POS-80C1" },

                // --- หมวด ราดข้าว (ID: 2) ---
                { name: "กระเพรา หมูกรอบ", price: 65, category: "ราดข้าว", image: "", sort: 1, printer_name: "POS-80C4" },
                { name: "กระเพรา หมูสับ", price: 55, category: "ราดข้าว", image: "", sort: 2, printer_name: "POS-80C4" },
                { name: "กระเพรา ปลาหมึก", price: 65, category: "ราดข้าว", image: "", sort: 3, printer_name: "POS-80C4" },
                { name: "กระเพรา กุ้ง", price: 65, category: "ราดข้าว", image: "", sort: 4, printer_name: "POS-80C4" },
                { name: "กระเพรา หมูชิ้น", price: 55, category: "ราดข้าว", image: "", sort: 5, printer_name: "POS-80C4" },
                { name: "กระเพรา ไก่", price: 55, category: "ราดข้าว", image: "", sort: 6, printer_name: "POS-80C4" },
                { name: "กระเพรา ทะเล", price: 65, category: "ราดข้าว", image: "", sort: 7, printer_name: "POS-80C4" },
                { name: "กระเพรา รวม", price: 65, category: "ราดข้าว", image: "", sort: 8, printer_name: "POS-80C4" },
                { name: "คะน้า", price: 65, category: "ราดข้าว", image: "", sort: 9, printer_name: "POS-80C4" },
                { name: "ข้าวผัด", price: 65, category: "ราดข้าว", image: "", sort: 10, printer_name: "POS-80C4" },
                { name: "ข้าวหมูกรอบ", price: 65, category: "ราดข้าว", image: "", sort: 11, printer_name: "POS-80C1" },
                { name: "ข้าวไข่เจียว", price: 40, category: "ราดข้าว", image: "", sort: 12, printer_name: "POS-80C4" },
                { name: "กระเทียม 55", price: 55, category: "ราดข้าว", image: "", sort: 13, printer_name: "POS-80C4" },
                { name: "กระเทียม 65", price: 65, category: "ราดข้าว", image: "", sort: 14, printer_name: "POS-80C4" },
                { name: "ข้าวไข่ดาว", price: 20, category: "ราดข้าว", image: "", sort: 15, printer_name: "POS-80C4" },
                { name: "ผัดกระเพราไข่เหยี่ยวม้า", price: 65, category: "ราดข้าว", image: "", sort: 100, printer_name: "POS-80C4" },
                { name: "ไข่ เปล่าๆ", price: 0, category: "ราดข้าว", image: "", sort: 1000, printer_name: "POS-80C4" },

                // --- หมวด กับข้าว (ID: 3) ---
                { name: "กับข้าว กระเพรา", price: 80, category: "กับข้าว", image: "", sort: 1, printer_name: "POS-80C4" },
                { name: "หมูกรอบ ชุด", price: 100, category: "กับข้าว", image: "", sort: 2, printer_name: "POS-80C1" },
                { name: "ลวกจิ้ม ชุด", price: 80, category: "กับข้าว", image: "", sort: 3, printer_name: "POS-80C1" },
                { name: "กับข้าว คะน้า", price: 80, category: "กับข้าว", image: "", sort: 4, printer_name: "POS-80C4" },
                { name: "กับข้าว กระเทียม", price: 80, category: "กับข้าว", image: "", sort: 5, printer_name: "POS-80C4" },
                { name: "กับข้าว ไข่เจียว", price: 40, category: "กับข้าว", image: "", sort: 6, printer_name: "POS-80C4" },
                { name: "ต้มยำ", price: 80, category: "กับข้าว", image: "", sort: 7, printer_name: "POS-80C4" },
                { name: "กับข้าว พริกแกง", price: 80, category: "กับข้าว", image: "", sort: 8, printer_name: "POS-80C4" },
                { name: "กับข้าว พริกหยวก", price: 80, category: "กับข้าว", image: "", sort: 9, printer_name: "POS-80C4" },
                { name: "กับข้าว ผัดฉ่า", price: 80, category: "กับข้าว", image: "", sort: 10, printer_name: "POS-80C4" },
                { name: "กับข้าว ผัดผักบุ้ง", price: 80, category: "กับข้าว", image: "", sort: 99, printer_name: "POS-80C4" },
                { name: "กับข้าว อื่นๆ", price: 80, category: "กับข้าว", image: "", sort: 998, printer_name: "POS-80C4" },
                { name: "อื่นๆ", price: 0, category: "กับข้าว", image: "", sort: 999, printer_name: "" },

                // --- หมวด เครื่องดื่ม (ID: 4) ---
                { name: "โค๊ก", price: 20, category: "เครื่องดื่ม", image: "", sort: 99, printer_name: "" },
                { name: "เก๊กฮวย", price: 20, category: "เครื่องดื่ม", image: "", sort: 99, printer_name: "" },
                { name: "โอเลี้ยง", price: 20, category: "เครื่องดื่ม", image: "", sort: 99, printer_name: "" },
                { name: "ชาดำ", price: 20, category: "เครื่องดื่ม", image: "", sort: 99, printer_name: "" },
                { name: "น้ำเปล่า", price: 10, category: "เครื่องดื่ม", image: "", sort: 100, printer_name: "" },
                { name: "น้ำเปล่า ขวดเล็ก", price: 7, category: "เครื่องดื่ม", image: "", sort: 101, printer_name: "" },
                { name: "น้ำปั่น 35", price: 35, category: "เครื่องดื่ม", image: "", sort: 102, printer_name: "" },
                { name: "เบียร์ สิงค์", price: 75, category: "เครื่องดื่ม", image: "", sort: 9999, printer_name: "" },
                { name: "น้ำฟัก", price: 20, category: "เครื่องดื่ม", image: "", sort: 9999, printer_name: "" },

                // --- หมวด เมนูพิเศษ (ID: 5) ---
                { name: "ข้าวเหนียวหมูห่อ", price: 30, category: "เมนูพิเศษ", image: "", sort: 1, printer_name: "POS-80C4" },
                { name: "ไก่ทอด", price: 0, category: "เมนูพิเศษ", image: "", sort: 2, printer_name: "POS-80C4" },
                { name: "ข้าวเหนียวเปล่าๆ", price: 0, category: "เมนูพิเศษ", image: "", sort: 3, printer_name: "POS-80C4" },
                { name: "ข้าวหมูทอด", price: 55, category: "เมนูพิเศษ", image: "", sort: 4, printer_name: "POS-80C4" },
                { name: "หมู ขีดละ 40", price: 0, category: "เมนูพิเศษ", image: "", sort: 5, printer_name: "" },

                // --- หมวด บะหมี่ (ID: 9) ---
                { name: "บะหมี่", price: 45, category: "บะหมี่", image: "", sort: 1, printer_name: "POS-80C3" },
                { name: "เล้งแซ่บ", price: 80, category: "บะหมี่", image: "", sort: 2, printer_name: "POS-80C99" },
                { name: "เกี้ยวน้ำ-หมูแดง", price: 55, category: "บะหมี่", image: "", sort: 3, printer_name: "POS-80C3" },
                { name: "เกี้ยวน้ำ-หมูกรอบ", price: 65, category: "บะหมี่", image: "", sort: 4, printer_name: "POS-80C3" },
                { name: "ข้าวหมูแดง", price: 55, category: "บะหมี่", image: "", sort: 5, printer_name: "POS-80C1" },
                { name: "ข้าวหมูกรอบ...", price: 65, category: "บะหมี่", image: "", sort: 6, printer_name: "POS-80C1" },
                { name: "ข้าวมันไก่", price: 50, category: "บะหมี่", image: "", sort: 999, printer_name: "POS-80C99" },
                { name: "เส้นเล็ก", price: 45, category: "บะหมี่", image: "", sort: 999, printer_name: "POS-80C3" },

                // --- หมวด ชาไข่มุก (ID: 6) ---
                { name: "ชานม", price: 24, category: "ชาไข่มุก", image: "", sort: 99, printer_name: "POS-80C555" },
                { name: "ชาไทย", price: 24, category: "ชาไข่มุก", image: "", sort: 99, printer_name: "POS-80C555" },
                { name: "ชาเขียว", price: 24, category: "ชาไข่มุก", image: "", sort: 99, printer_name: "POS-80C555" },
                { name: "โกโก้", price: 24, category: "ชาไข่มุก", image: "", sort: 99, printer_name: "POS-80C555" },
                // ... (เมนูชาอื่นๆ ในหมวด 6 สามารถใส่เพิ่มตามรูปแบบนี้ได้เลยครับ)

                // --- หมวด โปรโมชั่น (ID: 10) ---
                { name: "เซต A หมูกรอบ", price: 69, category: "โปรโมชั่น", image: "", sort: 0, printer_name: "POS-80C1" },
                { name: "เซต B เล้ง", price: 99, category: "โปรโมชั่น", image: "", sort: 0, printer_name: "POS-80C99" },
                { name: "เซต C ข้าวมันไก่", price: 60, category: "โปรโมชั่น", image: "", sort: 0, printer_name: "POS-80C99" }
            ]
            const res = await request(app)
                .post('/api/product')
                .send(data); // ส่ง Array ก้อนเดียว
            if (res.status !== 201) {
                console.log("❌ Mongoose บอกว่า:", JSON.stringify(res.body, null, 2));
            }
        });
    });
    describe('Category API', () => {
        it('POST', async () => {
            let data = [
                { name: "ต้ม", order: 1, color: "#10B981" },       // เขียว
                { name: "ราดข้าว", order: 2, color: "#F59E0B" },    // ส้ม
                { name: "กับข้าว", order: 3, color: "#10B981" },    // เขียว
                { name: "เครื่องดื่ม", order: 4, color: "#3B82F6" }, // ฟ้า
                { name: "เมนูพิเศษ", order: 5, color: "#EC4899" },  // ชมพู
                { name: "ชาไข่มุก", order: 6, color: "#10B981" },   // เขียว
                { name: "ตู้ไอติม", order: 7, color: "#60A5FA" },   // ฟ้าอ่อน
                { name: "บะหมี่", order: 8, color: "#EF4444" },     // แดง
                { name: "โปรโมชั่น", order: 9, color: "#6B7280" }    // เทา
            ]
            const res = await request(app)
                .post('/api/category')
                .send(data); // ส่ง Array ก้อนเดียว
            if (res.status !== 201) {
                console.log("❌ Mongoose บอกว่า:", JSON.stringify(res.body, null, 2));
            }
        });
        it('PUT - Update Product with Options and QuickTags', async () => {
            const productId = "6a04710cb411bba3175ebdff"; // ID ของต้มเลือดหมูที่คุณระบุ

            const updateData = {
                name: "ต้มเลือดหมู",
                price: 60,
                category: "ต้ม",
                // เพิ่มส่วน Options ตาม Schema
                options: [
                    { label: "พิเศษ", extraPrice: 10 },
                    { label: "ใส่ถุง", extraPrice: 5 },
                    { label: "เพิ่มจิงจูฉ่าย", extraPrice: 10 }
                ],
                // เพิ่มส่วน QuickTags
                quickTags: ["ไม่เครื่องใน", "ไม่ผัก", "เผ็ดน้อย", "แยกน้ำ"],
                printer_name: "POS-80C1",
                sort: 1
            };

            const res = await request(app)
                .put(`/api/products/${productId}`) // สมมติว่า Path คือ /api/products/:id
                .send(updateData);

            if (res.status === 200 || res.status === 204) {
                console.log("✅ อัปเดตข้อมูลต้มเลือดหมูเรียบร้อย!");
            } else {
                console.log("❌ อัปเดตไม่สำเร็จ:", JSON.stringify(res.body, null, 2));
            }
        });
    });

    describe('PATCH /api/orders/update-print-status', () => {

        const { OrderItem } = require('../models');

        it('ควรจะอัปเดตสถานะของ OrderItem เป็น printed เมื่อ Python ส่งแค่ itemIds มา', async () => {
            // 1. สร้างข้อมูลจำลองที่มีสถานะคาเป็น 'printing' ไว้ใน DB
            const mockItem1 = {
                _id: "6a095f93a5240d17129e179a",
                orderId: "6a06f49ce25e90de90820433",
                name: "ต้มเลือดหมู",
                quantity: 3,
                price: 60,
                status: "printing", // สถานะที่เปลี่ยนมาจากฟังก์ชันพิมพ์ขั้นแรก
                printCount: 1
            }

            // 2. 🔥 ยิง Payload ตัวแปรเดียวโดด ๆ ตามที่ฝั่ง Python ส่งมาจริง
            const update_payload = {
                itemIds: [
                    mockItem1._id.toString()
                ]
            };

            // 3. ยิงกระแทกเข้า API เส้นรับ Callback
            const res = await request(app)
                .patch('/api/orders/update-print-status')
                .send(update_payload);

            if (res.status === 200 || res.status === 204) {
                console.log("✅ อัปเดตข้อมูลต้มเลือดหมูเรียบร้อย!");
            } else {
                console.log("❌ อัปเดตไม่สำเร็จ:", JSON.stringify(res.body, null, 2));
            }
        });
    });

    after(async () => {
        await mongoose.connection.close();
    });
});