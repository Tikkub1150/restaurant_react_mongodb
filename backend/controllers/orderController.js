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

exports.upsertOrder = async (req, res) => {
    try {
        const { tableId, items, table_name, totalAmount, tableNote, shift } = req.body;
        if (!tableId) return res.status(400).json({ error: "ต้องมี tableId" });

        // ค้นหาออเดอร์เดิมที่ยังไม่ปิดบิล
        let order = await Order.findOne({ tableId, status: { $in: ['draft', 'pending'] } });

        if (order) {
            // --- จังหวะแก้ไขออเดอร์ ---
            // 1. อัปเดตข้อมูลบิลหลัก (Table Orders) ปกติ
            order.status = 'draft'; // Force กลับเป็น draft เพื่อรอพิมพ์ใหม่
            order.tableNote = tableNote || order.tableNote;
            order.totalAmount = totalAmount;
            await order.save();

            // 2. ลบของเก่าออกโดยใช้ _id (เฉพาะตัวที่ส่งมาจากหน้าบ้านว่าเคยมีอยู่)
            const oldIds = items.filter(i => i._id).map(i => i._id);
            if (oldIds.length > 0) {
                await OrderItem.deleteMany({ _id: { $in: oldIds } });
            }

            // 3. เตรียมข้อมูลใหม่ (ลบ _id เดิมออก) และจัดการสถานะ
            const newItemsToInsert = items.map(item => {
                let finalStatus = 'pending';

                return {
                    ...item,
                    _id: undefined,      // ✅ ลบ ID เก่าออกตามที่พี่บอก เพื่อให้ DB เจนใหม่
                    orderId: order._id,  // ผูก ID บิลเดิม
                    status: finalStatus,  // เซตสถานะใหม่ pending
                    categoryName: item.categoryName,
                };
            });

            // 4. Insert ข้อมูลใหม่ทั้งหมดเข้าไปเลย
            if (newItemsToInsert.length > 0) {
                await OrderItem.insertMany(newItemsToInsert);
            }



        } else {
            // --- จังหวะสร้างออเดอร์ใหม่ครั้งแรก ---
            order = await Order.create({ tableId, table_name, status: 'draft', totalAmount, tableNote, shift });
            const initialItems = items.map(i => ({
                ...i,
                _id: undefined,
                orderId: order._id,
                status: 'pending',
                shift: shift || 'error',
                categoryName: i.categoryName,
            }));
            await OrderItem.insertMany(initialItems);
        }

        // อัปเดตสถานะโต๊ะ
        await Table.findByIdAndUpdate(tableId, { table_status: 'occupied' });

        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ แก้ไขรายการเดิม (PUT /api/orders/item/:itemId)
// ในไฟล์ orderController.js (ส่วนที่อัปเดตไอเทม)
// ✅ แก้ไขรายการอาหารรายตัว (รวมลอจิก printCount)
exports.updateOrderItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity, note, options, price, name, isEdited, categoryName, isPrinted } = req.body;

        // 1. หาข้อมูลเดิมในฐานข้อมูลก่อนโดนอัปเดตทับ
        const oldItem = await OrderItem.findById(itemId);
        if (!oldItem) return res.status(404).json({ error: "ไม่พบรายการอาหารนี้" });

        const updatePayload = {
            quantity,
            note,
            options,
            price,
            name,
            status: 'pending',
            categoryName: categoryName,
            isEdited: isEdited,
            isPrinted: isPrinted || ''
        };


        // updatePayload.isEdited = true;
        // สร้าง Object เก็บประวัติของเก่า ณ วินาทีก่อนโดนเซฟทับ เอาไว้ส่งให้ปริ้นเตอร์ทำรอยขีดฆ่า
        if (!isPrinted) {
            updatePayload.isPrinted = oldItem.isPrinted; // ถ้ายังไม่เคยพิมพ์มาก่อน ให้คงสถานะเดิมไว้ (ปกติจะเป็น false)
        }
        updatePayload.oldVersion = {
            name: oldItem.name,
            quantity: oldItem.quantity,
            note: oldItem.note || '',
            categoryName: oldItem.categoryName || '',
            options: oldItem.options && oldItem.options.length > 0
                ? oldItem.options.map(o => o.label).join(', ')
                : ''

        };

        // 2. อัปเดตข้อมูลใหม่ทับลงไป (พร้อมเก็บข้อมูลเก่าไว้ในฟาร์มข้อมูลเรียบร้อย)
        const updatedItem = await OrderItem.findByIdAndUpdate(
            itemId,
            { $set: updatePayload },
            { returnDocument: 'after' }
        );

        // 3. คำนวณยอดรวมบิลใหม่ (Recalculate) ตามปกติ
        const allItems = await OrderItem.find({ orderId: updatedItem.orderId });
        const newTotal = allItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        await Order.findByIdAndUpdate(updatedItem.orderId, { totalAmount: newTotal });

        res.json(updatedItem);
    } catch (err) {
        console.error("Update Item Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// ✅ เพิ่มรายการใหม่เข้าบิลเดิม (POST /api/orders/item/add)
exports.addOrderItem = async (req, res) => {
    try {
        const newItem = await OrderItem.create({
            ...req.body,
            status: 'pending' // ของใหม่ต้องเป็น pending เสมอ
        });
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

exports.confirmOrderPrinting = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "ไม่พบออเดอร์" });

        // ดึงรายการอาหารเฉพาะตัวที่ค้างพิมพ์ (status: 'pending')
        const pendingItems = await OrderItem.find({
            orderId: orderId,
            status: 'pending'
        });

        if (pendingItems.length === 0) {
            return res.status(400).json({ error: "ไม่มีรายการอาหารที่รอพิมพ์ในออเดอร์นี้" });
        }

        // อัปเดตสถานะบิลและไอเทมชั่วคราวเป็น 'printing'
        order.status = 'printing';
        await order.save();

        const pendingItemIds = pendingItems.map(item => item._id);
        await OrderItem.updateMany(
            { _id: { $in: pendingItemIds } },
            { $set: { status: 'printing', isPrinted: true } }
        );

        const printServerUrl = 'http://127.0.0.1:8000/print-order';
        const printPromises = [];

        // แยกกลุ่มตั๋วปกติ (ไอเทมใหม่)
        const normalItemsByPrinter = {};

        pendingItems.forEach(item => {
            // 🎯 1. ดักจับค่าว่าง: ถ้าสินค้าชิ้นนี้ไม่มีการระบุเครื่องพิมพ์ ให้ข้าม (skip)
            if (!item.printer_name || item.printer_name.trim() === "") return;
            let printerName = item.printer_name || 'POS-80C1';

            const optionLabels = item.options && item.options.length > 0
                ? item.options.map(o => o.label).join(', ')
                : '';

            const itemPayload = {
                itemId: item._id.toString(),
                menu_name: item.name,
                quantity: item.quantity,
                option_name: optionLabels,
                comment: item.note || '',
                old_version: null
            };

            // 🎯 เช็คไอเทมที่มีการแก้ไข (isPrinted === true) -> ตัดแยกกระดาษยิงเดี่ยวทันที
            if (item.isPrinted && item.oldVersion) {
                itemPayload.old_version = {
                    name: item.oldVersion.name,
                    quantity: item.oldVersion.quantity,
                    note: item.oldVersion.note,
                    options: item.oldVersion.options
                };

                const modifiedPayload = {
                    orderId: orderId,
                    printer_name: printerName,
                    table_name: `[แก้ไข] ${order.table_name || 'ไม่ระบุโต๊ะ'}`,
                    temp_table_name: order.tableNote ? `( ${order.tableNote} )` : '',
                    date_create: new Date(order.createdAt).toLocaleString('th-TH', { hour12: false }),
                    orders: [itemPayload]
                };
                printPromises.push(axios.post(printServerUrl, modifiedPayload, { timeout: 5000 }));
            } else {
                if (!normalItemsByPrinter[printerName]) {
                    normalItemsByPrinter[printerName] = [];
                }
                normalItemsByPrinter[printerName].push(itemPayload);
            }
        });

        // 🎯=========================================🎯
        // 🎯 เริ่มแทรกลอจิก สรุปรายการอาหารข้ามหมวดหมู่ (ดึงค่าจาก .env)
        // 🎯=========================================🎯
        const targetPrinter = process.env.SYNC_PRINTER_NAME || 'POS-80C1';
        const triggerCat = process.env.SYNC_CATEGORY_MAIN || 'ต้ม';

        // 1. ดึงค่าหมวดเสริมจาก env แล้วสับออกเป็นก้อนๆ เช่น ['ราดข้าว', 'กับข้าว']
        const subCategoriesEnv = process.env.SYNC_CATEGORY_SUB || 'ราดข้าว,กับข้าว';
        const targetCategories = subCategoriesEnv.split(',').map(cat => cat.trim());

        // 2. เช็คว่ามีหมวดหลัก (ต้ม) ไหม และกรองเอาไอเทมเฉพาะที่อยู่ในหมวดเสริมออกมา
        const hasTriggerCat = pendingItems.some(item => item.categoryName === triggerCat);
        const targetCatItems = pendingItems.filter(item => targetCategories.includes(item.categoryName));

        if (hasTriggerCat && targetCatItems.length > 0) {
            // 3. 🔄 วนลูปรวมจำนวนจานสะสมแยกตามหมวดหมู่ เช่น { "ราดข้าว": 2, "กับข้าว": 1 }
            const categoryCounts = {};
            targetCatItems.forEach(item => {
                const catName = item.categoryName;
                categoryCounts[catName] = (categoryCounts[catName] || 0) + item.quantity;
            });

            // 4. แปลง Object มาวนลูปต่อกันเป็นข้อความบอกจำนวน เช่น "ราดข้าว 2, กับข้าว 1"
            const summaryText = Object.entries(categoryCounts)
                .map(([catName, totalQty]) => `${catName} ${totalQty}`)
                .join(', ');

            // สร้าง Array เตรียมไว้กรณีที่ตั๋วยังไม่มีใน Printer นั้น
            if (!normalItemsByPrinter[targetPrinter]) {
                normalItemsByPrinter[targetPrinter] = [];
            }

            // 5. ยัดไส้เป็นไอเทมปลอมลงไปต่อท้ายใบ (ปรับ quantity เป็น 1 เพื่อไม่ให้ยอดรวมเพี้ยน)
            normalItemsByPrinter[targetPrinter].push({
                itemId: "summary_" + Date.now(),
                menu_name: `📌📌 [รอออกพร้อมกัน] 📌📌`,
                quantity: 999,
                option_name: summaryText, // สรุปยอดจะโผล่ตรงนี้: "ราดข้าว 2, กับข้าว 1"
                comment: "",
                old_version: null
            });
        }
        // 🎯=========================================🎯
        // 🎯 สิ้นสุดลอจิกพิเศษ
        // 🎯=========================================🎯

        // เอากลุ่มตั๋วปกติมายิงต่อคิว
        Object.keys(normalItemsByPrinter).forEach(printerName => {
            if (normalItemsByPrinter[printerName].length > 0) {
                const normalPayload = {
                    orderId: orderId,
                    printer_name: printerName,
                    table_name: order.table_name || 'ไม่ระบุโต๊ะ',
                    temp_table_name: order.tableNote ? `( ${order.tableNote} )` : '',
                    date_create: new Date(order.createdAt).toLocaleString('th-TH', { hour12: false }),
                    orders: normalItemsByPrinter[printerName]
                };
                printPromises.push(axios.post(printServerUrl, normalPayload, { timeout: 5000 }));
            }
        });

        // ยิงหา Python ขนานกันทั้งหมด
        await Promise.all(printPromises);

        // อัปเดตสถานะปลายทางเป็น printed และบวกค่าพิมพ์สะสม
        order.status = 'printed';
        await order.save();

        const updatePromises = pendingItems.map(item => {
            const updateFields = { status: 'printed' };
            return OrderItem.findByIdAndUpdate(item._id, {
                $set: updateFields,
            });
        });
        await Promise.all(updatePromises);

        res.json({
            message: "ส่งข้อมูลแยกตั๋วพิมพ์เรียบร้อยแล้ว!",
            status: "printed"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ฟังก์ชันสำหรับอัปเดตหมายเหตุโต๊ะทันทีเมื่อกดปุ่มพิมพ์บิล (ฉบับกระชับตาม ID ออเดอร์)
exports.updateTableNoteOnly = async (req, res) => {
    try {
        const { orderId } = req.params; // รับ orderId ตรงๆ จากหน้าบ้าน
        const { tableNote } = req.body;
        // ค้นหาและอัปเดตหมายเหตุเข้าตัวออเดอร์ ID นี้โดยตรง บรรทัดเดียวจบ
        await Order.findByIdAndUpdate(orderId, { $set: { tableNote: tableNote || "" } });

        res.json({ message: "อัปเดตหมายเหตุโต๊ะเรียบร้อย" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. ฟังก์ชัน Callback: อัปเดต "เฉพาะ" รายการอาหารย่อย (OrderItem) เท่านั้น บิลหลักไม่ต้องยุ่ง
exports.handlePythonPrintCallback = async (req, res) => {
    try {
        const { itemIds } = req.body; // รับแค่ itemIds มาทำงานพอ (ไม่ต้องใช้ orderId แล้ว)

        // 🚨 [จุดแก้ไขหลักที่ 2] อัปเดตเฉพาะ OrderItem ที่พิมพ์ออกจริง ให้เป็น 'printed'
        // และสะสมยอด printCount เพิ่มขึ้น 1 ครั้ง (ไม่มีลอจิกการอัปเดต Order ตัวแม่แล้ว)
        await OrderItem.updateMany(
            {
                _id: { $in: itemIds },
                status: 'printing' // ป้องกันการอัปเดตทับซ้อน
            },
            {
                $set: { status: 'printed' },
                $inc: { printCount: 1 }
            }
        );

        console.log(`[Python Callback] พิมพ์สำเร็จ อัปเดตสถานะ OrderItem เป็น printed แล้ว:`, itemIds);
        res.json({ status: "success", message: "อัปเดตสถานะรายการอาหารย่อยเรียบร้อยแล้ว" });

    } catch (err) {
        console.error("Callback Update Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { shift, date } = req.query;
        let filter = { status: 'paid' };
        if (shift) filter.shift = shift;
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.closedAt = { $gte: start, $lte: end };
        }
        const orders = await Order.find(filter).sort({ closedAt: -1 }).lean();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};