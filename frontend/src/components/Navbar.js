import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 👈 ดึงตำแหน่งหน้าปัจจุบันมาเช็คสีปุ่มครับพี่
    const [shift, setShift] = useState(localStorage.getItem('working_shift') || 'morning');

    const handleShiftChange = (e) => {
        const newShift = e.target.value;
        setShift(newShift);
        localStorage.setItem('working_shift', newShift);
        window.location.reload();
    };

    return (
        <nav className="bg-white border-b sticky top-0 z-[100] px-4 py-1 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
                <Link to="/" className="text-4xl font-black italic tracking-tighter text-red-600 shrink-0">
                    ต.ติ๊ก <span className="text-gray-800 text-sm not-italic">POS</span>
                </Link>

                {/* 🛠️ Dropdown รวมเมนูจัดการระบบ */}
                <select
                    value={location.pathname}
                    onChange={(e) => navigate(e.target.value)}
                    className="text-[11px] font-black border-2 border-gray-900 bg-gray-950 text-white rounded-xl px-3 py-1.5 outline-none cursor-pointer active:scale-95 transition-all"
                >
                    {/* ใส่ value="/" ไว้เผื่อหน้าหลัก หรือใช้แสดงเป็นหัวข้อหลัก */}
                    <option value="" disabled hidden>⚙️ เมนูจัดการ</option>
                    <option value="/" className="text-gray-800 bg-white font-medium">🏠 เมนูอื่นๆ</option>
                    <option value="/history" className="text-gray-800 bg-white font-medium">📜 ประวัติการขาย</option>
                    <option value="/restock" className="text-gray-800 bg-white font-medium">📦 สั่งวัตถุดิบ</option>
                </select>
            </div>

            <button
                type="button"
                onClick={() => {
                    // ถ้ารอบปัจจุบันเป็น morning ให้สลับเป็น afternoon ถ้าไม่ใช่ให้กลับเป็น morning
                    const nextShift = shift === 'morning' ? 'afternoon' : 'morning';

                    // ส่ง Event จำลองไปให้ฟังก์ชันเดิมของพี่ทำงานต่อได้เลย
                    handleShiftChange({ target: { value: nextShift } });
                }}
                className={`text-[11px] font-black border-2 rounded-xl px-3 py-1.5 outline-none transition-all duration-200 flex items-center gap-1 active:scale-95 shadow-2xs ${
                    shift === 'morning'
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                        : 'border-yellow-400 text-black bg-white' /* 🌟 เหลืองสว่างสะใจแบบเดิมเป๊ะ */
                }`}
            >
                {shift === 'morning' ? (
                    <>
                        <span>☀️</span>
                        <span>รอบเช้า</span>
                    </>
                ) : (
                    <>
                        <span>🌚</span>
                        <span>รอบบ่าย</span>
                    </>
                )}
            </button>
        </nav>
    );
};

export default Navbar;