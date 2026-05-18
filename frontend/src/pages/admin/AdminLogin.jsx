import React, { useState, useEffect } from 'react';
import MonthlyReport from './MonthlyReport';

const AdminLogin = () => {
    const [pass, setPass] = useState('');
    const [isAuth, setIsAuth] = useState(false);

    // ตรวจสอบสถานะการล็อกอินเมื่อโหลดหน้า
    useEffect(() => {
        const adminAuthData = localStorage.getItem('adminAuthData');
        if (adminAuthData) {
            const { expiry } = JSON.parse(adminAuthData);
            // ถ้าเวลาปัจจุบันยังไม่ถึงเวลาหมดอายุ
            if (new Date().getTime() < expiry) {
                setIsAuth(true);
            } else {
                // ถ้าหมดอายุแล้ว ให้ลบข้อมูลทิ้ง
                localStorage.removeItem('adminAuthData');
            }
        }
    }, []);

    const checkLogin = (e) => {
        e.preventDefault();
        if (pass === 'หำดำ') {
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const expiryTime = new Date().getTime() + oneWeek;

            localStorage.setItem('adminAuthData', JSON.stringify({
                isLoggedIn: true,
                expiry: expiryTime
            }));

            // ล็อกอินผ่านแล้ว ให้ดีดไปหน้า Report ทันที
            window.location.href = '/admin/report/monthly';
        } else {
            alert('รหัสไม่ถูกต้องครับพี่!');
        }
    };

    // ฟังก์ชัน Logout (เผื่อพี่อยากกดออกเอง)
    const handleLogout = () => {
        localStorage.removeItem('adminAuthData');
        setIsAuth(false);
    };

    if (isAuth) {
        return (
            <div className="relative">
                <MonthlyReport />
                {/* ปุ่ม Logout เล็กๆ มุมจอ */}
                <button
                    onClick={handleLogout}
                    className="fixed bottom-4 right-4 bg-gray-200 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full opacity-50 hover:opacity-100"
                >
                    ออกจากระบบ (Admin)
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 font-sans">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center">
                <div className="text-4xl mb-4">👑</div>
                <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Admin Control</h2>
                <form onSubmit={checkLogin}>
                    <input
                        type="password"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        placeholder="กรอกรหัสผ่าน"
                        className="w-full bg-gray-100 rounded-2xl p-4 mb-4 text-center text-xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    />
                    <button className="w-full py-4 bg-black text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                        ยืนยันตัวตน
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;