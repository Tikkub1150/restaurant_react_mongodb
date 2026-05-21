import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import api from '../api/axios';

const apiBaseUrl = process.env.REACT_APP_API_URL;

const RestockPage = () => {
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editingItems, setEditingItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showPopup, setShowPopup] = useState(false); // ควบคุมการเปิด/ปิด Popup สรุปงาน
    const [imageUrl, setImageUrl] = useState(null); // เก็บรูปสรุปที่ Gen เสร็จแล้ว
    const [showDropdown, setShowDropdown] = useState(false); // ควบคุมเมนูจัดการ (สรุป/เคลียร์ราคา)

    const dropdownRef = useRef(null);
    const UNIT_OPTIONS = ["โล", "กำ", "ลูก"];

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/materials');
            setOrders(res.data);
            if (res.data.length > 0) {
                setEditingItems(res.data[activeTab]?.items || res.data[0].items || []);
            }
            setLoading(false);
        } catch (err) {
            console.error("ดึงข้อมูลล้มเหลว:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // ปิด Dropdown เมนูจัดการเมื่อคลิกพื้นที่ภายนอก
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // เมื่อสลับร้านผ่าน Select ดรอปดาวน์
    const handleSelectSupplier = (e) => {
        const index = parseInt(e.target.value, 10);
        setActiveTab(index);
        setEditingItems(orders[index].items || []);
    };

    const handleFieldChange = (itemIdx, field, value) => {
        const updated = [...editingItems];
        updated[itemIdx][field] = value;

        if (field === 'price') {
            updated[itemIdx]['unitPrice'] = value;
        }

        setEditingItems(updated);
    };

    const handleSaveOrder = async (orderId) => {
        try {
            setIsSaving(true);
            await axios.put(`${apiBaseUrl}/api/materials/${orderId}/items`, {
                items: editingItems
            });
            // alert("บันทึกข้อมูลของร้านนี้เข้าฐานข้อมูลสำเร็จแล้วครับ! 💾");
            fetchOrders();
        } catch (err) {
            console.error(err);
            alert("บันทึกไม่สำเร็จ เช็คเซิร์ฟเวอร์หลังบ้านอีกครั้งครับ");
        } finally {
            setIsSaving(false);
        }
    };

    const visibleItems = editingItems.filter(item => item.qty && item.qty.trim() !== "" && item.qty !== "0");
    const currentOrder = orders[activeTab];

    const totalAmount = editingItems.reduce((sum, item) => {
        const priceValue = item.price !== undefined ? item.price : item.unitPrice;
        const price = parseFloat(priceValue) || 0;
        return sum + price;
    }, 0);

    useEffect(() => {
        if (showPopup && visibleItems.length > 0 && !imageUrl) {
            setTimeout(() => {
                const element = document.getElementById('summary-table-area');
                if (!element) return;
                html2canvas(element, {
                    useCORS: true,
                    scale: 2
                }).then((canvas) => {
                    setImageUrl(canvas.toDataURL('image/png'));
                });
            }, 100);
        }
    }, [showPopup, imageUrl, visibleItems]);

    const handleClosePopup = () => {
        setShowPopup(false);
        setImageUrl(null);
    };

    // 🧹 ฟังก์ชันเคลียร์ราคาต้นทุนทั้งหมด + บันทึกลงฐานข้อมูลให้อัตโนมัติทันที
    const handleClearPrices = async () => {
        setShowDropdown(false);
        if (!window.confirm("ต้องการเคลียร์ช่องราคาทั้งหมดของร้านนี้ใช่ไหมครับ? 🧹 (ระบบจะบันทึกให้อัตโนมัติ)")) return;

        // 1. เคลียร์ค่าราคาสินค้าในตัวแปร updated ก่อน
        const updated = editingItems.map(item => ({
            ...item,
            price: "",
            unitPrice: 0
        }));

        // อัปเดตหน้าจอทันทีเพื่อให้พนักงานเห็นว่าค่าหายไปแล้ว
        setEditingItems(updated);

        // 2. 🚀 ยิง API บันทึกเข้าฐานข้อมูลถาวรทันที (ถอดแบบลอจิกมาจาก handleSaveOrder เป๊ะๆ)
        try {
            setIsSaving(true);
            const currentOrder = orders[activeTab]; // ดึงข้อมูลร้านปัจจุบันมาหา ID
            if (!currentOrder) return;

            // ยิงเซิฟเวอร์หลังบ้าน
            await axios.put(`${apiBaseUrl}/api/materials/${currentOrder._id}/items`, {
                items: updated
            });

            // ดึงข้อมูลจากฐานข้อมูลมาอัปเดต State ก้อนใหญ่ใหม่อีกรอบเพื่อความชัวร์
            await fetchOrders();
            alert("ล้างราคาและบันทึกข้อมูลเรียบร้อยครับพี่อลิส! ✨");
        } catch (err) {
            console.error("เกิดข้อผิดพลาดตอนเซฟเคลียร์ราคา:", err);
            alert("บันทึกลงเซิร์ฟเวอร์ไม่สำเร็จ เช็คระบบหลังบ้านอีกครั้งครับพี่");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-sm font-black text-gray-800">กำลังโหลดรายการสด...</div>;

    return (
        <div className="p-2 max-w-md mx-auto font-sans text-sm font-bold text-gray-900 bg-gray-50 min-h-screen pb-24">

            {/* แสดงเนื้อหาวัตถุดิบ */}
            {currentOrder && (
                <div className="space-y-1">

                    {/* 🛠️ แถบหัวกระดาษแบบ All-in-One: รวมดรอปดาวน์เลือกร้าน และ ปุ่มจัดการไว้ด้วยกัน */}
                    <div className="p-2.5 bg-gray-900 text-white rounded-xl flex justify-between items-center shadow-sm border border-gray-800 gap-2">

                        {/* ฝั่งซ้าย: Dropdown สำหรับเลือกร้านค้า (ย้ายมาไว้ตรงนี้เพื่อประหยัดพื้นที่) */}
                        <div className="flex-grow min-w-0 flex items-center gap-1.5 bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-700">
                            <span className="text-xs flex-shrink-0">📍</span>
                            <select
                                value={activeTab}
                                onChange={handleSelectSupplier}
                                className="w-full bg-transparent text-xs text-amber-400 font-black outline-none border-none cursor-pointer pr-1 truncate"
                            >
                                {orders.map((order, idx) => (
                                    <option key={order._id} value={idx} className="bg-gray-900 text-white font-bold">
                                        {order.supplier_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* ฝั่งขวา: เมนูสามจุดสำหรับจัดการ (ดูใบสรุป / เคลียร์ราคา) */}
                        <div className="relative flex-shrink-0" ref={dropdownRef}>
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="text-gray-400 hover:text-white p-2 bg-gray-800 rounded-lg border border-gray-700 active:scale-95 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5?" />
                                </svg>
                            </button>

                            {/* กล่องรายการเมนูภายใน Dropdown */}
                            {showDropdown && (
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                    <button
                                        onClick={() => { setShowPopup(true); setShowDropdown(false); }}
                                        className="w-full text-left px-4 py-3 text-xs text-gray-800 font-black hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 border-b border-gray-100"
                                    >
                                        📋 ดูใบสรุปส่งร้าน
                                    </button>
                                    <button
                                        onClick={handleClearPrices}
                                        className="w-full text-left px-4 py-3 text-xs text-red-600 font-black hover:bg-red-50 active:bg-red-100 flex items-center gap-2"
                                    >
                                        🧹 เคลียร์ราคาร้านนี้
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* รายการวัตถุดิบหลักหน้าฟอร์ม */}
                    <div className="space-y-0.5">
                        {editingItems.map((item, idx) => (
                            <div key={idx} className="bg-white p-0.5 rounded-xl border-2 border-gray-200/80 shadow-xs flex items-center justify-between gap-2">
                                {/* 🎯 ปรับข้อความชื่อรายการให้เป็น text-base (ใหญ่ขึ้น) */}
                                <div className="text-gray-950 text-base font-black tracking-tight flex-grow min-w-0 pr-1 truncate">
                                    <span className="text-gray-400 font-bold">{idx + 1}.</span> {item.name}
                                </div>

                                {/* ช่องกรอกหมายเหตุ/โน้ต (🎯 ขยายขนาดกล่องเป็น w-16 และตัวหนังสือเป็น text-xs) */}
                                <div className="w-12 flex-shrink-0">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={item.comment || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // ดักให้พิมพ์ได้เฉพาะตัวเลขเท่านั้น
                                            if (val === '' || /^[0-9]*$/.test(val)) {
                                                handleFieldChange(idx, 'comment', val);
                                            }
                                        }}
                                        placeholder="โน้ต"
                                        className="w-full bg-gray-50 px-1 py-1.5 rounded-lg border border-gray-300 font-bold text-gray-800 outline-none focus:bg-white text-xs text-center"
                                    />
                                </div>

                                {/* ชุดควบคุมกรอกจำนวนและหน่วย */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {/* 🎯 ช่องกรอกจำนวน (QTY) - ขนาดเล็กพอดีสำหรับ 4 ตัวอักษร พิมพ์อะไรก็ได้อิสระ */}
                                    <input
                                        type="text"
                                        value={item.qty || ''}
                                        onChange={(e) => handleFieldChange(idx, 'qty', e.target.value)}
                                        placeholder="QTY"
                                        className="w-14 bg-gray-50 text-center py-1.5 rounded-lg border border-gray-300 text-gray-950 font-black focus:bg-amber-50 focus:border-amber-400 outline-none text-sm"
                                    />
                                </div>

                                {/* ช่องกรอกราคาค่าเงินบาท (🎯 ขยายขนาดกล่องเป็น w-16 และตัวหนังสือเป็น text-sm) */}
                                <div className="w-12 flex-shrink-0 flex items-center gap-0.5">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*"
                                        value={item.price !== undefined ? item.price : (item.unitPrice || '')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // ล็อกให้พิมพ์ได้เฉพาะตัวเลขและจุดทศนิยมเท่านั้น พิมพ์ตัวหนังสือจะไม่ขึ้น
                                            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                                handleFieldChange(idx, 'price', val);
                                            }
                                        }}
                                        placeholder="บาท"
                                        className="w-full bg-blue-50/50 text-center py-1.5 rounded-lg border border-blue-200 text-blue-900 font-black focus:bg-white focus:border-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 💰 แถวแสดงยอดรวมเงินบาทอัพเดท Real-time ไว้ช่องขวา */}
                    <div className="bg-blue-600 p-3 rounded-xl shadow-xs flex justify-between items-center text-white my-3">
                        <span className="text-xs font-black tracking-wide">💵 ยอดเงินบาทรวมทั้งหมด:</span>
                        <span className="text-base font-black tracking-tight bg-blue-900/40 px-3 py-1 rounded-lg border border-blue-400/30">
                            {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} บาท
                        </span>
                    </div>

                    {/* ปุ่มบันทึกหลักลอยอยู่ก้นจอโทรศัพท์ */}
                    <div className="fixed bottom-0 left-0 right-0 p-2.5 bg-white border-t border-gray-200 shadow-[0_-3px_12px_rgba(0,0,0,0.08)] flex items-center justify-between z-40 max-w-md mx-auto">
                        <div className="text-[11px] text-gray-500 font-bold leading-tight max-w-[45%]">
                            เซฟจำนวนและราคาร้านนี้ให้เรียบร้อยก่อนนะครับ
                        </div>
                        <button
                            onClick={() => handleSaveOrder(currentOrder._id)}
                            disabled={isSaving}
                            className="bg-red-600 active:bg-red-700 text-white px-5 py-3 rounded-xl text-xs font-black shadow-md active:scale-95 transition-all"
                        >
                            {isSaving ? "⏳ กำลังเซฟ..." : "💾 บันทึกสั่งของร้านนี้"}
                        </button>
                    </div>
                </div>
            )}

            {/* 📥 POPUP ใบสรุปเดิม */}
            {showPopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-xs w-full shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex-grow overflow-y-auto p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[260px]">
                            {imageUrl && (
                                <div className="text-center w-full">
                                    <p className="text-[10px] text-emerald-600 font-black mb-2 animate-pulse">
                                        👉 เอานิ้วจิ้มค้างที่รูปภาพเพื่อบันทึกได้เลยครับ!
                                    </p>
                                    <img src={imageUrl} alt="สรุปรายการสั่งของ" className="w-full border border-gray-200 shadow-sm rounded-xl" />
                                </div>
                            )}

                            <div id="summary-table-area" className={`w-full bg-white p-4 ${imageUrl ? 'hidden' : ''}`}>
                                <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-3">
                                    <h3 className="text-[13px] font-black text-gray-900 tracking-tight">📝 ใบสรุปรายการสั่งของ</h3>
                                    <p className="text-[11px] text-red-600 font-black mt-0.5">ร้าน: {currentOrder?.supplier_name}</p>
                                    <p className="text-[9px] text-gray-400 font-normal mt-0.5">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                                </div>

                                <table className="w-full border border-collapse text-[11px] font-bold text-gray-800">
                                    <thead>
                                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-900">
                                        <th className="p-2 text-left">ชื่อวัตถุดิบ</th>
                                        <th className="p-2 text-center w-20">จำนวน</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {visibleItems.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-100 bg-white">
                                            <td className="p-2 font-black text-gray-950">{`${index + 1}. ${item.name}`}</td>
                                            <td className="p-2 text-center font-black text-gray-900 bg-gray-50/50">
                                                {item.qty}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleItems.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="p-6 text-center text-gray-400 font-normal text-[10px]">
                                                ยังไม่ได้กรอกจำนวนวัตถุดิบเลยครับพี่
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>

                                <div className="text-center pt-3 mt-4 border-t border-dashed border-gray-300 text-[9px] text-gray-400 font-normal">
                                    ขอบคุณครับ 🙏✨
                                </div>
                            </div>
                        </div>

                        <div className="p-2 bg-white border-t border-gray-100">
                            <button
                                onClick={handleClosePopup}
                                className="w-full bg-gray-900 active:bg-gray-950 text-white py-2.5 rounded-xl font-black text-[12px] active:scale-95 transition-all text-center"
                            >
                                ❌ ปิดหน้าต่างใบสรุป
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestockPage;