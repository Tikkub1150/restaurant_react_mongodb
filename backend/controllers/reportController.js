require('dotenv').config();
const axios = require('axios');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Table = require('../models/Table');

exports.getMonthlyReport = async (req, res) => {
    try {
        const { year, month } = req.query;
        const targetYear = parseInt(year) || new Date().getFullYear();

        let startDate, endDate, dateFormat;

        // 🔄 เช็กโหมด: ถ้าส่งเดือนมา = รายวัน / ถ้าเดือนเป็นค่าว่าง = รายเดือนทั้งปี
        if (month && month !== "") {
            const targetMonth = parseInt(month);
            startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
            endDate = new Date(Date.UTC(targetYear, targetMonth, 1));
            dateFormat = "%Y-%m-%d";
        } else {
            startDate = new Date(Date.UTC(targetYear, 0, 1));
            endDate = new Date(Date.UTC(targetYear + 1, 0, 1));
            dateFormat = "%Y-%m";
        }

        const report = await Order.aggregate([
            {
                $match: {
                    status: 'paid',
                    closedAt: { $gte: startDate, $lt: endDate }
                }
            },
            // 🎯 จุดสำคัญที่ผมลืมใส่! ต้องแปลง _id เป็น String ก่อนเอาไป Lookup
            { $addFields: { orderIdString: { $toString: "$_id" } } },
            {
                $lookup: {
                    from: "orderitems",
                    localField: "orderIdString", // เปลี่ยนมาใช้ฟิลด์ที่แปลงเป็น String แล้ว
                    foreignField: "orderId",
                    as: "detailedItems"
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$closedAt", timezone: "Asia/Bangkok" } },

                    morningNet: { $sum: { $cond: [{ $eq: ["$shift", "morning"] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    morningCash: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "morning"] }, { $eq: ["$paymentMethod", "cash"] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    morningTruemoney: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "morning"] }, { $in: ["$paymentMethod", ["truemoney", "Truemoney", "โอน"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    morningPromptpay: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "morning"] }, { $in: ["$paymentMethod", ["promptpay", "Promptpay", "โอน"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    morningLineman: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "morning"] }, { $in: ["$paymentMethod", ["lineman", "LINEMAN"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    morningGoverment: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "morning"] }, { $in: ["$paymentMethod", ["goverment", "GOVERMENT"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },

                    afternoonNet: { $sum: { $cond: [{ $eq: ["$shift", "afternoon"] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    afternoonCash: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "afternoon"] }, { $eq: ["$paymentMethod", "cash"] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    afternoonTruemoney: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "afternoon"] }, { $in: ["$paymentMethod", ["truemoney", "Truemoney", "โอน"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    afternoonPromptpay: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "afternoon"] }, { $in: ["$paymentMethod", ["promptpay", "Promptpay", "โอน"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    afternoonLineman: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "afternoon"] }, { $in: ["$paymentMethod", ["lineman", "LINEMAN"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    afternoonGoverment: { $sum: { $cond: [{ $and: [{ $eq: ["$shift", "afternoon"] }, { $in: ["$paymentMethod", ["goverment", "GOVERMENT"]] }] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },

                    totalNet: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] } },
                    cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    truemoneyTotal: { $sum: { $cond: [{ $in: ["$paymentMethod", ["truemoney", "Truemoney", "โอน"]] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    promptpayTotal: { $sum: { $cond: [{ $in: ["$paymentMethod", ["promptpay", "Promptpay", "โอน"]] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    linemanTotal: { $sum: { $cond: [{ $in: ["$paymentMethod", ["lineman", "LINEMAN"]] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    govermentTotal: { $sum: { $cond: [{ $in: ["$paymentMethod", ["goverment", "GOVERMENT"]] }, { $subtract: ["$totalAmount", { $ifNull: ["$discountAmount", 0] }] }, 0] } },
                    totalBills: { $sum: 1 },
                    totalItems: { $sum: { $size: "$detailedItems" } },
                    discountOrders: {
                        $push: {
                            $cond: [
                                { $gt: [{ $ifNull: ["$discountAmount", 0] }, 0] },
                                {
                                    order_id: "$_id",               // 👈 เพิ่ม _id ตรงนี้
                                    cashierName: "$cashierName",
                                    discount: "$discount",
                                    discountAmount: "$discountAmount",
                                    totalAmount: "$totalAmount",
                                    shift: "$shift"
                                },
                                "$$REMOVE"
                            ]
                        }
                    },
                    allOrderItems: {
                        $push: {
                            table_name: "$table_name",       // 👈 1. เพิ่มบรรทัดนี้
                            paymentMethod: "$paymentMethod", // 👈 2. เพิ่มบรรทัดนี้
                            totalAmount: "$totalAmount",
                            items: "$detailedItems", // รอบนี้ข้อมูลมาเต็ม 100% แน่นอน
                            shift: "$shift",
                            order_id: "$_id",
                            closedAt: "$closedAt"
                        }
                    },
                    orderTimes: {
                        $push: {
                            closedAt: "$closedAt",
                            shift: "$shift",
                            // 🎯 แก้เป็น detailedItems เพื่อให้บวกจำนวนจานที่สั่งมาทั้งหมดในบิลนั้นได้เป๊ะๆ
                            totalItems: { $sum: "$detailedItems.quantity" }
                        }
                    }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};