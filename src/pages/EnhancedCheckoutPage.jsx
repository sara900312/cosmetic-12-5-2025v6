import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '@/lib/soundPlayer';
import { ArrowLeft, Package, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import ConfirmationModal from '@/components/checkout/ConfirmationModal';
import OrderConfirmedDisplay from '@/components/checkout/OrderConfirmedDisplay';
import ShippingChoiceModal from '@/components/checkout/ShippingChoiceModal';
import { formatPrice } from '@/data/products';
import { useQuickCheckout } from '@/hooks/useEnhancedCheckout';
import { getUniqueStores } from '@/lib/orderPayloadUtils';

const EnhancedCheckoutPage = () => {
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const checkoutFormRef = useRef(null);
  
  // استخدام Hook الدفع المحسن
  const checkout = useQuickCheckout(cartItems, clearCart, {
    autoShowToast: true,
    onSuccess: async (result) => {
      console.log('✅ نجح الطلب!', result);
      setOrderCode(result.orderCode || 'غير محدد');
      setOrderConfirmed(true);
      setShowOrderCodeSection(true);
      setShowConfirmation(false);
      
      // إنهاء العد التنازلي إذا كان نشطاً
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    },
    onError: async (result) => {
      console.error('❌ فشل الطلب:', result?.message || result);
      setShowConfirmation(false);
      setOrderConfirmed(false);
    },
    onValidationError: async (result) => {
      console.error('❌ خطأ في التحقق:', result?.message || result);
      setShowConfirmation(false);
    }
  });

  // الحالات المحلية
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [showOrderCodeSection, setShowOrderCodeSection] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showShippingChoice, setShowShippingChoice] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  const shouldFocusInput = useRef(true);

  // Focus the name input field when user navigates directly to checkout
  useEffect(() => {
    if (shouldFocusInput.current && checkoutFormRef.current && formData.name === '') {
      setTimeout(() => {
        checkoutFormRef.current?.focusNameInput?.();
      }, 500);
      shouldFocusInput.current = false;
    }
  }, []);

  // مرجع للعد التنازلي
  const countdownIntervalRef = React.useRef(null);

  const subtotal = getTotalPrice();
  const totalAmount = subtotal;

  // حساب إجمالي مبلغ الخصم للطلب
  const getTotalDiscountAmount = () => {
    return cartItems.reduce((totalDiscount, item) => {
      const isProductDiscounted = item.is_discounted === true || (item.discount_percent && item.discount_percent > 0);
      const finalPrice = isProductDiscounted && item.discounted_price ? item.discounted_price : item.price;
      const discountPerItem = isProductDiscounted ? Math.max(0, item.price - finalPrice) : 0;
      return totalDiscount + (discountPerItem * item.quantity);
    }, 0);
  };

  const totalDiscountAmount = getTotalDiscountAmount();

  // Helper functions
  const hasMultipleStores = () => {
    const uniqueStores = getUniqueStores(cartItems);
    return uniqueStores.length > 1;
  };

  const getStoresList = () => {
    return getUniqueStores(cartItems);
  };

  // معالج تغيير بيانات النموذج
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // التحقق من صحة النموذج
  const isFormValid = () => {
    const errors = [];
    
    if (!formData.name || formData.name.trim().length === 0) {
      errors.push('الاسم مطلوب');
    }
    
    if (!formData.phone || formData.phone.trim().length === 0) {
      errors.push('رقم الهاتف مطلوب');
    } else {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        errors.push('رقم الهاتف يجب أن يحتوي على 10 أرقام على الأقل');
      }
    }
    
    if (!formData.address || formData.address.trim().length === 0) {
      errors.push('العنوان مطلوب');
    }

    return errors.length === 0;
  };

  // معالج إرسال النموذج
  const handleFormSubmit = async () => {
    // منع الإرسال إذا كان قيد المعالجة
    if (checkout.isSubmitting) {
      console.warn('⚠️ عملية إرسال جارية بالفعل');
      return;
    }

    // التحقق من صحة النموذج
    if (!isFormValid()) {
      toast({
        title: "بيانات غير مكتملة ❌",
        description: "يرجى التأكد من ملء جميع الحقول المطلوبة بشكل صحيح.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // للتحقق من وجود منتجات في السلة
    if (!checkout.hasItems) {
      toast({
        title: "سلة فارغة ❌",
        description: "لا يمكن إرسال طلب بدون منتجات. يرجى إضافة منتجات للسلة أولاً.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // فحص إذا كان هناك متاجر متعددة
    if (hasMultipleStores()) {
      setShowShippingChoice(true);
      return;
    }

    // إذا كان متجر واحد، متابعة مباشرة
    proceedWithOrder('unified');
  };

  // متابعة ال��لب بعد اختيار نوع الشحن
  const proceedWithOrder = (shippingType) => {
    setSelectedShipping(shippingType);
    setShowShippingChoice(false);
    setShowConfirmation(true);

    // Play placing order sound when user starts the order (starts confirmation)
    playSound('placingOrder');

    // بدء العد التنازلي
    startCountdown(shippingType);
  };

  // بدء العد التنازلي
  const startCountdown = (shippingType) => {
    let countdownValue = 10;
    setCountdown(countdownValue);

    // تنظيف العد التنازلي السابق إن وجد
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);

      if (countdownValue <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        processOrderSubmission(shippingType);
      }
    }, 1000);
  };

  // معالجة إرسال الطلب
  const processOrderSubmission = async (shippingType = 'unified') => {
    try {
      console.log('🚀 بدء إرسال الطلب المحسن...');

      // تحضير بيانات الطلب
      const checkoutData = {
        formData: {
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_address: formData.address,
          customer_city: detectCityFromAddress(formData.address),
          customer_notes: formData.notes
        },
        cartItems,
        shippingType
      };

      // إرسال الطلب باستخدام Hook المحسن
      const result = await checkout.quickSubmit(checkoutData.formData, shippingType);
      
      // لا حاجة لمعالجة إضافية هنا، سيتم التعامل مع النتيجة في callbacks

    } catch (error) {
      console.error('❌ خطأ غير متوقع في معالجة الطلب:', error?.message || error);
      
      // إنهاء حالة التأكيد
      setShowConfirmation(false);
    }
  };

  // استخراج المدينة من العنوان
  const detectCityFromAddress = (address) => {
    if (!address) return 'غير محدد';
    
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('بغداد') || addressLower.includes('baghdad')) {
      return 'بغداد';
    } else if (addressLower.includes('أربيل') || addressLower.includes('erbil')) {
      return 'أربيل';
    } else if (addressLower.includes('البصرة') || addressLower.includes('basra')) {
      return 'البصرة';
    }

    return 'محافظات أخرى';
  };

  // معالج اختيار نوع الشحن
  const handleShippingChoice = (shippingType) => {
    proceedWithOrder(shippingType);
  };

  // إلغاء الطلب
  const cancelOrder = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setShowConfirmation(false);
    setCountdown(10);
    setOrderCode('');
    
    // إعادة تعيين Hook إذا لزم الأمر
    if (checkout.isSubmitting) {
      checkout.reset();
    }
  };

  // تأكيد الطلب فوراً
  const confirmOrderImmediately = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    processOrderSubmission(selectedShipping || 'unified');
  };

  // نسخ رقم الطلب
  const handleCopyOrderCode = () => {
    if (orderCode) {
      navigator.clipboard.writeText(orderCode);
      toast({
        title: "تم نسخ رقم الطلب! 📋",
        description: orderCode,
        duration: 3000,
      });
    }
  };

  // تنظيف العد التنازلي عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // عرض صفحة السلة الفارغة
  if (cartItems.length === 0 && !orderConfirmed) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 mx-auto text-themed-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold text-themed-foreground mb-4">السلة فارغة</h1>
          <p className="text-themed-foreground/60 mb-8">لا توجد منتجات في سلة التسوق</p>
          <Button onClick={() => navigate('/products')} className="gradient-bg text-white">
            تصفح المنتجات
          </Button>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-themed-foreground/60 mb-8"
        >
          <button onClick={() => navigate(-1)} className="hover:text-themed-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold text-themed-foreground">إتمام الطلب</h1>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          <CheckoutForm
            ref={checkoutFormRef}
            formData={formData}
            handleInputChange={handleInputChange}
            onAutoSubmit={handleFormSubmit}
            isSubmitting={checkout.isSubmitting}
          />
          <div className="space-y-6">
            <OrderSummary
              items={cartItems || []}
              subtotal={subtotal}
            />
            
            {/* عرض حالة المعالجة */}
            {checkout.isSubmitting && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-2xl p-6 text-center"
              >
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-bold text-themed-foreground mb-2">
                  جاري معالجة الطلب...
                </h3>
                <p className="text-themed-foreground/60">
                  يرجى عدم إغلاق الصفحة أو النقر على زر الإرسال مرة أخرى
                </p>
              </motion.div>
            )}

            {/* عرض الأخطاء */}
            {checkout.hasErrors && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
              >
                <h3 className="text-red-400 font-bold mb-2">أخطاء في الطلب:</h3>
                <ul className="text-red-300 space-y-1">
                  {checkout.submissionErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                
                {checkout.canRetry && (
                  <button
                    onClick={checkout.retryLastSubmission}
                    className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    إعادة المحاولة
                  </button>
                )}
              </motion.div>
            )}

            {/* عرض التحذيرات */}
            {checkout.hasWarnings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4"
              >
                <h3 className="text-yellow-400 font-bold mb-2">تنبيهات:</h3>
                <ul className="text-yellow-300 space-y-1">
                  {checkout.submissionWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* شاشات التأكيد */}
      <ShippingChoiceModal
        isOpen={showShippingChoice}
        onClose={() => setShowShippingChoice(false)}
        onChooseShipping={handleShippingChoice}
        multipleStores={hasMultipleStores()}
        storesList={getStoresList()}
      />

      <ConfirmationModal
        isOpen={showConfirmation && !orderConfirmed}
        countdown={countdown}
        orderCode={orderCode}
        onCancel={cancelOrder}
        onConfirmImmediately={confirmOrderImmediately}
      />

      <OrderConfirmedDisplay
        isOpen={orderConfirmed && showOrderCodeSection}
        orderCode={orderCode}
        onCopy={handleCopyOrderCode}
        onClose={() => setShowOrderCodeSection(false)}
      />

      <Footer />
    </div>
  );
};

export default EnhancedCheckoutPage;
