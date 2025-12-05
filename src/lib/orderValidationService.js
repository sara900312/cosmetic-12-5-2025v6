/**
 * خدمة التحقق من صحة الطلبات وإرسالها مع التعامل مع الأخطاء
 * تقوم بجميع التحققات المطلوبة قبل الإرسال إلى Edge Function
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * تحقق من صحة عنصر واحد في السلة
 * @param {Object} item - عنصر السلة
 * @returns {Object|null} العنصر بعد التنظيف أو null إذا كان غير صالح
 */
function validateCartItem(item) {
  // التحقق من وجود الحقول المطلوبة
  const productId = item.id || item.product_id;
  const quantity = parseInt(item.quantity);
  const price = parseFloat(item.price);

  // إذا كان أي من الحقول المطلوبة غير صالح، إرجاع null
  if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
    console.warn('❌ عنصر غير صالح تم رفضه:', {
      productId,
      originalQuantity: item.quantity,
      parsedQuantity: quantity,
      originalPrice: item.price,
      parsedPrice: price,
      name: item.name
    });
    return null;
  }

  // تنظيف اسم المتجر
  let storeName = 'غير محدد';
  if (item.main_store_name && typeof item.main_store_name === 'string') {
    storeName = item.main_store_name.trim();
  } else if (item.store_name && typeof item.store_name === 'string') {
    storeName = item.store_name.trim();
  } else if (item.main_store && typeof item.main_store === 'string') {
    storeName = item.main_store.trim();
  }

  return {
    product_id: productId,
    product_name: (item.name || item.product_name || 'منتج غير معروف').trim(),
    main_store_name: storeName,
    quantity: quantity,
    price: price,
    discounted_price: item.discounted_price ? parseFloat(item.discounted_price) : null,
  };
}

/**
 * إزالة العناصر المكررة بناءً على product_id
 * @param {Array} items - مصفوفة العناصر
 * @returns {Array} العناصر بدون تكرار
 */
function removeDuplicateItems(items) {
  const itemMap = new Map();

  for (const item of items) {
    const productId = item.product_id;

    if (itemMap.has(productId)) {
      // دمج الكميات للمنتجات المكررة
      const existingItem = itemMap.get(productId);
      existingItem.quantity += item.quantity;
      console.log(`🔄 دمج منتج مكرر ${productId}: الكمية الإجمالية الآن ${existingItem.quantity}`);
    } else {
      itemMap.set(productId, { ...item });
    }
  }

  return Array.from(itemMap.values());
}

/**
 * تحضير العناصر للشحن السريع - كل منتج مرة واحدة فقط
 * @param {Array} items - مصفوفة العناصر
 * @returns {Array} العناصر مُحضرة للشحن السريع
 */
function prepareItemsForFastShipping(items) {
  console.log('🚀 تحضير العناصر للشحن السريع: كل منتج يُرسل مرة واحدة فقط');
  
  // التأكد من عدم وجود عناصر فارغة وأن كل منتج ل�� معرف فريد
  const validItems = items.filter(item => 
    item && 
    item.product_id && 
    item.quantity > 0 && 
    item.price >= 0
  );

  console.log(`✅ ${validItems.length} منتج صالح للشحن السريع`);
  return validItems;
}

/**
 * تحضير العناصر للشحن الموحد - جمع كل العناصر في طلب واحد
 * @param {Array} items - مصفوفة العناصر
 * @returns {Array} العناصر مُحضرة للشحن الموحد
 */
function prepareItemsForUnifiedShipping(items) {
  console.log('📦 تحضير العناصر للشحن الموحد: جمع كل العناصر في طلب واحد');
  
  // إزالة العناصر الفارغة وضمان صحة البيانات
  const validItems = items.filter(item => 
    item && 
    item.product_id && 
    item.quantity > 0 && 
    item.price >= 0
  );

  console.log(`✅ ${validItems.length} منتج صالح للشحن الموحد`);
  return validItems;
}

/**
 * التحقق من صحة بيانات العميل
 * @param {Object} customerData - بيانات العميل
 * @returns {Object} نتيجة التحقق مع الأخطاء إن وجدت
 */
function validateCustomerData(customerData) {
  const errors = [];
  const cleanData = {};

  // التحقق من الحقول المطلوبة
  if (!customerData.customer_name || customerData.customer_name.trim().length === 0) {
    errors.push('اسم العميل مطلوب');
  } else {
    cleanData.customer_name = customerData.customer_name.trim();
  }

  if (!customerData.customer_phone || customerData.customer_phone.trim().length === 0) {
    errors.push('رقم الهاتف مطلوب');
  } else {
    // تنظيف رقم الهاتف من الأحرف غير الرقمية
    const cleanPhone = customerData.customer_phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errors.push('رقم الهاتف يجب أن يحتوي على 10 أرقام على الأقل');
    } else {
      cleanData.customer_phone = cleanPhone;
    }
  }

  // الحقول الاختيارية
  cleanData.customer_address = (customerData.customer_address || '').trim();
  cleanData.customer_city = (customerData.customer_city || '').trim();
  cleanData.customer_notes = (customerData.customer_notes || '').trim();
  cleanData.user_id = customerData.user_id || null;

  return {
    isValid: errors.length === 0,
    errors,
    cleanData
  };
}

/**
 * إنشاء مفتاح منع التكرار فريد
 * @param {string} prefix - بادئة المفتاح
 * @returns {string} مفتاح فريد
 */
function generateIdempotencyKey(prefix = 'order') {
  return `${prefix}-${Date.now()}-${uuidv4()}`;
}

/**
 * التحق�� من جميع متطلبات الطلب قبل الإرسال
 * @param {Object} orderData - بيانات الطلب
 * @returns {Object} نتيجة التحقق الشامل
 */
export function validateOrderBeforeSubmission(orderData) {
  const validationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    processedData: null
  };

  try {
    // 1. التحقق من وجود العناصر
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      validationResult.errors.push('لا توجد منتجات في الطلب');
      return validationResult;
    }

    // 2. التحقق من صحة كل عنصر في items وإزالة العناصر الفارغة
    console.log('🔍 فحص وتنظيف عناصر السلة...');
    const validItems = orderData.items
      .map(item => validateCartItem(item))
      .filter(item => item !== null);

    if (validItems.length === 0) {
      validationResult.errors.push('لا توجد منتجات صالحة في السلة');
      return validationResult;
    }

    if (validItems.length < orderData.items.length) {
      const removedCount = orderData.items.length - validItems.length;
      validationResult.warnings.push(`تم إزالة ${removedCount} منتج غير صالح من ��لسلة`);
    }

    // 3. إزالة المنتجات المكررة بناءً على product_id
    console.log('🔄 إزالة المنتجات المكررة...');
    const deduplicatedItems = removeDuplicateItems(validItems);

    if (deduplicatedItems.length < validItems.length) {
      const mergedCount = validItems.length - deduplicatedItems.length;
      validationResult.warnings.push(`تم دمج ${mergedCount} منتج مكرر`);
    }

    // 4. التحقق من نوع الشحن وتحضير العناصر وفقاً له
    const shippingType = orderData.shipping_type;
    if (!['fast', 'unified'].includes(shippingType)) {
      validationResult.errors.push('نوع الشحن يجب أن يكون "fast" أو "unified"');
      return validationResult;
    }

    let finalItems;
    if (shippingType === 'fast') {
      // للشحن السريع: كل منتج يُرسل مرة واحدة فقط، بدون صفوف فارغة
      finalItems = prepareItemsForFastShipping(deduplicatedItems);
    } else {
      // للشحن الموحد: جمع كل العناصر الصحيحة في طلب واحد، بدون صفوف فارغة
      finalItems = prepareItemsForUnifiedShipping(deduplicatedItems);
    }

    // 5. التحقق من بيانات العميل
    console.log('👤 التحقق من بيانات العميل...');
    const customerValidation = validateCustomerData(orderData);
    
    if (!customerValidation.isValid) {
      validationResult.errors.push(...customerValidation.errors);
      return validationResult;
    }

    // 6. إنشاء البيانات النظيفة والجاهزة للإرسال
    const processedData = {
      ...customerValidation.cleanData,
      items: finalItems,
      shipping_type: shippingType,
      idempotency_key: orderData.idempotency_key || generateIdempotencyKey(),
      order_code: orderData.order_code || generateOrderCode(),
      
      // حساب المجاميع
      subtotal: finalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      total_amount: finalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      discounted_price: finalItems.reduce((sum, item) => {
        const discounted = item.discounted_price || 0;
        return sum + (discounted * item.quantity);
      }, 0) || null,
      
      // معلومات إضافية
      delivery_cost: orderData.delivery_cost || 0,
      main_store_name: orderData.main_store_name || getMainStoreName(finalItems)
    };

    // إضافة رسوم التوصيل للمجموع النهائي
    processedData.total_amount += processedData.delivery_cost;

    validationResult.isValid = true;
    validationResult.processedData = processedData;

    console.log('✅ تم التحقق من الطلب بنجاح:');
    console.log(`- العميل: ${processedData.customer_name} (${processedData.customer_phone})`);
    console.log(`- المنتجات: ${finalItems.length} منتج صالح`);
    console.log(`- نوع الشحن: ${shippingType}`);
    console.log(`- المبلغ الإجمالي: ${processedData.total_amount}`);

  } catch (error) {
    console.error('❌ خطأ أثناء التحقق من الطلب:', error);
    validationResult.errors.push(`خطأ في التحقق: ${error.message}`);
  }

  return validationResult;
}

/**
 * إرسال الطلب إلى Edge Function مع التعامل مع الأخطاء
 * @param {Object} validatedOrderData - بيانات الطلب المتحقق منها
 * @param {string} edgeFunctionUrl - رابط Edge Function
 * @returns {Promise<Object>} نتيجة الإرسال
 */
export async function submitValidatedOrder(validatedOrderData, edgeFunctionUrl) {
  try {
    console.log('📤 إرسال الطلب إلى Edge Function...');
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedOrderData),
    });

    // التعامل مع الاستجابة
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      // إذا لم تكن الاستجابة JSON، نحاول قراءتها كنص
      const responseText = await response.text();
      console.warn('⚠️ استجابة غير متوقعة من الخادم:', responseText);
      responseData = { error: 'استجابة غير صحيحة من الخادم' };
    }

    if (!response.ok) {
      // التعامل مع أخطاء HTTP
      const errorMessage = responseData?.error || 
                          responseData?.message || 
                          `HTTP ${response.status}: ${response.statusText}`;
      
      console.error('❌ خطأ HTTP من Edge Function:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        data: responseData
      });

      // تخصيص رسائل الخطأ ا��مختلفة
      if (response.status === 400) {
        throw new Error(`خطأ في البيانات المرسلة: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error(`خطأ في الخادم: ${errorMessage}`);
      } else if (response.status === 404) {
        throw new Error('خدمة الطلبات غير متوفرة حالياً');
      } else {
        throw new Error(errorMessage);
      }
    }

    // التحقق من نجاح العملية
    if (responseData.success) {
      console.log('✅ تم إرسال الطلب بنجاح');
      return {
        success: true,
        data: responseData,
        message: 'تم إرسال الطلب بنجاح'
      };
    } else {
      console.error('❌ فشل في معالجة الطلب:', responseData);
      throw new Error(responseData.error || 'فشل في معالجة الطلب');
    }

  } catch (error) {
    console.error('❌ خطأ أثناء إرسال الطلب:', error);
    
    // تحديد نوع الخطأ لتوفير رسالة مناسبة
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('خطأ في الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
    } else if (error.name === 'SyntaxError') {
      throw new Error('خطأ في تحليل استجابة الخادم. يرجى المحاولة مرة ��خرى.');
    } else {
      // إعادة إلقاء الخط�� كما هو إذا كان رسالة مخصصة
      throw error;
    }
  }
}

/**
 * الدالة الرئيسية لمعالجة وإرسال الطلب
 * @param {Object} orderData - بيانات الطلب الأولية
 * @param {string} edgeFunctionUrl - رابط Edge Function
 * @returns {Promise<Object>} نتيجة العملية الكاملة
 */
export async function processAndSubmitOrder(orderData, edgeFunctionUrl = null) {
  try {
    // استخدام رابط افتراضي إذا لم يُمرر
    const functionUrl = edgeFunctionUrl || 'https://ykyzviqwscrjjkucorlp.supabase.co/functions/v1/order-notification';
    
    console.log('🚀 بدء معالجة الطلب...');

    // 1. التحقق من صحة البيانات وتنظيفها
    const validation = validateOrderBeforeSubmission(orderData);
    
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
        message: `فشل في التحقق من البيانات: ${validation.errors.join(', ')}`
      };
    }

    // عرض التحذيرات إن وجدت
    if (validation.warnings.length > 0) {
      console.warn('⚠️ تحذيرات:', validation.warnings);
    }

    // 2. إرسال البيانات المنظفة إلى Edge Function
    const submissionResult = await submitValidatedOrder(validation.processedData, functionUrl);

    return {
      success: true,
      data: submissionResult.data,
      warnings: validation.warnings,
      message: submissionResult.message,
      orderCode: validation.processedData.order_code,
      totalAmount: validation.processedData.total_amount,
      itemsCount: validation.processedData.items.length
    };

  } catch (error) {
    console.error('❌ فشل في معالجة الطلب:', error);
    
    return {
      success: false,
      error: error.message,
      message: `خطأ: ${error.message}`
    };
  }
}

/**
 * دوال مساعدة
 */

function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getMainStoreName(items) {
  if (!items || items.length === 0) return 'غير محدد';
  
  const storeNames = [...new Set(items.map(item => item.main_store_name))];
  
  if (storeNames.length === 1) {
    return storeNames[0];
  }
  
  return 'متعدد المتاجر';
}

/**
 * معالجة خطأ PGRST116 المحدد
 * هذا الخطأ ي��دث عندما يطلب النظام JSON object واحد لكن يجد 0 صفوف
 */
export function handlePGRST116Error(error) {
  if (error.code === 'PGRST116' || error.message?.includes('PGRST116')) {
    console.warn('⚠️ خطأ PGRST116: محاولة جلب طلب غير موجود');
    return {
      isIdempotencyError: true,
      message: 'لا يوجد طلب سابق بهذا المفتاح، سيتم إنشاء طلب جديد',
      shouldProceed: true
    };
  }
  
  return {
    isIdempotencyError: false,
    message: error.message || 'خطأ غير معروف',
    shouldProceed: false
  };
}

/**
 * مثال على الاستخدام
 */
export const orderValidationExamples = {
  // مثال كامل للاستخدام
  async submitOrderExample() {
    const orderData = {
      customer_name: 'أحمد محمد',
      customer_phone: '07801234567',
      customer_address: 'بغداد، الكرادة الشرقية',
      customer_city: 'بغداد',
      customer_notes: 'التسليم مساءً',
      shipping_type: 'unified',
      items: [
        {
          id: 1,
          name: 'لابتوب HP',
          price: 800,
          quantity: 1,
          main_store_name: 'متجر الحاس��ب'
        },
        {
          id: 2,
          name: 'ماوس لاسلكي',
          price: 25,
          quantity: 2,
          main_store_name: 'متجر الحاسوب'
        }
      ]
    };

    try {
      const result = await processAndSubmitOrder(orderData);
      
      if (result.success) {
        console.log('✅ تم إرسال الطلب بنجاح!');
        console.log(`رقم الطلب: ${result.orderCode}`);
        console.log(`المبلغ الإجمالي: ${result.totalAmount}`);
        
        if (result.warnings?.length > 0) {
          console.log('تحذيرات:', result.warnings);
        }
      } else {
        console.error('❌ فشل في إرسال الطلب:', result.message);
        if (result.errors) {
          console.error('الأخطاء:', result.errors);
        }
      }
      
      return result;
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
      throw error;
    }
  }
};
