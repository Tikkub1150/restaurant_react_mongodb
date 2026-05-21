// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TablePage from './pages/TablePage';
import OrderPage from './pages/OrderPage';
import CheckoutPage from './pages/CheckoutPage';
import HistoryPage from './pages/HistoryPage';

// นำเข้าหน้าฟังก์ชันจัดสั่งวัตถุดิบตัวใหม่ที่เราเพิ่งสร้าง
import RestockPage from './pages/RestockPage';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import MonthlyReport from './pages/admin/MonthlyReport';
import AdminProducts from './pages/admin/AdminProducts';

function App() {
    return (
        <Router>
            <Routes>
                {/* 🏠 กลุ่มหน้าพนักงานปกติ (มีปุ่มสลับเมนูบน Navbar ตัวเดียวกัน) */}
                <Route path="/" element={<><Navbar /><TablePage /></>} />
                <Route path="/order/:tableId" element={<><Navbar /><OrderPage /></>} />
                <Route path="/checkout/:tableId" element={<><Navbar /><CheckoutPage /></>} />
                <Route path="/history" element={<><Navbar /><HistoryPage /></>} />

                {/* 🚀 บรรทัดเจาะรูเชื่อมทางเดินให้หน้าฟังก์ชันสั่งซื้อวัตถุดิบครับพี่ */}
                <Route path="/restock" element={<><Navbar /><RestockPage /></>} />

                {/* 🔑 หน้า Login Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* 🛡️ กลุ่ม Admin Control */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="report/monthly" replace />} />
                    <Route path="report/monthly" element={<MonthlyReport />} />
                    <Route path="products" element={<AdminProducts />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;