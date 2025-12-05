/**
 * React Hook للتعامل مع عملية الدفع المحسنة
 * يوفر واجهة سهلة لاستخدام خدمة الدفع مع إدارة الحالة
 */

import { useState, useCallback, useRef } from 'react';
import { submitEnhancedOrder } from '@/lib/enhancedCheckoutService';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook للتعامل مع عملية الدفع المحسنة
 * @param {Object} options - خيارات التكوين
 * @returns {Object} حالة وطرق الدفع
 */
export function useEnhancedCheckout(options = {}) {
  // الحالات الأساسية
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);
  const [submissionErrors, setSubmissionErrors] = useState([]);
  const [submissionWarnings, setSubmissionWarnings] = useState([]);
  
  // للتحكم في منع التكرار
  const isProcessingRef = useRef(false);
  const lastSubmissionTimeRef = useRef(0);
  
  // خيارات افتراضية
  const defaultOptions = {
    autoShowToast: true,
    preventDuplicateSubmissions: true,
    minTimeBetweenSubmissions: 2000, // 2 ثانية
    onSuccess: null,
    onError: null,
    onValidationError: null,
    ...options
  };

  /**
   * تنظيف حالة الأخطاء والتحذيرات
   */
  const clearMessages = useCallback(() => {
    setSubmissionErrors([]);
    setSubmissionWarnings([]);
  }, []);

  /**
   * عرض Toast تلقائي بناءً على نتيجة الإرسال
   */
  const showAutoToast = useCallback((result) => {
    if (!defaultOptions.autoShowToast) return;

    if (result.success) {
      toast({
        title: "تم إرسال الطلب بنجاح! ✅",
        description: result.userMessage,
        variant: "default",
        duration: 7000,
      });

      // عرض التحذيرات إن وجدت
      if (result.warnings?.length > 0) {
        setTimeout(() => {
          toast({
            title: "تنبيهات مهمة ⚠️",
            description: result.warnings.join('، '),
            variant: "default",
            duration: 5000,
          });
        }, 1000);
      }
    } else {
      const variant = result.shouldRetry ? "default" : "destructive";
      const duration = result.shouldRetry ? 8000 : 10000;
      
      toast({
        title: result.shouldRetry ? "خطأ مؤقت ⚠️" : "خطأ في الطلب ❌",
        description: result.userMessage,
        variant,
        duration,
      });
    }
  }, [defaultOptions.autoShowToast]);

  /**
   * التحقق من إمكانية الإرسال (منع التكرار)
   */
  const canSubmit = useCallback(() => {
    if (!defaultOptions.preventDuplicateSubmissions) return true;
    
    if (isProcessingRef.current) {
      console.warn('⚠️ محاولة إرسال أثناء معالجة طلب آخر');
      return false;
    }

    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTimeRef.current;
    
    if (timeSinceLastSubmission < defaultOptions.minTimeBetweenSubmissions) {
      console.warn('⚠️ محاولة إرسال سريعة جداً');
      return false;
    }

    return true;
  }, [defaultOptions.preventDuplicateSubmissions, defaultOptions.minTimeBetweenSubmissions]);

  /**
   * الدالة الرئيسية لإرسال الطلب
   */
  const submitOrder = useCallback(async (checkoutData) => {
    // التحقق من إمكانية الإرسال
    if (!canSubmit()) {
      console.warn('⚠️ تم منع إرسال الطلب - محاولة مكررة');
      
      if (defaultOptions.autoShowToast) {
        toast({
          title: "انتظر قليلاً ⏳",
          description: "يرجى عدم النقر على زر الإرسال بسرعة. انتظر انتهاء العملية الحالية.",
          variant: "default",
          duration: 3000,
        });
      }
      
      return { success: false, isDuplicate: true };
    }

    // تنظيف الرسائل السابقة
    clearMessages();
    
    // تعيين حالة الإرسال
    setIsSubmitting(true);
    isProcessingRef.current = true;
    lastSubmissionTimeRef.current = Date.now();

    try {
      console.log('🚀 بدء إرسال الطلب عبر Hook...');

      // إرسال الطلب باستخدام الخدمة المحسنة
      const result = await submitEnhancedOrder(checkoutData);
      
      // حفظ نتيجة الإرسال
      setLastSubmissionResult(result);

      if (result.success) {
        console.log('✅ نجح إرسال الطلب عبر Hook');
        
        // حفظ التحذيرات إن وجدت
        if (result.warnings?.length > 0) {
          setSubmissionWarnings(result.warnings);
        }

        // استدعاء callback النجاح
        if (defaultOptions.onSuccess) {
          try {
            await defaultOptions.onSuccess(result, checkoutData);
          } catch (callbackError) {
            console.error('خطأ في callback النجاح:', callbackError);
          }
        }

      } else {
        console.error('❌ فشل إرسال الطلب عبر Hook:', result.message);
        
        // حفظ الأخطاء
        if (result.errors?.length > 0) {
          setSubmissionErrors(result.errors);
        } else if (result.error) {
          setSubmissionErrors([result.error]);
        }

        // حفظ التحذيرات إن وجدت
        if (result.warnings?.length > 0) {
          setSubmissionWarnings(result.warnings);
        }

        // استدعاء callback الخطأ المناسب
        if (result.isValidationError && defaultOptions.onValidationError) {
          try {
            await defaultOptions.onValidationError(result, checkoutData);
          } catch (callbackError) {
            console.error('خطأ في callback التحقق:', callbackError);
          }
        } else if (defaultOptions.onError) {
          try {
            await defaultOptions.onError(result, checkoutData);
          } catch (callbackError) {
            console.error('خطأ في callback الخطأ:', callbackError);
          }
        }
      }

      // عرض Toast تلقائي
      showAutoToast(result);

      return result;

    } catch (error) {
      console.error('❌ خطأ غير متوقع في Hook:', error);
      
      const errorResult = {
        success: false,
        error: error.message,
        message: `خطأ غير متوقع: ${error.message}`,
        userMessage: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.',
        isUnknownError: true
      };

      setLastSubmissionResult(errorResult);
      setSubmissionErrors([error.message]);

      // عرض Toast للخطأ
      if (defaultOptions.autoShowToast) {
        toast({
          title: "خطأ غير متوقع ❌",
          description: errorResult.userMessage,
          variant: "destructive",
          duration: 10000,
        });
      }

      // استدعاء callback الخطأ
      if (defaultOptions.onError) {
        try {
          await defaultOptions.onError(errorResult, checkoutData);
        } catch (callbackError) {
          console.error('خطأ في callback الخطأ:', callbackError);
        }
      }

      return errorResult;

    } finally {
      setIsSubmitting(false);
      isProcessingRef.current = false;
    }
  }, [canSubmit, clearMessages, showAutoToast, defaultOptions]);

  /**
   * إعادة تعيين حالة Hook
   */
  const reset = useCallback(() => {
    setIsSubmitting(false);
    setLastSubmissionResult(null);
    clearMessages();
    isProcessingRef.current = false;
    lastSubmissionTimeRef.current = 0;
    console.log('🔄 تم إعادة تعيين Hook الدفع');
  }, [clearMessages]);

  /**
   * إعادة محاولة آخر طلب
   */
  const retryLastSubmission = useCallback(async () => {
    if (!lastSubmissionResult?.checkoutData) {
      console.warn('⚠️ لا يوجد طلب سابق لإعادة المحاولة');
      return { success: false, error: 'No previous submission to retry' };
    }

    console.log('🔄 إعادة محاولة آخر طلب...');
    return await submitOrder(lastSubmissionResult.checkoutData);
  }, [lastSubmissionResult, submitOrder]);

  // حساب الحالات المشتقة
  const hasErrors = submissionErrors.length > 0;
  const hasWarnings = submissionWarnings.length > 0;
  const lastSubmissionWasSuccessful = lastSubmissionResult?.success === true;
  const lastSubmissionFailed = lastSubmissionResult?.success === false;
  const canRetry = lastSubmissionResult?.shouldRetry === true;

  return {
    // الحالات الأساسية
    isSubmitting,
    lastSubmissionResult,
    submissionErrors,
    submissionWarnings,
    
    // الحالات المشتقة
    hasErrors,
    hasWarnings,
    lastSubmissionWasSuccessful,
    lastSubmissionFailed,
    canRetry,
    
    // الطرق
    submitOrder,
    reset,
    clearMessages,
    retryLastSubmission,
    
    // معلومات إضافية
    canSubmitNow: canSubmit(),
    isProcessing: isProcessingRef.current
  };
}

/**
 * Hook مبسط للاستخدام السريع مع السلة
 */
export function useQuickCheckout(cartItems, clearCart, options = {}) {
  const checkout = useEnhancedCheckout({
    ...options,
    onSuccess: async (result) => {
      // مسح السلة تلقائياً عند النجاح
      if (clearCart && typeof clearCart === 'function') {
        clearCart();
        console.log('🗑️ تم مسح السلة تلقائياً بعد نجاح الطلب');
      }
      
      // استدعاء callback المخصص إن وجد
      if (options.onSuccess) {
        await options.onSuccess(result);
      }
    }
  });

  /**
   * إرسال طلب سريع بالبيانات الأساسية
   */
  const quickSubmit = useCallback(async (formData, shippingType = 'unified') => {
    if (!cartItems || cartItems.length === 0) {
      console.error('❌ لا يمكن إرسال طلب بسلة فارغة');
      
      if (options.autoShowToast !== false) {
        toast({
          title: "سلة فارغة ❌",
          description: "لا يمكن إرسال طلب بدون منتجات. يرجى إضافة منتجات للسلة أولاً.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      return { success: false, error: 'Empty cart' };
    }

    const checkoutData = {
      formData,
      cartItems,
      shippingType
    };

    return await checkout.submitOrder(checkoutData);
  }, [cartItems, checkout, options]);

  return {
    ...checkout,
    quickSubmit,
    cartItemsCount: cartItems?.length || 0,
    hasItems: (cartItems?.length || 0) > 0
  };
}

/**
 * مثال على الاستخدام في مكون React
 */
export const checkoutHookExamples = {
  // مثال أساسي
  BasicUsageExample: `
import { useEnhancedCheckout } from '@/hooks/useEnhancedCheckout';

function CheckoutForm() {
  const checkout = useEnhancedCheckout({
    onSuccess: async (result) => {
      console.log('نجح الطلب!', result.orderCode);
      // إجراءات ما بعد النجاح
    },
    onError: async (result) => {
      console.error('فشل الطلب:', result.message);
      // معالجة الخطأ
    }
  });

  const handleSubmit = async (formData, cartItems, shippingType) => {
    const result = await checkout.submitOrder({
      formData,
      cartItems,
      shippingType
    });
    
    if (result.success) {
      // نجح الطلب
      navigate('/order-confirmation');
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(formData, cartItems, 'unified');
    }}>
      {/* نموذج الدفع */}
      
      <button 
        type="submit" 
        disabled={checkout.isSubmitting}
      >
        {checkout.isSubmitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
      </button>
      
      {checkout.hasErrors && (
        <div className="error-messages">
          {checkout.submissionErrors.map((error, index) => (
            <p key={index} className="text-red-500">{error}</p>
          ))}
        </div>
      )}
    </form>
  );
}
  `,

  // مثال للاستخدام السريع مع السلة
  QuickUsageExample: `
import { useQuickCheckout } from '@/hooks/useEnhancedCheckout';
import { useCart } from '@/contexts/CartContext';

function QuickCheckoutForm() {
  const { cartItems, clearCart } = useCart();
  const checkout = useQuickCheckout(cartItems, clearCart);

  const handleQuickSubmit = async (formData) => {
    const result = await checkout.quickSubmit(formData, 'unified');
    
    if (result.success) {
      console.log('تم إرسال الطلب!', result.orderCode);
    }
  };

  return (
    <div>
      <p>المنتجات: {checkout.cartItemsCount}</p>
      
      <button 
        onClick={() => handleQuickSubmit(formData)}
        disabled={!checkout.hasItems || checkout.isSubmitting}
      >
        {checkout.isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب سريع'}
      </button>
      
      {checkout.canRetry && (
        <button onClick={checkout.retryLastSubmission}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
  `
};
