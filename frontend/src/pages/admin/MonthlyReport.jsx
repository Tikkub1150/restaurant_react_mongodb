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

    // 🔍 State สำหรับฟีเจอร์กรองกราฟแท่ง (แยกชื่อเมนู และ Option)
    const [timeSlotDetail, setTimeSlotDetail] = useState(null);
    const [searchMenuName, setSearchMenuName] = useState("");
    const [searchMenuOption, setSearchMenuOption] = useState("");
    const [expandedPayment, setExpandedPayment] = useState(null);
    const [selectedBill, setSelectedBill] = useState(null);

    // รีเซ็ตค่าต่างๆ เมื่อเปลี่ยนวัน หรือเปลี่ยนกะ
    useEffect(() => {
        setShowDiscountDetail(false);
        setExpandedCategory(null);
        setExpandedItem(null);
        setTimeSlotDetail(null);
        setSearchMenuName("");
        setSearchMenuOption("");
        setExpandedPayment(null);
        setSelectedBill(null);
    }, [selected, popupShift]);

    // 🔄 ดึงข้อมูลรายงาน
    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await axios.get(`${apiBaseUrl}/api/reports/monthly`, {
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
        if (!selected) return { net: 0, cash: 0, truemoney:0, promptpay: 0, lineman: 0, goverment: 0 };
        if (popupShift === 'morning') {
            return {
                net: selected.morningNet || 0,
                cash: selected.morningCash || 0,
                truemoney: selected.morningTruemoney || 0,
                promptpay: selected.morningPromptpay || 0,
                lineman: selected.morningLineman || 0,
                goverment: selected.morningGoverment || 0
            };
        }
        if (popupShift === 'afternoon') {
            return {
                net: selected.afternoonNet || 0,
                cash: selected.afternoonCash || 0,
                truemoney: selected.afternoonTruemoney || 0,
                promptpay: selected.afternoonPromptpay || 0,
                lineman: selected.afternoonLineman || 0,
                goverment: selected.afternoonGoverment || 0,
            };
        }
        return {
            net: selected.totalNet || 0,
            cash: selected.cashTotal || 0,
            truemoney: selected.truemoneyTotal || 0,
            promptpay: selected.promptpayTotal || 0,
            lineman: selected.linemanTotal || 0,
            goverment: selected.govermentTotal || 0
        };
    };

    const metrics = getDisplayMetrics();
    const info = (month && selected) ? getDayInfo(selected._id) : null;

    // 📊 ฟังก์ชันคำนวณข้อมูลกราฟแท่งคู่ (อัปเดต: รองรับการพิมพ์ Option แยกคอมมาหลายคำ)
    const getChartData = () => {
        if (!selected || !selected.orderTimes) return [];

        const filteredOrders = selected.orderTimes.filter(o => popupShift === 'all' || o.shift === popupShift);
        const timeMap = {};
        const searchName = searchMenuName.toLowerCase().trim();

        // ✂️ แยกข้อความ Option ด้วยคอมมา (,) หรือเว้นวรรค ให้กลายเป็น Array ของคำค้นหา
        const searchOptions = searchMenuOption
            .split(/[,，\s]+/)
            .map(s => s.trim().toLowerCase())
            .filter(s => s !== "");

        const interval = parseInt(process.env.REACT_APP_CHART_INTERVAL_MINUTES) || 60;

        filteredOrders.forEach((order) => {
            if (!order.closedAt) return;

            const correspondingGroup = selected.allOrderItems?.find(g => g.closedAt === order.closedAt);
            const items = correspondingGroup?.items || [];

            // ทำการกรองเมนู
            const matchingItems = (searchName !== "" || searchOptions.length > 0)
                ? items.filter(item => {
                    const nameMatch = searchName === "" || (item.name || "").toLowerCase().includes(searchName);

                    // ตรรกะแบบ AND: ออปชันของสินค้าชิ้นนั้น ต้องมีครบทุกคำที่พิมพ์ค้นหา
                    const optMatch = searchOptions.length === 0 || searchOptions.every(keyword =>
                        item.options?.some(o => (o.label || "").toLowerCase().includes(keyword))
                    );

                    return nameMatch && optMatch;
                })
                : items;

            const d = new Date(order.closedAt);
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes();

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

            if (searchName === "" && searchOptions.length === 0) {
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

    // 🎯 ฟังก์ชันเมื่อกดที่แท่งกราฟ (อัปเดต: ให้รองรับการพิมพ์แยกคอมมาหลายคำเหมือนข้างบน)
    const handleBarClick = (timeKey) => {
        if (!selected.allOrderItems) return;

        const itemsInSlot = {};
        const interval = parseInt(process.env.REACT_APP_CHART_INTERVAL_MINUTES) || 60;

        const searchName = searchMenuName.toLowerCase().trim();

        // ✂️ แยกคำค้นหาในฝั่ง Option เหมือนกัน
        const searchOptions = searchMenuOption
            .split(/[,，\s]+/)
            .map(s => s.trim().toLowerCase())
            .filter(s => s !== "");

        selected.allOrderItems.forEach(group => {
            if (!group.closedAt) return;
            if (popupShift !== 'all' && group.shift !== popupShift) return;

            const d = new Date(group.closedAt);
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes();

            let currentSlotKey = "";
            if (interval >= 60) {
                currentSlotKey = `${h}:00`;
            } else {
                const roundedM = Math.floor(m / interval) * interval;
                currentSlotKey = `${h}:${roundedM.toString().padStart(2, '0')}`;
            }

            if (currentSlotKey === timeKey) {
                group.items.forEach(item => {
                    const nameMatch = searchName === "" || (item.name || "").toLowerCase().includes(searchName);

                    // ตรรกะ AND เช็คครบทุกคำค้นหาในกล่อง Popup ย่อย
                    const optMatch = searchOptions.length === 0 || searchOptions.every(keyword =>
                        item.options?.some(o => (o.label || "").toLowerCase().includes(keyword))
                    );

                    if ((searchName !== "" || searchOptions.length > 0) && !(nameMatch && optMatch)) {
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

    // 🧮 คำนวณยอดรวมรายได้ทั้งหมด, ส่วนลด และดึงข้อมูลทุกอย่างมารวมกันเพื่อให้กาง Popup ได้
    const summaryData = report.reduce((acc, day) => {
        // 1. ยอดสุทธิและจำนวนวัน
        acc.morningNet += (day.morningNet || 0);
        acc.afternoonNet += (day.afternoonNet || 0);
        acc.totalNet += (day.totalNet || 0);
        if ((day.totalNet || 0) > 0) acc.activeDaysCount += 1;

        // 2. ยอดส่วนลดที่ขาดหายไป
        const dayDiscounts = day.discountOrders || [];
        const mDiscount = dayDiscounts.filter(d => d.shift === 'morning').reduce((sum, d) => sum + (d.discountAmount || 0), 0);
        const aDiscount = dayDiscounts.filter(d => d.shift === 'afternoon').reduce((sum, d) => sum + (d.discountAmount || 0), 0);
        acc.morningDiscountTotal += mDiscount;
        acc.afternoonDiscountTotal += aDiscount;
        acc.overallDiscountTotal += (mDiscount + aDiscount);

        // 3. รวมช่องทางจ่ายเงินกะเช้า
        acc.morningCash += (day.morningCash || 0);
        acc.morningPromptpay += (day.morningPromptpay || 0);
        acc.morningTruemoney += (day.morningTruemoney || 0);
        acc.morningLineman += (day.morningLineman || 0);
        acc.morningGoverment += (day.morningGoverment || 0);

        // 4. รวมช่องทางจ่ายเงินกะบ่าย
        acc.afternoonCash += (day.afternoonCash || 0);
        acc.afternoonPromptpay += (day.afternoonPromptpay || 0);
        acc.afternoonTruemoney += (day.afternoonTruemoney || 0);
        acc.afternoonLineman += (day.afternoonLineman || 0);
        acc.afternoonGoverment += (day.afternoonGoverment || 0);

        // 5. รวมช่องทางจ่ายเงินทั้งหมด
        acc.cashTotal += (day.cashTotal || 0);
        acc.promptpayTotal += (day.promptpayTotal || 0);
        acc.truemoneyTotal += (day.truemoneyTotal || 0);
        acc.linemanTotal += (day.linemanTotal || 0);
        acc.govermentTotal += (day.govermentTotal || 0);

        // 6. รวมบิล รายการอาหาร และช่วงเวลาเข้าด้วยกันทั้งหมด
        if (day.discountOrders) acc.discountOrders.push(...day.discountOrders);
        if (day.allOrderItems) acc.allOrderItems.push(...day.allOrderItems);
        if (day.orderTimes) acc.orderTimes.push(...day.orderTimes);

        return acc;
    }, {
        _id: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}-01`,
        isTotal: true, // 👈 ป้ายกำกับสำหรับหน้า Popup
        morningNet: 0, afternoonNet: 0, totalNet: 0, activeDaysCount: 0,
        morningDiscountTotal: 0, afternoonDiscountTotal: 0, overallDiscountTotal: 0,
        morningCash: 0, morningPromptpay: 0, morningTruemoney: 0, morningLineman: 0, morningGoverment: 0,
        afternoonCash: 0, afternoonPromptpay: 0, afternoonTruemoney: 0, afternoonLineman: 0, afternoonGoverment: 0,
        cashTotal: 0, promptpayTotal: 0, truemoneyTotal: 0, linemanTotal: 0, govermentTotal: 0,
        discountOrders: [], allOrderItems: [], orderTimes: []
    });

    const avgMorning = summaryData.activeDaysCount > 0 ? summaryData.morningNet / summaryData.activeDaysCount : 0;
    const avgAfternoon = summaryData.activeDaysCount > 0 ? summaryData.afternoonNet / summaryData.activeDaysCount : 0;
    const avgOverall = summaryData.activeDaysCount > 0 ? summaryData.totalNet / summaryData.activeDaysCount : 0;

    // 🗂️ ฟังก์ชันสร้างตารางรายละเอียดเวลากดคลิกดูแต่ละช่องทาง
    const renderPaymentDetails = (methodName) => {
        if (!selected || !selected.allOrderItems) return null;

        // กรองหาบิลที่จ่ายด้วยวิธีนี้ และตรงกับกะที่เลือก
        const filtered = selected.allOrderItems.filter(o =>
            o.paymentMethod?.toLowerCase() === methodName.toLowerCase() &&
            (popupShift === "all" || o.shift === popupShift)
        );

        if (filtered.length === 0) return <div className="p-2 text-center text-gray-400 text-[10px] bg-gray-50 rounded-xl mt-1.5 border border-gray-100 shadow-inner">ไม่มีข้อมูลบิล</div>;

        return (
            <div className="mt-1.5 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-gray-200/50 text-gray-500 font-black border-b border-gray-200">
                    <tr>
                        <th className="p-2 w-14 text-center">เวลา</th>
                        <th className="p-2">โต๊ะ / รายการอาหาร</th>
                        <th className="p-2 text-right">ยอดบิล</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {filtered.map((o, idx) => (
                        <tr key={idx}
                            onClick={() => setSelectedBill(o)} // 👈 คลิกตรงไหนของแถวก็ได้เพื่อเปิดบิล
                            className="bg-white hover:bg-blue-50/60 transition-colors cursor-pointer active:bg-gray-50">
                            <td className="p-2 text-gray-400 font-bold text-center align-top whitespace-nowrap">
                                {new Date(o.closedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}
                            </td>
                            <td className="p-2 align-top">
                                <div className="font-black text-blue-600 mb-0.5">โต๊ะ {o.table_name || 'ไม่ระบุโต๊ะ'}</div>
                                <div className="text-[9px] text-gray-500 font-bold leading-tight">
                                    {o.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                                </div>
                            </td>
                            <td className="p-2 text-right font-black text-gray-900 align-top whitespace-nowrap">
                                {o.totalAmount?.toLocaleString()}.-
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const fallbackCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // ซ่อนตัว textarea ไม่ให้ผู้ใช้เห็นและไม่ให้หน้าจอกระตุก
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert(`คัดลอก ID: ${text} เรียบร้อยแล้ว! (Fallback)`);
            } else {
                alert('ไม่สามารถคัดลอกได้ กรุณาก็อปปี้ด้วยตนเองครับ');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการคัดลอก: ' + err);
        }

        document.body.removeChild(textArea);
    };

    // =========================================================
    // 📊 ลอจิกคำนวณยอดขายแยกตาม Zone (แบบคลีน)
    // =========================================================
    const zones = [
        { id: 'main', name: 'ในร้าน' },
        { id: 'delivery', name: 'ส่งเอง' },
        { id: 'take_home', name: 'กลับบ้าน' },
        { id: 'reserve', name: 'สำรอง' },
        // { id: 'bamee', name: 'บะหมี่' },
        { id: 'vip', name: 'VIP' },
        // { id: 'lineman', name: 'Line Man' }
    ];
    const calculateZoneSales = () => {
        const allOrders = report.flatMap(day => day.allOrderItems || []);
        return zones.map(zone => {
            const zoneOrders = allOrders.filter(order => {
                const orderZone = (order.zone || 'main').toLowerCase();
                return orderZone === zone.id;
            });

            const total = zoneOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            return { ...zone, total, count: zoneOrders.length };
        });
    };

    const zoneSalesData = calculateZoneSales();
    const totalAllZones = zoneSalesData.reduce((sum, z) => sum + z.total, 0);

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

                        {report.length > 0 && (
                            <>
                                <tr className="bg-gray-100 font-black text-gray-900 border-t-2 border-gray-300">
                                    <td className="p-2 text-center border-r font-black bg-gray-200/70 text-gray-800">รวมทั้งหมด</td>
                                    <td onClick={() => { setSelected(summaryData); setPopupShift("morning"); }} className="p-2 text-right border-r font-black text-amber-800 bg-amber-100/40 cursor-pointer active:bg-amber-200 hover:bg-amber-200/50 transition-colors">
                                        {summaryData.morningNet > 0 ? summaryData.morningNet.toLocaleString() : '-'}
                                    </td>
                                    <td onClick={() => { setSelected(summaryData); setPopupShift("afternoon"); }} className="p-2 text-right border-r font-black text-blue-800 bg-blue-100/20 cursor-pointer active:bg-blue-200 hover:bg-blue-200/50 transition-colors">
                                        {summaryData.afternoonNet > 0 ? summaryData.afternoonNet.toLocaleString() : '-'}
                                    </td>
                                    <td onClick={() => { setSelected(summaryData); setPopupShift("all"); }} className="p-2 text-right font-black text-green-700 bg-green-100/40 text-[12px] cursor-pointer active:bg-green-200 hover:bg-green-200/50 transition-colors">
                                        {summaryData.totalNet > 0 ? summaryData.totalNet.toLocaleString() : '-'}
                                    </td>
                                </tr>
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
                                <tr className="bg-red-50/40 font-black text-gray-900 border-t border-red-100">
                                    <td className="p-1.5 text-center border-r border-red-100 font-black bg-red-100/50 text-red-600 leading-tight">
                                        <div>ส่วนลดทั้งหมด</div>
                                        <div className="text-[8px] text-red-400 font-bold">(ยอดที่ขาดหาย)</div>
                                    </td>
                                    <td className="p-2 text-right border-r border-red-100 font-black text-red-500 bg-red-50/60">
                                        {summaryData.morningDiscountTotal > 0 ? `-${summaryData.morningDiscountTotal.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-2 text-right border-r border-red-100 font-black text-red-500 bg-red-50/30">
                                        {summaryData.afternoonDiscountTotal > 0 ? `-${summaryData.afternoonDiscountTotal.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-2 text-right font-black text-red-600 bg-red-100/40">
                                        {summaryData.overallDiscountTotal > 0 ? `-${summaryData.overallDiscountTotal.toLocaleString()}` : '-'}
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
                                    {(month && !selected.isTotal) ? (
                                        `ประจำวันที่ ${info?.dateNum} (${info?.dayName}) ${new Date(selected._id).toLocaleDateString('th-TH', {month: 'short', year: 'numeric'})}`
                                    ) : (selected.isTotal && !month) ? (
                                        `สรุปยอดรวมทั้งปี ${year + 543}`
                                    ) : (
                                        `สรุปยอดรวมประจำเดือน ${new Date(selected._id + "-02").toLocaleString('th-TH', {month: 'long', year: 'numeric'})}`
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
                                                                <tr
                                                                    key={index}
                                                                    onClick={() => {
                                                                        // 1. ค้นหาบิลฉบับเต็มจาก allOrderItems โดยใช้ _id หรือ order_id เทียบกัน
                                                                        const fullBillDetails = selected.allOrderItems?.find(
                                                                            (b) => (b.order_id && b.order_id === order.order_id)
                                                                        );

                                                                        // 2. ถ้าเจอบิลเต็ม ให้นำข้อมูลส่วนลด (order) มารวมกับบิลเต็ม แล้วเปิด Popup
                                                                        if (fullBillDetails) {
                                                                            setSelectedBill({ ...fullBillDetails, ...order });
                                                                        } else {
                                                                            // ถ้าหาไม่เจอจริงๆ (เผื่อไว้) ก็แสดงเท่าที่มีไปก่อน
                                                                            setSelectedBill(order);
                                                                            alert("ไม่พบรายละเอียดรายการอาหารของบิลนี้ในระบบ");
                                                                        }
                                                                    }}
                                                                    className="bg-white hover:bg-blue-50/60 transition-colors cursor-pointer active:bg-gray-50"
                                                                >
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
                                {/* บล็อก เงินสด (อัปเดตให้กดกางได้แล้ว) */}
                                <div>
                                    <div
                                        onClick={() => setExpandedPayment(expandedPayment === 'cash' ? null : 'cash')}
                                        className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">💵</span><span className="text-gray-500 font-bold">เงินสด</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-900">{metrics.cash.toLocaleString()}.-</span>
                                            <span className="text-[10px] text-gray-400">{expandedPayment === 'cash' ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                    {expandedPayment === 'cash' && renderPaymentDetails('cash')}
                                </div>

                                {/* บล็อก เงินโอน (อัปเดตให้กดกางได้แล้ว) */}
                                <div>
                                    <div
                                        onClick={() => setExpandedPayment(expandedPayment === 'truemoney' ? null : 'truemoney')}
                                        className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">📱</span><span className="text-gray-500 font-bold">truemoney</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-blue-600">{metrics.truemoney.toLocaleString()}.-</span>
                                            <span className="text-[10px] text-gray-400">{expandedPayment === 'truemoney' ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                    {expandedPayment === 'truemoney' && renderPaymentDetails('truemoney')}
                                </div>

                                {/* บล็อก เงินโอน (อัปเดตให้กดกางได้แล้ว) */}
                                <div>
                                    <div
                                        onClick={() => setExpandedPayment(expandedPayment === 'promptpay' ? null : 'promptpay')}
                                        className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">📱</span><span className="text-gray-500 font-bold">ธนาคาร พร้อมเพย์</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-blue-600">{metrics.promptpay.toLocaleString()}.-</span>
                                            <span className="text-[10px] text-gray-400">{expandedPayment === 'promptpay' ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                    {expandedPayment === 'promptpay' && renderPaymentDetails('promptpay')}
                                </div>

                                {/* บล็อก Lineman */}
                                <div>
                                    <div
                                        onClick={() => setExpandedPayment(expandedPayment === 'lineman' ? null : 'lineman')}
                                        className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">🛵</span><span className="text-gray-500 font-bold">Lineman</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-green-600">{metrics.lineman.toLocaleString()}.-</span>
                                            <span className="text-[10px] text-gray-400">{expandedPayment === 'lineman' ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                    {expandedPayment === 'lineman' && renderPaymentDetails('lineman')}
                                </div>

                                {/* บล็อก โครงการรัฐ */}
                                <div>
                                    <div
                                        onClick={() => setExpandedPayment(expandedPayment === 'goverment' ? null : 'goverment')}
                                        className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {/* ขออนุญาตเปลี่ยนไอคอนเป็นธงชาติเพื่อแยกกับ Lineman ให้ดูง่ายขึ้นนะครับ */}
                                            <span className="text-xs">🇹🇭</span><span className="text-gray-500 font-bold">โครงการรัฐ</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-green-600">{metrics.goverment.toLocaleString()}.-</span>
                                            <span className="text-[10px] text-gray-400">{expandedPayment === 'goverment' ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                    {expandedPayment === 'goverment' && renderPaymentDetails('goverment')}
                                </div>

                                {/* 👇👇👇 แปะโค้ด ZONE ตรงนี้ 👇👇👇 */}
                                <div className="mt-4 pt-3 border-t border-dashed border-gray-200 w-full overflow-hidden">
                                    {(() => {
                                        // 🎯 กรองบิลและส่วนลดตามวัน/กะที่เลือก
                                        const activeOrders = (selected?.allOrderItems || []).filter(
                                            o => popupShift === "all" || o.shift === popupShift
                                        );
                                        const activeDiscounts = (selected?.discountOrders || []).filter(
                                            d => popupShift === "all" || d.shift === popupShift
                                        );

                                        // 🧮 คำนวณยอดขายของแต่ละโซน (หักส่วนลดแล้ว)
                                        const zonesData = zones.map(zone => {
                                            const zOrders = activeOrders.filter(o => (o.zone || 'main').toLowerCase() === zone.id);
                                            const rawTotal = zOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                                            const zDiscounts = activeDiscounts.filter(d => zOrders.some(zo => zo.order_id === d.order_id));
                                            const discountTotal = zDiscounts.reduce((sum, d) => sum + (d.discountAmount || 0), 0);

                                            return { ...zone, netTotal: rawTotal - discountTotal };
                                        });

                                        // 💰 รวมยอดสุทธิของทุกโซนเข้าด้วยกัน
                                        const allZonesNetTotal = zonesData.reduce((sum, z) => sum + z.netTotal, 0);

                                        return (
                                            <>
                                                <span className="text-[10px] text-gray-400 block mb-2 font-black uppercase tracking-wider">
                                                    📍 ยอดขายแยกตามโซน ({allZonesNetTotal.toLocaleString()}.-)
                                                </span>

                                                {/* 🛠️ เปลี่ยนเป็น Grid 2 คอลัมน์ตรงนี้ */}
                                                <div className="grid grid-cols-3 gap-3 pb-3">
                                                    {zonesData.map((z, idx) => (
                                                        <div key={idx} className="bg-white border border-gray-200 rounded-xl py-2 px-1 flex justify-between items-center shadow-3xs">
                                                            <span className="text-[11px] font-black text-gray-700">{z.name}</span>
                                                            <span className="text-xs font-black text-blue-600">{z.netTotal.toLocaleString()}.-</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                {/* 👆👆👆 สิ้นสุดโค้ด ZONE 👆👆👆 */}

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

                            {/* 📈 บล็อกแสดงกราฟแท่งคู่ */}
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
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 bg-blue-500 rounded-xs"></span>
                                                        บิลโต๊ะ ({chartData.reduce((sum, d) => sum + d.bills, 0).toLocaleString()} บิล)
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 bg-orange-500 rounded-xs"></span>
                                                        จำนวนจาน ({chartData.reduce((sum, d) => sum + d.items, 0).toLocaleString()} จาน)
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 🔍 ช่องอินพุตฟิลเตอร์ค้นหาแบบแยกส่วน */}
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={searchMenuName}
                                                        onChange={(e) => setSearchMenuName(e.target.value)}
                                                        placeholder="🔍 พิมพ์ชื่อเมนู..."
                                                        className="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 font-bold text-[10px] outline-none focus:border-gray-400 transition-colors"
                                                    />
                                                    {searchMenuName && (
                                                        <button
                                                            onClick={() => setSearchMenuName("")}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-black text-[11px]"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={searchMenuOption}
                                                        onChange={(e) => setSearchMenuOption(e.target.value)}
                                                        placeholder="🏷️ พิมพ์ Option (เช่น ไก่, ไข่ดาว)..."
                                                        className="w-full bg-gray-50 p-2 rounded-lg border border-gray-200 font-bold text-[10px] outline-none focus:border-gray-400 transition-colors"
                                                    />
                                                    {searchMenuOption && (
                                                        <button
                                                            onClick={() => setSearchMenuOption("")}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-black text-[11px]"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-32 flex items-end gap-1 overflow-x-auto no-scrollbar w-full pt-6 justify-start pb-1">
                                            {chartData.map((data, index) => {
                                                const maxBills = Math.max(...chartData.map(d => d.bills), 1);
                                                const maxItems = Math.max(...chartData.map(d => d.items), 1);

                                                const billHeight = (data.bills / maxBills) * 70;
                                                const itemHeight = (data.items / maxItems) * 70;

                                                return (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleBarClick(data.time)}
                                                        className="flex flex-col items-center justify-end h-full min-w-[26px] relative cursor-pointer hover:bg-gray-100/80 rounded-t-lg transition-colors p-0.5"
                                                    >
                                                        <div className="flex items-end gap-[3px] w-full h-full justify-center">
                                                            <div className="flex flex-col items-center justify-end h-full w-2.5">
                                                                <span className="text-[7px] font-black text-blue-600 mb-0.5">{data.bills}</span>
                                                                <div className="w-full bg-blue-500 rounded-t-xs transition-all" style={{ height: `${Math.max(billHeight, 4)}%` }}></div>
                                                            </div>

                                                            <div className="flex flex-col items-center justify-end h-full w-2.5">
                                                                <span className="text-[7px] font-black text-orange-600 mb-0.5">{data.items}</span>
                                                                <div className="w-full bg-orange-500 rounded-t-xs transition-all" style={{ height: `${Math.max(itemHeight, 4)}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <span className="text-[8px] font-bold text-gray-400 mt-1 shrink-0">{data.time}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

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
                                {searchMenuOption.trim() !== "" && (
                                    <span className="text-[8px] text-amber-400 font-bold block mt-0.5">
                                        กรอง Option: {searchMenuOption.split(/[,，\s]+/).filter(Boolean).map(s => `"${s}"`).join(' และ ')}
                                    </span>
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

            {/* 🎫 Popup ซ้อนชั้นที่ 3: แสดงรายละเอียดบิลของโต๊ะนั้นแบบเจาะลึก (ถอดสไตล์มาจากหน้า History) */}
            {selectedBill && (
                <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[80vh]">

                        {/* ส่วนหัวป้ายโต๊ะ */}
                        <div className="p-4 bg-gray-900 text-white flex justify-between items-start shrink-0">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span className="bg-amber-400 text-gray-900 text-[10px] px-3 py-1 rounded-full font-black uppercase inline-block">
                                        🪑 โต๊ะ {selectedBill.table_name || 'ไม่ระบุโต๊ะ'}
                                    </span>

                                    {/* 👇 ส่วนที่เพิ่มเข้ามา: ปุ่ม Copy ID */}
                                    <div
                                        onClick={() => {
                                            // 🆔 ดึงค่า ID ออกมา (ปรับตามตัวแปรของหน้านั้นๆ เช่น selectedBill._id หรือ order._id)
                                            const idToCopy = selectedBill?._id || selectedBill?.order_id || "";

                                            if (!idToCopy) return;

                                            if (navigator.clipboard && window.isSecureContext) {
                                                // 🚀 วิธีหลัก: ถ้าเบราว์เซอร์ยอมรับ (มี HTTPS หรือรันบน localhost)
                                                navigator.clipboard.writeText(idToCopy)
                                                    .then(() => alert(`คัดลอก ID: ${idToCopy} เรียบร้อยแล้ว!`))
                                                    .catch(() => fallbackCopyText(idToCopy));
                                            } else {
                                                // 🛠️ วิธีสำรอง: สำหรับกรณี HTTP / DDNS ทั่วไป (สร้างแผ่นกระดาษซ่อนแล้วก็อป)
                                                fallbackCopyText(idToCopy);
                                            }
                                        }}
                                        className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md cursor-pointer hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
                                        title="คลิกเพื่อคัดลอก ID"
                                    >
                                        <span className="text-[9px] text-gray-300 font-mono tracking-wider">ID: {selectedBill.order_id}</span>
                                        <span className="text-[10px]">📋</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold">
                                    เช็คบิลเมื่อ: {new Date(selectedBill.closedAt).toLocaleTimeString('th-TH')} น.
                                </p>
                            </div>
                            <button onClick={() => setSelectedBill(null)} className="text-white text-xl font-black px-2 active:scale-95 leading-none">×</button>
                        </div>

                        {/* รายการอาหารข้างในบิล */}
                        <div className="overflow-y-auto p-4 space-y-4 flex-1 no-scrollbar bg-gray-50">
                            <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-3xs">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider border-b pb-1.5 mb-2">📄 รายการอาหารในบิลนี้</p>
                                {selectedBill.items?.map((item, idx) => (
                                    <div key={idx} className="border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start text-xs font-bold text-gray-800">
                                            <span>{item.name} <span className="text-blue-500 font-black">x{item.quantity}</span></span>
                                            <span>{((item.price || 0) * (item.quantity || 1)).toLocaleString()}.-</span>
                                        </div>
                                        {item.note && (
                                            <p className="text-[10px] text-orange-500 font-bold italic mt-0.5">
                                                * {item.note}
                                            </p>
                                        )}
                                        {item.options?.map((opt, oIdx) => (
                                            <p key={oIdx} className="text-[9px] text-gray-400 font-medium pl-2">+ {opt.label} (+{opt.extraPrice || 0})</p>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* สรุปบัญชี ทอนเงิน ส่วนลด ด้านล่าง */}
                            <div className="bg-gray-900 rounded-2xl p-4 text-white shadow-md">
                                <div className="space-y-2 text-[11px]">
                                    <div className="flex justify-between font-bold text-gray-400">
                                        <span>ราคาปกติรวม</span>
                                        <span>{(selectedBill.totalAmount || 0).toLocaleString()}.-</span>
                                    </div>

                                    {selectedBill.discountAmount > 0 && (
                                        <div className="flex justify-between items-center border-b border-white/10 pb-2 text-red-400 font-black">
                                            <span>ส่วนลด {selectedBill.discount}% ({selectedBill.cashierName || 'ผู้ลด'})</span>
                                            <span>-{selectedBill.discountAmount.toLocaleString()}.-</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
                                        <span className="font-black text-gray-300">ยอดรวมสุทธิ</span>
                                        <span className="text-xl font-black text-green-400">
                                            {((selectedBill.totalAmount || 0) - (selectedBill.discountAmount || 0)).toLocaleString()}.-
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-white/10 space-y-1 text-[10px] text-gray-400 font-medium">
                                        <div className="flex justify-between">
                                            <span>ช่องทางจ่ายเงิน</span>
                                            <span className="text-white font-bold uppercase">
                                                {selectedBill.paymentMethod?.toLowerCase() === 'cash' ? '💵 เงินสด' :
                                                    selectedBill.paymentMethod?.toLowerCase() === 'truemoney' ? '📱 true money' :
                                                        selectedBill.paymentMethod?.toLowerCase() === 'promptpay' ? '📱 เงินโอน' :
                                                            selectedBill.paymentMethod?.toLowerCase() === 'lineman' ? '🛵 Lineman' : '🇹🇭 โครงการรัฐ'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>รับเงินมา</span>
                                            <span className="text-white">{(selectedBill.cashReceived || 0).toLocaleString()}.-</span>
                                        </div>
                                        <div className="flex justify-between text-green-400 font-bold">
                                            <span>เงินทอน</span>
                                            <span>{(selectedBill.changeGiven || 0).toLocaleString()}.-</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ปุ่มปิดท้ายบิล */}
                        <div className="p-3 bg-white border-t shrink-0">
                            <button
                                onClick={() => setSelectedBill(null)}
                                className="w-full py-2.5 bg-gray-950 text-white rounded-xl text-xs font-black active:scale-95 transition-all shadow-md"
                            >
                                ปิดรายละเอียดบิล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};

export default MonthlyReport;