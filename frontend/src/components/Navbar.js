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
        <nav className="bg-white border-b sticky top-0 z-[100] px-4 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
                <Link to="/" className="text-xl font-black italic tracking-tighter text-red-600 shrink-0">
                    ต.ติ๊ก <span className="text-gray-800 text-sm not-italic">POS</span>
                </Link>

                {/* 📜 ปุ่มประวัติของเดิม */}
                <button
                    onClick={() => navigate('/history')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all ${
                        location.pathname === '/history'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    📜 ประวัติ
                </button>

                {/* 📦 ปุ่มระบบแจ้งของหมด/สั่งซื้อวัตถุดิบตัวใหม่ที่พี่อลิสสั่งเพิ่ม */}
                <button
                    onClick={() => navigate('/restock')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1 ${
                        location.pathname === '/restock'
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-orange-50 text-orange-600 hover:bg-orange-100/80'
                    }`}
                >
                    <span>📦</span> Restock Materials
                </button>
            </div>

            <select
                value={shift}
                onChange={handleShiftChange}
                className={`text-[11px] font-black border-2 rounded-xl px-2 py-1 outline-none ${
                    shift === 'morning' ? 'border-blue-500 text-blue-600' : 'border-orange-500 text-orange-600'
                }`}
            >
                <option value="morning">☀️ รอบเช้า</option>
                <option value="afternoon">🌆 รอบบ่าย</option>
            </select>
        </nav>
    );
};

export default Navbar;