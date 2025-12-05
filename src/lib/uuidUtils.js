/**
 * مكتبة شاملة لإدارة UUID وmعرفات الطلبات
 * تحل مشاكل "invalid input syntax for type uuid"
 */

/**
 * تحقق من صحة UUID
 * @param {string} uuid - المعرف للتحقق منه
 * @returns {boolean} true إذا كان UUID صحيح
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

/**
 * توليد UUID صحيح لـ idempotency_key
 * @returns {string} UUID صحيح
 */
export function generateIdempotencyKey() {
  return crypto.randomUUID();
}

/**
 * توليد UUID صحيح للمستخدمين
 * @returns {string} UUID صحيح
 */
export function generateUserUUID() {
  return crypto.randomUUID();
}

/**
 * توليد رقم طلب نصي فريد (ليس UUID)
 * @param {string} prefix - بادئة اختيارية
 * @returns {string} رقم طلب فريد
 */
export function generateOrderCode(prefix = '') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  
  // إضافة timestamp مختصر
  const timestamp = Date.now().toString().slice(-6);
  result += timestamp;
  
  // إضافة أحرف عشوائية
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * توليد مفتاح idempotency فريد حسب نوع الشحن
 * @param {string} shippingType - نوع الشحن ('fast' أو 'unified')
 * @param {number} storeIndex - فهرس المتجر (للشحن السريع فقط)
 * @returns {string} UUID صحيح
 */
export function generateShippingIdempotencyKey(shippingType, storeIndex = 0) {
  // دائماً إرجاع UUID صحيح، مهما كان نوع الشحن
  return crypto.randomUUID();
}

/**
 * تنظيف وتحويل المعرفات النصية إلى قيم مقبولة
 * @param {any} value - القيمة المراد تنظيفها
 * @returns {string|null} القيمة المنظفة أو null
 */
export function sanitizeUUIDField(value) {
  if (!value) return null;
  
  // إذا كان UUID صحيح، إرجاعه كما هو
  if (isValidUUID(value)) {
    return value;
  }
  
  // إذا كان نص عادي، إرجاع null (لا نحوله لـ UUID)
  return null;
}

/**
 * استخراج اسم المتجر بطريقة آمنة
 * @param {any} storeData - بيانات المتجر
 * @returns {string} اسم المتجر أو قيمة افتراضية
 */
export function getStoreName(storeData) {
  // التحقق من القيم المختلفة بترتيب الأولوية
  if (typeof storeData === 'string' && storeData.trim()) {
    return storeData.trim();
  }
  
  if (typeof storeData === 'object' && storeData !== null) {
    return storeData.main_store_name || 
           storeData.name || 
           storeData.store_name ||
           storeData.title ||
           'غير محدد';
  }
  
  return 'غير محدد';
}

/**
 * تحضير بيانات الطلب للإرسال (تنظيف UUID)
 * @param {Object} orderData - بيانات الطلب
 * @returns {Object} بيانات منظفة
 */
export function sanitizeOrderData(orderData) {
  const sanitized = { ...orderData };
  
  // تنظيف حقول UUID
  if (sanitized.user_id) {
    sanitized.user_id = sanitizeUUIDField(sanitized.user_id);
  }
  
  // التأكد من أن idempotency_key هو UUID صحيح
  if (!isValidUUID(sanitized.idempotency_key)) {
    sanitized.idempotency_key = generateIdempotencyKey();
    console.log('🔧 تم إنشاء idempotency_key جديد:', sanitized.idempotency_key);
  }
  
  return sanitized;
}

/**
 * تحضير بيانات عناصر الطلب للإرسال
 * @param {Array} items - عناصر الطلب
 * @param {string} orderId - مع��ف الطلب (UUID)
 * @returns {Array} عناصر منظفة
 */
export function sanitizeOrderItems(items, orderId) {
  if (!isValidUUID(orderId)) {
    throw new Error('معرف الطلب يجب أن يكون UUID صحيح');
  }
  
  return items.map(item => ({
    order_id: orderId,
    product_id: item.product_id || item.id,
    product_name: item.name || '',
    quantity: parseInt(item.quantity) || 1,
    price: parseFloat(item.price) || 0,
    discounted_price: item.discounted_price ? parseFloat(item.discounted_price) : null,
    main_store_name: getStoreName(item.main_store || item.main_store_name) // نص عادي
  }));
}

/**
 * تحويل استجابة الطلبات إلى تنسيق موحد
 * @param {any} response - استجابة من الـ backend
 * @returns {Array} مصفوفة طلبات
 */
export function normalizeOrdersResponse(response) {
  // إذا كانت الاستجابة مصفوفة، إرجاعها كما هي
  if (Array.isArray(response)) {
    return response;
  }
  
  // إذا كانت كائن واحد، تحويلها لمصفوفة
  if (response && typeof response === 'object') {
    return [response];
  }
  
  // إذا كانت فارغة أو غير صحيحة
  return [];
}

/**
 * معلومات تشخيصية للمساعدة في ��ل المشاكل
 * @param {any} data - البيانات للتشخيص
 * @returns {Object} معلومات مفصلة
 */
export function debugUUIDData(data) {
  return {
    type: typeof data,
    value: data,
    isValidUUID: isValidUUID(data),
    stringified: JSON.stringify(data),
    length: data?.length || 0,
    suggestion: isValidUUID(data) ? 'UUID صحيح' : 'يحتاج إلى UUID جديد'
  };
}

/**
 * مثال على الاستخدام الصحيح
 */
export const usageExamples = {
  // توليد معرفات صحيحة
  correctIdempotencyKey: generateIdempotencyKey(),
  correctOrderCode: generateOrderCode('ORD-'),
  
  // تنظيف البيانات
  cleanOrderData: (rawData) => sanitizeOrderData(rawData),
  
  // التعامل مع الاستجابات
  handleResponse: (response) => normalizeOrdersResponse(response)
};

console.log('🔧 مكتبة UUID جاهزة للاستخدام');
