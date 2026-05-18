import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';

const AdminLayout = () => {
    const adminAuthData = localStorage.getItem('adminAuthData');

    // 1. ถ้าไม่มีข้อมูลล็อกอิน ให้ดีดไปหน้า Login
    if (!adminAuthData) return <Navigate to="/admin/login" replace />;

    const { expiry } = JSON.parse(adminAuthData);

    // 2. ถ้าหมดอายุ (เกิน 1 อาทิตย์) ให้ลบข้อมูลแล้วดีดไปหน้า Login
    if (new Date().getTime() > expiry) {
        localStorage.removeItem('adminAuthData');
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* ✅ ใช้ Navbar เฉพาะของ Admin */}
            <AdminNavbar />

            {/* ส่วนเนื้อหาของแต่ละหน้า (เช่น MonthlyReport) */}
            <main className="flex-grow">
                <Outlet />
            </main>

            {/* ปุ่ม Logout แบบจางๆ เผื่อพี่อยากล้างเครื่อง */}
            <button
                onClick={() => {
                    if(window.confirm('ยืนยันออกจากระบบ?')){
                        localStorage.removeItem('adminAuthData');
                        window.location.href = '/admin/login';
                    }
                }}
                className="fixed bottom-6 left-6 bg-white/80 backdrop-blur-md text-gray-400 text-[9px] font-black px-4 py-2 rounded-full shadow-sm border border-gray-100 z-50 uppercase tracking-tighter"
            >
                Sign Out
            </button>
        </div>
    );
};

export default AdminLayout;