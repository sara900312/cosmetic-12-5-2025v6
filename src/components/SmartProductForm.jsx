import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import geminiService from '../lib/geminiService';
import { Loader2, Sparkles, Save, RefreshCw } from 'lucide-react';

const SmartProductForm = ({ onProductAdded, editingProduct = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    specifications: '',
    images: '',
    stock: 1,
    sku: ''
  });

  const [loading, setLoading] = useState({
    description: false,
    specs: false,
    price: false,
    optimize: false,
    category: false
  });

  const [aiSuggestions, setAiSuggestions] = useState({
    description: '',
    specifications: '',
    priceData: null,
    category: '',
    optimization: null
  });

  const { toast } = useToast();

  // تحميل بيانات المنتج للتعديل
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price || '',
        originalPrice: editingProduct.originalPrice || '',
        category: editingProduct.category || '',
        specifications: editingProduct.specifications || '',
        images: editingProduct.images || '',
        stock: editingProduct.stock || 1,
        sku: editingProduct.sku || ''
      });
    }
  }, [editingProduct]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // توليد وصف ذكي
  const generateDescription = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المنتج أولاً",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, description: true }));
    try {
      const description = await geminiService.generateProductDescription(
        formData.name,
        formData.category
      );
      setAiSuggestions(prev => ({ ...prev, description }));
      toast({
        title: "تم بنجاح",
        description: "تم توليد وصف المنتج بواسطة الذكاء الاصطناعي"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(prev => ({ ...prev, description: false }));
  };

  // توليد المواصفات
  const generateSpecs = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المنتج أولاً",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, specs: true }));
    try {
      const specifications = await geminiService.generateProductSpecs(
        formData.name,
        formData.category
      );
      setAiSuggestions(prev => ({ ...prev, specifications }));
      toast({
        title: "تم بنجاح",
        description: "تم توليد مواصفات المنتج"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(prev => ({ ...prev, specs: false }));
  };

  // اقتراح سعر
  const suggestPrice = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المنتج أولاً",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, price: true }));
    try {
      const priceData = await geminiService.suggestProductPrice(
        formData.name,
        formData.category,
        formData.specifications
      );
      setAiSuggestions(prev => ({ ...prev, priceData }));
      toast({
        title: "تم بنجاح",
        description: "تم اقتراح سعر للمنتج"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(prev => ({ ...prev, price: false }));
  };



  // تصنيف تلقائي
  const autoCategory = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المنتج أولاً",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, category: true }));
    try {
      const category = await geminiService.categorizeProduct(
        formData.name,
        formData.description
      );
      setAiSuggestions(prev => ({ ...prev, category }));
      toast({
        title: "تم بنجاح",
        description: "تم تصنيف المنتج تلقائياً"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(prev => ({ ...prev, category: false }));
  };

  // تحسين المنتج
  const optimizeProduct = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم ووصف المنتج أولاً",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, optimize: true }));
    try {
      const optimization = await geminiService.optimizeProductListing(formData);
      setAiSuggestions(prev => ({ ...prev, optimization }));
      toast({
        title: "تم بنجاح",
        description: "تم تحسين بيانات المنتج"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(prev => ({ ...prev, optimize: false }));
  };

  // تطبيق الاقتراح
  const applySuggestion = (field, value) => {
    if (field === 'price' && aiSuggestions.priceData) {
      setFormData(prev => ({
        ...prev,
        price: aiSuggestions.priceData.discountedPrice,
        originalPrice: aiSuggestions.priceData.originalPrice
      }));
    } else if (field === 'optimization' && aiSuggestions.optimization) {
      setFormData(prev => ({
        ...prev,
        name: aiSuggestions.optimization.optimizedTitle,
        description: aiSuggestions.optimization.optimizedDescription
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // حفظ المنتج
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.price) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      originalPrice: parseFloat(formData.originalPrice) || parseFloat(formData.price),
      stock: parseInt(formData.stock),
      id: editingProduct?.id || Date.now().toString(),
      sku: formData.sku || `SKU-${Date.now()}`
    };

    onProductAdded(productData);
    
    if (!editingProduct) {
      setFormData({
        name: '',
        description: '',
        price: '',
        originalPrice: '',
        category: '',
        specifications: '',
        images: '',
        stock: 1,
        sku: ''
      });
      setAiSuggestions({
        description: '',
        specifications: '',
        priceData: null,
        category: '',
        optimization: null
      });
    }

    toast({
      title: "تم بنجاح",
      description: editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج بنجاح"
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'} - مدعوم بالذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* اسم المنتج */}
            <div>
              <label className="block text-sm font-medium mb-2">اسم المنتج *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="أدخل اسم المنتج..."
                required
              />
            </div>

            {/* الفئة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">الفئة</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="فئة المنتج..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={autoCategory}
                    disabled={loading.category}
                    className="flex items-center gap-2"
                  >
                    {loading.category ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {aiSuggestions.category && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800 mb-2">اقتراح الذكاء الاصطناعي:</p>
                    <p className="text-purple-700">{aiSuggestions.category}</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applySuggestion('category', aiSuggestions.category)}
                      className="mt-2"
                    >
                      تطبيق
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="رقم SKU (اختياري)"
                />
              </div>
            </div>

            {/* الوصف */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">وصف المنتج *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateDescription}
                  disabled={loading.description}
                  className="flex items-center gap-2"
                >
                  {loading.description ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  توليد وصف ذكي
                </Button>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="وصف مفصل للمنتج..."
                required
              />
              {aiSuggestions.description && (
                <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 mb-2">اقتراح الذكاء الاصطناعي:</p>
                  <p className="text-purple-700 whitespace-pre-line">{aiSuggestions.description}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applySuggestion('description', aiSuggestions.description)}
                    className="mt-2"
                  >
                    تطبيق
                  </Button>
                </div>
              )}
            </div>

            {/* المواصفات */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">المواصفات التقنية</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSpecs}
                  disabled={loading.specs}
                  className="flex items-center gap-2"
                >
                  {loading.specs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  توليد مواصفات
                </Button>
              </div>
              <textarea
                name="specifications"
                value={formData.specifications}
                onChange={handleInputChange}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="الموا��فات التقنية للمنتج..."
              />
              {aiSuggestions.specifications && (
                <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 mb-2">اقتراح الذكاء الاصطناعي:</p>
                  <p className="text-purple-700 whitespace-pre-line">{aiSuggestions.specifications}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applySuggestion('specifications', aiSuggestions.specifications)}
                    className="mt-2"
                  >
                    تطبيق
                  </Button>
                </div>
              )}
            </div>

            {/* السعر */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">السعر (ريال) *</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={suggestPrice}
                    disabled={loading.price}
                    className="flex items-center gap-2 text-xs"
                  >
                    {loading.price ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    اقتراح سعر
                  </Button>
                </div>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">السعر الأصلي (ريال)</label>
                <input
                  type="number"
                  name="originalPrice"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الكمية المتاحة</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
            </div>

            {aiSuggestions.priceData && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-800 mb-2">اقتراح الأسعار من الذكاء الاصطناعي:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-700">
                  <div>
                    <p>السعر الأصلي: {aiSuggestions.priceData.originalPrice} ريال</p>
                    <p>السعر بعد الخصم: {aiSuggestions.priceData.discountedPrice} ريال</p>
                  </div>
                  <div>
                    <p className="text-sm">{aiSuggestions.priceData.priceJustification}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applySuggestion('price')}
                  className="mt-2"
                >
                  تطبيق الأسعار المقترحة
                </Button>
              </div>
            )}



            {/* رابط الصور */}
            <div>
              <label className="block text-sm font-medium mb-2">رابط الصور</label>
              <input
                type="url"
                name="images"
                value={formData.images}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* تحسين المنتج */}
            {formData.name && formData.description && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">تحسين المنتج بالذكاء الاصطناعي</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={optimizeProduct}
                    disabled={loading.optimize}
                    className="flex items-center gap-2"
                  >
                    {loading.optimize ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    تحسين المنتج
                  </Button>
                </div>
                
                {aiSuggestions.optimization && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">اقتراحات التحسين:</h4>
                    <div className="space-y-3 text-green-700">
                      <div>
                        <p className="font-medium">العنوان المحسن:</p>
                        <p>{aiSuggestions.optimization.optimizedTitle}</p>
                      </div>
                      <div>
                        <p className="font-medium">الوصف المحسن:</p>
                        <p>{aiSuggestions.optimization.optimizedDescription}</p>
                      </div>
                      <div>
                        <p className="font-medium">ن��اط البيع الرئيسية:</p>
                        <ul className="list-disc list-inside">
                          {aiSuggestions.optimization.keySellingPoints?.map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">دعوة للعمل:</p>
                        <p>{aiSuggestions.optimization.callToAction}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applySuggestion('optimization')}
                      className="mt-3"
                    >
                      تطبيق التحسينات
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* أزرار الحفظ */}
            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {editingProduct ? 'تحديث المنتج' : 'حفظ المنتج'}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartProductForm;
