import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from '@/components/ui/use-toast';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { categoriesData } from '@/data/products';
import { generateBarcode, sanitizeText, sanitizeUrl, safeNumber } from '@/lib/utils';
import { Edit, Trash2, LogOut, Sparkles, Upload, TestTube, TrendingUp, Database } from 'lucide-react';
import { testGeminiEdgeFunction } from '@/lib/testEdgeFunction';
import { fetchSubcategoriesByCategory } from '@/lib/subcategoryService';
import ImageUploadManager from '@/components/ImageUploadManager';
import ImageUploadPrep from '@/components/ImageUploadPrep';
import { batchUploadImages } from '@/lib/imageUploadService';
import ExcelImportTab from './ExcelImportTab';

const InventoryPage = () => {
    const navigate = useNavigate();
    const { supabase } = useSupabase();
    const { userRole, signOut, loading: authLoading } = useAuth();

    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    
    const getInitialFormData = () => ({
        name: '',
        description: '',
        price: '',
        discounted_price: '',
        stock: '',
        category: '',
        subcategory_id: '',
        published: false,
        main_image_url: '',
        image_1: '',
        image_2: '',
        image_3: '',
        main_store_name: '',
    });

    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [subcategories, setSubcategories] = useState([]);
    const [loadingSubcategories, setLoadingSubcategories] = useState(false);
    const [storeOptions, setStoreOptions] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newProductImages, setNewProductImages] = useState({
        main: { file: null, preview: null },
        image_1: { file: null, preview: null },
        image_2: { file: null, preview: null },
        image_3: { file: null, preview: null },
    });

    const fetchStores = useCallback(async () => {
        setLoadingStores(true);
        try {
            const { data, error } = await supabase.from('stores').select('name').order('name', { ascending: true });
            if (error) throw error;
            const names = data.map(store => store.name).filter(Boolean);
            setStoreOptions(names);
        } catch (error) {
            console.error('Error fetching stores:', error);
            toast({ title: "خطأ في تحميل المتاجر", description: error.message, variant: "destructive" });
        } finally {
            setLoadingStores(false);
        }
    }, [supabase]);

    const canPublish = userRole === 'admin';
    const canUseFeature = userRole === 'admin' || userRole === 'assistant';

    const fetchProducts = useCallback(async () => {
        setLoadingProducts(true);
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
            toast({ title: "Error fetching products", description: error.message, variant: "destructive" });
        } else {
            setProducts(data);
        }
        setLoadingProducts(false);
    }, [supabase]);

    useEffect(() => {
        if (authLoading) return;
        if (!canUseFeature) {
            toast({ title: "Access denied", description: "You don't have permission to view this page.", variant: "destructive" });
            navigate('/');
            return;
        }
        fetchProducts();
        fetchStores();
    }, [fetchProducts, fetchStores, canUseFeature, navigate, authLoading]);

    useEffect(() => {
        const loadSubcategories = async () => {
            setSubcategories([]);

            if (formData.category && formData.category !== '') {
                setLoadingSubcategories(true);
                try {
                    const data = await fetchSubcategoriesByCategory(supabase, formData.category);
                    setSubcategories(data);
                } catch (error) {
                    console.error('Error loading subcategories:', error);
                    toast({ title: "خطأ في تحميل الأنواع", description: error.message, variant: "destructive" });
                } finally {
                    setLoadingSubcategories(false);
                }
            } else {
                // فقط امسح الفئة الفرعية إذا تم مسح الفئة الرئيسية
                setFormData(prev => ({ ...prev, subcategory_id: '' }));
            }
        };

        loadSubcategories();
    }, [formData.category, supabase]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleGenerateWithAI = async () => {
        if (!aiPrompt) {
            toast({ title: "Please enter a product description.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        try {
            const { data: aiResponse, error: edgeError } = await supabase.functions.invoke('ai-add-product', {
                body: {
                    action: 'generateCompleteProduct',
                    description: aiPrompt
                }
            });

            if (edgeError) {
                throw new Error(edgeError.message || 'خطأ في خدمة الذكاء الاصطناعي');
            }

            if (!aiResponse.success) {
                throw new Error(aiResponse.error || 'فشل في توليد المنتج');
            }

            const aiData = aiResponse.data;

            if (!aiData || !aiData.name || !aiData.price || !aiData.stock) {
                throw new Error("البيانات المولدة غير مكتملة");
            }

            const barcode = await generateBarcode(supabase);

            const nameClean = sanitizeText(aiData.name, 160);
            const stockValueAI = Math.floor(safeNumber(aiData.stock || 1, { min: 0 }));
            const newProduct = {
                name: nameClean,
                description: sanitizeText(aiData.description || `منتج عالي الجودة - ${nameClean}`, 5000),
                price: safeNumber(aiData.price, { min: 0 }),
                discounted_price: safeNumber(aiData.discounted_price || 0, { min: 0 }),
                stock: stockValueAI,
                barcode: barcode,
                category: sanitizeText(aiData.category || 'uncategorized', 64),
                subcategory_id: null,
                published: false,
                slug: nameClean.toLowerCase().replace(/ /g, '-').replace(/[^\w\u0600-\u06FF-]+/g, ''),
                main_image_url: '',
                image_1: '',
                image_2: '',
                image_3: '',
                is_featured: stockValueAI >= 1 && stockValueAI <= 5,
                specifications: sanitizeText(aiData.specifications || '', 5000)
            };

            const { error: insertError } = await supabase.from('products').insert([newProduct]);
            if (insertError) throw insertError;

            toast({
                title: "✅ تم إضافة المنتج بنجاح",
                description: `تم إنشاء المنتج "${aiData.name}" بواسطة الذكاء الاصطناعي`
            });
            setAiPrompt('');
            await fetchProducts();
        } catch (error) {
            console.error('AI Product Generation Error:', error?.message || error);
            toast({
                title: "خطأ في توليد المنتج",
                description: error.message || 'حدث خطأ غير متوقع',
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            description: product.description || '',
            price: product.price || '',
            discounted_price: product.discounted_price || '',
            stock: product.stock || '',
            category: product.category || '',
            subcategory_id: product.subcategory_id || '',
            published: product.published || false,
            main_image_url: product.main_image_url || '',
            image_1: product.image_1 || '',
            image_2: product.image_2 || '',
            image_3: product.image_3 || '',
            main_store_name: product.main_store_name || '',
        });
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا المنتج؟')) return;
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "تم حذف المنتج بنجاح" });
            await fetchProducts();
        }
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setFormData(getInitialFormData());
        setNewProductImages({
            main: { file: null, preview: null },
            image_1: { file: null, preview: null },
            image_2: { file: null, preview: null },
            image_3: { file: null, preview: null },
        });
    };

    const handleSubmitManual = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const barcode = editingProduct ? editingProduct.barcode : await generateBarcode(supabase);

            const nameClean = sanitizeText(formData.name, 160);
            const stockValue = Math.floor(safeNumber(formData.stock, { min: 0 }));

            const baseData = {
                name: nameClean,
                description: sanitizeText(formData.description, 5000),
                price: safeNumber(formData.price, { min: 0 }),
                discounted_price: safeNumber(formData.discounted_price || 0, { min: 0 }),
                stock: stockValue,
                category: sanitizeText(formData.category || 'uncategorized', 64),
                subcategory_id: formData.subcategory_id || null,
                published: canPublish ? !!formData.published : false,
                barcode,
                slug: nameClean.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                main_store_name: sanitizeText(formData.main_store_name, 160),
                is_featured: stockValue >= 1 && stockValue <= 5,
            };

            const sanitizedData = {
                ...baseData,
                main_image_url: sanitizeUrl(formData.main_image_url),
                image_1: sanitizeUrl(formData.image_1),
                image_2: sanitizeUrl(formData.image_2),
                image_3: sanitizeUrl(formData.image_3),
            };

            let productId;
            let error;

            if (editingProduct) {
                delete sanitizedData.barcode;
                ({ error } = await supabase.from('products').update(sanitizedData).eq('id', editingProduct.id));
                productId = editingProduct.id;
            } else {
                const { data, error: insertError } = await supabase.from('products').insert([sanitizedData]).select('id');
                error = insertError;
                if (data && data.length > 0) {
                    productId = data[0].id;
                }
            }

            if (error) throw error;

            // Handle image uploads for new products
            if (!editingProduct && productId && (newProductImages.main.file || newProductImages.image_1.file || newProductImages.image_2.file || newProductImages.image_3.file)) {
                try {
                    toast({ title: "جاري رفع الصور..." });
                    const imagesToUpload = {
                        main: newProductImages.main.file,
                        image_1: newProductImages.image_1.file,
                        image_2: newProductImages.image_2.file,
                        image_3: newProductImages.image_3.file,
                    };

                    const uploadedUrls = await batchUploadImages(imagesToUpload, supabase, productId);

                    // Update product with image URLs
                    const imageUpdateData = {};
                    if (uploadedUrls.main_image_url) imageUpdateData.main_image_url = uploadedUrls.main_image_url;
                    if (uploadedUrls.image_1) imageUpdateData.image_1 = uploadedUrls.image_1;
                    if (uploadedUrls.image_2) imageUpdateData.image_2 = uploadedUrls.image_2;
                    if (uploadedUrls.image_3) imageUpdateData.image_3 = uploadedUrls.image_3;

                    if (Object.keys(imageUpdateData).length > 0) {
                        const { error: updateError } = await supabase.from('products').update(imageUpdateData).eq('id', productId);
                        if (updateError) throw updateError;
                    }
                } catch (uploadError) {
                    console.error('Error uploading images:', uploadError);
                    toast({ title: "تحذير", description: "تم إضافة المنتج لكن حدث خطأ في رفع بعض الصور", variant: "destructive" });
                }
            }

            toast({ title: editingProduct ? "تم تحديث المنتج بنجاح!" : "تمت إضافة المنتج بنجاح!" });
            handleCancelEdit();
            await fetchProducts();
        } catch (error) {
            toast({ title: "خطأ في العملية", description: error.message, variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleLogout = async () => {
        await signOut();
        toast({ title: "تم تسجيل الخروج بنجاح" });
        navigate('/');
    };

    const handleTestEdgeFunction = async () => {
        try {
            toast({ title: "جاري اختبار Edge Function..." });
            const result = await testGeminiEdgeFunction();

            if (result.success) {
                toast({
                    title: "✅ Edge Function يعمل بنجاح",
                    description: "تم اختبار الاتصال بنجاح"
                });
                console.log('نتيجة الاختبار:', result.data);
            } else {
                toast({
                    title: "❌ فشل في اختبار Edge Function",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "خطأ في الاختبار",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleImageUrlChange = (imageKey, url) => {
        const fieldMap = {
            main: 'main_image_url',
            image_1: 'image_1',
            image_2: 'image_2',
            image_3: 'image_3',
        };

        const fieldName = fieldMap[imageKey];
        setFormData(prev => ({
            ...prev,
            [fieldName]: url || '',
        }));
    };

    return (
        <div className="inventory-main-container">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <h1 className="inventory-page-header text-4xl">لوحة تحكم المخزن</h1>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => navigate('/')} variant="outline" className="inventory-button-secondary">العودة للمتجر</Button>
                        <Button onClick={() => navigate('/analytics')} className="inventory-button-secondary">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            التحليلات
                        </Button>
                        <Button onClick={handleTestEdgeFunction} variant="secondary" className="inventory-button-secondary">
                            <TestTube className="w-4 h-4 mr-2" />
                            اختبار AI
                        </Button>
                        <Button onClick={handleLogout} variant="destructive" className="inventory-button-primary"><LogOut className="w-4 h-4 mr-2" />تسجيل الخروج</Button>
                    </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="md:col-span-1 flex flex-col gap-6">
                        {canUseFeature && (
                            <div className="inventory-side-section">
                                <h2 className="inventory-section-title flex items-center gap-2 mb-5"><Sparkles className="w-5 h-5" />إضافة سريعة بالذكاء الاصطناعي</h2>
                                <div className="flex flex-col gap-4">
                                    <div className="inventory-form-group">
                                        <label htmlFor="ai-prompt" className="inventory-form-label">اسم المنتج أو وصف مختصر</label>
                                        <textarea id="ai-prompt" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="مثال: سماعات بلوتوث مع خاصية عزل الضوضاء" className="inventory-textarea" rows="3"/>
                                    </div>
                                    <button onClick={handleGenerateWithAI} disabled={isGenerating} className="inventory-button-primary w-full">{isGenerating ? 'جاري الإنشاء...' : 'إنشاء وحفظ المنتج'}</button>
                                </div>
                            </div>
                        )}

                        <div className="inventory-side-section">
                            <h2 className="inventory-section-title mb-5">{editingProduct ? 'تعديل المنتج' : 'إضافة منتج يدوي'}</h2>
                            <form onSubmit={handleSubmitManual} className="flex flex-col gap-4">
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">اسم المنتج</label>
                                    <input name="name" value={formData.name} onChange={handleInputChange} placeholder="اسم المنتج" className="inventory-input" required />
                                </div>
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">اسم المتجر الرئيسي</label>
                                    <select name="main_store_name" value={formData.main_store_name} onChange={handleInputChange} className="inventory-select" disabled={loadingStores}>
                                        <option value="">اختر اسم المتجر الرئيسي</option>
                                        {loadingStores ? (
                                            <option disabled>جاري تحميل المتاجر...</option>
                                        ) : (
                                            storeOptions.map((name) => (
                                                <option key={name} value={name}>{name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">الوصف</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="الوصف" className="inventory-textarea" rows="3"/>
                                </div>
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">السعر الأصلي</label>
                                    <input name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="السعر الأصلي" className="inventory-input" required />
                                </div>
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">مقدار الخصم (اختياري)</label>
                                    <input name="discounted_price" type="number" value={formData.discounted_price} onChange={handleInputChange} placeholder="مقدار الخصم" className="inventory-input" />
                                </div>
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">الكمية</label>
                                    <input name="stock" type="number" value={formData.stock} onChange={handleInputChange} placeholder="الكمية" className="inventory-input" required />
                                </div>
                                <div className="inventory-form-group">
                                    <label className="inventory-form-label">الفئة</label>
                                    <select name="category" value={formData.category} onChange={handleInputChange} className="inventory-select">
                                        <option value="">اختر الفئة</option>
                                        {categoriesData.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {formData.category && formData.category !== '' && (
                                    <div className="inventory-form-group">
                                        <label className="inventory-form-label">اختيار النوع</label>
                                        <select name="subcategory_id" value={formData.subcategory_id} onChange={handleInputChange} className="inventory-select" disabled={loadingSubcategories}>
                                            <option value="">اختر النوع</option>
                                            {loadingSubcategories ? (
                                                <option disabled>جاري تحميل الأنواع...</option>
                                            ) : (
                                                subcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name_ar || sub.name}</option>)
                                            )}
                                        </select>
                                    </div>
                                )}

                                <div className="inventory-form-group">
                                    <label className="inventory-form-label mb-4">نظام رفع الصور (WebP محسّن)</label>
                                    {editingProduct?.id ? (
                                        <ImageUploadManager
                                            productId={editingProduct.id}
                                            supabase={supabase}
                                            onImageUrlsChange={handleImageUrlChange}
                                            initialUrls={{
                                                main_image_url: formData.main_image_url,
                                                image_1: formData.image_1,
                                                image_2: formData.image_2,
                                                image_3: formData.image_3,
                                            }}
                                        />
                                    ) : (
                                        <ImageUploadPrep
                                            onFilesChange={setNewProductImages}
                                        />
                                    )}
                                </div>
                                
                                {canPublish && (
                                    <div className="flex items-center gap-3 py-2">
                                        <input type="checkbox" id="published" name="published" checked={formData.published} onChange={handleInputChange} className="inventory-checkbox" />
                                        <label htmlFor="published" className="inventory-form-label mb-0">نشر المنتج؟</label>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4">
                                    {editingProduct && <button type="button" onClick={handleCancelEdit} className="inventory-button-secondary flex-1">إلغاء</button>}
                                    <button type="submit" disabled={isSubmitting} className="inventory-button-primary flex-1">{isSubmitting ? 'جاري الحفظ...' : (editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج')}</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="md:col-span-2 inventory-main-section">
                        <div className="mb-6">
                            <h2 className="inventory-section-title mb-4">قائمة المنتجات</h2>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="ابحث عن منتج بالاسم أو الباركود..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="inventory-input w-full px-4 pl-10"
                                />
                                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        {loadingProducts ? (
                            <p className="text-center text-gray-500 py-8">جاري تحميل المنتجات...</p>
                        ) : products.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Unpublished Products Section (First/Left) */}
                                {products.filter(p => !p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-base font-semibold text-amber-600 flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg sticky top-0 z-10">
                                            <span className="text-lg">⊗</span>
                                            المنتجات غير المنشورة ({products.filter(p => !p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length})
                                        </h3>
                                        <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-3">
                                            {(() => {
                                                const unpublishedAndFiltered = products.filter(p => !p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)));
                                                const withoutSubcategory = unpublishedAndFiltered.filter(p => p.category && p.category !== '' && !p.subcategory_id);
                                                const withSubcategory = unpublishedAndFiltered.filter(p => !(p.category && p.category !== '' && !p.subcategory_id));
                                                const sortedProducts = [...withoutSubcategory, ...withSubcategory];

                                                return sortedProducts.map(p => {
                                                    const canModify = userRole === 'admin' || !p.published;
                                                    return (
                                                        <div key={p.id} className="inventory-product-item">
                                                            <div className="inventory-product-info">
                                                                <p className="inventory-product-name">{p.name}</p>
                                                                <p className="inventory-product-meta">الكمية: <span style={{ fontWeight: '600' }}>{p.stock}</span> | الباركود: <span style={{ fontWeight: '600' }}>{p.barcode}</span></p>
                                                                <span className={`inventory-product-status ${p.published ? 'inventory-product-status-published' : 'inventory-product-status-draft'}`}>
                                                                    {p.published ? '✓ منشور' : '⊗ غير منشور'}
                                                                </span>
                                                            </div>
                                                            <div className="inventory-action-buttons">
                                                                <button onClick={() => handleEdit(p)} disabled={!canModify} className="inventory-action-button" title="تعديل">
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDelete(p.id)} disabled={!canModify} className="inventory-action-button delete" title="حذف">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Published Products Section (Second/Right) */}
                                {products.filter(p => p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length > 0 && (
                                    <div className="space-y-3">
                                        {(() => {
                                            const publishedProducts = products.filter(p => p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)));
                                            const productsWithoutSubcategory = publishedProducts.filter(p => p.category && p.category !== '' && !p.subcategory_id).length;
                                            const productsWithoutDescription = publishedProducts.filter(p => !p.description || p.description.trim() === '').length;
                                            const productsWithoutImage = publishedProducts.filter(p => !p.main_image_url || p.main_image_url.trim() === '').length;
                                            return (
                                                <h3 className="text-base font-semibold text-green-600 flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg sticky top-0 z-10">
                                                    <span className="text-lg">✓</span>
                                                    المنتجات المنشورة ({publishedProducts.length})
                                                    {(productsWithoutDescription > 0 || productsWithoutSubcategory > 0 || productsWithoutImage > 0) && (
                                                        <div className="ml-auto flex gap-1 flex-wrap">
                                                            {productsWithoutDescription > 0 && (
                                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                    ⚠ {productsWithoutDescription} بدون وصف
                                                                </span>
                                                            )}
                                                            {productsWithoutSubcategory > 0 && (
                                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                    ⚠ {productsWithoutSubcategory} بدون نوع
                                                                </span>
                                                            )}
                                                            {productsWithoutImage > 0 && (
                                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                    ⚠ {productsWithoutImage} بدون صورة
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </h3>
                                            );
                                        })()}
                                        <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-3">
                                            {(() => {
                                                const publishedAndFiltered = products.filter(p => p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)));
                                                const withoutDescription = publishedAndFiltered.filter(p => !p.description || p.description.trim() === '');
                                                const withoutSubcategory = publishedAndFiltered.filter(p => (p.description && p.description.trim() !== '') && (p.category && p.category !== '' && !p.subcategory_id));
                                                const withBoth = publishedAndFiltered.filter(p => (p.description && p.description.trim() !== '') && !(p.category && p.category !== '' && !p.subcategory_id));
                                                const sortedProducts = [...withoutDescription, ...withoutSubcategory, ...withBoth];

                                                return sortedProducts.map(p => {
                                                    const canModify = userRole === 'admin' || !p.published;
                                                    const hasNoSubcategory = p.category && p.category !== '' && !p.subcategory_id;
                                                    const hasNoDescription = !p.description || p.description.trim() === '';
                                                    const hasNoImage = !p.main_image_url || p.main_image_url.trim() === '';
                                                    return (
                                                        <div key={p.id} className="inventory-product-item">
                                                            <div className="inventory-product-info">
                                                                <p className="inventory-product-name">{p.name}</p>
                                                                <p className="inventory-product-meta">الكمية: <span style={{ fontWeight: '600' }}>{p.stock}</span> | الباركود: <span style={{ fontWeight: '600' }}>{p.barcode}</span></p>
                                                                <div className="flex gap-2 items-center flex-wrap">
                                                                    <span className={`inventory-product-status ${p.published ? 'inventory-product-status-published' : 'inventory-product-status-draft'}`}>
                                                                        {p.published ? '✓ منشور' : '⊗ غير منشور'}
                                                                    </span>
                                                                    {hasNoDescription && (
                                                                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                            ⚠ بدون وصف
                                                                        </span>
                                                                    )}
                                                                    {hasNoSubcategory && (
                                                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                            ⚠ بدون نوع
                                                                        </span>
                                                                    )}
                                                                    {hasNoImage && (
                                                                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                            ⚠ بدون صورة
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="inventory-action-buttons">
                                                                <button onClick={() => handleEdit(p)} disabled={!canModify} className="inventory-action-button" title="تعديل">
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDelete(p.id)} disabled={!canModify} className="inventory-action-button delete" title="حذف">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* If only one category has products */}
                                {products.filter(p => !p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length === 0 && products.filter(p => p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length > 0 && (
                                    <div />
                                )}
                                {products.filter(p => p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length === 0 && products.filter(p => !p.published && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length > 0 && (
                                    <div />
                                )}

                                {/* No results message */}
                                {searchQuery && products.filter(p => (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))).length === 0 && (
                                    <div className="col-span-2 text-center py-8">
                                        <p className="text-gray-500">لم يتم العثور على منتجات تطابق البحث "{searchQuery}"</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="inventory-empty-state">لا توجد منتجات. ابدأ بإضافة منتج جديد!</p>
                        )}
                    </div>
                </div>

                <Tabs defaultValue="excel-import" className="w-full mt-8">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="excel-import" className="flex items-center gap-2 justify-center">
                      <Database className="w-4 h-4" />
                      استيراد Excel AI
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="excel-import" className="mt-6">
                    <div className="inventory-main-section">
                      <ExcelImportTab onProductsAdded={fetchProducts} />
                    </div>
                  </TabsContent>
                </Tabs>
            </main>
            <Footer />
        </div>
    );
};

export default InventoryPage;
