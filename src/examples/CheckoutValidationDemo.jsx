/**
 * مكون لعرض وتوضيح كيفية استخدام نظام التحقق المحسن للطلبات
 * يعرض جميع الحالات المختلفة والتحققات المطلوبة
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useEnhancedCheckout } from '@/hooks/useEnhancedCheckout';
import { 
  validateOrderBeforeSubmission, 
  processAndSubmitOrder,
  handlePGRST116Error 
} from '@/lib/orderValidationService';

const CheckoutValidationDemo = () => {
  const [selectedExample, setSelectedExample] = useState('basic');
  const [validationResult, setValidationResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showRawData, setShowRawData] = useState(false);

  // Hook للاختبار
  const checkout = useEnhancedCheckout({
    autoShowToast: false, // نتحكم في Toast يدوياً
    onSuccess: (result) => {
      console.log('✅ نجح الطلب في Demo:', result);
    },
    onError: (result) => {
      console.error('❌ فشل الطلب في Demo:', result?.message || result);
    }
  });

  // أمثلة مختلفة للاختبار
  const testExamples = {
    basic: {
      name: 'طلب صحيح أساسي',
      description: 'طلب يحتوي على جميع البيانات المطلوبة بشكل صحيح',
      data: {
        customer_name: 'أحمد محمد علي',
        customer_phone: '07801234567',
        customer_address: 'بغداد، الكرادة الشرقية، شارع 62',
        customer_notes: 'التسليم مساءً',
        shipping_type: 'unified',
        items: [
          {
            id: 1,
            name: 'لابتوب HP',
            price: 800,
            quantity: 1,
            main_store_name: 'متجر الحاسوب'
          },
          {
            id: 2,
            name: 'ماوس لاسلكي',
            price: 25,
            quantity: 2,
            main_store_name: 'متجر الحاسوب'
          }
        ]
      }
    },

    withDuplicates: {
      name: 'طلب يحتوي على منتجات مكررة',
      description: 'اختبار إزالة المنتجات المكررة ودمج الكميا��',
      data: {
        customer_name: 'سارة أحمد',
        customer_phone: '07701234567',
        customer_address: 'أربيل، حي الأندلس',
        shipping_type: 'unified',
        items: [
          {
            id: 1,
            name: 'هاتف Samsung',
            price: 400,
            quantity: 1,
            main_store_name: 'متجر الهواتف'
          },
          {
            id: 1, // منتج مكرر
            name: 'هاتف Samsung',
            price: 400,
            quantity: 2,
            main_store_name: 'متجر الهواتف'
          },
          {
            id: 2,
            name: 'جراب هاتف',
            price: 15,
            quantity: 1,
            main_store_name: 'متجر الهواتف'
          }
        ]
      }
    },

    withInvalidItems: {
      name: 'طلب يحتوي على منتجات غير صالحة',
      description: 'اختبار فلترة المنتجات ذات البيانات المعطوبة أو المفقودة',
      data: {
        customer_name: 'محمد عمر',
        customer_phone: '07801112233',
        customer_address: 'البصرة، حي الحسين',
        shipping_type: 'unified',
        items: [
          {
            id: 1,
            name: 'منتج صالح',
            price: 100,
            quantity: 1,
            main_store_name: 'متجر 1'
          },
          {
            id: 2,
            name: 'منتج بسعر خاطئ',
            price: 'invalid', // سعر غير صالح
            quantity: 1,
            main_store_name: 'متجر 1'
          },
          {
            id: 3,
            name: 'منتج بدون كمية',
            price: 50,
            // quantity مفقود
            main_store_name: 'متجر 1'
          },
          {
            // id مفقود
            name: 'منتج بدون معرف',
            price: 75,
            quantity: 1,
            main_store_name: 'متجر 1'
          },
          {
            id: 4,
            name: 'منتج صالح آخر',
            price: 200,
            quantity: 2,
            main_store_name: 'متجر 2'
          }
        ]
      }
    },

    fastShipping: {
      name: 'شحن سريع متعدد المتاجر',
      description: 'اختبار الشحن السريع مع متاجر مختلفة',
      data: {
        customer_name: 'علي حسن',
        customer_phone: '07709998877',
        customer_address: 'الموصل، حي الزهور',
        shipping_type: 'fast',
        items: [
          {
            id: 1,
            name: 'كتاب تعليمي',
            price: 30,
            quantity: 1,
            main_store_name: 'مكتبة النور'
          },
          {
            id: 2,
            name: 'قلم حبر',
            price: 5,
            quantity: 3,
            main_store_name: 'مكتبة النور'
          },
          {
            id: 3,
            name: 'جهاز كمبيوتر لوحي',
            price: 350,
            quantity: 1,
            main_store_name: 'متجر التكنولوجيا'
          }
        ]
      }
    },

    missingRequiredFields: {
      name: 'طلب ينقصه حقول مطلوبة',
      description: 'اختبار التحقق من الحقول المطلوبة ورسائل الخطأ',
      data: {
        // customer_name مفقود
        customer_phone: '', // فارغ
        customer_address: 'عنوان جزئي',
        shipping_type: 'invalid_type', // نوع شحن خاطئ
        items: [] // مصفوفة فارغة
      }
    },

    invalidPhoneAndData: {
      name: 'بيانات عميل غير صحيحة',
      description: 'اختبار التحقق من رقم الهاتف والبيانات الشخصية',
      data: {
        customer_name: '   ', // مسافات فقط
        customer_phone: '123', // رقم قصير جداً
        customer_address: 'https://malicious-link.com', // رابط مشبوه
        customer_notes: 'تواصل معي عبر www.spam.com', // ملاحظات تحتوي على رابط
        shipping_type: 'unified',
        items: [
          {
            id: 1,
            name: 'منتج اختبار',
            price: 50,
            quantity: 1,
            main_store_name: 'متجر اختبار'
          }
        ]
      }
    }
  };

  // تشغيل مثال للتحقق فقط (بدون إرسال)
  const runValidationTest = () => {
    const example = testExamples[selectedExample];
    console.log(`🧪 اختبار التحقق: ${example.name}`);
    
    const result = validateOrderBeforeSubmission(example.data);
    setValidationResult(result);
    setSubmissionResult(null);

    // عرض نتيجة مختصرة في Toast
    if (result.isValid) {
      toast({
        title: "التحقق نجح ✅",
        description: `تم التحقق بنجاح. ${result.processedData.items.length} منتج صالح.`,
        variant: "default",
        duration: 3000,
      });
    } else {
      toast({
        title: "فشل التحقق ❌",
        description: `${result.errors.length} خطأ، ${result.warnings?.length || 0} تحذير.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // تشغيل مثال كامل (تحقق + إرسال وهمي)
  const runFullTest = async () => {
    const example = testExamples[selectedExample];
    console.log(`🚀 اختبار كامل: ${example.name}`);

    try {
      // إجراء التحقق أولاً
      const validation = validateOrderBeforeSubmission(example.data);
      setValidationResult(validation);

      if (!validation.isValid) {
        toast({
          title: "فشل التحقق ❌",
          description: "لا يمكن إرسال الطلب بسبب أخطاء في البيانات.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // محاكاة الإرسال (بدون إرسال فعلي للتجنب spam)
      const mockSubmissionResult = {
        success: Math.random() > 0.3, // 70% نجاح
        data: {
          order_code: `TEST-${Date.now().toString().slice(-6)}`,
          orders_count: validation.processedData.shipping_type === 'fast' ? validation.processedData.items.length : 1
        },
        orderCode: `TEST-${Date.now().toString().slice(-6)}`,
        totalAmount: validation.processedData.total_amount,
        itemsCount: validation.processedData.items.length,
        message: 'تم إنشاء طلب اختبار بنجاح'
      };

      // إضافة تأخير لمحاكاة الشبكة
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmissionResult(mockSubmissionResult);

      if (mockSubmissionResult.success) {
        toast({
          title: "نجح الإرسال التجريبي ✅",
          description: `رقم الطلب: ${mockSubmissionResult.orderCode}`,
          variant: "default",
          duration: 5000,
        });
      } else {
        toast({
          title: "فشل الإرسال التجريبي ❌", 
          description: "محاكاة فشل في الإرسال",
          variant: "destructive",
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('خطأ في الاختبار:', error?.message || error);
      setSubmissionResult({
        success: false,
        error: error.message,
        message: `خطأ: ${error.message}`
      });
    }
  };

  // تشغيل اختبار معالجة خطأ PGRST116
  const testPGRST116Error = () => {
    const mockError = {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'The result contains 0 rows'
    };

    const errorHandling = handlePGRST116Error(mockError);
    
    toast({
      title: "معالجة خطأ PGRST116 🔧",
      description: errorHandling.message,
      variant: errorHandling.shouldProceed ? "default" : "destructive",
      duration: 6000,
    });

    console.log('🔧 نتيجة معالجة PGRST116:', errorHandling);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 معرض التحقق المحسن للطلبات
          </h1>
          <p className="text-gray-300 text-lg">
            اختبار جميع الحالات والتحققات المطلوبة قبل إرسال الطلبات
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* قائمة الأمثلة */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-effect rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6">أمثلة الاختبا��</h2>
            
            <div className="space-y-3">
              {Object.entries(testExamples).map(([key, example]) => (
                <button
                  key={key}
                  onClick={() => setSelectedExample(key)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                    selectedExample === key
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <div className="font-medium mb-1">{example.name}</div>
                  <div className="text-sm opacity-80">{example.description}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-lg font-medium text-white mb-4">أدوات الاختبار</h3>
              
              <div className="space-y-3">
                <Button
                  onClick={runValidationTest}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ��ختبار التحقق فقط
                </Button>

                <Button
                  onClick={runFullTest}
                  disabled={checkout.isSubmitting}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checkout.isSubmitting ? 'animate-spin' : ''}`} />
                  {checkout.isSubmitting ? 'جاري الاختبار...' : 'اختبار كامل (وهمي)'}
                </Button>

                <Button
                  onClick={testPGRST116Error}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  اختبار خطأ PGRST116
                </Button>

                <Button
                  onClick={() => setShowRawData(!showRawData)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showRawData ? 'إخفاء' : 'عرض'} البيانات الخام
                </Button>
              </div>
            </div>
          </motion.div>

          {/* ال��تائج */}
          <div className="lg:col-span-2 space-y-6">
            {/* البيانات الخام */}
            {showRawData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-4">البيانات الأصلية</h3>
                <pre className="bg-black/50 rounded-lg p-4 text-green-400 text-sm overflow-auto max-h-64">
                  {JSON.stringify(testExamples[selectedExample].data, null, 2)}
                </pre>
              </motion.div>
            )}

            {/* نتائج التحقق */}
            {validationResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  {validationResult.isValid ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <h3 className="text-lg font-bold text-white">
                    نتائج التحقق
                  </h3>
                </div>

                {/* الأخطاء */}
                {validationResult.errors?.length > 0 && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <h4 className="font-bold text-red-400 mb-2">الأخطاء:</h4>
                    <ul className="text-red-300 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* التحذيرات */}
                {validationResult.warnings?.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <h4 className="font-bold text-yellow-400 mb-2">التحذيرات:</h4>
                    <ul className="text-yellow-300 space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* البيانات المعالجة */}
                {validationResult.isValid && validationResult.processedData && (
                  <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <h4 className="font-bold text-green-400 mb-2">البيانات المعالجة:</h4>
                    <div className="text-green-300 space-y-1">
                      <p>• العميل: {validationResult.processedData.customer_name}</p>
                      <p>• الهاتف: {validationResult.processedData.customer_phone}</p>
                      <p>• المنتجات: {validationResult.processedData.items.length}</p>
                      <p>• نوع الشحن: {validationResult.processedData.shipping_type}</p>
                      <p>• المبلغ الإجمالي: {validationResult.processedData.total_amount} د.ع</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* نتائج الإرسال */}
            {submissionResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  {submissionResult.success ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <h3 className="text-lg font-bold text-white">
                    نتائج الإرسال التجريبي
                  </h3>
                </div>

                {submissionResult.success ? (
                  <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <h4 className="font-bold text-green-400 mb-2">نجح الإرسال! 🎉</h4>
                    <div className="text-green-300 space-y-1">
                      <p>• رقم الطلب: {submissionResult.orderCode}</p>
                      <p>• عدد المنتجات: {submissionResult.itemsCount}</p>
                      <p>• المبلغ الإجمالي: {submissionResult.totalAmount} د.ع</p>
                      <p>• الرسالة: {submissionResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <h4 className="font-bold text-red-400 mb-2">فشل الإرسال!</h4>
                    <p className="text-red-300">
                      {submissionResult.message || submissionResult.error}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* معلومات Hook */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4">حالة Hook</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">قيد الإرسال:</span>
                  <span className={`ml-2 ${checkout.isSubmitting ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {checkout.isSubmitting ? 'نعم' : 'لا'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">آخر نتيجة:</span>
                  <span className={`ml-2 ${
                    checkout.lastSubmissionWasSuccessful ? 'text-green-400' : 
                    checkout.lastSubmissionFailed ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {checkout.lastSubmissionWasSuccessful ? 'نجح' : 
                     checkout.lastSubmissionFailed ? 'فشل' : 'لا يوجد'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">أخطاء:</span>
                  <span className="text-gray-300 ml-2">{checkout.submissionErrors.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">تحذيرات:</span>
                  <span className="text-gray-300 ml-2">{checkout.submissionWarnings.length}</span>
                </div>
              </div>

              {checkout.hasErrors && (
                <Button
                  onClick={checkout.clearMessages}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  مسح الرسائل
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutValidationDemo;
