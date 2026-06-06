import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const [sourceProduct, setSourceProduct] = useState(null);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [selectedTargetIds, setSelectedTargetIds] = useState([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProductId, setCurrentProductId] = useState(null);

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("");
    const [image, setImage] = useState("");
    const [sort, setSort] = useState(0);
    const [printerName, setPrinterName] = useState("POS-80C1");
    const [options, setOptions] = useState([]);
    const [quickTags, setQuickTags] = useState([]);

    const [tempOptionName, setTempOptionName] = useState("");
    const [tempOptionPrice, setTempOptionPrice] = useState("");
    const [tempTag, setTempTag] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                api.get('/api/products'),
                api.get('/api/category')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
        } catch (err) {
            console.error("ดึงข้อมูลสินค้าล้มเหลว:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            price: Number(price),
            category,
            image,
            sort: Number(sort),
            printer_name: printerName,
            options: options.map(o => ({ label: o.label || o.name, extraPrice: Number(o.extraPrice) || 0 })),
            quickTags
        };

        try {
            if (isEditing) {
                await api.put(`/api/products/${currentProductId}`, payload);
            } else {
                await api.post('/api/products', payload);
                alert("เพิ่มสินค้าใหม่สำเร็จครับ! ✨");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("คุณแน่ใจใช่ไหมว่าจะลบสินค้าชิ้นนี้? ❌")) return;
        try {
            await api.delete(`/api/products/${id}`);
            alert("ลบสินค้าเรียบร้อยครับ");
            fetchData();
        } catch (err) {
            console.error(err);
            alert("ลบสินค้าไม่สำเร็จ");
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentProductId(null);
        setName("");
        setPrice("");
        setCategory(categories[0]?.name || "");
        setImage("");
        setSort(0);
        setPrinterName("POS-80C1");
        setOptions([]);
        setQuickTags([]);
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setIsEditing(true);
        setCurrentProductId(product._id);
        setName(product.name);
        setPrice(product.price);
        setCategory(product.category);
        setImage(product.image || "");
        setSort(product.sort || 0);
        setPrinterName(product.printer_name || "POS-80C1");
        setOptions(product.options ? product.options.map(o => ({ label: o.label || o.name, extraPrice: o.extraPrice })) : []);
        setQuickTags(product.quickTags ? [...product.quickTags] : []);
        setIsModalOpen(true);
    };

    const handleStartCopy = (product) => {
        setSourceProduct(product);
        setSelectedTargetIds([]);
        setIsCopyModalOpen(true);
    };

    const sameCategoryProducts = products.filter(p => p.category === sourceProduct?.category && p._id !== sourceProduct?._id);

    const handleSelectAllSameCategory = () => {
        if (selectedTargetIds.length === sameCategoryProducts.length) {
            setSelectedTargetIds([]);
        } else {
            setSelectedTargetIds(sameCategoryProducts.map(p => p._id));
        }
    };

    const handleToggleSelectTarget = (id) => {
        if (selectedTargetIds.includes(id)) {
            setSelectedTargetIds(selectedTargetIds.filter(item => item !== id));
        } else {
            setSelectedTargetIds([...selectedTargetIds, id]);
        }
    };

    const handleExecuteBulkPaste = async () => {
        if (selectedTargetIds.length === 0) {
            alert("กรุณาเลือกสินค้าปลายทางที่ต้องการคัดลอกไปวางอย่างน้อย 1 รายการครับ");
            return;
        }

        if (!window.confirm(`ต้องการคัดลอก Options และ โน้ตด่วน จากสินค้า "${sourceProduct.name}" ไปวางทับสินค้าที่เลือกทั้งหมดจำนวน ${selectedTargetIds.length} รายการ ใช่หรือไม่ครับ? 📥`)) return;

        setIsBulkSaving(true);
        try {
            await Promise.all(selectedTargetIds.map(async (targetId) => {
                const targetProduct = products.find(p => p._id === targetId);
                if (!targetProduct) return;

                const payload = {
                    name: targetProduct.name,
                    price: targetProduct.price,
                    category: targetProduct.category,
                    image: targetProduct.image,
                    sort: targetProduct.sort,
                    printer_name: targetProduct.printer_name || "POS-80C1",
                    options: sourceProduct.options ? sourceProduct.options.map(o => ({ label: o.label || o.name, extraPrice: o.extraPrice })) : [],
                    quickTags: sourceProduct.quickTags ? [...sourceProduct.quickTags] : []
                };

                return api.put(`/api/products/${targetId}`, payload);
            }));

            alert("⚡ อัปเดตวางทับข้อมูลตัวเลือกสินค้าทุกชิ้นสำเร็จเรียบร้อยครับ!");
            setIsCopyModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดระหว่างกระบวนการอัปเดตวางทับข้อมูล");
        } finally {
            setIsBulkSaving(false);
        }
    };

    // --- จัดการ Options ---
    const addOption = () => {
        if (!tempOptionName.trim()) return;
        setOptions([...options, { label: tempOptionName, extraPrice: Number(tempOptionPrice) || 0 }]);
        setTempOptionName("");
        setTempOptionPrice("");
    };

    const removeOption = (index) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    // 🚀 ฟังก์ชันเปลี่ยนลำดับ Option ตามตัวเลข Dropdown
    const moveOptionTo = (currentIndex, targetIndex) => {
        const newOptions = [...options];
        const [item] = newOptions.splice(currentIndex, 1);
        newOptions.splice(targetIndex, 0, item);
        setOptions(newOptions);
    };

    // --- จัดการ Quick Tags ---
    const addTag = () => {
        if (!tempTag.trim()) return;
        if (!quickTags.includes(tempTag.trim())) {
            setQuickTags([...quickTags, tempTag.trim()]);
        }
        setTempTag("");
    };

    const removeTag = (tag) => {
        setQuickTags(quickTags.filter(t => t !== tag));
    };

    // 🚀 ฟังก์ชันเปลี่ยนลำดับ Tag ตามตัวเลข Dropdown
    const moveTagTo = (currentIndex, targetIndex) => {
        const newTags = [...quickTags];
        const [item] = newTags.splice(currentIndex, 1);
        newTags.splice(targetIndex, 0, item);
        setQuickTags(newTags);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) return <div className="p-4 text-center text-sm font-black text-gray-800">กำลังโหลดข้อมูลสินค้า...🛠️</div>;

    return (
        <div className="p-2 max-w-md mx-auto font-sans text-sm font-bold text-gray-900 bg-gray-50 min-h-screen pb-24">

            {/* หัวข้อหลัก */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 mb-2 shadow-xs">
                <div>
                    <h2 className="text-base font-black tracking-tight text-gray-900">📦 คลังจัดการสินค้า</h2>
                    <p className="text-[10px] text-gray-400 font-bold">จำนวนทั้งหมด {filteredProducts.length} รายการ</p>
                </div>
                <button onClick={openAddModal} className="bg-blue-600 active:bg-blue-700 text-white text-xs px-3 py-2 rounded-xl font-black flex items-center gap-1 shadow-sm transition-all">
                    ＋ เพิ่มสินค้า
                </button>
            </div>

            {/* ค้นหา */}
            <div className="grid grid-cols-12 gap-1.5 mb-2.5">
                <div className="col-span-7">
                    <input type="text" placeholder="🔍 ค้นหาชื่อสินค้า..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white px-3 py-2 text-xs rounded-xl border border-gray-300 font-bold outline-none text-gray-800 focus:border-blue-500 shadow-2xs" />
                </div>
                <div className="col-span-5">
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-white px-2 py-2 text-xs rounded-xl border border-gray-300 font-black outline-none text-gray-800 focus:border-blue-500 shadow-2xs">
                        <option value="All">ทุกหมวดหมู่</option>
                        {categories.map((cat) => (
                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* รายการสินค้า */}
            <div className="space-y-1.5">
                {filteredProducts.map((product) => (
                    <div key={product._id} className="bg-white p-3 rounded-xl border-2 border-gray-200/80 shadow-2xs flex items-center justify-between gap-2 transition-all">
                        <div className="min-w-0 flex-grow">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-black">📍 ลำดับ {product.sort || 0}</span>
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black truncate max-w-[100px]">{product.category}</span>
                            </div>
                            <h4 className="text-gray-950 text-sm font-black tracking-tight truncate mt-1">{product.name}</h4>
                            <p className="text-blue-600 font-black text-xs mt-0.5">{product.price.toLocaleString()} บาท</p>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                            <div className="flex gap-1">
                                <button onClick={() => handleStartCopy(product)} className="px-2 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg active:scale-95 transition-all text-xs font-black">📋 ก็อปปี้</button>
                                <button onClick={() => openEditModal(product)} className="px-2.5 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-black active:scale-95 transition-all">แก้ไข</button>
                            </div>
                            <button onClick={() => handleDelete(product._id)} className="w-full py-1 text-center bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold active:scale-95 transition-all">ลบออก</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 📋 หน้าต่างใหม่: เลือก ติ๊กถูก สินค้าปลายทาง */}
            {isCopyModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-3 z-50">
                    {/* 💡 แก้ max-h เป็น 90dvh รองรับจอ iPhone */}
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl flex flex-col max-h-[90dvh] overflow-hidden animate-fade-in">

                        <div className="px-4 py-3 bg-amber-500 text-gray-950 flex flex-col flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black tracking-wide">📋 เลือกปุ่มเป้าหมายที่ต้องการวางทับ</span>
                                <button type="button" onClick={() => setIsCopyModalOpen(false)} className="text-gray-950 font-black text-base px-2">×</button>
                            </div>
                            <p className="text-[10px] text-gray-900 font-bold mt-1">
                                คัดลอกจากต้นแบบ: <span className="underline font-black">{sourceProduct?.name}</span>
                            </p>
                        </div>

                        {/* กล่องรายการสินค้าปลายทาง (พื้นที่ไถหน้าจอ) */}
                        <div className="p-4 flex-grow overflow-y-auto bg-gray-50 space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-[11px] text-gray-500">สินค้ากลุ่มเดียวกัน</span>
                                {sameCategoryProducts.length > 0 && (
                                    <button type="button" onClick={handleSelectAllSameCategory} className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {selectedTargetIds.length === sameCategoryProducts.length ? "🔲 ยกเลิกทั้งหมด" : "☑️ เลือกทั้งหมด"}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1">
                                {sameCategoryProducts.map((prod) => (
                                    <label key={prod._id} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${selectedTargetIds.includes(prod._id) ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs' : 'bg-white border-gray-200 text-gray-800'}`}>
                                        <input type="checkbox" checked={selectedTargetIds.includes(prod._id)} onChange={() => handleToggleSelectTarget(prod._id)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
                                        <div className="min-w-0 flex-grow text-xs font-bold"><div className="truncate text-gray-900">{prod.name}</div></div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 📌 ล็อคปุ่มสั่งงานก้นกล่อง ไม่ให้ขยับหนี */}
                        <div className="p-3 bg-white border-t border-gray-200 flex gap-2 flex-shrink-0">
                            <button type="button" onClick={() => setIsCopyModalOpen(false)} className="w-1/3 py-2.5 bg-gray-200 text-gray-600 font-black rounded-xl text-xs text-center">ปิด</button>
                            <button type="button" disabled={isBulkSaving || selectedTargetIds.length === 0} onClick={handleExecuteBulkPaste} className={`w-2/3 py-2.5 text-white font-black rounded-xl text-xs text-center shadow-md ${selectedTargetIds.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 active:bg-amber-700'}`}>
                                {isBulkSaving ? "⏳ กำลังบันทึก..." : `📥 ยืนยันวางทับ (${selectedTargetIds.length})`}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* 📥 MODAL ฟอร์มเพิ่ม/แก้ไขสินค้าเดี่ยว */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-3 z-50">
                    {/* 💡 แก้ max-h เป็น 90dvh */}
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl flex flex-col max-h-[90dvh] overflow-hidden animate-fade-in">

                        <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center flex-shrink-0">
                            <span className="text-xs font-black tracking-wide text-amber-400">{isEditing ? "✏️ แก้ไขข้อมูลสินค้า" : "✨ เพิ่มสินค้าใหม่เข้าระบบ"}</span>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-white font-black text-base px-1">×</button>
                        </div>

                        {/* แยกฟอร์มเป็นส่วน เลื่อนจอเฉพาะเนื้อหาตรงกลาง */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden text-xs">

                            {/* พื้นที่ไถหน้าจอ (Scrollable) */}
                            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50">

                                <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                                    <div><label className="block text-gray-500 font-bold mb-1">ชื่อสินค้า *</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-300 font-bold" /></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="block text-gray-500 font-bold mb-1">ราคา (บาท) *</label><input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-300 font-black" /></div>
                                        <div><label className="block text-gray-500 font-bold mb-1">ลำดับจัดเรียง</label><input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-300 font-bold" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-gray-500 font-bold mb-1">หมวดหมู่ *</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-50 px-2 py-2 rounded-lg border border-gray-300 font-black">
                                                {categories.map((cat) => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 font-bold mb-1">เครื่องพิมพ์หลัก *</label>
                                            <select value={printerName} onChange={(e) => setPrinterName(e.target.value)} className="w-full bg-gray-50 px-2 py-2 rounded-lg border border-gray-300 font-black">
                                                <option value="POS-80C1">ต้ม (POS-80C1)</option>
                                                <option value="POS-80C4">ผัด (POS-80C4)</option>
                                                <option value="POS-80C3">บะหมี่ (POS-80C3)</option>
                                                <option value=" ">ไม่สั่งพิมพ์</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 🚀 บล็อก Options แบบ Dropdown เลือกตัวเลข */}
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                    <label className="block text-gray-950 font-black text-xs border-b pb-1">➕ ตัวเลือกเสริมพิเศษ (เช่น ไข่ดาว, เพิ่มข้าว)</label>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <input type="text" placeholder="ชื่อตัวเลือก" value={tempOptionName} onChange={(e) => setTempOptionName(e.target.value)} className="col-span-6 bg-gray-50 p-1.5 rounded-md border border-gray-300 font-bold" />
                                        <input type="number" placeholder="+บาท" value={tempOptionPrice} onChange={(e) => setTempOptionPrice(e.target.value)} className="col-span-4 bg-gray-50 p-1.5 rounded-md border border-gray-300 font-black text-center" />
                                        <button type="button" onClick={addOption} className="col-span-2 bg-blue-600 text-white p-1.5 rounded-md font-black">เพิ่ม</button>
                                    </div>
                                    <div className="space-y-1.5 pt-1">
                                        {options.map((opt, i) => (
                                            <div key={i} className="flex justify-between items-center bg-gray-50 p-1.5 rounded-md border border-gray-200">
                                                <span className="font-bold text-gray-800 pl-1">{opt.label || opt.name} <span className="text-green-600">(+{opt.extraPrice}.-)</span></span>
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        value={i}
                                                        onChange={(e) => moveOptionTo(i, Number(e.target.value))}
                                                        className="bg-white border border-gray-300 text-gray-800 text-xs rounded px-1.5 py-1 outline-none font-black shadow-sm"
                                                    >
                                                        {options.map((_, idx) => <option key={idx} value={idx}>{idx + 1}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => removeOption(i)} className="text-red-500 font-black text-sm px-1.5">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 🚀 บล็อก Quick Tags แบบ Dropdown เลือกตัวเลข */}
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                    <label className="block text-gray-950 font-black text-xs border-b pb-1">📝 ปุ่มตัวเลือกโน้ตด่วนส่งเข้าครัว</label>
                                    <div className="flex gap-1">
                                        <input type="text" value={tempTag} onChange={(e) => setTempTag(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addTag(); } }} className="flex-grow bg-gray-50 p-1.5 rounded-md border border-gray-300 font-bold" />
                                        <button type="button" onClick={addTag} className="bg-blue-600 text-white px-3 py-1.5 rounded-md font-black">เพิ่ม</button>
                                    </div>
                                    <div className="flex flex-col gap-1.5 pt-1">
                                        {quickTags.map((tag, i) => (
                                            <div key={i} className="bg-orange-50 text-orange-600 border border-orange-100 px-2 py-1.5 rounded-lg flex justify-between items-center font-bold">
                                                <span className="pl-1">{tag}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        value={i}
                                                        onChange={(e) => moveTagTo(i, Number(e.target.value))}
                                                        className="bg-white border border-orange-200 text-orange-800 text-xs rounded px-1.5 py-1 outline-none font-black shadow-sm"
                                                    >
                                                        {quickTags.map((_, idx) => <option key={idx} value={idx}>{idx + 1}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => removeTag(tag)} className="text-orange-400 font-black px-1.5">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 📌 แถวปุ่มกดยืนยัน (ล็อคติดขอบล่างเสมอ ไม่ต้องไถหา) */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-white border-t border-gray-200 flex-shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="py-3 bg-gray-200 text-gray-600 font-black rounded-xl text-center active:scale-95 transition-all">ยกเลิก</button>
                                <button type="submit" className="py-3 bg-blue-600 text-white font-black rounded-xl text-center shadow-md active:scale-95 transition-all">บันทึกข้อมูล</button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;