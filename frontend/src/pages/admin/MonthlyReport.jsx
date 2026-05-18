import React, { useState, useEffect } from 'react';
import axios from 'axios';
const apiBaseUrl = process.env.REACT_APP_API_URL;

const MonthlyReport = () => {
    const [report, setReport] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    // 📊 ระบบ Popup แยกสถานะ
    const [selected, setSelected] = useState(null); // เก็บก้อนข้อมูลของวันนั้นๆ
    const [popupShift, setPopupShift] = useState("all"); // 'morning' | 'afternoon' | 'all'

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await axios.get(`${apiBaseUrl}/api/orders/report/monthly`, {
                    params: { year, month }
                });
                setReport(res.data);
            } catch (err) {
                console.error("Report Error:", err);
            }
        };
        fetchReport();
    }, [year, month]);

    const getDayInfo = (dateStr) => {
        const date = new Date(dateStr);
        const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        return {
            dateNum: date.getDate(),
            dayName: days[date.getDay()],
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        };
    };

    // ฟังก์ชันช่วยดึงหัวข้อของ Popup ตามกะที่กด
    const getPopupTitle = () => {
        if (popupShift === 'morning') return "☀️ ยอดขาย กะเช้า";
        if (popupShift === 'afternoon') return "🌤️ ยอดขาย กะบ่าย";
        return "💰 ยอดขาย รวมทั้งหมด";
    };

    // ฟังก์ชันดึงยอดแยกตามประเภทและตามกะที่เลือก
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
        // กรณีดึงยอดรวม 'all' ทั้งวัน
        return {
            net: selected.totalNet || 0,
            cash: selected.cashTotal || 0,
            transfer: selected.transferTotal || 0,
            lineman: selected.linemanTotal || 0
        };
    };

    const metrics = getDisplayMetrics();
    const info = selected ? getDayInfo(selected._id) : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-xs font-bold text-gray-900">
            {/* ส่วนหัวและตัวเลือกเดือน/ปี */}
            <div className="bg-white p-3 rounded-b-2xl border-b border-gray-200 shadow-2xs mb-3 sticky top-0 z-40">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-black tracking-tight text-gray-900">📊 รายงานยอดขายประจำเดือน</h2>
                </div>
                <div className="flex gap-2">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="flex-grow bg-gray-50 p-2 rounded-xl border border-gray-300 font-black outline-none"
                    >
                        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y + 543}</option>)}
                    </select>
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="flex-grow bg-gray-50 p-2 rounded-xl border border-gray-300 font-black outline-none"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(2000, i).toLocaleString('th-TH', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ส่วนตารางรายงานบนมือถือ */}
            <div className="px-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                        <tr className="bg-gray-900 text-white text-center">
                            <th className="p-2 border border-gray-800 w-14">วันที่</th>
                            <th className="p-2 border border-gray-800 bg-amber-600/20 text-amber-500">☀️ เช้า</th>
                            <th className="p-2 border border-gray-800 bg-blue-600/10 text-blue-500">🌤️ บ่าย</th>
                            <th className="p-2 border border-gray-800 text-green-400">💰 รวม</th>
                        </tr>
                        </thead>
                        <tbody>
                        {report.map((day) => {
                            const dayInfo = getDayInfo(day._id);
                            return (
                                <tr key={day._id} className="border-b border-gray-200 hover:bg-gray-50/80 transition-colors">
                                    {/* วันที่ */}
                                    <td className={`p-2 text-center border-r font-black ${dayInfo.isWeekend ? 'bg-red-50 text-red-600' : 'text-gray-700'}`}>
                                        {dayInfo.dateNum} ({dayInfo.dayName})
                                    </td>

                                    {/* ยอดเช้า */}
                                    <td
                                        onClick={() => { setSelected(day); setPopupShift("morning"); }}
                                        className="p-2 text-right border-r font-black text-amber-700 bg-amber-50/40 active:bg-amber-100 cursor-pointer"
                                    >
                                        {day.morningNet > 0 ? `${day.morningNet.toLocaleString()}` : '-'}
                                    </td>

                                    {/* ยอดบ่าย */}
                                    <td
                                        onClick={() => { setSelected(day); setPopupShift("afternoon"); }}
                                        className="p-2 text-right border-r font-black text-blue-700 bg-blue-50/20 active:bg-blue-100 cursor-pointer"
                                    >
                                        {day.afternoonNet > 0 ? `${day.afternoonNet.toLocaleString()}` : '-'}
                                    </td>

                                    {/* ยอดรวม */}
                                    <td
                                        onClick={() => { setSelected(day); setPopupShift("all"); }}
                                        className="p-2 text-right font-black text-green-600 bg-green-50/30 active:bg-green-100 cursor-pointer"
                                    >
                                        {(day.totalNet || 0).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                        {report.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-8 text-gray-400">ไม่มีข้อมูลของเดือนนี้ครับ 📭</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 📥 หน้าต่าง POPUP แยกยอดขายตามกะเวลาอย่างแม่นยำ */}
            {selected && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-3 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl flex flex-col my-auto overflow-hidden border border-gray-100">

                        {/* ส่วนหัว ปรับตามปุ่มที่กด */}
                        <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center">
                            <div>
                                <span className="text-xs font-black tracking-wide text-amber-400 block">
                                    {getPopupTitle()}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    ประจำวันที่ {info?.dateNum} ({info?.dayName}) {new Date(selected._id).toLocaleDateString('th-TH', {month: 'short', year: 'numeric'})}
                                </span>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-white text-lg font-black px-2">×</button>
                        </div>

                        {/* ตัวเลขยอดขายแยกช่องทาง */}
                        <div className="p-4 bg-gray-50 space-y-3">

                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-center">
                                <span className="text-[10px] text-gray-400 block mb-0.5">ยอดขายสุทธิ (หักส่วนลดแล้ว)</span>
                                <span className="text-xl font-black text-gray-950">{metrics.net.toLocaleString()} <span className="text-xs font-bold text-gray-500">บาท</span></span>
                            </div>

                            <div className="space-y-1.5">
                                {/* เงินสด */}
                                <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">💵</span>
                                        <span className="text-gray-500 font-bold">เงินสด</span>
                                    </div>
                                    <span className="font-black text-gray-900">{metrics.cash.toLocaleString()}.-</span>
                                </div>

                                {/* เงินโอน */}
                                <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">📱</span>
                                        <span className="text-gray-500 font-bold">เงินโอน</span>
                                    </div>
                                    <span className="font-black text-blue-600">{metrics.transfer.toLocaleString()}.-</span>
                                </div>

                                {/* Lineman */}
                                <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-200 shadow-3xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">🛵</span>
                                        <span className="text-gray-500 font-bold">Lineman</span>
                                    </div>
                                    <span className="font-black text-green-600">{metrics.lineman.toLocaleString()}.-</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-white border-t">
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