/**
 * خدمة الدفع المحسنة مع التحقق الشامل والتعامل مع الأخطاء
 * تستخدم orderValidationService للتحقق من البيانات قبل الإرسال
 */

import { 
  processAndSubmitOrder, 
  validateOrderBeforeSubmission,
  handlePGRST116Error 
} from './orderValidationService.js';

/**
 * معالج شامل لعملية إرسال الطلبات مع جميع التحققات المطلوبة
 */
export class EnhancedCheckoutService {
  constructor() {
    this.edgeFunctionUrl = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification';
    this.activeRequests = new Map(); // لتتبع الطلبات النشطة ومنع التكرار
  }

  /**
   * تحضير بيانات الطلب من معلومات الدفع
   * @param {Object} checkoutData - بيانات الدفع
   * @returns {Object} بيانات الطلب مُحضرة
   */
  prepareOrderData(checkoutData) {
    const {
      formData,
      cartItems,
      shippingType = 'unified',
      orderCode = null,
      userId = null
    } = checkoutData;

    // التحقق من المدخلات الأساسية
    if (!formData || !cartItems || !Array.isArray(cartItems)) {
      throw new Error('بيانات الدفع غير كاملة');
    }

    return {
      // بيانات العميل (مطلوبة)
      customer_name: formData.name || formData.customer_name,
      customer_phone: formData.phone || formData.customer_phone,
      
      // بيانات العميل (اختيارية)
      customer_address: formData.address || formData.customer_address || '',
      customer_city: formData.city || formData.customer_city || this.detectCityFromAddress(formData.address),
      customer_notes: formData.notes || formData.customer_notes || '',
      user_id: userId,

      // بيانات الطلب
      items: cartItems.map(item => ({
        id: item.id,
        product_id: item.id,
        name: item.name,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        discounted_price: item.discounted_price,
        main_store_name: item.main_store_name || item.main_store || item.store_name
      })),
      
      shipping_type: shippingType,
      order_code: orderCode,
      delivery_cost: 0 // يمكن تخصيصها لاحقاً
    };
  }

  /**
   * استخراج المدينة من العنوان تلقائياً
   * @param {string} address - العنوان
   * @returns {string} المدينة المستخرجة
   */
  detectCityFromAddress(address) {
    if (!address || typeof address !== 'string') return 'غير محدد';
    
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('بغداد') || addressLower.includes('baghdad')) {
      return 'بغداد';
    } else if (addressLower.includes('أربيل') || addressLower.includes('erbil')) {
      return 'أربيل';
    } else if (addressLower.includes('البصرة') || addressLower.includes('basra')) {
      return 'البصرة';
    } else if (addressLower.includes('الموصل') || addressLower.includes('mosul')) {
      return 'الموصل';
    } else if (addressLower.includes('السليمانية') || addressLower.includes('sulaymaniyah')) {
      return 'السليمانية';
    } else if (addressLower.includes('كربلاء') || addressLower.includes('karbala')) {
      return 'كربلاء';
    } else if (addressLower.includes('النجف') || addressLower.includes('najaf')) {
      return 'النجف';
    }
    
    return 'محافظات أخرى';
  }

  /**
   * تشفير مفتاح الطلب لمنع التكرار
   * @param {Object} orderData - بيانات الطلب
   * @returns {string} مفتاح فريد
   */
  generateRequestKey(orderData) {
    const keyData = {
      customer_phone: orderData.customer_phone,
      items_count: orderData.items?.length || 0,
      shipping_type: orderData.shipping_type,
      timestamp: Math.floor(Date.now() / 1000 / 60) // دقيقة واحدة precision
    };
    
    return btoa(JSON.stringify(keyData));
  }

  /**
   * التحقق من عدم وجود طلب مماثل نشط
   * @param {string} requestKey - مفتاح الط��ب
   * @returns {boolean} true إذا كان الطلب جديد
   */
  isRequestUnique(requestKey) {
    if (this.activeRequests.has(requestKey)) {
      const requestTime = this.activeRequests.get(requestKey);
      const timeDiff = Date.now() - requestTime;
      
      // إذا مر أكثر من دقيقتين، نعتبر الطلب منتهي الصلاحية
      if (timeDiff > 2 * 60 * 1000) {
        this.activeRequests.delete(requestKey);
        return true;
      }
      
      return false; // طلب مكرر
    }
    
    return true; // طلب جديد
  }

  /**
   * تسجيل طلب نشط
   * @param {string} requestKey - مفتاح الطلب
   */
  registerActiveRequest(requestKey) {
    this.activeRequests.set(requestKey, Date.now());
  }

  /**
   * إزالة طلب من القائمة النشطة
   * @param {string} requestKey - مفتاح الطلب
   */
  unregisterActiveRequest(requestKey) {
    this.activeRequests.delete(requestKey);
  }

  /**
   * معالجة أخطاء قاعدة البيانات المختلفة
   * @param {Error} error - الخطأ المستلم
   * @returns {Object} معلومات معالجة الخطأ
   */
  handleDatabaseError(error) {
    const errorMessage = error.message || error.toString();
    
    // معالجة خطأ PGRST116 المحدد
    if (errorMessage.includes('PGRST116')) {
      return handlePGRST116Error(error);
    }
    
    // أخطاء تكرار المفاتيح
    if (errorMessage.includes('duplicate key') || 
        errorMessage.includes('idempotency') ||
        errorMessage.includes('unique constraint')) {
      return {
        isDuplicateError: true,
        message: 'تم إرسال هذا الطلب مسبقاً',
        shouldRetry: false,
        userMessage: 'تم تسجيل طلبك مسبقاً. يرجى مراجعة طلباتك السابقة.'
      };
    }
    
    // خطأ اتصال الشبكة
    if (errorMessage.includes('fetch') || 
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED')) {
      return {
        isNetworkError: true,
        message: 'خطأ في الاتصال بالخادم',
        shouldRetry: true,
        userMessage: 'تحقق من اتصال الإنترنت وحاول مرة أخرى.'
      };
    }
    
    // خطأ انتهاء المهلة الزمنية
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return {
        isTimeoutError: true,
        message: 'انتهت المهلة الزمنية للطلب',
        shouldRetry: true,
        userMessage: 'استغرق الطلب وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.'
      };
    }
    
    // أخطاء الخادم
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      return {
        isServerError: true,
        message: 'خطأ في الخادم',
        shouldRetry: true,
        userMessage: 'حدث خطأ مؤقت في الخادم. يرجى المحاولة بعد قليل.'
      };
    }
    
    // خطأ غير معروف
    return {
      isUnknownError: true,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `حدث خطأ غير متوقع: ${errorMessage}`
    };
  }

  /**
   * الدالة الرئيسية لإرسال الطلب مع جميع الحمايات المطلوبة
   * @param {Object} checkoutData - بيانات الدفع
   * @param {Object} options - خيارات إضافية
   * @returns {Promise<Object>} نتيجة عملية الإرسال
   */
  async submitOrder(checkoutData, options = {}) {
    let requestKey = null;
    
    try {
      console.log('🚀 بدء عملية إرسال الطلب المحسنة...');
      
      // 1. تحضير بيانات الطلب
      const orderData = this.prepareOrderData(checkoutData);
      
      // 2. إنشاء مفتاح الطلب لمنع التكرار
      requestKey = this.generateRequestKey(orderData);
      
      // 3. التحقق من عدم تكرار الطلب
      if (!this.isRequestUnique(requestKey)) {
        console.warn('⚠️ طلب مكرر تم رفضه');
        return {
          success: false,
          isDuplicate: true,
          message: 'يتم معالجة طلب مماثل حالياً. يرجى الانتظار.',
          userMessage: 'يرجى عدم النقر على زر الإرسال مرة أخرى. يتم معالجة طلبك حالياً.'
        };
      }
      
      // 4. تسجيل الطلب كنشط
      this.registerActiveRequest(requestKey);
      
      // 5. التحقق المتقدم من البيانات قبل الإرسال
      console.log('🔍 بدء التحقق المتقدم من البيانات...');
      const validation = validateOrderBeforeSubmission(orderData);
      
      if (!validation.isValid) {
        console.error('❌ فشل في التحقق من البيانات:', validation.errors);
        return {
          success: false,
          isValidationError: true,
          errors: validation.errors,
          warnings: validation.warnings,
          message: 'بيانات الطلب غير صالحة',
          userMessage: `يرجى تصحيح الأخطاء التالية: ${validation.errors.join('، ')}`
        };
      }
      
      // عرض التحذيرات للمستخدم إن وجدت
      if (validation.warnings?.length > 0) {
        console.warn('⚠️ تحذيرات:', validation.warnings);
      }
      
      // 6. إرسال الطلب إلى Edge Function
      console.log('📤 إرسال الطلب إلى Edge Function...');
      const result = await processAndSubmitOrder(orderData, this.edgeFunctionUrl);
      
      if (result.success) {
        console.log('✅ تم إرسال الطلب بنجاح!');
        
        return {
          success: true,
          data: result.data,
          orderCode: result.orderCode,
          totalAmount: result.totalAmount,
          itemsCount: result.itemsCount,
          warnings: [...(validation.warnings || []), ...(result.warnings || [])],
          message: result.message,
          userMessage: this.generateSuccessMessage(result, checkoutData.shippingType)
        };
      } else {
        console.error('❌ فشل في إرسال الطلب:', result.message);
        
        // معالجة خطأ الإرسال
        const errorInfo = this.handleDatabaseError(new Error(result.error || result.message));
        
        return {
          success: false,
          error: result.error,
          message: result.message,
          userMessage: errorInfo.userMessage,
          shouldRetry: errorInfo.shouldRetry || false,
          ...errorInfo
        };
      }
      
    } catch (error) {
      console.error('❌ خطأ غير متوقع أثناء إرسال الطلب:', error);
      
      // معالجة الخطأ وتوفير رسالة مناسبة للمستخدم
      const errorInfo = this.handleDatabaseError(error);
      
      return {
        success: false,
        error: error.message,
        message: `خطأ: ${error.message}`,
        userMessage: errorInfo.userMessage,
        shouldRetry: errorInfo.shouldRetry || false,
        ...errorInfo
      };
      
    } finally {
      // 7. إزالة الطلب من القائمة النشطة
      if (requestKey) {
        this.unregisterActiveRequest(requestKey);
      }
    }
  }

  /**
   * إنشاء رسالة نجاح مخصصة بناءً على نوع الشحن
   * @param {Object} result - نتيجة الإرسال
   * @param {string} shippingType - نوع الشحن
   * @returns {string} رسالة النجاح
   */
  generateSuccessMessage(result, shippingType) {
    const orderCode = result.orderCode;
    const itemsCount = result.itemsCount;
    
    if (shippingType === 'fast') {
      return `تم إنشاء ${itemsCount} طلب منفصل للشحن السريع. الرقم الرئيسي: ${orderCode}. سيتم التواصل معك قريباً من كل متجر.`;
    } else {
      return `تم إرسال طلبك بنجاح! رقم الطلب: ${orderCode}. يحتوي على ${itemsCount} منتج. سيتم التواصل معك قريباً.`;
    }
  }

  /**
   * تنظيف الطلبات القديمة من الذاكرة
   */
  cleanupOldRequests() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 دقائق
    
    for (const [key, timestamp] of this.activeRequests.entries()) {
      if (now - timestamp > maxAge) {
        this.activeRequests.delete(key);
      }
    }
  }

  /**
   * إعادة تعيين الخدمة وتنظيف جميع الطلبات النشطة
   */
  reset() {
    this.activeRequests.clear();
    console.log('🔄 تم إعادة تعيين خدمة الدفع');
  }
}

/**
 * إنشاء instance واحد للاستخدام العام
 */
export const checkoutService = new EnhancedCheckoutService();

/**
 * دالة مساعدة للاستخدام السريع
 * @param {Object} checkoutData - بيانات الدفع
 * @param {Object} options - خ��ارات إضافية
 * @returns {Promise<Object>} نتيجة الإرسال
 */
export async function submitEnhancedOrder(checkoutData, options = {}) {
  return await checkoutService.submitOrder(checkoutData, options);
}

/**
 * مثال على الاستخدام
 */
export const checkoutServiceExamples = {
  // مثال كامل للاستخدام في صفحة الدفع
  async exampleCheckoutSubmission() {
    const checkoutData = {
      formData: {
        name: 'أحمد محمد علي',
        phone: '07801234567',
        address: 'بغداد، الكرادة الشرقية، شارع 62، زقاق 5، دار 12',
        notes: 'التسليم مساءً بعد الساعة 6'
      },
      cartItems: [
        {
          id: 1,
          name: 'لابتوب HP EliteBook',
          price: 850,
          quantity: 1,
          discounted_price: 800,
          main_store_name: 'متجر الحاسوب المتقدم'
        },
        {
          id: 2,
          name: 'ماوس لوجيتك لاسلكي',
          price: 35,
          quantity: 2,
          main_store_name: 'متجر الحاسوب المتقدم'
        }
      ],
      shippingType: 'unified',
      userId: null // أو معرف المس��خدم إذا كان مسجل الدخول
    };

    try {
      const result = await checkoutService.submitOrder(checkoutData);
      
      if (result.success) {
        console.log('✅ نجح ا��طلب!');
        console.log('رسالة للمس��خدم:', result.userMessage);
        
        if (result.warnings?.length > 0) {
          console.log('تحذيرات:', result.warnings);
        }
        
        // إجراءات ما بعد النجاح
        // - مسح السلة
        // - عرض صفحة التأكيد
        // - إرسال إشعار للمستخدم
        
      } else {
        console.error('❌ فشل الطلب:', result.message);
        console.log('رسالة للمستخدم:', result.userMessage);
        
        if (result.shouldRetry) {
          console.log('💡 يمكن إعادة المحاولة');
        }
        
        // إجراءات معالجة الخطأ
        // - عرض رسالة خطأ للمستخدم
        // - اقتراح حلول بديلة
        // - تسجيل الخطأ للمراجعة
      }
      
      return result;
      
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
      throw error;
    }
  },

  // مثال للشحن السريع
  async exampleFastShipping() {
    const checkoutData = {
      formData: {
        name: 'سارة أحمد',
        phone: '07703334455',
        address: 'أربيل، حي الأندلس'
      },
      cartItems: [
        {
          id: 10,
          name: 'هاتف Samsung Galaxy',
          price: 450,
          quantity: 1,
          main_store_name: 'متجر الهواتف الذكية'
        },
        {
          id: 11,
          name: 'ح��مل هاتف للسيارة',
          price: 15,
          quantity: 1,
          main_store_name: 'متجر اكسسوارات السيارات'
        }
      ],
      shippingType: 'fast' // شحن سريع منفصل لكل متجر
    };

    return await checkoutService.submitOrder(checkoutData);
  }
};
