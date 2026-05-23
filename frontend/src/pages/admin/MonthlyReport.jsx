import React, { useState, useEffect } from 'react';
import axios from 'axios';

const apiBaseUrl = process.env.REACT_APP_API_URL;

const MonthlyReport = () => {
    const [report, setReport] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    // 📊 ระบบ Popup แยกสถานะ
    const [selected, setSelected] = useState(null);
    const [popupShift, setPopupShift] = useState("all");
    const [showDiscountDetail, setShowDiscountDetail] = useState(false);

    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedItem, setExpandedItem] = useState(null);

    // 🔍 State ใหม่สำหรับฟีเจอร์กราฟแท่ง
    const [timeSlotDetail, setTimeSlotDetail] = useState(null);
    const [searchMenu, setSearchMenu] = useState("");

    // รีเซ็ตค่าต่างๆ เมื่อเปลี่ยนวัน หรือเปลี่ยนกะ
    useEffect(() => {
        setShowDiscountDetail(false);
        setExpandedCategory(null);
        setExpandedItem(null);
        setTimeSlotDetail(null);
        setSearchMenu("");
    }, [selected, popupShift]);

    // 🔄 ดึงข้อมูลรายงาน
    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await axios.get(`${apiBaseUrl}/api/orders/report/monthly`, {
                    params: { year, month: month || "" }
                });
                setReport(res.data);
            } catch (err) {
                console.error("Report Error:", err);
            }
        };
        fetchReport();
    }, [year, month]);

    const getDayInfo = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        return {
            dateNum: date.getDate(),
            dayName: days[date.getDay()],
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        };
    };

    const getPopupTitle = () => {
        if (popupShift === 'morning') return "☀️ ยอดขาย กะเช้า";
        if (popupShift === 'afternoon') return "🌤️ ยอดขาย กะบ่าย";
        return "💰 ยอดขาย รวมทั้งหมด";
    };

    const getDisplayMetrics = () => {
        if (!selected) return { net: 0, cash: 0, transfer: 0, lineman: 0 };
        if (popupShift === 'morning') {
            return {
                net: selected.morningNet || 0,
                cash: selected.morningCash || 0,
                transfer: selected.morningTransfer || 0,
                lineman: selected.morningLineman || 0
            };
        }
        if (popupShift === 'afternoon') {
            return {
                net: selected.afternoonNet || 0,
                cash: selected.afternoonCash || 0,
                transfer: selected.afternoonTransfer || 0,
                lineman: selected.afternoonLineman || 0
            };
        }
        return {
            net: selected.totalNet || 0,
            cash: selected.cashTotal || 0,
            transfer: selected.transferTotal || 0,
            lineman: selected.linemanTotal || 0
        };
    };

    const metrics = getDisplayMetrics();
    const info = (month && selected) ? getDayInfo(selected._id) : null;

    // 📊 ฟังก์ชันคำนวณข้อมูลกราฟแท่งคู่ (รองรับการกรองชื่อเมนู)
    const getChartData = () => {
        if (!selected || !selected.orderTimes) return [];

        const filteredOrders = selected.orderTimes.filter(o => popupShift === 'all' || o.shift === popupShift);
        const timeMap = {};
        const searchTerm = searchMenu.toLowerCase().trim();

        // ⏱️ ดึงค่าจาก env ถ้าไม่มีให้ Default เป็น 60 นาที (1 ชั่วโมง)
        const interval = parseInt(process.env.REACT_APP_CHART_INTERVAL_MINUTES) || 60;

        filteredOrders.forEach((order) => {
            if (!order.closedAt) return;

            const correspondingGroup = selected.allOrderItems?.find(g => g.closedAt === order.closedAt);
            const items = correspondingGroup?.items || [];

            const matchingItems = searchTerm !== ""
                ? items.filter(item => {
                    const nameMatch = item.name?.toLowerCase().includes(searchTerm);
                    const optMatch = item.options?.some(o => o.label.toLowerCase().includes(searchTerm));
                    return nameMatch || optMatch;
                })
                : items;

            const d = new Date(order.closedAt);
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes();

            // 🕒 คำนวณปัดเศษเวลาอัตโนมัติตาม env
            let timeKey = "";
            if (interval >= 60) {
                timeKey = `${h}:00`;
            } else {
                const roundedM = Math.floor(m / interval) * interval;
                timeKey = `${h}:${roundedM.toString().padStart(2, '0')}`;
            }

            if (!timeMap[timeKey]) {
                timeMap[timeKey] = { time: timeKey, bills: 0, items: 0 };
            }

            if (searchTerm === "") {
                timeMap[timeKey].bills += 1;
                timeMap[timeKey].items += items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            } else {
                if (matchingItems.length > 0) {
                    timeMap[timeKey].bills += 1;
                    timeMap[timeKey].items += matchingItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                }
            }
        });

        return Object.values(timeMap).sort((a, b) => a.time.localeCompare(b.time));
    };

    const chartData = getChartData();

    // 🎯 ฟังก์ชันเมื่อกดที่แท่งกราฟ เพื่อดูว่าสั่งอะไรเยอะสุด
    const handleBarClick = (timeKey) => {
        if (!selected.allOrderItems) return;

        const itemsInSlot = {};

        // ⏱️ ดึงค่าจาก env ตัวเดียวกัน
        const interval = parseInt(process.env.REACT_APP_CHART_INTERVAL_MINUTES) || 60;

        selected.allOrderItems.forEach(group => {
            if (!group.closedAt) return;
            if (popupShift !== 'all' && group.shift !== popupShift) return;

            const d = new Date(group.closedAt);
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes();

            // 🕒 คำนวณปัดเศษเวลาให้ตรงกับกราฟโดยใช้ env
            let currentSlotKey = "";
            if (interval >= 60) {
                currentSlotKey = `${h}:00`;
            } else {
                const roundedM = Math.floor(m / interval) * interval;
                currentSlotKey = `${h}:${roundedM.toString().padStart(2, '0')}`;
            }

            if (currentSlotKey === timeKey) {
                group.items.forEach(item => {
                    const searchTerm = searchMenu.toLowerCase().trim();
                    const nameMatch = item.name?.toLowerCase().includes(searchTerm);
                    const optMatch = item.options?.some(o => o.label.toLowerCase().includes(searchTerm));

                    if (searchTerm !== "" && !nameMatch && !optMatch) {
                        return;
                    }

                    const optStr = (item.options && item.options.length > 0)
                        ? ` (${item.options.map(o => o.label).join(', ')})`
                        : '';
                    const fullKey = `${item.name}${optStr}`;

                    if (!itemsInSlot[fullKey]) {
                        itemsInSlot[fullKey] = { name: item.name, options: optStr, qty: 0 };
                    }
                    itemsInSlot[fullKey].qty += (item.quantity || 0);
                });
            }
        });

        const sortedItems = Object.values(itemsInSlot).sort((a, b) => b.qty - a.qty);
        setTimeSlotDetail({ time: timeKey, items: sortedItems });
    };

    // 🧮 คำนวณยอดรวมรายได้ทั้งหมด และ นับจำนวนวันที่ขายจริง
    const summaryData = report.reduce((acc, day) => {
        acc.morningTotal += (day.morningNet || 0);
        acc.afternoonTotal += (day.afternoonNet || 0);
        acc.overallTotal += (day.totalNet || 0);

        // นับเป็นวันเปิดขายจริงเมื่อยอดรวมสุทธิประจำวันมากกว่า 0
        if ((day.totalNet || 0) > 0) {
            acc.activeDaysCount += 1;
        }
        return acc;
    }, { morningTotal: 0, afternoonTotal: 0, overallTotal: 0, activeDaysCount: 0 });

    // คำนวณยอดเฉลี่ยตามวันที่ขายจริง
    const avgMorning = summaryData.activeDaysCount > 0 ? summaryData.morningTotal / summaryData.activeDaysCount : 0;
    const avgAfternoon = summaryData.activeDaysCount > 0 ? summaryData.afternoonTotal / summaryData.activeDaysCount : 0;
    const avgOverall = summaryData.activeDaysCount > 0 ? summaryData.overallTotal / summaryData.activeDaysCount : 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-xs font-bold text-gray-900">
            {/* ส่วนหัวและตัวเลือกเดือน/ปี */}
            <div className="bg-white p-3 rounded-b-2xl border-b border-gray-200 shadow-2xs mb-3 sticky top-0 z-40">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-black tracking-tight text-gray-900">📊 รายงานยอดขายประจำเดือน/ปี</h2>
                </div>
                <div className="flex gap-2">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="flex-grow bg-gray-50 p-2 rounded-xl border border-gray-300 font-black outline-none text-center"
                    >
                        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y + 543}</option>)}
                    </select>

                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
                        className="flex-grow bg-gray-50 p-2 rounded-xl border border-gray-300 font-black outline-none text-center"
                    >
                        <option value="">🗓️ ทั้งปี (ดูรายเดือน)</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(2000, i).toLocaleString('th-TH', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ส่วนตารางรายงาน */}
            <div className="px-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                        <tr className="bg-gray-900 text-white text-center">
                            <th className="p-2 border border-gray-800 w-24">{month ? 'วันที่' : 'เดือน'}</th>
                            <th className="p-2 border border-gray-800 bg-amber-600/20 text-amber-500">☀️ เช้า</th>
                            <th className="p-2 border border-gray-800 bg-blue-600/10 text-blue-500">🌤️ บ่าย</th>
                            <th className="p-2 border border-gray-800 text-green-400">💰 รวม</th>
                        </tr>
                        </thead>
                        <tbody>
                        {report.map((day) => {
                            const dayInfo = month ? getDayInfo(day._id) : null;
                            return (
                                <tr key={day._id} className="border-b border-gray-200 hover:bg-gray-50/80 transition-colors">
                                    <td className={`p-2 text-center border-r font-black ${(month && dayInfo?.isWeekend) ? 'bg-red-50 text-red-600' : 'text-gray-700'}`}>
                                        {month ? (
                                            `${dayInfo?.dateNum} (${dayInfo?.dayName})`
                                        ) : (
                                            new Date(day._id + "-02").toLocaleString('th-TH', { month: 'long' })
                                        )}
                                    </td>
                                    <td onClick={() => { setSelected(day); setPopupShift("morning"); }} className="p-2 text-right border-r font-black text-amber-700 bg-amber-50/40 active:bg-amber-100 cursor-pointer">
                                        {day.morningNet > 0 ? `${day.morningNet.toLocaleString()}` : '-'}
                                    </td>
                                    <td onClick={() => { setSelected(day); setPopupShift("afternoon"); }} className="p-2 text-right border-r font-black text-blue-700 bg-blue-50/20 active:bg-blue-100 cursor-pointer">
                                        {day.afternoonNet > 0 ? `${day.afternoonNet.toLocaleString()}` : '-'}
                                    </td>
                                    <td onClick={() => { setSelected(day); setPopupShift("all"); }} className="p-2 text-right font-black text-green-600 bg-green-50/30 active:bg-green-100 cursor-pointer">
                                        {(day.totalNet || 0).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* 📊 ส่วนสรุปท้ายตาราง (แสดงเมื่อมีข้อมูล) */}
                        {report.length > 0 && (
                            <>
                                {/* 🛠️ แถวสรุปรวมรายได้ทั้งหมด */}
                                <tr className="bg-gray-100 font-black text-gray-900 border-t-2 border-gray-300">
                                    <td className="p-2 text-center border-r font-black bg-gray-200/70 text-gray-800">
                                        รวมทั้งหมด
                                    </td>
                                    <td className="p-2 text-right border-r font-black text-amber-800 bg-amber-100/40">
                                        {summaryData.morningTotal > 0 ? summaryData.morningTotal.toLocaleString() : '-'}
                                    </td>
                                    <td className="p-2 text-right border-r font-black text-blue-800 bg-blue-100/20">
                                        {summaryData.afternoonTotal > 0 ? summaryData.afternoonTotal.toLocaleString() : '-'}
                                    </td>
                                    <td className="p-2 text-right font-black text-green-700 bg-green-100/40 text-[12px]">
                                        {summaryData.overallTotal > 0 ? summaryData.overallTotal.toLocaleString() : '-'}
                                    </td>
                                </tr>

                                {/* 🛠️ แถวสรุปรายได้เฉลี่ยประจำวัน */}
                                <tr className="bg-gray-50 font-black text-gray-900 border-t border-gray-200">
                                    <td className="p-1.5 text-center border-r font-black bg-gray-100/50 text-gray-500 leading-tight">
                                        <div>รายได้เฉลี่ย</div>
                                        <div className="text-[8px] text-gray-400 font-bold">({summaryData.activeDaysCount} วันที่ขาย)</div>
                                    </td>
                                    <td className="p-2 text-right border-r font-black text-amber-600 bg-amber-50/20">
                                        {avgMorning > 0 ? Math.round(avgMorning).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-2 text-right border-r font-black text-blue-600 bg-blue-50/10">
                                        {avgAfternoon > 0 ? Math.round(avgAfternoon).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-2 text-right font-black text-green-600 bg-green-50/20">
                                        {avgOverall > 0 ? Math.round(avgOverall).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            </>
                        )}

                        {report.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-8 text-gray-400">ไม่มีข้อมูลบันทึกไว้ครับ 📭</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 📥 หน้าต่าง POPUP หลัก */}
            {selected && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-3 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100">

                        <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <span className="text-xs font-black tracking-wide text-amber-400 block">{getPopupTitle()}</span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {month ? (
                                        `ประจำวันที่ ${info?.dateNum} (${info?.dayName}) ${new Date(selected._id).toLocaleDateString('th-TH', {month: 'short', year: 'numeric'})}`
                                    ) : (
                                        `ประจำเดือน ${new Date(selected._id + "-02").toLocaleString('th-TH', {month: 'long', year: 'numeric'})}`
                                    )}
                                </span>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-white text-lg font-black px-2 active:scale-95">×</button>
                        </div>

                        <div className="p-4 bg-gray-50 space-y-3 overflow-y-auto flex-1 no-scrollbar">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-center">
                                <span className="text-[10px] text-gray-400 block mb-0.5">ยอดขายสุทธิ (หักส่วนลดแล้ว)</span>
                                <span className="text-xl font-black text-gray-950">
                                    {metrics.net.toLocaleString()} <span className="text-xs font-bold text-gray-500">บาท</span>
                                </span>
                                {(() => {
                                    const filteredDiscountOrders = (selected.discountOrders || []).filter(order => {
                                        if (popupShift === "all") return true;
                                        return order.shift === popupShift;
                                    });
                                    const totalDiscountGiven = filteredDiscountOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
                                    return (
                                        <>
                                            <div className="mt-1.5">
                                                <button onClick={() => setShowDiscountDetail(!showDiscountDetail)} className="text-[11px] font-bold text-red-500 hover:text-red-600 underline cursor-pointer active:opacity-70 transition-all inline-flex items-center gap-1">
                                                    {showDiscountDetail ? `🔼 ซ่อนรายละเอียดส่วนลด (-${totalDiscountGiven.toLocaleString()}.-)` : `📉 แสดงส่วนลด (-${totalDiscountGiven.toLocaleString()}.-)`}
                                                </button>
                                            </div>
                                            {showDiscountDetail && (
                                                filteredDiscountOrders.length === 0 ? (
                                                    <div className="text-center text-gray-400 py-2 text-[11px] mt-2 font-medium bg-gray-50 rounded-lg">ไม่มีรายการส่วนลด</div>
                                                ) : (
                                                    <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden bg-gray-50 text-[10px]">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                            <tr className="bg-gray-100 font-black text-gray-500 border-b border-gray-200">
                                                                <th className="p-1.5">คนลด (Cashier)</th>
                                                                <th className="p-1.5 text-center">ลด (%)</th>
                                                                <th className="p-1.5 text-right">ส่วนลด</th>
                                                                <th className="p-1.5 text-right">ยอดสุทธิ</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody className="font-bold text-gray-600 divide-y divide-gray-100">
                                                            {filteredDiscountOrders.map((order, index) => (
                                                                <tr key={index} className="bg-white hover:bg-gray-50/60 transition-colors">
                                                                    <td className="p-1.5 text-blue-600 text-left">{order.cashierName || 'ไม่ระบุชื่อ'}</td>
                                                                    <td className="p-1.5 text-center text-orange-500">{order.discount || 0}%</td>
                                                                    <td className="p-1.5 text-right text-red-500">-{order.discountAmount?.toLocaleString()}.-</td>
                                                                    <td className="p-1.5 text-right font-black text-gray-900">{order.totalAmount?.toLocaleString()}.-</td>
                                                                </tr>
                                                            ))}
                                                            <tr className="bg-red-50/50 font-black text-gray-800">
                                                                <td colSpan="2" className="p-1.5 text-right text-red-700">รวมส่วนลด:</td>
                                                                <td className="p-1.5 text-right text-red-600 underline decoration-double">{totalDiscountGiven.toLocaleString()}.-</td>
                                                                <td className="p-1.5 bg-white/40"></td>
                                                            </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">💵</span><span className="text-gray-500 font-bold">เงินสด</span>
                                    </div>
                                    <span className="font-black text-gray-900">{metrics.cash.toLocaleString()}.-</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">📱</span><span className="text-gray-500 font-bold">เงินโอน</span>
                                    </div>
                                    <span className="font-black text-blue-600">{metrics.transfer.toLocaleString()}.-</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">🛵</span><span className="text-gray-500 font-bold">Lineman</span>
                                    </div>
                                    <span className="font-black text-green-600">{metrics.lineman.toLocaleString()}.-</span>
                                </div>

                                {/* 🎯 ส่วนการเจาะลึกอาหารขายดีประจำช่วงเวลา */}
                                <div className="mt-4 pt-3 border-t border-dashed border-gray-200 text-left w-full">
                                    <span className="text-[10px] text-gray-400 block mb-2 font-black uppercase tracking-wider">
                                        📊 จำนวนจานแยกตามหมวดหมู่
                                    </span>

                                    {(() => {
                                        const rawItemsGroup = selected?.allOrderItems || [];
                                        let compiledItems = [];

                                        rawItemsGroup.forEach(group => {
                                            if (popupShift === "all" || group.shift === popupShift) {
                                                const itemsToProcess = Array.isArray(group.items) ? group.items : [];
                                                compiledItems = [...compiledItems, ...itemsToProcess.flat()];
                                            }
                                        });

                                        const categoryMap = {};

                                        compiledItems.forEach(item => {
                                            const catName = item.categoryName || item.name?.categoryName || "ไม่มีหมวดหมู่";
                                            const qty = item.quantity || 1;
                                            const itemPrice = (item.price || 0) * qty;

                                            if (!categoryMap[catName]) {
                                                categoryMap[catName] = { name: catName, totalQty: 0, totalAmount: 0, subItems: {} };
                                            }
                                            categoryMap[catName].totalQty += qty;
                                            categoryMap[catName].totalAmount += itemPrice;

                                            const itemName = item.name || "ไม่ระบุชื่อเมนู";
                                            if (!categoryMap[catName].subItems[itemName]) {
                                                categoryMap[catName].subItems[itemName] = { name: itemName, totalQty: 0, opts: {} };
                                            }
                                            categoryMap[catName].subItems[itemName].totalQty += qty;

                                            const optKey = (item.options && item.options.length > 0)
                                                ? item.options.map(o => o.label).join(' + ')
                                                : "ปกติ";

                                            if (!categoryMap[catName].subItems[itemName].opts[optKey]) {
                                                categoryMap[catName].subItems[itemName].opts[optKey] = 0;
                                            }
                                            categoryMap[catName].subItems[itemName].opts[optKey] += qty;
                                        });

                                        const categoriesList = Object.values(categoryMap).sort((a, b) => b.totalQty - a.totalQty);

                                        if (categoriesList.length === 0) {
                                            return <div className="text-center text-gray-400 py-2 text-[10px] bg-gray-50 rounded-lg">ไม่มีออเดอร์ในกะนี้</div>;
                                        }

                                        return (
                                            <div className="flex flex-col gap-1.5 text-[11px] w-full">
                                                {categoriesList.map((cat, idx) => {
                                                    const isExpandedCat = expandedCategory === cat.name;
                                                    const itemsList = Object.values(cat.subItems).sort((a, b) => b.totalQty - a.totalQty);

                                                    return (
                                                        <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-3xs w-full">
                                                            <div
                                                                onClick={() => setExpandedCategory(isExpandedCat ? null : cat.name)}
                                                                className="flex justify-between items-center p-2.5 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors"
                                                            >
                                                                <div className="flex items-center gap-1.5 font-black text-gray-700">
                                                                    <span>{isExpandedCat ? '📂' : '📁'}</span>
                                                                    <span>{cat.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 font-black text-gray-900">
                                                                    <span>{cat.totalAmount.toLocaleString()}.-</span>
                                                                    <span className="text-blue-600 ml-1">({cat.totalQty.toLocaleString()} จาน)</span>
                                                                    <span className="text-[9px] ml-1">{isExpandedCat ? '▲' : '▼'}</span>
                                                                </div>
                                                            </div>

                                                            {isExpandedCat && (
                                                                <div className="bg-white border-t divide-y divide-gray-100">
                                                                    {itemsList.map((sub, sIdx) => {
                                                                        const isExpandedItem = expandedItem === sub.name;
                                                                        const optsList = Object.entries(sub.opts).sort((a, b) => b[1] - a[1]);

                                                                        return (
                                                                            <div key={sIdx} className="flex flex-col">
                                                                                <div
                                                                                    onClick={() => setExpandedItem(isExpandedItem ? null : sub.name)}
                                                                                    className="flex justify-between py-2 px-3 font-bold hover:bg-blue-50/40 cursor-pointer transition-colors"
                                                                                >
                                                                                    <div className="flex items-center gap-1.5 text-blue-600">
                                                                                        <span>{isExpandedItem ? '📖' : '📘'}</span>
                                                                                        <span className="truncate">{sub.name}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 text-gray-700">
                                                                                        <span>{sub.totalQty.toLocaleString()} จาน</span>
                                                                                    </div>
                                                                                </div>

                                                                                {isExpandedItem && (
                                                                                    <div className="bg-gray-50/80 pb-2 px-4 space-y-1">
                                                                                        {optsList.map(([optName, count], oIdx) => (
                                                                                            <div key={oIdx} className="flex justify-between items-center text-[10px] pl-5 border-l-2 border-blue-300">
                                                                                                <span className="text-gray-500">• {optName}</span>
                                                                                                <span className="font-bold text-gray-700">{count.toLocaleString()} จาน</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* 📈 บล็อกแสดงกราฟแท่งคู่ดีไซน์พรีเมียม พร้อมระบบฟิลเตอร์ค้นหาเมนูอาหาร */}
                            {chartData.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-dashed border-gray-200 w-full">
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-3xs mt-2">
                                        <div className="border-b pb-2 mb-3 space-y-2">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <span className="text-[10px] text-gray-800 font-black uppercase tracking-wider block">
                                                        📈 ช่วงเวลาพีก (ทุก {process.env.REACT_APP_CHART_INTERVAL_MINUTES || 60} นาที)
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-bold">คลิกที่แท่งเพื่อดูรายการอาหารได้เลย</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5 items-end text-[8px] font-black shrink-0">
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-xs"></span> บิลโต๊ะ</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-xs"></span> จำนวนจาน</span>
                                                </div>
                                            </div>

                                            {/* 🔍 ช่องอินพุตฟิลเตอร์พิมพ์ค้นหาเมนู */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchMenu}
                                                    onChange={(e) => setSearchMenu(e.target.value)}
                                                    placeholder="🔍 พิมพ์ชื่อเมนูเพื่อกรองกราฟ..."
                                                    className="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 font-bold text-[10px] outline-none focus:border-gray-400 transition-colors"
                                                />
                                                {searchMenu && (
                                                    <button
                                                        onClick={() => setSearchMenu("")}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-black text-[11px]"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* พื้นที่สร้างกราฟ จัดเรียงชิดซ้าย (justify-start) และนำ flex-1 ออก เพื่อให้แคบลง */}
                                        <div className="h-32 flex items-end gap-1 overflow-x-auto no-scrollbar w-full pt-6 justify-start pb-1">
                                            {chartData.map((data, index) => {
                                                const maxBills = Math.max(...chartData.map(d => d.bills), 1);
                                                const maxItems = Math.max(...chartData.map(d => d.items), 1);

                                                // ลดความสูงลงมาที่ 70% เพื่อให้ตัวเลขด้านบนไม่หลุดกรอบ
                                                const billHeight = (data.bills / maxBills) * 70;
                                                const itemHeight = (data.items / maxItems) * 70;

                                                return (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleBarClick(data.time)}
                                                        className="flex flex-col items-center justify-end h-full min-w-[26px] relative cursor-pointer hover:bg-gray-100/80 rounded-t-lg transition-colors p-0.5"
                                                    >
                                                        {/* แท่งคู่ขนานและตัวเลขยอดขายด้านบนแท่งแบบถาวร */}
                                                        <div className="flex items-end gap-[3px] w-full h-full justify-center">

                                                            {/* แท่งฝั่งบิลโต๊ะ (สีน้ำเงิน) */}
                                                            <div className="flex flex-col items-center justify-end h-full w-2.5">
                                                                <span className="text-[7px] font-black text-blue-600 mb-0.5">{data.bills}</span>
                                                                <div className="w-full bg-blue-500 rounded-t-xs transition-all" style={{ height: `${Math.max(billHeight, 4)}%` }}></div>
                                                            </div>

                                                            {/* แท่งฝั่งจำนวนจาน (สีส้ม) */}
                                                            <div className="flex flex-col items-center justify-end h-full w-2.5">
                                                                <span className="text-[7px] font-black text-orange-600 mb-0.5">{data.items}</span>
                                                                <div className="w-full bg-orange-500 rounded-t-xs transition-all" style={{ height: `${Math.max(itemHeight, 4)}%` }}></div>
                                                            </div>

                                                        </div>

                                                        {/* เส้นแบ่งแกน X บอกค่าเวลา */}
                                                        <span className="text-[8px] font-bold text-gray-400 mt-1 shrink-0">{data.time}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ปุ่มปิดท้าย Popup หลัก */}
                        <div className="p-3 bg-white border-t shrink-0">
                            <button
                                onClick={() => setSelected(null)}
                                className="w-full py-2.5 bg-gray-950 active:bg-gray-900 text-white rounded-xl font-black shadow-md text-center text-xs"
                            >
                                ตกลงเรียบร้อย
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📋 Popup ซ้อน: แสดงรายละเอียดเมนูในแต่ละช่วงเวลา */}
            {timeSlotDetail && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[70vh]">
                        <div className="p-3 bg-gray-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h4 className="text-xs font-black">🔥 ยอดสั่งช่วงเวลา {timeSlotDetail.time} น.</h4>
                                {searchMenu.trim() !== "" && (
                                    <span className="text-[8px] text-amber-400 font-bold block mt-0.5">กรองเฉพาะคำว่า: "{searchMenu}"</span>
                                )}
                            </div>
                            <button onClick={() => setTimeSlotDetail(null)} className="text-lg font-black px-2 active:scale-95">×</button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1.5 flex-1 no-scrollbar bg-gray-50">
                            {timeSlotDetail.items.length > 0 ? (
                                timeSlotDetail.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-start p-2 bg-white rounded-xl border border-gray-100 shadow-3xs">
                                        <div className="flex-1 pr-2">
                                            <div className="text-[11px] font-black text-gray-800">🔹 {item.name}</div>
                                            <div className="text-[9px] text-gray-500 font-bold leading-tight pl-3">{item.options}</div>
                                        </div>
                                        <div className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 whitespace-nowrap">
                                            {item.qty} จาน
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-[10px]">ไม่พบเมนูดังกล่าวในช่วงเวลานี้ครับ</div>
                            )}
                        </div>
                        <div className="p-2 border-t bg-white shrink-0">
                            <button
                                onClick={() => setTimeSlotDetail(null)}
                                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[10px] font-black active:scale-95 transition-all shadow-xs"
                            >
                                ปิดหน้าต่างข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyReport;