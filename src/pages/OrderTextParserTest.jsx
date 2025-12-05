import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { parseOrderPrompt, sendOrderFromPrompt } from '@/lib/orderTextParser';
import { Send, FileText, CheckCircle, XCircle, Copy } from 'lucide-react';

const OrderTextParserTest = () => {
  const [promptText, setPromptText] = useState(`أريد طلبية جديدة:
- الاسم: أحمد علي
- الهاتف: 0912345678
- العنوان: شارع المثال 123
- المدينة: بغداد
- ملاحظات: لا تتصل قبل التسليم
- المنتجات:
   1. LogitechG915X، كمية 1، السعر 20000، متجر: hawranj
   2. AMD Ryzen 9 7950X، كمية 1، السعر 700000، متجر: sara`);
  
  const [parsedOrder, setParsedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const edgeFunctionUrl = 'https://ykyzviqwscrjjkucorlp.supabase.co/functions/v1/order-notification';

  const handleParseText = () => {
    try {
      setError(null);
      const parsed = parseOrderPrompt(promptText);
      setParsedOrder(parsed);
      toast({
        title: "تم تحليل النص بنجاح!",
        description: `تم العثور على ${parsed.items.length} منتج`,
      });
    } catch (err) {
      setError(err.message);
      toast({
        title: "خطأ في التحليل",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSendOrder = async () => {
    if (!parsedOrder) {
      toast({
        title: "يجب تحليل النص أولاً",
        description: "اضغط على زر 'تحليل النص' قبل الإرسال",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const orderResult = await sendOrderFromPrompt(promptText, edgeFunctionUrl);
      setResult(orderResult);
      toast({
        title: "تم إرسال الطلب بنجاح!",
        description: `رقم الطلب: ${orderResult.order?.order_code || 'غير محدد'}`,
      });
    } catch (err) {
      setError(err.message);
      toast({
        title: "خطأ في إرسال الطلب",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
    toast({
      title: "تم النسخ!",
      description: "تم نسخ البيانات إلى الحافظة",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            اختبار تحليل النصوص وإرسال الطلبات
          </h1>
          <p className="text-white/70 text-lg">
            أدخل النص وسيتم تحليله تلقائياً وإرسال الطلب
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* قسم الإدخال */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-effect rounded-lg p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              نص الطلب
            </h2>
            
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={15}
              className="w-full p-4 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none focus:border-primary"
              placeholder="أدخل تفاصيل الطلب هنا..."
            />

            <div className="flex gap-4 mt-4">
              <Button
                onClick={handleParseText}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!promptText.trim()}
              >
                <FileText className="h-4 w-4 mr-2" />
                تحليل النص
              </Button>
              
              <Button
                onClick={handleSendOrder}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={!parsedOrder || isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                إرسال الطلب
              </Button>
            </div>
          </motion.div>

          {/* قسم النتائج */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* البيانات المحللة */}
            {parsedOrder && (
              <div className="glass-effect rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    البيانات المحللة
                  </h3>
                  <Button
                    onClick={() => copyToClipboard(parsedOrder)}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-white/60">العميل:</span>
                      <p className="text-white">{parsedOrder.customer_name}</p>
                    </div>
                    <div>
                      <span className="text-white/60">الهاتف:</span>
                      <p className="text-white">{parsedOrder.customer_phone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-white/60">العنوان:</span>
                    <p className="text-white">{parsedOrder.customer_address}</p>
                  </div>
                  
                  <div>
                    <span className="text-white/60">المنتجات:</span>
                    <div className="space-y-2 mt-2">
                      {parsedOrder.items.map((item, index) => (
                        <div key={index} className="bg-white/5 p-3 rounded border border-white/10">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{item.product_name}</p>
                              <p className="text-white/60 text-xs">متجر: {item.main_store_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white">{item.quantity} × {item.price.toLocaleString()}</p>
                              <p className="text-green-400 text-xs">{(item.price * item.quantity).toLocaleString()} د.ع</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">الإجمالي:</span>
                      <span className="text-white font-bold">{parsedOrder.total_amount.toLocaleString()} د.ع</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* نتيجة الإرسال */}
            {result && (
              <div className="glass-effect rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    نتيجة الإرسال
                  </h3>
                  <Button
                    onClick={() => copyToClipboard(result)}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                    <p className="text-green-400 font-medium">✅ {result.message}</p>
                    {result.order?.order_code && (
                      <p className="text-white mt-1">رقم الطلب: {result.order.order_code}</p>
                    )}
                  </div>
                  
                  {result.items && (
                    <div>
                      <span className="text-white/60">المنتجات المضافة:</span>
                      <div className="space-y-1 mt-2">
                        {result.items.map((item, index) => (
                          <div key={index} className="bg-white/5 p-2 rounded text-xs">
                            <span className="text-white">{item.product_name}</span>
                            <span className="text-white/60 mx-2">×{item.quantity}</span>
                            <span className="text-primary">{item.store_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* الأخطاء */}
            {error && (
              <div className="glass-effect rounded-lg p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <XCircle className="h-5 w-5 text-red-400" />
                  خطأ
                </h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OrderTextParserTest;
