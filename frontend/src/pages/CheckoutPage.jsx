import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
const apiBaseUrl = process.env.REACT_APP_API_URL;
const REACT_APP_WEB_URL = process.env.REACT_APP_WEB_URL;

const CheckoutPage = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

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
                // เรียกผ่าน axios config เดิมของพี่ วิ่งเข้าเส้น /api/images/qr-images
                const res = await api.get('/api/images/qr-images');
                setQrList(res.data);
                if (res.data.length > 0) {
                    setSelectedQr(res.data[0]);
                }
                setQrLoading(false);
            } catch (err) {
                console.error("ดึงข้อมูลรูปภาพ QR ล้มเหลว:", err);
                setQrLoading(false);
            }
        };
        fetchQrData();
    }, []);


    // --- คำนวณยอดแบบปัดเศษทิ้ง ---
    const subTotal = orders.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discountAmount = Math.floor((subTotal * discountPercent) / 100);
    const grandTotal = Math.floor(subTotal - discountAmount); // ปัดเศษทิ้ง
    const change = cashReceived ? Math.floor(Number(cashReceived) - grandTotal) : 0; // ปัดเศษทิ้ง

    // --- Validate Logic ---
    const isNameReady = discountPercent > 0 ? customerName.trim() !== "" : true;
    const isCashReady = cashReceived !== "" && Number(cashReceived) >= grandTotal;

    const handlePrint = () => { window.print(); };

    // --- ฟังก์ชันชำระเงินลง Database จริง ---
    const handlePayment = async (method) => {
        try {
            const currentShift = localStorage.getItem('working_shift') || 'morning';

            // 1. ดักค่าเงินสดรับ/เงินทอนตามจริง ถ้าเป็นโอนเงินให้เป็นยอดพอดี
            const finalCashReceived = method === 'cash' ? (Number(cashReceived) || grandTotal) : grandTotal;
            const finalChangeGiven = method === 'cash' ? Math.max(0, change) : 0;

            // 2. ยิงเข้าเส้นปิดบิลโดยส่งค่า totalAmount ให้ถูกต้อง
            await api.put(`/api/orders/close/${tableId}`, {
                paymentMethod: method,                  // 'cash' หรือ 'promptpay'
                discount: discountPercent,              // % ส่วนลด
                discountAmount: discountAmount,         // ยอดเงินส่วนลด (บาท)
                totalAmount: subTotal,                  // 🎯 แก้ตรงนี้! ส่งยอดรวมเต็ม (ก่อนหักส่วนลด) ไปเก็บในฟิลด์หลัก
                cashReceived: finalCashReceived,        // ยอดรับเงินจริง
                changeGiven: finalChangeGiven,          // เงินทอน
                customerName: customerName,
                shift: currentShift,
                items: orders,                          // ยิง Array อาหารไปทำ Snapshot
                closedAt: new Date()
            });

            navigate('/');
        } catch (err) {
            alert("ปิดบิลไม่สำเร็จ: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans pb-10">

            {/* 1. ส่วนใบสรุปยอด (แสดง Option) - ปรับกระชับพื้นที่สำหรับโทรศัพท์ */}
            <div id="print-area" className="bg-white p-4 m-2 rounded-[2rem] shadow-sm border border-gray-100 text-black">
                {/* ชายสี่กับโต๊ะอยู่บรรทัดเดียวกัน ลด padding และขนาดลง */}
                <div className="flex justify-between items-baseline mb-2 border-b-2 border-dashed pb-1.5">
                    <h1 className="text-sm font-black uppercase text-red-600">ต.ติ๊ก ต้มเลือดหมู</h1>
                    <p className="text-xs font-bold uppercase text-blue-600">โต๊ะ: {tableInfo?.table_name}</p>
                </div>

                {/* 2. รายการอาหาร เพิ่มราคาต่อชิ้น @ ต่อจากจำนวน */}
                <div className="space-y-1 mb-2">
                    {orders.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-bold text-gray-600">
                        <span className="flex-1 pr-4 italic">
                            {/* 1. แสดงชื่อเมนูอาหารหลัก */}
                            {item.name}

                            {/* 2. แสดงตัวเลือกเสริม (ถ้ามี) */}
                            {item.options && item.options.length > 0 && (
                                <span className="text-blue-500 font-normal ml-1">
                                    ({item.options.map(o => o.label).join(', ')})
                                </span>
                            )}

                            {/* 3. แสดงจำนวนชิ้น และราคากล่อง */}
                            <span className="ml-1 text-gray-400">x{item.quantity}</span>
                            <span className="ml-1 text-blue-600 font-extrabold">@{item.price.toLocaleString()}</span>

                            {/* 🎯 4. จุดที่เพิ่ม: แสดงหมายเหตุ (Note) แบบขึ้นบรรทัดใหม่เล็กๆ สีส้มสะดุดตา */}
                            {item.note && (
                                <div className="text-orange-500 font-medium text-[11px] not-italic mt-0.5 pl-2">
                                    📝 หมายเหตุ: {item.note}
                                </div>
                            )}
                        </span>

                            {/* ราคารวมของเมนูนั้นๆ */}
                            <span>{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {/* 3. ยอดรวมสุทธิ กับ เงิน ปรับเล็กลง ไม่เทอะทะ */}
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
                    {/* ปรับยอดสุทธิกล่องให้เล็กลง */}
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

            {/* ส่วนชำระเงินและปุ่มคีย์บอร์ด */}
            <div className="px-4 space-y-2 no-print">
                <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100">

                    {/* 4, 5, 6. เปลี่ยนเป็นคีย์บอร์ด 3 คอลัมน์ ขนาดเท่ากัน และลบปุ่ม C ออก */}
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

                    {/* 7. ช่องใส่จำนวนเงิน ปรับให้เล็กลงอีกเยอะเลย */}
                    <input
                        type="number"
                        pattern="\d*"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-center text-xl font-black p-2 bg-gray-50 rounded-xl outline-none border-2 border-blue-200 text-blue-600"
                    />
                </div>

                {/* 8. ปุ่มชำระเงิน กับ QR CODE ปรับขนาดให้เล็กลงนิดนึงพองาม */}
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

            {/* ส่วนเลือกส่วนลด (ย้ายมาอยู่ด้านล่าง) */}
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

            {/* 9. ปุ่มพิมพ์บิล Preview (ยังสั่งพิมพ์ได้เหมือนเดิม 100%) */}
            <button onClick={handlePrint} className="mt-6 no-print text-gray-300 text-[10px] font-bold uppercase py-6 border-t w-full">
                🖨️ พิมพ์ใบสรุปรายการ (Preview)
            </button>

            {/* Popup QR Code */}
            {showQR && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-xs overflow-hidden shadow-2xl">
                        <div className="bg-gray-50 p-4 text-center border-b">
                            <h3 className="font-black text-base text-red-600 uppercase italic">ต.ติ๊ก ต้มเลือดหมู</h3>
                            <p className="text-[9px] font-bold text-gray-400 tracking-widest">เลือกช่องทางชำระเงิน</p>
                        </div>

                        {/* 🎯 แท็บสลับ แบบที่ 1 และ แบบที่ 2 */}
                        <div className="flex border-b text-[10px] font-black overflow-x-auto no-scrollbar">
                            {qrLoading ? (
                                <div className="p-3 text-center text-gray-400 w-full">กำลังโหลด...</div>
                            ) : (
                                qrList.map((qr) => (
                                    <button
                                        key={qr._id}
                                        type="button"
                                        onClick={() => setSelectedQr(qr)}
                                        className={`flex-1 min-w-[90px] py-3 transition-all ${selectedQr?._id === qr._id ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        {qr.title}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="p-4 text-center">
                            {/* 🎯 แสดงรูปภาพ QR Code สลับตามแท็บ ดึงจากโฟลเดอร์ money ตรงๆ */}
                            {selectedQr ? (
                                <>
                                    {/* 🎯 แสดงรูปภาพ QR Code ดึงพาธและชื่อไฟล์ตามชุดข้อมูลใน Database */}
                                    <img
                                        src={`${REACT_APP_WEB_URL}/image/${selectedQr.folder}/${selectedQr.filename}`}
                                        className="mx-auto border-4 border-gray-50 rounded-2xl w-44 h-44 object-contain"
                                        alt="qr-payment"
                                    />

                                    {/* 🎯 แสดงชื่อบัญชีของช่องทางนั้นๆ ตัวหนาชัดเจน */}
                                    <span className="text-xs font-black text-gray-950 mt-2 mb-3 block">
                                        {selectedQr.name}
                                    </span>
                                </>
                            ) : (
                                <div className="w-44 h-44 flex items-center justify-center mx-auto text-gray-400 font-bold text-xs">ไม่มีข้อมูล QR</div>
                            )}

                            {/* ยอดเงินรวมของพี่อลิสเหมือนเดิม */}
                            <p className="text-2xl font-black text-blue-600 mb-4">{grandTotal.toLocaleString()}.-</p>

                            <div className="space-y-2">
                                <button onClick={() => handlePayment('promptpay')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-base shadow-md active:scale-95">ยืนยันการโอนเงิน</button>
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
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none; }
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );
};

export default CheckoutPage;