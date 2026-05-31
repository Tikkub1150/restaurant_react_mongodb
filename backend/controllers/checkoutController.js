require('dotenv').config();
const axios = require('axios');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Table = require('../models/Table');


const { sendTelegramNotification } = require('../services/telegramService');

// ฟังก์ชันคำนวณเงินใหม่ (Recalculate)
const recalculateOrder = async (orderId) => {
    const items = await OrderItem.find({ orderId });

    const newTotal = items.reduce((sum, i) => {
        // 1. หาค่ารวมของ Options ใน item นั้นๆ (ถ้ามี)
        const optionsTotal = i.options ? i.options.reduce((optSum, opt) => optSum + (opt.extraPrice || 0), 0) : 0;

        // 2. เอาราคาหลัก มารวมกับราคาออปชั่น แล้วค่อยไปคูณกับจำนวนจาน
        const itemTotalPrice = (i.price + optionsTotal) * i.quantity;

        return sum + itemTotalPrice;
    }, 0);

    // อัปเดตยอดกลับเข้า Table Order
    await Order.findByIdAndUpdate(orderId, { totalAmount: newTotal });
    return newTotal;
};

exports.deleteOrderItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await OrderItem.findById(itemId);
        if (!item) return res.status(404).json({ error: "ไม่พบรายการ" });

        const orderId = item.orderId;
        const tableId = item.tableId; // สมมติว่ามี tableId ใน item หรือหาจาก order

        // จังหวะที่ 3: ลบรายการทิ้งทันที
        await OrderItem.findByIdAndDelete(itemId);

        const remainingItems = await OrderItem.find({ orderId });

        // จังหวะที่ 4: ลบจนหมด
        if (remainingItems.length === 0) {
            const order = await Order.findById(orderId);
            if (order) {
                const currentTableId = order.tableId;
                await Order.findByIdAndDelete(orderId);

                // เช็คว่าเหลือออเดอร์อื่นในโต๊ะนี้ไหม (เผื่อมีหลายบิล)
                const otherOrders = await Order.find({ tableId: currentTableId, status: { $ne: 'paid' } });
                if (otherOrders.length === 0) {
                    await Table.findByIdAndUpdate(currentTableId, { table_status: 'available' });
                }

                // 🎯 ดึงตัวเลือกเสริมมาต่อท้ายชื่อเมนู (ถ้ามี)
                const deleteOptionsStr = item.options && item.options.length > 0
                    ? ` (${item.options.map(o => o.label).join(', ')})`
                    : '';

                const generalDeleteMsg = `
🛑 *รายการอาหารโดนลบ!*
🪑 *โต๊ะ:* โต๊ะ ${order.table_name}
🍲 *เมนู:* ${item.name}${deleteOptionsStr} x${item.quantity}
            `.trim();

                // สั่งส่งเข้าไลน์แชททั่วไป
                sendTelegramNotification('general', generalDeleteMsg);
            }
        } else {
            // จังหวะที่ 3: Recalculate เงินใหม่
            await recalculateOrder(orderId);
        }
        res.json({ message: "ลบรายการเรียบร้อย" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.closeOrder = async (req, res) => {
    try {
        const { tableId } = req.params; // ID ที่ส่งมาจากหน้าบ้าน
        const { paymentMethod, discount, discountAmount, cashReceived, changeGiven, customerName, shift, totalAmount } = req.body;

        // 🎯 1. แก้ไขตรงนี้: เพิ่ม 'printing' และ 'printed' เข้าไปในสเตตัสค้นหา เพื่อไม่ให้บิลค้างพิมพ์หลุดคิว 404
        let activeOrders = await Order.find({
            _id: tableId,
            status: { $in: ['draft', 'pending', 'printing', 'printed'] }
        });

        // 🎯 2. แก้ไขตรงนี้ด้วยเหมือนกัน: เพิ่ม 'printing' และ 'printed' ตอนค้นหาจาก ID โต๊ะ
        if (activeOrders.length === 0) {
            activeOrders = await Order.find({
                tableId,
                status: { $in: ['draft', 'pending', 'printing', 'printed'] }
            });
        }

        // หากหาทุกทางแล้วยังไม่เจอ ค่อยส่ง 404
        if (activeOrders.length === 0) return res.status(404).json({ error: "ไม่มียอดค้าง" });

        const orderIds = activeOrders.map(o => o._id);
        const allItems = await OrderItem.find({ orderId: { $in: orderIds } });
        const masterOrder = activeOrders[0];

        // โครงสร้างดั้งเดิมของพี่อลิส: สร้าง Snapshot สำหรับเก็บใน Order
        const snapshotItems = allItems.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            options: i.options,
            note: i.note,
            status: 'paid'
        }));

        await Order.findByIdAndUpdate(masterOrder._id, {
            status: 'paid',
            paymentMethod,
            discount,
            discountAmount,
            cashReceived,
            changeGiven,
            cashierName: customerName,
            items: snapshotItems,
            totalAmount,
            shift: shift || masterOrder.shift || 'error',
            closedAt: new Date()
        });

        // เปลี่ยนสถานะ Item เป็น paid ทั้งหมด เพื่อทำ Report รายเมนูของพี่
        await OrderItem.updateMany(
            { orderId: { $in: orderIds } },
            { status: 'paid', orderId: masterOrder._id, updatedAt: new Date() }
        );

        // 🎯 3. แก้ไขตรงนี้ด้วยครับ: ตอนเคลียร์บิลรองที่อาจจะค้างอยู่ ให้รวมลบสถานะ printing และ printed ออกไปด้วย จะได้ไม่ค้างคาโต๊ะ
        await Order.deleteMany({
            tableId: masterOrder.tableId,
            _id: { $ne: masterOrder._id },
            status: { $in: ['draft', 'pending', 'printing', 'printed'] }
        });

        // ปลุกโต๊ะอาหารให้กลับมาว่างพร้อมใช้งาน
        await Table.findByIdAndUpdate(masterOrder.tableId, { table_status: 'available' });

        // =========================================================
        // 🚀 🛠️ ส่วนส่งแจ้งเตือน TELEGRAM NOTIFICATION (เพิ่มแสดง Option)
        // =========================================================
        try {
            // 1. ดึงรายการอาหารทั้งหมดมาจัด List + แสดง Options (ถ้ามี)
            const itemsList = allItems.map(item => {
                const optionsStr = item.options && item.options.length > 0
                    ? ` (${item.options.map(o => o.label).join(', ')})`
                    : '';
                return `- ${item.name}${optionsStr} x${item.quantity}`;
            }).join('\n');

            // 2. ดึงเฉพาะรายการที่เคยแก้ไขมาจัด List + แสดง Options (ถ้ามี)
            const editedItems = allItems.filter(item => item.isEdited || item.printCount > 0);
            const editedList = editedItems.length > 0
                ? editedItems.map(item => {
                    const optionsStr = item.options && item.options.length > 0
                        ? ` (${item.options.map(o => o.label).join(', ')})`
                        : '';
                    return `- ${item.name}${optionsStr} x${item.quantity}`;
                }).join('\n')
                : '- ไม่มีรายการแก้ไข';

            // 3. ประกอบข้อความสั้น กระชับตามสั่ง
            const checkoutMsg = `
🔔 *เช็คบิลปิดโต๊ะ*
📍 *โต๊ะ:* โต๊ะ ${masterOrder.table_name || 'ทั่วไป'}
💳 *ชำระโดย:* ${paymentMethod === 'cash' ? 'เงินสด' : 'โอน'}
💰 *จำนวนเงินรวม:* ${totalAmount?.toLocaleString()}.- บาท

📦 *[ รายการอาหาร ]*
${itemsList}

⚠️ *[ ออเดอร์ที่เคยแก้ ]*
${editedList}
`.trim();

            // 4. ส่งออกไปที่ห้องแชทเช็คบิล
            sendTelegramNotification('checkout', checkoutMsg);
        } catch (telegramErr) {
            console.error('❌ แจ้งเตือน Telegram เช็คบิลพลาด:', telegramErr.message);
        }
        // =========================================================


        res.json({ message: "เช็คบิลสำเร็จ" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
