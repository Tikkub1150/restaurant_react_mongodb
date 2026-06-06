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

        // 🎯 ดึงข้อมูลโต๊ะเพื่อเอา zone มาใช้งาน
        const table = await Table.findById(tableId);
        let zone = 'main'; // ค่าเริ่มต้น
        if (table && table.display && table.display.zone) {
            // เช็คและแปลงชื่อให้ตรงกับ Enum ใน Order Schema
            zone = table.display.zone === 'Main' ? 'main' : table.display.zone;
        }

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

        // โครงสร้างดั้งเดิม: สร้าง Snapshot สำหรับเก็บใน Order
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
            zone: zone, // 📌 บันทึก zone ลงออเดอร์
            closedAt: new Date()
        });

        // เปลี่ยนสถานะ Item เป็น paid ทั้งหมด เพื่อทำ Report รายเมนู
        await OrderItem.updateMany(
            { orderId: { $in: orderIds } },
            { status: 'paid', orderId: masterOrder._id, updatedAt: new Date() }
        );

        // 🎯 3. เคลียร์บิลรองที่อาจจะค้างอยู่ ให้รวมลบสถานะ printing และ printed ออกไปด้วย จะได้ไม่ค้างคาโต๊ะ
        await Order.deleteMany({
            tableId: masterOrder.tableId,
            _id: { $ne: masterOrder._id },
            status: { $in: ['draft', 'pending', 'printing', 'printed'] }
        });

        // ปลุกโต๊ะอาหารให้กลับมาว่างพร้อมใช้งาน
        await Table.findByIdAndUpdate(masterOrder.tableId, { table_status: 'available' });

        // =========================================================
        // 🚀 🛠️ ส่วนส่งแจ้งเตือน TELEGRAM NOTIFICATION (HTML MODE ปลอดภัย 100%)
        // =========================================================
        try {
            // ฟังก์ชันช่วยจัดการล้างอักขระพิเศษของ HTML เพื่อความปลอดภัยป้องกันบอทเออร์เรอร์
            const escapeHTML = (str) => {
                if (!str) return '';
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            };

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

            // 3. ประกอบข้อความด้วยแท็ก HTML สวยงามและไม่บั๊กง่าย
            const paymentLabels = {
                cash: 'เงินสด 💵',
                promptpay: 'โอนเงิน (PromptPay) 📱',
                truemoney: 'TrueMoney Wallet 🧡',
                goverment: 'โครงการรัฐ 🇹🇭',
                lineman: 'Line Man 🛵'
            };

            const checkoutMsg = `
🔔 <b>เช็คบิล</b> 📍 <b>โต๊ะ:</b> ${escapeHTML(masterOrder.table_name || 'ทั่วไป')}
💳 <b>ชำระโดย:</b> ${paymentLabels[paymentMethod] || 'ไม่ระบุ'}
💰 <b>จำนวนเงินรวม:</b> ${totalAmount?.toLocaleString()}.- บาท

📦 <b>[ รายการอาหาร ]</b>
${escapeHTML(itemsList)}

⚠️ <b>[ ออเดอร์ที่เคยแก้ ]</b>
${escapeHTML(editedList)}
`.trim();

            // 4. ส่งออกไปที่ห้องแชทเช็คบิล (ภายในฟังก์ชันส่ง telegramService ต้องมั่นใจว่าใช้ parse_mode: 'HTML')
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

// 📌 ฟังก์ชันใหม่สำหรับแยกบิลจ่ายโดยเฉพาะ
exports.splitCheckout = async (req, res) => {
    try {
        const { tableId } = req.params;
        const { itemIds, splitTotalAmount, paymentMethod, discount, discountAmount, cashReceived, changeGiven, customerName, shift } = req.body;

        // 1. ค้นหาออเดอร์หลักที่ยังเปิดอยู่ของโต๊ะนี้
        const activeOrder = await Order.findOne({
            tableId,
            status: { $in: ['draft', 'pending', 'printing', 'printed'] }
        });

        if (!activeOrder) return res.status(404).json({ error: "ไม่พบออเดอร์หลักที่กำลังเปิดอยู่" });

        // 🎯 ดึงข้อมูลโต๊ะเพื่อเอา zone มาใช้งาน
        const table = await Table.findById(tableId);
        let zone = 'main'; // ค่าเริ่มต้น
        if (table && table.display && table.display.zone) {
            zone = table.display.zone === 'Main' ? 'main' : table.display.zone;
        }

        // 2. ค้นหารายการอาหารเฉพาะตัวที่ลูกค้าเลือกแยกบิล
        const splitItems = await OrderItem.find({ _id: { $in: itemIds } });
        if (splitItems.length === 0) return res.status(400).json({ error: "ไม่พบรายการอาหารที่ต้องการแยกบิล" });

        // 3. สร้าง Snapshot ของรายการอาหารเพื่อบันทึกประวัติลงบิลใหม่
        const snapshotItems = splitItems.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            options: i.options,
            note: i.note,
            status: 'paid'
        }));

        // 4. สร้างออเดอร์ "ใบใหม่" สำหรับการแยกบิลครั้งนี้ (สถานะ Paid ทันที)
        const splitOrder = await Order.create({
            tableId: activeOrder.tableId,
            table_name: `${activeOrder.table_name} (แยกบิล)`, // เติมคำว่าแยกบิลให้รู้ตอนดู Report
            status: 'paid',
            paymentMethod,
            discount,
            discountAmount,
            cashReceived,
            changeGiven,
            cashierName: customerName,
            items: snapshotItems,
            totalAmount: splitTotalAmount,
            shift: shift || activeOrder.shift || 'error',
            zone: zone, // 📌 บันทึก zone ลงออเดอร์แยกบิลตรงนี้
            closedAt: new Date()
        });

        // 5. อัปเดตรายการอาหารที่แยกออกมา ให้ผูกกับออเดอร์ใบใหม่ และเปลี่ยนเป็น Paid
        await OrderItem.updateMany(
            { _id: { $in: itemIds } },
            { $set: { status: 'paid', orderId: splitOrder._id, updatedAt: new Date() } }
        );

        // 6. เช็คว่าบิลหลักเหลือรายการอาหารอีกไหม
        const remainingItems = await OrderItem.find({
            orderId: activeOrder._id,
            status: { $ne: 'paid' }
        });

        if (remainingItems.length === 0) {
            // ถ้าไม่เหลือแล้ว = โต๊ะว่าง ลบบิลหลักทิ้งและคืนโต๊ะ
            await Order.findByIdAndDelete(activeOrder._id);
            await Table.findByIdAndUpdate(activeOrder.tableId, { table_status: 'available' });
        } else {
            // ถ้ายังมีของเหลือ ให้คำนวณยอดรวมของบิลหลักใหม่ (Recalculate)
            const newTotal = remainingItems.reduce((sum, i) => {
                const optionsTotal = i.options ? i.options.reduce((optSum, opt) => optSum + (opt.extraPrice || 0), 0) : 0;
                return sum + ((i.price + optionsTotal) * i.quantity);
            }, 0);
            await Order.findByIdAndUpdate(activeOrder._id, { totalAmount: newTotal });
        }

        res.json({
            message: "แยกบิลสำเร็จ",
            splitOrderId: splitOrder._id,
            remainingItemsCount: remainingItems.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};