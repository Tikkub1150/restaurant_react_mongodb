import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // เช็คสถานะไฮไลต์ปุ่มปัจจุบัน
    const isActive = (path) => location.pathname.includes(path) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800';

    return (
        <nav className="bg-gray-900 text-white px-3 py-2 flex justify-between items-center shadow-md sticky top-0 z-40">            {/* ฝั่งซ้าย: โลโก้และชื่อย่อ */}
            <div
                onClick={() => window.location.reload()}
                className="cursor-pointer flex items-center gap-1.5"
            >
                <span className="bg-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-md">แอดมิน</span>
                <h1 className="text-xs font-black tracking-tight">ระบบหลังบ้าน</h1>
            </div>

            {/* ฝั่งขวา: ปุ่มเมนูภาษาไทย ขนาดเล็กกระชับพื้นที่ */}
            <div className="flex gap-1 bg-gray-950 p-0.5 rounded-lg border border-gray-800">
                <button
                    onClick={() => navigate('/admin/products')}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-all ${isActive('products')}`}
                >
                    คลังสินค้า
                </button>
                <button
                    onClick={() => navigate('/admin/report/monthly')}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-all ${isActive('monthly')}`}
                >
                    รายงานเดือน
                </button>
            </div>
        </nav>
    );
};

export default AdminNavbar;