import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const apiBaseUrl = process.env.REACT_APP_API_URL;

const TablePage = () => {
    const [tables, setTables] = useState([]);
    const navigate = useNavigate();
    // ดึงค่ากะจาก localStorage
    const currentShift = localStorage.getItem('working_shift') || 'morning';

    useEffect(() => {
        // 1. สร้างฟังก์ชันแยกออกมารับหน้าที่ยิง API
        const fetchTablesData = () => {
            axios.get(`${apiBaseUrl}/api/tables?shift=${currentShift}`)
                .then(res => {
                    setTables(res.data);
                })
                .catch(err => console.error("Error fetching tables:", err));
        };

        // 2. สั่งให้ทำงานทันที 1 ครั้งตอนเปิดหน้าจอ
        fetchTablesData();

        // 3. สั่งให้ทำงานวนลูปซ้ำๆ ทุกๆ 3 วินาที (3000ms) อารมณ์ Ajax Polling
        const intervalId = setInterval(fetchTablesData, 3000);

        // 4. เคลียร์ลูปทิ้งเมื่อพนักงานย้ายหน้า ป้องกันเครื่องหน่วง
        return () => clearInterval(intervalId);
    }, [currentShift]);

    const getStatusStyle = (status) => {
        switch(status) {
            case 'available':
                if (currentShift === 'afternoon') {
                    // กะบ่าย: เส้นขอบสีเหลือง ตัวหนังสือดำ
                    return 'bg-white border-yellow-400 text-black hover:bg-yellow-50/30';
                }
                // กะเช้าหรือกะอื่น: เส้นขอบสีเขียว ตัวหนังสือดำ
                return 'bg-white border-green-500 text-black hover:bg-green-50';

            case 'occupied': return 'bg-red-500 border-red-500 text-white shadow-inner';
            case 'reserved': return 'bg-yellow-400 border-yellow-400 text-white';
            default: return 'bg-gray-200 border-gray-200 text-gray-400';
        }
    };

    return (
        <div className="p-4">
            {/* ลบหัวข้อ "เลือกโต๊ะ" และคำอธิบายสถานะภาษาไทยออกตามสั่ง */}

            {/* ปรับเป็น grid-cols-4 ตามสั่ง */}
            <div className="grid grid-cols-4 gap-2">
                {tables.map(table => (
                    <div key={table._id}>
                        {table.table_status === 'hidden' ? (
                            /* ปรับความสูงช่องซ่อนให้แบนลงเท่ากับขนาดปุ่มจริง (h-14) */
                            <div className="h-14 opacity-0 pointer-events-none"></div>
                        ) : (
                            <button
                                onClick={() => navigate(`/order/${table._id}`)}
                                /* ปรับลดความสูงจาก h-24 ลงมาเหลือ h-14 เพื่อให้ปุ่มแบนลง ประหยัดพื้นที่หน้าจอ */
                                className={`w-full h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 shadow-sm active:scale-95 ${getStatusStyle(table.table_status)}`}
                            >
                                {/* ❌ ลบชื่อ Zone (table.display?.zone) ออกเรียบร้อยตามสั่ง */}

                                <span className="text-1xl font-black">{table.table_name}</span>

                                {/* ใช้จุดสถานะแทนคำว่า OCCUPIED เพื่อประหยัดพื้นที่ */}
                                {table.table_status === 'occupied' && (
                                    /* ปรับลด mt-2 เป็น mt-1 เพื่อความสมดุลหลังจากปุ่มแบนลง */
                                    <div className="w-2 h-2 bg-white rounded-full mt-1 animate-pulse"></div>
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* แสดงสถานะเล็กๆ ด้านล่างแทน */}
            <div className="mt-8 flex justify-center gap-4 text-[10px] font-black text-gray-400 uppercase">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> ว่าง</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> มีลูกค้า</div>
                <div className="ml-4 text-blue-500 italic underline">SHIFT: {currentShift}</div>
            </div>
        </div>
    );
};

export default TablePage;