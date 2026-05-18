import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const apiBaseUrl = process.env.REACT_APP_API_URL;
const HistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [historyShift, setHistoryShift] = useState('morning');
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTable, setSelectedTable] = useState('all');

    useEffect(() => {
        fetchHistory();
    }, [historyShift, historyDate]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://tikkubzaza-1234.ddns.net:5000/api/orders/history`, {
                params: { shift: historyShift, date: historyDate }
            });
            setOrders(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Fetch Error:", err);
            setLoading(false);
        }
    };

    const uniqueTables = [...new Set(orders.map(order => order.table_name))].sort((a, b) => a - b);

    const filteredOrders = orders.filter(order =>
        selectedTable === 'all' ? true : order.table_name === selectedTable
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header & Filter */}
            <div className="bg-white p-6 rounded-b-[3rem] shadow-sm mb-6">
                <h1 className="text-3xl font-black mb-6">ประวัติการขาย</h1>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            className="flex-1 p-4 bg-gray-100 rounded-2xl font-bold outline-none text-sm"
                        />
                        <select
                            value={historyShift}
                            onChange={(e) => setHistoryShift(e.target.value)}
                            className="p-4 bg-gray-100 rounded-2xl font-bold outline-none text-sm"
                        >
                            <option value="morning">กะเช้า</option>
                            <option value="afternoon">กะบ่าย</option>
                        </select>
                    </div>

                    {/* แก้ไขเป็น Dropdown เลือกโต๊ะ */}
                    <div className="flex gap-2">
                        <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            className="w-full p-4 bg-gray-100 rounded-2xl font-bold outline-none text-sm"
                        >
                            <option value="all">🔎 แสดงทุกโต๊ะ</option>
                            {uniqueTables.map(t => (
                                <option key={t} value={t}>🪑 โต๊ะ {t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* บิลรายการ */}
            {loading ? (
                <div className="text-center py-10 font-bold text-gray-400">กำลังโหลดข้อมูล...</div>
            ) : (
                <div className="px-4 space-y-4">
                    {filteredOrders.map((order) => {
                        const netTotal = order.totalAmount - (order.discountAmount || 0);

                        return (
                            <div key={order._id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-black italic uppercase">โต๊ะ {order.table_name}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">
                                                {new Date(order.closedAt || order.createdAt).toLocaleTimeString('th-TH')} น.
                                            </span>
                                        </div>
                                        {/* เอาบรรทัดพนักงานออกแล้ว */}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-red-600 leading-none">
                                            {netTotal.toLocaleString()}.-
                                        </p>
                                        <div className="flex flex-col items-end gap-1 mt-1">
                                            {order.discountAmount > 0 && (
                                                <span className="text-[9px] font-bold text-gray-400 line-through">
                                                    จากปกติ {order.totalAmount.toLocaleString()}.-
                                                </span>
                                            )}
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${order.paymentMethod === 'cash' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {order.paymentMethod === 'cash' ? 'เงินสด' : 'โอนจ่าย'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* รายการอาหาร */}
                                <div className="space-y-3 py-4 border-t border-dashed border-gray-100">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="text-xs font-bold text-gray-800">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                                                    <span className="text-xs font-bold text-gray-800">{(item.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                                {/* แสดง Note รายการอาหาร */}
                                                {item.note && (
                                                    <p className="text-[10px] text-orange-500 font-bold italic mt-0.5">
                                                        * {item.note}
                                                    </p>
                                                )}
                                                {item.options?.map((opt, oIdx) => (
                                                    <p key={oIdx} className="text-[10px] text-gray-400 font-medium">+ {opt.label} (+{opt.extraPrice})</p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* สรุปยอดด้านล่าง */}
                                <div className="bg-gray-900 rounded-[1.5rem] p-4 text-white mt-4">
                                    <div className="space-y-2">
                                        {order.discountAmount > 0 && (
                                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase block">ส่วนลด {order.discount}% / {order.cashierName || '-'}</span>
                                                <span className="text-yellow-400 font-black">-{order.discountAmount.toLocaleString()}.-</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                            <span>รับเงินมา</span>
                                            <span>{order.cashReceived?.toLocaleString() || 0}.-</span>
                                        </div>

                                        <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
                                            <span className="text-xs font-black uppercase text-green-400">เงินทอน</span>
                                            <span className="text-xl font-black text-green-400">
                                            {(order.changeGiven || 0).toLocaleString()}.-
                                        </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                onClick={() => navigate('/')}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-12 py-4 rounded-full font-black text-xs shadow-xl active:scale-95"
            >
                กลับหน้าหลัก
            </button>
        </div>
    );
};

export default HistoryPage;