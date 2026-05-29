import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
const REACT_APP_WEB_URL = process.env.REACT_APP_WEB_URL;
const SPLIT_TABLE_ID = process.env.REACT_APP_SPLIT_TABLE_ID;

const CheckoutPage = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // 🔀 ตรวจสอบว่ารอบนี้ถูกส่งมาแบบ "แยกบิล" หรือไม่
    const isSplitBill = location.state?.isSplitBill || false;
    const originalTableId = location.state?.originalTableId || tableId;

    const [orders] = useState(location.state?.cart || []);
    const [tableInfo] = useState(location.state?.tableInfo || null);

    const [discountPercent, setDiscountPercent] = useState(0);
    const [customerName, setCustomerName] = useState("");
    const [cashReceived, setCashReceived] = useState("");
    const [showQR, setShowQR] = useState(false);
    const [qrList, setQrList] = useState([]);
    const [selectedQr, setSelectedQr] = useState(null);
    const [qrLoading, setQrLoading] = useState(true);

    useEffect(() => {
        const fetchQrData = async () => {
            try {
                const res = await api.get('/api/images/qr-images');
                const allQrs = res.data;
                setQrList(allQrs);

                // 🔍 1. หาตัวที่เป็น 'active' เพื่อเซ็ตเป็นแท็บเริ่มต้น
                const defaultActive = allQrs.find(qr => qr.status === 'active');

                if (defaultActive) {
                    setSelectedQr(defaultActive);
                } else {
                    // 🛡️ 2. Fallback: ถ้าลืมตั้งค่า active ไว้ ให้ดึงตัวแรกที่ไม่ได้ disabled มาโชว์แทน
                    const firstAvailable = allQrs.find(qr => qr.status !== 'disabled');
                    setSelectedQr(firstAvailable || null);
                }

                setQrLoading(false);
            } catch (err) {
                console.error(err);
                setQrLoading(false);
            }
        };

        // ... (ส่วนอื่นของ useEffect)
        fetchQrData();
    }, []);

    const subTotal = orders.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discountAmount = Math.floor((subTotal * discountPercent) / 100);
    const grandTotal = Math.floor(subTotal - discountAmount);
    const change = cashReceived ? Math.floor(Number(cashReceived) - grandTotal) : 0;

    const isNameReady = discountPercent > 0 ? customerName.trim() !== "" : true;
    const isCashReady = cashReceived !== "" && Number(cashReceived) >= grandTotal;

    const handlePrint = () => { window.print(); };

    const handlePayment = async (method) => {
        try {
            const currentShift = localStorage.getItem('working_shift') || 'morning';
            const finalCashReceived = method === 'cash' ? (Number(cashReceived) || grandTotal) : grandTotal;
            const finalChangeGiven = method === 'cash' ? Math.max(0, change) : 0;

            if (isSplitBill) {
                // 🔀 ลอจิกแยกบิล: สร้างบิลที่โต๊ะจำลอง -> ปิดบิล -> ลบของออกจากโต๊ะเก่า -> เด้งกลับ
                const targetTableId = SPLIT_TABLE_ID || "split_table_001";
                const splitTableName = `${tableInfo?.table_name} (แยกบิล)`;

                // 1. สร้างบิลจำลอง
                await api.post('/api/orders', {
                    tableId: targetTableId,
                    table_name: splitTableName,
                    items: orders,
                    status: 'draft',
                    totalAmount: subTotal,
                });

                // 2. ปิดบิลที่โต๊ะจำลอง
                await api.put(`/api/orders/close/${targetTableId}`, {
                    paymentMethod: method,
                    discount: discountPercent,
                    discountAmount: discountAmount,
                    totalAmount: subTotal,
                    cashReceived: finalCashReceived,
                    changeGiven: finalChangeGiven,
                    customerName: customerName,
                    shift: currentShift,
                    items: orders,
                    closedAt: new Date()
                });

                // 3. วนลบรายการที่จ่ายเสร็จแล้ว ออกจากบิลของโต๊ะหลัก (API หลังบ้านจะ Recalculate ให้เองอัตโนมัติ)
                for (const item of orders) {
                    await api.delete(`/api/orders/item/${item._id}`);
                }

                // 4. เด้งกลับไปหน้าโต๊ะเดิม
                navigate(`/order/${originalTableId}`);
            } else {
                // 💳 ลอจิกปิดบิลเต็มรูปแบบ (ปกติ)
                await api.put(`/api/orders/close/${tableId}`, {
                    paymentMethod: method,
                    discount: discountPercent,
                    discountAmount: discountAmount,
                    totalAmount: subTotal,
                    cashReceived: finalCashReceived,
                    changeGiven: finalChangeGiven,
                    customerName: customerName,
                    shift: currentShift,
                    items: orders,
                    closedAt: new Date()
                });
                navigate('/');
            }
        } catch (err) {
            alert("ปิดบิลไม่สำเร็จ: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans pb-10">
            <div id="print-area" className="bg-white p-4 m-2 rounded-[2rem] shadow-sm border border-gray-100 text-black">
                <div className="flex justify-between items-baseline mb-2 border-b-2 border-dashed pb-1.5">
                    <h1 className="text-sm font-black uppercase text-red-600">ต.ติ๊ก ต้มเลือดหมู</h1>
                    <p className="text-xs font-bold uppercase text-blue-600">
                        โต๊ะ: {tableInfo?.table_name} {isSplitBill && <span className="text-orange-500">(แยกบิล)</span>}
                    </p>
                </div>

                <div className="space-y-1 mb-2">
                    {orders.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-bold text-gray-600">
                        <span className="flex-1 pr-4 italic">
                            {item.name}
                            {item.options && item.options.length > 0 && (
                                <span className="text-blue-500 font-normal ml-1">
                                    ({item.options.map(o => o.label).join(', ')})
                                </span>
                            )}
                            <span className="ml-1 text-gray-400">x{item.quantity}</span>
                            <span className="ml-1 text-blue-600 font-extrabold">@{item.price.toLocaleString()}</span>
                            {item.note && (
                                <div className="text-orange-500 font-medium text-[11px] not-italic mt-0.5 pl-2">
                                    📝 หมายเหตุ: {item.note}
                                </div>
                            )}
                        </span>
                            <span>{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-dashed pt-2 space-y-0.5 text-xs font-bold">
                    <div className="flex justify-between text-gray-400">
                        <span>ยอดรวม</span>
                        <span>{subTotal.toLocaleString()}</span>
                    </div>
                    {discountPercent > 0 && (
                        <div className="flex justify-between text-red-500">
                            <span>ส่วนลด {discountPercent}%</span>
                            <span>-{discountAmount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-black bg-blue-50 p-2 rounded-xl text-blue-700 my-1">
                        <span>ยอดสุทธิ</span>
                        <span>{grandTotal.toLocaleString()}.-</span>
                    </div>
                    <div className="flex justify-between text-gray-500 border-t pt-1">
                        <span>รับเงิน</span>
                        <span>{cashReceived ? Number(cashReceived).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex justify-between font-black text-orange-600 text-base">
                        <span>เงินทอน</span>
                        <span className="underline decoration-double">{change > 0 ? change.toLocaleString() : '0'}</span>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-2 no-print">
                <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                        <button
                            onClick={() => setCashReceived(grandTotal)}
                            className="bg-green-500 text-white py-2.5 rounded-xl font-black text-xs shadow-sm active:scale-95"
                        >
                            จ่ายเงินพอดี
                        </button>
                        {[100, 200, 300, 500, 1000].map(val => (
                            <button
                                key={val}
                                onClick={() => setCashReceived(val)}
                                className="bg-white border border-gray-200 py-2.5 rounded-xl font-black text-gray-700 text-xs active:bg-blue-50 shadow-2xs"
                            >
                                {val}
                            </button>
                        ))}
                    </div>

                    <input
                        type="number"
                        pattern="\d*"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-center text-xl font-black p-2 bg-gray-50 rounded-xl outline-none border-2 border-blue-200 text-blue-600"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        disabled={!isCashReady || !isNameReady}
                        onClick={() => handlePayment('cash')}
                        className={`py-4 rounded-[1.5rem] font-black text-base shadow-md transition-all ${isCashReady && isNameReady ? 'bg-blue-600 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        ชำระเงินสด
                    </button>
                    <button
                        disabled={!isNameReady}
                        onClick={() => setShowQR(true)}
                        className={`py-4 rounded-[1.5rem] font-black text-base shadow-md transition-all ${isNameReady ? 'bg-purple-600 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        QR CODE
                    </button>
                </div>
            </div>

            <div className="px-4 mt-4 no-print">
                <div className={`p-3 rounded-2xl border-2 transition-all ${discountPercent > 0 && !customerName ? 'bg-red-50 border-red-500' : 'bg-white border-dashed border-gray-200'}`}>
                    <div className="flex gap-1.5 mb-2">
                        {[0, 5, 10, 30].map(p => (
                            <button key={p} onClick={() => setDiscountPercent(p)} className={`flex-1 py-2 rounded-lg font-black border ${discountPercent === p ? 'bg-gray-800 border-gray-800 text-white shadow-xs' : 'bg-white border-gray-100 text-gray-400 text-xs'}`}>
                                {p}%
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={discountPercent > 0 ? "!!! กรุณาใส่ชื่อผู้ให้ส่วนลด !!!" : "ชื่อลูกค้า / พนักงาน..."}
                        className={`w-full p-2.5 rounded-xl font-bold text-center text-xs outline-none border transition-all ${discountPercent > 0 && !customerName ? 'bg-white border-red-500' : 'bg-gray-50 border-transparent focus:border-blue-500'}`}
                    />
                </div>
            </div>

            <button onClick={handlePrint} className="mt-6 no-print text-gray-300 text-[15px] font-bold uppercase py-6 border-t w-full">
                🖨️ พิมพ์ใบสรุปรายการ (Preview)
            </button>

            {showQR && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-xs overflow-hidden shadow-2xl">
                        <div className="bg-gray-50 p-4 text-center border-b">
                            <h3 className="font-black text-base text-red-600 uppercase italic">ต.ติ๊ก ต้มเลือดหมู</h3>
                            <p className="text-[9px] font-bold text-gray-400 tracking-widest">เลือกช่องทางชำระเงิน</p>
                        </div>

                        {/* ส่วนหัวแท็บ */}
                        <div className="flex border-b text-[10px] font-black overflow-x-auto no-scrollbar">
                            {qrLoading ? (
                                <div className="p-3 text-center text-gray-400 w-full">กำลังโหลด...</div>
                            ) : (
                                (() => {
                                    // 🚫 ตัดตัวที่เป็น disabled ทิ้งไปเลย
                                    const visibleQrs = qrList.filter(qr => qr.status !== 'disabled');

                                    if (visibleQrs.length === 0) {
                                        return <div className="p-3 text-center text-red-500 w-full">ไม่มีช่องทางชำระเงินที่เปิดใช้งาน</div>;
                                    }

                                    return visibleQrs.map((qr) => (
                                        <button
                                            key={qr._id}
                                            type="button"
                                            onClick={() => setSelectedQr(qr)}
                                            className={`flex-1 min-w-[90px] py-3 transition-all ${selectedQr?._id === qr._id ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {qr.title}
                                        </button>
                                    ));
                                })()
                            )}
                        </div>

                        {/* ส่วนแสดง QR Code */}
                        <div className="p-4 text-center">
                            {selectedQr ? (
                                <>
                                    <img
                                        src={`${REACT_APP_WEB_URL}/image/${selectedQr.folder}/${selectedQr.filename}`}
                                        className="mx-auto border-4 border-gray-50 rounded-2xl w-44 h-44 object-contain"
                                        alt="qr-payment"
                                    />
                                    <span className="text-xs font-black text-gray-950 mt-2 mb-3 block">
                            {selectedQr.name}
                        </span>
                                </>
                            ) : (
                                <div className="w-44 h-44 flex items-center justify-center mx-auto text-gray-400 font-bold text-xs">ไม่มีข้อมูล QR</div>
                            )}

                            <p className="text-2xl font-black text-blue-600 mb-4">{grandTotal.toLocaleString()}.-</p>

                            <div className="space-y-2">
                                <button onClick={() => handlePayment(selectedQr?.method)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-base shadow-md active:scale-95">ยืนยันการชำระเงิน</button>
                                <button onClick={() => setShowQR(false)} className="w-full text-gray-400 font-bold py-1 text-xs">ปิดหน้าต่าง</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
    @media print {
        body * { visibility: hidden; }
        #print-area, #print-area * { visibility: visible; }
        
        #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            border: none;
            zoom: 150%; 
        }

        .no-print { display: none !important; }
    }
`}} />
        </div>
    );
};

export default CheckoutPage;