import React, { useState, useEffect } from 'react';
import axios from 'axios';
const apiBaseUrl = process.env.REACT_APP_API_URL;

const MonthlyReport = () => {
    const [report, setReport] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    // 🗓️ ตั้งต้นเป็นเดือนปัจจุบัน แต่รอบนี้สามารถเคลียร์เป็นค่าว่าง "" เพื่อดูทั้งปีได้
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    // 📊 ระบบ Popup แยกสถานะ
    const [selected, setSelected] = useState(null);
    const [popupShift, setPopupShift] = useState("all");
    const [showDiscountDetail, setShowDiscountDetail] = useState(false);

    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedItem, setExpandedItem] = useState(null);

    useEffect(() => {
        setShowDiscountDetail(false);
        setExpandedCategory(null);
        setExpandedItem(null);
    }, [selected, popupShift]);

    // 🔄 ดึงข้อมูลรายงาน (รองรับทั้งเคสมีเดือน และเคสเดือนเป็นค่าว่าง)
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
                        className="flex-grow bg-gray-50 p-2 rounded-xl border border-gray-300 font-black outline-none"
                    >
                        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y + 543}</option>)}
                    </select>

                    {/* 🔥 เพิ่มตัวเลือกค่าว่าง (ทั้งปี) ตรงนี้ */}
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
                        className="flex-grow bg-gray-50 p-2 rounded-xl border border-gray-300 font-black outline-none"
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
                            {/* 🔥 หัวตารางเปลี่ยนตามโหมด: ถ้ามีเดือนแสดง "วันที่" ถ้าไม่มีแสดง "เดือน" */}
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
                                    {/* 🔥 แถวแรกเปลี่ยนตามโหมด: รายวัน VS ชื่อเดือนเต็ม */}
                                    <td className={`p-2 text-center border-r font-black ${(month && dayInfo?.isWeekend) ? 'bg-red-50 text-red-600' : 'text-gray-700'}`}>
                                        {month ? (
                                            `${dayInfo?.dateNum} (${dayInfo?.dayName})`
                                        ) : (
                                            // บวกวันที่สอง (-02) เพื่อป้องกันปัญหาเรื่องเขตเวลาเขยิบถอยหลัง
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
                        {report.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-8 text-gray-400">ไม่มีข้อมูลบันทึกไว้ครับ 📭</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 📥 หน้าต่าง POPUP (โครงสร้างเดิมเด๊ะ ทำงานร่วมกันได้สมบูรณ์) */}
            {selected && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-3 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100">

                        <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <span className="text-xs font-black tracking-wide text-amber-400 block">{getPopupTitle()}</span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {/* 🔥 ปรับตัวหนังสือหัว Popup เล็กน้อยให้เหมาะกับโหมดรายเดือน */}
                                    {month ? (
                                        `ประจำวันที่ ${info?.dateNum} (${info?.dayName}) ${new Date(selected._id).toLocaleDateString('th-TH', {month: 'short', year: 'numeric'})}`
                                    ) : (
                                        `ประจำเดือน ${new Date(selected._id + "-02").toLocaleString('th-TH', {month: 'long', year: 'numeric'})}`
                                    )}
                                </span>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-white text-lg font-black px-2">×</button>
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

                                {/* 🎯 ส่วนการเจาะลึกอาหารขายดีประจำช่วงเวลา (เมื่อกดดูรายเดือน เมนูก็จะม้วนรวมยอดขายทั้งเดือนมาเรียงลำดับให้ทันที!) */}
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

                                                            {/* LEVEL 1 */}
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

                                                            {/* LEVEL 2 */}
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

                                                                                {/* LEVEL 3 */}
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
        </div>
    );
};

export default MonthlyReport;