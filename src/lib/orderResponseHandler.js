/**
 * نظام شامل للتعامل مع استجابات الطلبات
 * يحل مشاكل التعامل مع الاستجابات المختلفة للشحن السريع والموحد
 */

import { normalizeOrdersResponse } from './uuidUtils';

/**
 * معالجة استجابة الطلب حسب نوع الشحن
 * @param {any} response - الاستجابة من الـ backend
 * @param {string} shippingType - نوع الشحن ('fast' أو 'unified')
 * @returns {Object} استجابة منظمة
 */
export function processOrderResponse(response, shippingType) {
  try {
    console.log('📨 معالجة استجابة الطلب:', { response, shippingType });

    // تحويل الاستجابة إلى تنسيق موحد
    const ordersArray = normalizeOrdersResponse(response);

    if (shippingType === 'fast') {
      // للشحن السريع: نتوقع مصفوفة من الطلبات
      return {
        success: true,
        type: 'fast_shipping',
        orders: ordersArray,
        orderCount: ordersArray.length,
        message: `تم إنشاء ${ordersArray.length} طلبات منفصلة للشحن السريع`,
        orderCodes: ordersArray.map(order => order.order_code || order.orderCode).filter(Boolean)
      };
    } else {
      // للشحن الموحد: نتوقع طلب واحد
      const singleOrder = ordersArray[0];
      return {
        success: true,
        type: 'unified_shipping',
        order: singleOrder,
        orderCount: 1,
        message: 'تم إنشاء طلب موحد بنجاح',
        orderCode: singleOrder?.order_code || singleOrder?.orderCode
      };
    }

  } catch (error) {
    console.error('❌ خطأ في معالجة استجابة الطلب:', error);
    return {
      success: false,
      error: error.message,
      type: 'error',
      originalResponse: response
    };
  }
}

/**
 * إنشاء رسالة نجاح مخصصة حسب نوع الطلب
 * @param {Object} processedResponse - الاستجابة المعالجة
 * @param {Array} storesList - قائمة المتاجر (للشحن السريع)
 * @returns {Object} رسالة مخصصة
 */
export function createSuccessMessage(processedResponse, storesList = []) {
  if (!processedResponse.success) {
    return {
      title: "خطأ في إنشاء الطلب",
      description: processedResponse.error || "حدث خطأ غير متوقع",
      variant: "destructive"
    };
  }

  if (processedResponse.type === 'fast_shipping') {
    const storeCount = storesList.length || processedResponse.orderCount;
    const orderCodes = processedResponse.orderCodes.join(', ');
    
    return {
      title: "🚀 تم إنشاء طلبات الشحن السريع!",
      description: `تم إنشاء ${storeCount} طلبات منفصلة للحصول على أسرع تسليم.\nأرقام الطلبات: ${orderCodes}`,
      variant: "default",
      duration: 8000
    };
  } else {
    return {
      title: "📦 تم إنشاء طلبك بنجاح!",
      description: `رقم طلبك: ${processedResponse.orderCode}\nسيتم التواصل معك قريباً.`,
      variant: "default",
      duration: 6000
    };
  }
}

/**
 * معالجة أخطاء الطلبات مع رسائل مفيدة
 * @param {Error} error - الخطأ المرفوع
 * @param {string} shippingType - نوع الشحن
 * @returns {Object} رسالة خطأ منظمة
 */
export function handleOrderError(error, shippingType) {
  console.error('❌ خطأ في معالجة الطلب:', error);

  // تصنيف أنواع الأخطاء
  let errorType = 'unknown';
  let userMessage = 'حدث خطأ غير متوقع';
  let techMessage = error.message;

  if (error.message.includes('UUID') || error.message.includes('uuid')) {
    errorType = 'uuid_error';
    userMessage = 'خطأ في معرفات النظام. يرجى المحاولة مرة أخرى.';
  } else if (error.message.includes('duplicate') || error.message.includes('idempotency')) {
    errorType = 'duplicate_order';
    userMessage = 'تم إرسال هذا الطلب مسبقاً. يرجى التحقق من طلباتك.';
  } else if (error.message.includes('stock') || error.message.includes('مخزون')) {
    errorType = 'stock_error';
    userMessage = 'بعض المنتجات غير متوفرة في المخزون.';
  } else if (error.message.includes('network') || error.message.includes('fetch')) {
    errorType = 'network_error';
    userMessage = 'مشكلة في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.';
  } else if (error.message.includes('Supabase') || error.message.includes('database')) {
    errorType = 'database_error';
    userMessage = 'خطأ في قاعدة البيانات. يرجى المحاولة لاحقاً.';
  }

  return {
    success: false,
    errorType,
    userMessage,
    techMessage,
    shippingType,
    timestamp: new Date().toISOString(),
    suggestion: getSuggestion(errorType)
  };
}

/**
 * اقتراحات حل للأخطاء المختلفة
 * @param {string} errorType - نوع الخطأ
 * @returns {string} اقتراح للحل
 */
function getSuggestion(errorType) {
  const suggestions = {
    uuid_error: 'قم بتحديث الصفحة وحاول مرة أخرى',
    duplicate_order: 'تحقق من طلباتك السابقة أو اتصل بخدمة العملاء',
    stock_error: 'راجع كميات المنتجات في السلة',
    network_error: 'تأكد من اتصال الإنترنت وحاول مرة أخرى',
    database_error: 'انتظر قليلاً وحاول مرة أخرى',
    unknown: 'حاول تحديث الصفحة أو اتصل بخدمة العملاء'
  };

  return suggestions[errorType] || suggestions.unknown;
}

/**
 * إنشاء toast message من الاستجابة المعالجة
 * @param {Object} processedResponse - الاستجابة المعالجة
 * @param {Function} toast - دالة الـ toast
 * @param {Array} storesList - قائمة المتاجر (اختيارية)
 */
export function showOrderToast(processedResponse, toast, storesList = []) {
  const message = createSuccessMessage(processedResponse, storesList);
  
  setTimeout(() => {
    toast(message);
  }, 100); // تأخير بسيط لتجنب مشاكل الـ rendering
}

/**
 * إنشاء ملخص مفصل للطلب
 * @param {Object} processedResponse - الاستجابة المعالجة
 * @param {Array} cartItems - عناصر السلة
 * @param {Object} formData - بيانات العميل
 * @returns {Object} ملخص الطلب
 */
export function createOrderSummary(processedResponse, cartItems, formData) {
  const totalAmount = cartItems.reduce((sum, item) => {
    const finalPrice = item.discounted_price || item.price;
    return sum + (finalPrice * item.quantity);
  }, 0);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: processedResponse.success,
    type: processedResponse.type,
    orderCount: processedResponse.orderCount,
    orderCodes: processedResponse.orderCodes || [processedResponse.orderCode],
    customer: {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      city: formData.customer_city || 'غير محدد'
    },
    items: {
      total: totalItems,
      products: cartItems.length,
      details: cartItems
    },
    financial: {
      totalAmount,
      currency: 'IQD',
      formatted: `${totalAmount.toLocaleString()} دينار عراقي`
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * التحقق من حالة الطلب بعد الإنشاء
 * @param {Object} supabase - عميل Supabase
 * @param {Array} orderCodes - أرقام الطلبات للتحقق منها
 * @returns {Promise<Object>} حالة الطلبات
 */
export async function verifyOrderStatus(supabase, orderCodes) {
  try {
    const orders = [];
    
    for (const orderCode of orderCodes) {
      const { data, error } = await supabase
        .from('orders')
        .select('order_code, order_status, created_at')
        .eq('order_code', orderCode)
        .single();

      if (!error && data) {
        orders.push(data);
      }
    }

    return {
      success: true,
      verifiedOrders: orders,
      totalChecked: orderCodes.length,
      verified: orders.length,
      status: orders.length === orderCodes.length ? 'all_verified' : 'partial_verified'
    };

  } catch (error) {
    console.error('خطأ في التحقق من حالة الطلبات:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * أمثلة على الاستخدام
 */
export const responseHandlerExamples = {
  // معالجة استجابة شحن سريع
  processFastShipping(response) {
    return processOrderResponse(response, 'fast');
  },

  // معالجة استجابة شحن موحد
  processUnifiedShipping(response) {
    return processOrderResponse(response, 'unified');
  },

  // التعامل مع الأخطاء
  handleError(error, shippingType) {
    return handleOrderError(error, shippingType);
  }
};

console.log('📨 نظام معالجة استجابات الطلبات جاهز للاستخدام');
