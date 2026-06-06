import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const OrderPage = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();

    const [tableInfo, setTableInfo] = useState(null);
    const [allTables, setAllTables] = useState([]);
    const [categories, setCategories] = useState([]);
    const [menus, setMenus] = useState([]);
    const [existingOrders, setExistingOrders] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showExisting, setShowExisting] = useState(true);
    const [tableNote, setTableNote] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState("");
    const [selectedOptions, setSelectedOptions] = useState([]);

    const [isEditing, setIsEditing] = useState(false);
    const [editItemId, setEditItemId] = useState(null);

    // 🔀 State สำหรับระบบแยกบิล
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [selectedSplitItemIds, setSelectedSplitItemIds] = useState([]);

    const fetchData = async () => {
        try {
            const [catRes, productRes, tableRes, orderRes, allTablesRes] = await Promise.all([
                api.get('/api/category'),
                api.get('/api/products'),
                api.get(`/api/tables/${tableId}`),
                api.get(`/api/tables/table/${tableId}?status=pending,draft,printed,printing,printed_edited`),
                api.get('/api/tables')
            ]);

            const sortedCats = catRes.data.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
            setCategories(sortedCats);
            if (sortedCats.length > 0 && !selectedCategory) setSelectedCategory(sortedCats[0].name);

            setMenus(productRes.data.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0)));
            setTableInfo(tableRes.data);

            const fetchedTables = allTablesRes.data;
            setAllTables(fetchedTables);
            setExistingOrders(orderRes.data || []);

            if (orderRes.data?.length > 0) {
                setTableNote(orderRes.data[0].tableNote || "");
            }

            setLoading(false);
        } catch (err) {
            console.error("Fetch error:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setIsSplitMode(false);
        setSelectedSplitItemIds([]);
    }, [tableId]);

    const isLineman = tableInfo?.display?.zone === 'lineman';

    const handleOpenEdit = (item) => {
        const product = menus.find(m => m._id === (item.productId?._id || item.productId));
        if (!product) return;
        setSelectedProduct(product);
        setQuantity(item.quantity);
        setNote(item.note || "");
        setSelectedOptions(item.options || []);
        setIsEditing(true);
        setEditItemId(item._id);
        setIsModalOpen(true);
    };

    const handleSaveOrder = async () => {
        try {
            setLoading(true);
            const orderId = existingOrders[0]?._id;

            const itemData = {
                productId: selectedProduct._id,
                name: selectedProduct.name,
                quantity,
                price: selectedProduct.price + selectedOptions.reduce((s, o) => s + (Number(o.extraPrice) || 0), 0),
                options: selectedOptions,
                note: note,
                status: 'pending',
                printer_name: selectedProduct.printer_name,
                categoryName: selectedProduct.category,
            };

            const currentItem = existingOrders[0]?.items?.find(item => item._id === editItemId);

            if (isEditing) {
                itemData.isEdited = true;
                await api.put(`/api/orders/item/${editItemId}`, itemData);
            } else {
                if (orderId) {
                    await api.post('/api/orders/item/add', { ...itemData, orderId });
                } else {
                    await api.post('/api/orders', {
                        tableId,
                        table_name: tableInfo?.table_name,
                        items: [itemData],
                        status: 'pending',
                        shift: tableInfo?.session?.shift || 'error',
                        totalAmount: itemData.price * itemData.quantity,
                        tableNote
                    });
                }
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert("บันทึกไม่สำเร็จ!");
            setLoading(false);
        }
    };

    const handleMoveTable = async (newTableId) => {
        if (!newTableId || newTableId === tableId) return;
        const newTable = allTables.find(t => t._id === newTableId);
        if (!window.confirm(`ย้ายไปโต๊ะ ${newTable?.table_name}?`)) return;
        try {
            setLoading(true);
            await api.put(`/api/tables/move/${tableId}`, { newTableId, newTableName: newTable.table_name });
            navigate(`/order/${newTableId}`, { replace: true });
        } catch (err) {
            alert("ย้ายไม่สำเร็จ");
            setLoading(false);
        }
    };

    const handlePrintOrder = async () => {
        try {
            setLoading(true);
            const order = existingOrders[0];
            if (!order) return alert("ไม่มีรายการ");

            await api.put(`/api/orders/update-note/${order._id}`, { tableNote });
            await api.put(`/api/orders/confirm-print/${order._id}`);
            navigate('/');
        } catch (err) {
            alert('❌ พิมพ์ไม่สำเร็จ');
            setLoading(false);
        }
    };

    const grandTotal = () => {
        return existingOrders.reduce((sum, order) => {
            const itemsTotal = order.items.reduce((iSum, item) => iSum + (item.price * item.quantity), 0);
            return sum + itemsTotal;
        }, 0);
    };

    const handleCheckoutClick = async () => {
        if (existingOrders.length === 0) return;

        if (isLineman) {
            const confirmClose = window.confirm(`ยืนยันการปิดยอดโต๊ะเดลิเวอรี ${tableInfo?.table_name} ทันที?`);
            if (confirmClose) {
                try {
                    setLoading(true);
                    await api.put(`/api/checkout/close/${tableId}`, {
                        paymentMethod: 'lineman',
                        totalAmount: grandTotal()
                    });
                    alert('✅ ปิดโต๊ะเรียบร้อย!');
                    navigate('/', { replace: true });
                } catch (err) {
                    alert('❌ ไม่สามารถปิดยอดได้');
                    setLoading(false);
                }
            }
        } else {
            navigate(`/checkout/${tableId}`, {
                state: {
                    cart: existingOrders.flatMap(o => o.items),
                    total: grandTotal(),
                    tableInfo
                }
            });
        }
    };

    const toggleOption = (option) => {
        const isSelected = selectedOptions.find(o => o.label === option.label);
        isSelected ? setSelectedOptions(selectedOptions.filter(o => o.label !== option.label)) : setSelectedOptions([...selectedOptions, option]);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return 'text-blue-500';
            case 'printing': return 'text-red-500';
            case 'printed': return 'text-green-500';
            default: return 'text-gray-400';
        }
    };

    const handleUpdateTableNote = async (value) => {
        const orderId = existingOrders?.[0]?._id;
        if (!orderId) return;
        try {
            await api.put(`/api/orders/update-note/${orderId}`, { tableNote: value });
        } catch (err) {
            console.error("บันทึกหมายเหตุโต๊ะล้มเหลว:", err);
        }
    };

    // 🔀 ฟังก์ชันสำหรับระบบแยกบิล
    const toggleSplitItem = (itemId) => {
        if (selectedSplitItemIds.includes(itemId)) {
            setSelectedSplitItemIds(selectedSplitItemIds.filter(id => id !== itemId));
        } else {
            setSelectedSplitItemIds([...selectedSplitItemIds, itemId]);
        }
    };

    const getSplitTotal = () => {
        const splitItems = existingOrders.flatMap(o => o.items).filter(i => selectedSplitItemIds.includes(i._id));
        return splitItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleSplitCheckoutClick = () => {
        const splitItems = existingOrders.flatMap(o => o.items).filter(i => selectedSplitItemIds.includes(i._id));
        navigate(`/checkout/${tableId}`, {
            state: {
                cart: splitItems,
                total: getSplitTotal(),
                tableInfo: tableInfo,
                isSplitBill: true,
                originalTableId: tableId
            }
        });
    };

    if (loading) return <div className="p-10 text-center font-bold text-gray-500 uppercase tracking-widest">Loading...</div>;

    const hasItems = existingOrders.some(o => o.items.length > 0);
    const hasItemsPending = existingOrders.some(order =>
        order.items && order.items.some(item => item.status === 'pending' || item.status === 'printing')
    );
    const currentItem = existingOrders[0]?.items?.find(item => item._id === editItemId);

    // 🔀 เพิ่ม 2 บรรทัดนี้: นับจำนวนรายการอาหาร ว่ามีกี่แถว
    const totalItemRows = existingOrders.reduce((count, o) => count + (o.items?.length || 0), 0);
    const canSplit = totalItemRows > 1; // ต้องมีมากกว่า 1 แถว ถึงจะอนุญาตให้แยกบิลได้

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-48 font-sans text-xs font-bold">
            {/* Top Row Bar */}
            <div className="bg-white px-2.5 py-2 shadow-sm sticky top-0 z-40 flex items-center gap-2 border-b">
                <select
                    onChange={(e) => handleMoveTable(e.target.value)}
                    value={tableId}
                    className="px-2 py-2 rounded-xl text-[11px] font-black outline-none bg-blue-50 text-blue-700 border border-blue-100 shrink-0 max-w-[130px]"
                >
                    <option value={tableId}>📍 โต๊ะ {tableInfo?.table_name || ''}</option>
                    <optgroup label="☀️ ช่วงเช้า">
                        {allTables
                            .filter(t => t.session?.shift === 'morning' && t.table_status === 'available' && t._id !== tableId)
                            .map(t => (
                                <option key={t._id} value={t._id}>☀️ โต๊ะ {t.table_name}</option>
                            ))
                        }
                    </optgroup>
                    <optgroup label="🌚 ช่วงบ่าย">
                        {allTables
                            .filter(t => t.session?.shift === 'afternoon' && t.table_status === 'available' && t._id !== tableId)
                            .map(t => (
                                <option key={t._id} value={t._id}>🌚 โต๊ะ {t.table_name}</option>
                            ))
                        }
                    </optgroup>
                </select>

                <input
                    type="text"
                    value={tableNote}
                    onChange={(e) => setTableNote(e.target.value)}
                    onBlur={(e) => handleUpdateTableNote(e.target.value)}
                    placeholder="หมายเหตุโต๊ะ..."
                    className="flex-1 bg-gray-50 rounded-xl px-2.5 py-2 outline-none text-[11px] min-w-0"
                />

                <button
                    onClick={handlePrintOrder}
                    disabled={!hasItemsPending}
                    className={`px-3.5 py-2 rounded-xl font-black text-[11px] shrink-0 transition-all ${
                        hasItemsPending
                            ? 'bg-orange-500 text-white shadow-md active:scale-95'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                >
                    พิมพ์
                </button>
            </div>

            {/* Categories Tab */}
            <div className="flex overflow-x-auto bg-white border-b sticky top-[43px] z-20 no-scrollbar">
                {categories.map(cat => (
                    <button key={cat._id} onClick={() => setSelectedCategory(cat.name)} className={`px-4 py-2.5 border-b-4 transition-all whitespace-nowrap ${selectedCategory === cat.name ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* 1. Product List (Grid เมนูอาหาร) */}
            <div className="p-2 grid grid-cols-2 gap-1.5">
                {menus.filter(m => m.category === selectedCategory).map(product => (
                    <button
                        key={product._id}
                        onClick={() => { setSelectedProduct(product); setQuantity(1); setNote(""); setSelectedOptions([]); setIsEditing(false); setIsModalOpen(true); }}
                        className="bg-white rounded-xl shadow-2xs border border-gray-100 flex items-center p-1 active:scale-97 transition-all cursor-pointer text-left min-h-[72px] w-full gap-1.5 overflow-hidden"
                    >
                        <div className="w-16 h-16 bg-blue-50/50 rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative border border-gray-50">
                            {product.image ? (
                                <img
                                    src={`/image/product/${product.image}`}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const textFallback = e.target.nextSibling;
                                        if (textFallback) textFallback.style.display = 'block';
                                    }}
                                />
                            ) : null}

                            <div
                                className="font-black text-blue-900 text-[11px] text-center leading-tight tracking-tight break-words px-0.5"
                                style={{ display: product.image ? 'none' : 'block' }}
                            >
                                {product.name}
                            </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-0 flex-1 pr-0.5">
                            <span className="font-black text-gray-800 text-sm truncate leading-tight mb-0.5">
                                {product.name}
                            </span>
                            <span className="text-sm font-black text-blue-600">
                                {product.price}.-
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* 2. Cart & Checkout Panel (แผงสรุปรายการก้นจอ) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.1)] rounded-t-2xl px-2 py-2.5 z-40 max-h-[50vh] flex flex-col border-t border-gray-100">
                <div className="overflow-y-auto flex-1 mb-2.5 no-scrollbar">
                    {hasItems && (
                        <div>
                            <div className="flex justify-between items-center mb-2 text-sm font-black uppercase text-gray-400">
                                <span>{isSplitMode ? '✅ เลือกรายการที่ต้องการแยกบิล' : 'รายการอาหารในโต๊ะ'}</span>
                                {!isSplitMode && (
                                    <button onClick={() => setShowExisting(!showExisting)} className="text-blue-600 underline">{showExisting ? 'ซ่อน' : 'แสดง'}</button>
                                )}
                            </div>

                            {showExisting && existingOrders.map(o => o.items.map((item, iIdx) => (
                                <div
                                    key={item._id || iIdx}
                                    onClick={() => {
                                        if (isSplitMode) {
                                            toggleSplitItem(item._id);
                                        } else {
                                            handleOpenEdit(item);
                                        }
                                    }}
                                    className={`flex justify-between items-center text-base font-black mb-1.5 p-2 rounded-lg transition-all border ${
                                        isSplitMode && selectedSplitItemIds.includes(item._id)
                                            ? 'bg-blue-100 border-blue-400 shadow-sm'
                                            : 'bg-gray-50 border-gray-100/60 active:bg-blue-50'
                                    }`}
                                >
                                    {isSplitMode && (
                                        <div className="shrink-0 mr-3 flex items-center justify-center">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedSplitItemIds.includes(item._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                                {selectedSplitItemIds.includes(item._id) && <span className="text-white text-xs">✓</span>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col flex-1 min-w-0 pr-2">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className={`${getStatusStyle(item.status)} truncate text-base`}>
                                                {item.name}
                                                <span className="text-gray-400 text-sm ml-1">x{item.quantity}</span>
                                                <span className="text-blue-700 text-xs font-black ml-1.5">@{item.price.toLocaleString()}</span>
                                            </span>
                                            {item.printCount > 0 && (
                                                <span className="bg-red-50 text-red-600 text-[10px] px-1 rounded ml-1">พิมพ์ครั้งที่ {item.printCount}</span>
                                            )}
                                            {item.options?.length > 0 && (
                                                <span className="text-xs text-gray-400 font-black italic">
                                                    ({item.options.map(opt => `+${opt.label}`).join(' ')})
                                                </span>
                                            )}

                                        </div>
                                        {item.note && <span className="text-xs text-orange-500 italic font-black">*{item.note}</span>}
                                    </div>
                                    <span className="text-gray-900 font-black shrink-0 text-base">{(item.price * item.quantity).toLocaleString()}.-</span>
                                </div>
                            )))}
                        </div>
                    )}
                </div>

                {/* 3. ปุ่มแยกบิล และ ปุ่มเช็คบิล */}
                {!isSplitMode ? (
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <button
                            onClick={() => { setIsSplitMode(true); setSelectedSplitItemIds([]); }}
                            disabled={!canSplit}
                            className={`py-3 px-3.5 rounded-xl font-black text-xs transition-all shadow-md shrink-0 border ${canSplit ? 'bg-orange-50 text-orange-600 active:scale-95 border-orange-200' : 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed'}`}
                        >
                            🔀 แยกบิลจ่าย
                        </button>

                        <button
                            onClick={handleCheckoutClick}
                            // 🔀 เปลี่ยนเงื่อนไข disabled: ปิดปุ่มถ้าไม่มีของ หรือ ถ้ายอดรวมเป็น 0
                            disabled={!hasItems || grandTotal() <= 0}
                            className={`flex-1 py-3 rounded-xl font-black text-base flex justify-between px-4 items-center transition-all shadow-md ${(hasItems && grandTotal() > 0) ? 'bg-blue-600 text-white active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                            <span>{isLineman ? 'ปิดยอดเดลิเวอรี' : 'เช็คบิลทั้งหมด'}</span>
                            <span className={`${(hasItems && grandTotal() > 0) ? 'bg-white/20 text-white' : 'bg-gray-300'} px-2.5 py-0.5 rounded-lg text-sm font-black`}>
        {grandTotal().toLocaleString()}.-
    </span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <button
                            onClick={() => setIsSplitMode(false)}
                            className="py-3 px-4 rounded-xl font-black text-xs transition-all shadow-md shrink-0 bg-gray-800 text-white active:scale-95"
                        >
                            ❌ ยกเลิก
                        </button>

                        <button
                            onClick={handleSplitCheckoutClick}
                            disabled={selectedSplitItemIds.length === 0}
                            className={`flex-1 py-3 rounded-xl font-black text-sm flex justify-between px-3 items-center transition-all shadow-md ${selectedSplitItemIds.length > 0 ? 'bg-blue-600 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            <span>👉 ไปหน้าเช็คบิล (แยกบิล)</span>
                            <span className={`${selectedSplitItemIds.length > 0 ? 'bg-white/20 text-white' : 'bg-gray-300'} px-2 py-0.5 rounded-lg text-sm font-black`}>
                                {getSplitTotal().toLocaleString()}.-
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Item Detail Modal */}
            {isModalOpen && selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs font-bold">
                    <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 pb-2 border-b border-gray-100 shrink-0 flex items-baseline justify-between gap-2 flex-wrap">
                            <h2 className="text-xl font-black text-gray-800">
                                {isEditing ? 'แก้ไข' : 'สั่ง'} {selectedProduct.name}
                                {isEditing && currentItem?.createdAt && (
                                    <span className="ml-2 text-gray-400 text-sm font-normal tracking-tighter">
                                        ({new Date(currentItem.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)
                                    </span>
                                )}
                            </h2>
                            {/* 💰 เปลี่ยนจาก <p> เป็น <span> และอยู่บรรทัดเดียวกับชื่อด้านบน */}
                            <span className="text-sm font-black text-blue-600 whitespace-nowrap">
                                {((selectedProduct.price || 0) + selectedOptions.reduce((sum, opt) => sum + (Number(opt.extraPrice) || 0), 0)).toLocaleString()}.- บาท
                                                        {quantity > 1 && ` (ยอดรวม ${(((selectedProduct.price || 0) + selectedOptions.reduce((sum, opt) => sum + (Number(opt.extraPrice) || 0), 0)) * quantity).toLocaleString()}.-)`}
                            </span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-4 no-scrollbar">
                            {selectedProduct.options?.length > 0 && (
                                <div>
                                    <p className="text-gray-400 mb-1.5 uppercase text-[10px]">ตัวเลือกเพิ่มเติม</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedProduct.options.map((opt, i) => (
                                            <button key={i} onClick={() => toggleOption(opt)} className={`text-base px-3 py-1.5 rounded-xl border-2 transition-all ${selectedOptions.find(o => o.label === opt.label) ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-white border-gray-100 text-gray-400'}`}>{opt.label} (+{opt.extraPrice})</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedProduct.quickTags?.length > 0 && (
                                <div>
                                    <p className="text-gray-400 mb-1.5 uppercase text-[10px]">คำสั่งด่วน (Quick Tags)</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedProduct.quickTags.map((tag, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setNote(prev => prev ? `${prev}, ${tag}` : tag)}
                                                className="text-base px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 font-bold"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                        {note && (
                                            <button
                                                onClick={() => setNote("")}
                                                className="text-base px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100 font-bold"
                                            >
                                                ล้างหมายเหตุ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">ระบุหมายเหตุ (พิมพ์เอง)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="เช่น ไม่เผ็ด, พิเศษ..."
                                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full bg-white shadow font-black">-</button>
                                <span className="font-black text-xl text-blue-600">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-full bg-white shadow font-black">+</button>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                            <div className={`grid ${isEditing ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                                <button onClick={() => setIsModalOpen(false)} className="py-3 rounded-xl text-gray-400 bg-white border border-gray-200 font-black shadow-2xs">ยกเลิก</button>
                                {isEditing && (
                                    <button
                                        onClick={async () => {
                                            if(!window.confirm("ลบรายการนี้?")) return;
                                            await api.delete(`/api/orders/item/${editItemId}`);
                                            setIsModalOpen(false);
                                            fetchData();
                                        }}
                                        className="py-3 rounded-xl text-white bg-red-500 shadow-sm font-black"
                                    >
                                        ลบ
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveOrder}
                                    disabled={(((selectedProduct?.price || 0) + selectedOptions.reduce((sum, opt) => sum + (Number(opt.extraPrice) || 0), 0)) * quantity) === 0}
                                    className={`py-3 rounded-xl text-white font-black shadow-sm transition-all ${
                                        (((selectedProduct?.price || 0) + selectedOptions.reduce((sum, opt) => sum + (Number(opt.extraPrice) || 0), 0)) * quantity) === 0
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                                    }`}
                                >
                                    บันทึก ({(((selectedProduct?.price || 0) + selectedOptions.reduce((sum, opt) => sum + (Number(opt.extraPrice) || 0), 0)) * quantity).toLocaleString()}.-)
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderPage;