/**
 * مساعد للتحقق من idempotency بشكل آمن
 * يتجنب خطأ PGRST116 ويوفر معالجة موثوقة
 */

/**
 * التحقق من وجود طلب سابق بمفتاح idempotency معين
 * @param {Object} supabase - عميل Supabase
 * @param {string} idempotencyKey - مفتاح منع التكرار
 * @returns {Promise<Object>} نتيجة التحقق
 */
export async function checkExistingOrder(supabase, idempotencyKey) {
  try {
    console.log(`🔍 فحص الطلبات المكررة للمفتاح: ${idempotencyKey}`);
    
    const { data: existingOrder, error } = await supabase
      .from('orders')
      .select('id, order_code, order_status, created_at')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ خطأ في فحص الطلب المكرر:', error);
      return {
        success: false,
        error: error,
        exists: false,
        shouldProceed: true, // متابعة رغم الخطأ
        message: 'فشل في فحص الطلبات المكررة، سيتم متابعة إنشاء طلب جديد'
      };
    }

    if (existingOrder) {
      console.log(`✅ وُجد طلب مكرر: ${existingOrder.order_code}`);
      return {
        success: true,
        exists: true,
        existingOrder: existingOrder,
        shouldProceed: false,
        message: `الطلب موجود مسبقاً برقم: ${existingOrder.order_code}`
      };
    }

    console.log('✅ لا يوجد طلب مكرر، يمكن متابعة إنشاء طلب جديد');
    return {
      success: true,
      exists: false,
      existingOrder: null,
      shouldProceed: true,
      message: 'لا يوجد طلب مكرر'
    };

  } catch (error) {
    console.error('❌ خطأ غير متوقع في فحص الطلب المكرر:', error);
    return {
      success: false,
      error: error,
      exists: false,
      shouldProceed: true, // متابعة رغم الخطأ لتجنب منع الطلبات الصحيحة
      message: `خطأ في الفحص: ${error.message}`
    };
  }
}

/**
 * التحقق من وجود طلب بناءً على معايير متعددة
 * @param {Object} supabase - عميل Supabase
 * @param {Object} criteria - معايير البحث
 * @returns {Promise<Object>} نتيجة التحقق
 */
export async function checkOrderByCriteria(supabase, criteria) {
  try {
    let query = supabase
      .from('orders')
      .select('id, order_code, order_status, created_at');

    // إضافة المعايير المختلفة
    if (criteria.idempotencyKey) {
      query = query.eq('idempotency_key', criteria.idempotencyKey);
    }
    
    if (criteria.orderCode) {
      query = query.eq('order_code', criteria.orderCode);
    }
    
    if (criteria.customerPhone) {
      query = query.eq('customer_phone', criteria.customerPhone);
    }

    // استخدام maybeSingle للحصول على طلب واحد أو null
    const { data: order, error } = await query.maybeSingle();

    if (error) {
      console.warn('⚠️ خطأ في البحث عن الطلب:', error);
      return {
        success: false,
        error: error,
        found: false,
        message: `خطأ في البحث: ${error.message}`
      };
    }

    return {
      success: true,
      found: !!order,
      order: order,
      message: order ? `وُجد الطلب: ${order.order_code}` : 'لم يُجد الطلب'
    };

  } catch (error) {
    console.error('❌ خطأ في البحث عن الطلب:', error);
    return {
      success: false,
      error: error,
      found: false,
      message: `خطأ: ${error.message}`
    };
  }
}

/**
 * تحقق آمن من وجود عدة طلبات
 * @param {Object} supabase - عميل Supabase
 * @param {Array} idempotencyKeys - مصفوفة مفاتيح منع التكرار
 * @returns {Promise<Object>} نتيجة التحقق
 */
export async function checkMultipleOrders(supabase, idempotencyKeys) {
  try {
    console.log(`🔍 فحص ${idempotencyKeys.length} طلب للتأكد من عدم التكرار`);
    
    const { data: existingOrders, error } = await supabase
      .from('orders')
      .select('id, order_code, idempotency_key, order_status')
      .in('idempotency_key', idempotencyKeys);

    if (error) {
      console.warn('⚠️ خطأ في فحص الطلبات المتعددة:', error);
      return {
        success: false,
        error: error,
        existingOrders: [],
        duplicateKeys: [],
        message: `خطأ في الفحص: ${error.message}`
      };
    }

    const existingKeys = (existingOrders || []).map(order => order.idempotency_key);
    const duplicateKeys = idempotencyKeys.filter(key => existingKeys.includes(key));

    console.log(`✅ وُجد ${existingOrders?.length || 0} طلب مكرر من أصل ${idempotencyKeys.length}`);

    return {
      success: true,
      existingOrders: existingOrders || [],
      duplicateKeys: duplicateKeys,
      newKeys: idempotencyKeys.filter(key => !existingKeys.includes(key)),
      message: `${duplicateKeys.length} طلب مكرر، ${idempotencyKeys.length - duplicateKeys.length} طلب جديد`
    };

  } catch (error) {
    console.error('❌ خطأ في فحص الطلبات المتعددة:', error);
    return {
      success: false,
      error: error,
      existingOrders: [],
      duplicateKeys: [],
      message: `خطأ: ${error.message}`
    };
  }
}

/**
 * إنشاء مفتاح idempotency آمن وفريد
 * @param {string} prefix - بادئة المفتاح
 * @param {Object} additionalData - بيانات إضافية لضمان الفرادة
 * @returns {string} مفتاح فريد
 */
export function generateSafeIdempotencyKey(prefix = 'order', additionalData = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  // إضافة hash للبيانات الإضافية إذا وُجدت
  let dataHash = '';
  if (Object.keys(additionalData).length > 0) {
    const dataString = JSON.stringify(additionalData);
    dataHash = btoa(dataString).substr(0, 8);
  }
  
  return `${prefix}-${timestamp}-${random}${dataHash ? '-' + dataHash : ''}`;
}

/**
 * معالجة أخطاء PGRST المختلفة
 * @param {Error} error - الخطأ المستلم
 * @returns {Object} معلومات معالجة الخطأ
 */
export function handleSupabaseError(error) {
  const errorCode = error?.code;
  const errorMessage = error?.message || error?.toString() || 'خطأ غير معروف';

  // PGRST116: طُلب JSON object واحد لكن تم العثور على 0 أو عدة صفوف
  if (errorCode === 'PGRST116') {
    return {
      type: 'PGRST116',
      severity: 'warning',
      shouldRetry: false,
      userMessage: 'لا يوجد طلب سابق بهذا المفتاح (هذا طبيعي للطلبات الجديدة)',
      technicalMessage: 'No existing order found with this idempotency key',
      shouldProceed: true
    };
  }

  // PGRST106: JSON غير صالح
  if (errorCode === 'PGRST106') {
    return {
      type: 'PGRST106',
      severity: 'error',
      shouldRetry: false,
      userMessage: 'خطأ في تنسيق البيانات المرسلة',
      technicalMessage: 'Invalid JSON format',
      shouldProceed: false
    };
  }

  // 23505: مفتاح مكرر (unique constraint violation)
  if (errorCode === '23505') {
    return {
      type: 'DUPLICATE_KEY',
      severity: 'warning', 
      shouldRetry: false,
      userMessage: 'تم إرسال هذا الطلب مسبقاً',
      technicalMessage: 'Duplicate key violation',
      shouldProceed: false
    };
  }

  // أخطاء الشبكة
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return {
      type: 'NETWORK_ERROR',
      severity: 'error',
      shouldRetry: true,
      userMessage: 'خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى',
      technicalMessage: 'Network connection error',
      shouldProceed: false
    };
  }

  // خطأ عام
  return {
    type: 'UNKNOWN_ERROR',
    severity: 'error',
    shouldRetry: false,
    userMessage: `حدث خطأ: ${errorMessage}`,
    technicalMessage: errorMessage,
    shouldProceed: false
  };
}

/**
 * مثال على الاستخدام
 */
export const idempotencyExamples = {
  // فحص طلب واحد
  async checkSingleOrder(supabase, idempotencyKey) {
    const result = await checkExistingOrder(supabase, idempotencyKey);
    
    if (result.exists) {
      console.log('الطلب موجود مسبقاً:', result.existingOrder);
      return result.existingOrder;
    } else if (result.shouldProceed) {
      console.log('يمكن إنشاء طلب جديد');
      return null;
    } else {
      console.error('خطأ في الفحص:', result.error);
      throw new Error(result.message);
    }
  },

  // فحص متعدد للشحن السريع
  async checkFastShippingOrders(supabase, orderCount) {
    const keys = Array.from({length: orderCount}, (_, i) => 
      generateSafeIdempotencyKey('fast', {index: i})
    );
    
    const result = await checkMultipleOrders(supabase, keys);
    
    if (result.success) {
      console.log(`${result.newKeys.length} طلب جديد، ${result.duplicateKeys.length} طلب مكرر`);
      return result.newKeys;
    } else {
      throw new Error(result.message);
    }
  }
};
