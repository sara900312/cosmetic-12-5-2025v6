import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/contexts/SupabaseContext';
import { toast } from '@/components/ui/use-toast';
import { generateBarcode, sanitizeText, sanitizeUrl, safeNumber } from '@/lib/utils';
import { Sparkles, Upload, Database } from 'lucide-react';

const ExcelImportTab = ({ onProductsAdded }) => {
  const [products, setProducts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const { supabase } = useSupabase();
  const fileInputRef = React.useRef(null);

  const handleFileSelect = useCallback(async (file) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const names = (jsonData)
        .flat()
        .filter((x) => typeof x === 'string' && x.trim().length > 1)
        .slice(0, 50);

      if (names.length === 0) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على أسماء منتجات في الملف',
          variant: 'destructive',
        });
        return;
      }

      const initialProducts = names.map((name) => ({
        name_en: name,
        description_ar: '',
        status: 'pending',
      }));

      setProducts(initialProducts);

      toast({
        title: 'تم رفع الملف بنجاح',
        description: `تم استخراج ${names.length} منتج`,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'خطأ في قراءة الملف',
        description: 'تأكد من أن الملف بصيغة Excel صحيحة',
        variant: 'destructive',
      });
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processWithAI = async () => {
    if (products.length === 0) return;

    setIsProcessing(true);
    setProducts(prev => prev.map(p => ({ ...p, status: 'processing' })));

    try {
      const names = products.map((p) => p.name_en);

      const { data, error } = await supabase.functions.invoke('ai-extract-product', {
        body: { names }
      });

      if (error) {
        throw error;
      }

      if (data?.products) {
        const updatedProducts = data.products.map((p) => ({
          ...p,
          status: 'ready',
        }));

        setProducts(updatedProducts);

        toast({
          title: 'تمت المعالجة بنجاح',
          description: `تم توليد أوصاف لـ ${updatedProducts.length} منتج`,
        });
      }
    } catch (error) {
      console.error('Error processing with AI:', error);
      setProducts(prev => prev.map(p => ({ ...p, status: 'pending' })));
      
      toast({
        title: 'خطأ في المعالجة',
        description: error.message || 'حدث خطأ أثناء معالجة المنتجات',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const insertProducts = async () => {
    if (products.length === 0 || products.some(p => !p.description_ar)) {
      toast({
        title: 'تنبيه',
        description: 'يجب معالجة المنتجات أولاً باستخدام الذكاء الاصطناعي',
        variant: 'destructive',
      });
      return;
    }

    setIsInserting(true);

    try {
      const productsToInsert = await Promise.all(
        products.map(async (p) => {
          const barcode = await generateBarcode(supabase);
          return {
            name: sanitizeText(p.name_en, 160),
            name_en: p.name_en,
            description: sanitizeText(p.description_ar, 5000),
            description_en: '',
            price: safeNumber(p.price || 0, { min: 0 }),
            stock: Math.floor(safeNumber(p.stock || 0, { min: 0 })),
            published: false,
            barcode: barcode,
            slug: p.name_en.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
          };
        })
      );

      const { error } = await supabase.from('products').insert(productsToInsert);

      if (error) throw error;

      toast({
        title: 'تم الإدراج بنجاح',
        description: `تم إدراج ${products.length} منتج في قاعدة البيانات`,
      });

      setProducts([]);
      if (onProductsAdded) {
        onProductsAdded();
      }
    } catch (error) {
      console.error('Error inserting products:', error);
      toast({
        title: 'خطأ في الإدراج',
        description: error.message || 'حدث خطأ أثناء إدراج المنتجات',
        variant: 'destructive',
      });
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            رفع ملف Excel
          </h2>
        </div>
        
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative border-2 border-dashed border-primary/30 rounded-lg p-12 text-center cursor-pointer transition-all hover:border-primary/60 hover:bg-accent/50 ${
            isProcessing || isInserting ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing || isInserting}
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-lg animate-pulse">
              <Upload className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                قم بسحب وإفلات ملف Excel هنا
              </h3>
              <p className="text-muted-foreground">
                أو اضغط للاختيار من جهازك
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                يدعم ملفات .xlsx و .xls
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      {products.length > 0 && (
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={processWithAI}
            disabled={isProcessing || isInserting || products.some(p => p.status === 'ready')}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 shadow-lg gap-2 text-base px-8"
          >
            <Sparkles className="w-5 h-5" />
            {isProcessing ? 'جاري التحليل...' : 'تحليل بالذكاء الاصطناعي'}
          </Button>

          <Button
            onClick={insertProducts}
            disabled={isInserting || isProcessing || !products.every(p => p.status === 'ready')}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-lg gap-2 text-base px-8"
          >
            <Database className="w-5 h-5" />
            {isInserting ? 'جاري الإدراج...' : 'إدراج في قاعدة البيانات'}
          </Button>
        </div>
      )}

      {/* Products Table */}
      {products.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-secondary" />
            <h2 className="text-xl font-semibold text-foreground">
              المنتجات ({products.length})
            </h2>
          </div>
          
          <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                    <th className="text-right font-semibold p-4">اسم المنتج (EN)</th>
                    <th className="text-right font-semibold p-4">الوصف (AR)</th>
                    <th className="text-center font-semibold p-4 w-32">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={index} className="hover:bg-accent/30 transition-colors border-b border-border last:border-b-0">
                      <td className="font-medium text-right p-4">{product.name_en}</td>
                      <td className="text-right text-muted-foreground p-4">
                        {product.description_ar || '...'}
                      </td>
                      <td className="text-center p-4">
                        {product.status === 'processing' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-accent text-accent-foreground text-sm">
                            <span className="animate-spin">⏳</span>
                            جاري المعالجة
                          </span>
                        )}
                        {product.status === 'ready' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-500/20 text-green-700 text-sm">
                            ✓ جاهز
                          </span>
                        )}
                        {product.status === 'pending' && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-yellow-500/20 text-yellow-700 text-sm">
                            في الانتظار
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12 space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Upload className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-foreground">
              ابدأ برفع ملف Excel
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              قم برفع ملف Excel يحتوي على أسماء المنتجات، وسيقوم الذكاء الاصطناعي بتوليد أوصاف عربية احترافية تلقائياً
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImportTab;
