/**
 * Generate random order code (8 characters: letters and numbers)
 * @returns {string} Random order code
 */
export function generateRandomOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate and clean cart item
 * @param {Object} item - Cart item to validate
 * @returns {Object|null} Cleaned item or null if invalid
 */
function validateAndCleanItem(item) {
  // التحقق من الحقول المطلوبة
  const productId = item.id || item.product_id;
  const quantity = parseInt(item.quantity);
  const price = parseFloat(item.price);

  // إذا كان أي من الحقول المطلوبة غير صالح، إرجاع null
  if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
    console.warn('Invalid item detected and removed:', {
      productId,
      quantity: item.quantity,
      price: item.price,
      name: item.name
    });
    return null;
  }

  // استخراج اسم المتجر بشكل نظيف
  let storeName = 'غير معروف';
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
 * Remove duplicate items based on product_id
 * @param {Array} items - Array of items
 * @returns {Array} Deduplicated items
 */
function deduplicateItems(items) {
  const seen = new Map();
  const deduplicated = [];

  for (const item of items) {
    const productId = item.product_id;

    if (seen.has(productId)) {
      // دمج الكميات للمنتجات المكررة
      const existingItem = seen.get(productId);
      existingItem.quantity += item.quantity;
      console.log(`Merged duplicate product ${productId}: total quantity now ${existingItem.quantity}`);
    } else {
      seen.set(productId, item);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

/**
 * Prepare order data for submission to backend
 * @param {Array} cartItems - قائمة المنتجات في السلة
 * @param {Object} customer - بيانات العميل (name, phone, address, city, notes)
 * @param {string} shippingType - 'fast' أو 'unified'
 * @param {string} orderCode - كود فريد للطلب (اختياري - سيتم إنشاؤه تلقائياً إذا لم يُمرر)
 * @param {string} idempotencyKey - مفتاح منع التكرار
 * @returns {Object} payload جاهز للإرسال إلى backend
 */
export function prepareOrderPayload(cartItems, customer, shippingType, orderCode = null, idempotencyKey) {
  // التحقق من صحة المدخلات الأساسية
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Cart is empty or invalid');
  }

  if (!['fast', 'unified'].includes(shippingType)) {
    throw new Error('Invalid shipping type. Must be "fast" or "unified"');
  }

  // التحقق من بيانات العميل المطلوبة
  if (!customer || !customer.name || !customer.phone) {
    throw new Error('Missing required customer fields: name and phone are required');
  }

  // تنظيف وفلترة العناصر - إزالة العناصر غير الصالحة
  const validItems = cartItems
    .map(item => validateAndCleanItem(item))
    .filter(item => item !== null);

  if (validItems.length === 0) {
    throw new Error('No valid items found in cart after validation');
  }

  // إزالة المكررات بناءً على product_id
  const items = deduplicateItems(validItems);

  // للشحن السريع: التأكد من أن كل منتج يُرسل مرة واحدة فقط
  if (shippingType === 'fast') {
    console.log(`Fast shipping: ensuring each product is sent only once. Final items count: ${items.length}`);
  }

  // إنشاء order_code عشوائي إذا لم يُمرر
  const finalOrderCode = orderCode || generateRandomOrderCode();

  // حساب المجاميع
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscounted = items.reduce((sum, item) => {
    const discountedPrice = item.discounted_price || 0;
    return sum + (discountedPrice * item.quantity);
  }, 0);

  // إنشاء الحمولة مع التأكد من وجود جميع الحقول المطلوبة
  const payload = {
    // الحقول المطلوبة
    customer_name: customer.name.trim(),
    customer_phone: customer.phone.trim(),
    items: items,
    shipping_type: shippingType,

    // الحقول الاختيارية
    customer_address: (customer.address || '').trim(),
    customer_city: (customer.city || '').trim(),
    customer_notes: (customer.notes || '').trim(),
    order_code: finalOrderCode,
    idempotency_key: idempotencyKey || `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    delivery_cost: 0, // يمكن تخصيصها لاحقاً
  };

  // إضافة بيانات خاصة بنوع الشحن
  if (shippingType === 'unified') {
    // الشحن الموحد: طلب واحد لجميع ��لمنتجات
    payload.subtotal = subtotal;
    payload.total_amount = subtotal + (payload.delivery_cost || 0);
    payload.discounted_price = totalDiscounted > 0 ? totalDiscounted : null;
    payload.main_store_name = getMainStoreName(items);
  } else if (shippingType === 'fast') {
    // الشحن السريع: طلبات منفصلة لكل متجر
    // البيانات ستُحسب في الـ backend لكل طلب منفصل
    payload.subtotal = subtotal;
    payload.total_amount = subtotal + (payload.delivery_cost || 0);
    payload.discounted_price = totalDiscounted > 0 ? totalDiscounted : null;
  }

  // التحقق النهائي من وجود جميع الحقول المطلوبة
  const requiredFields = ['customer_name', 'customer_phone', 'items', 'shipping_type'];
  const missingFields = requiredFields.filter(field => !payload[field] ||
    (Array.isArray(payload[field]) && payload[field].length === 0));

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // التحقق من أن items غير فارغة ولها هيكل صحيح
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    if (!item.product_id || !item.quantity || typeof item.price !== 'number') {
      throw new Error(`Invalid item at index ${i}: missing product_id, quantity, or price`);
    }
  }

  console.log(`✅ Payload prepared successfully:`);
  console.log(`- Customer: ${payload.customer_name} (${payload.customer_phone})`);
  console.log(`- Items: ${payload.items.length} valid items`);
  console.log(`- Shipping: ${payload.shipping_type}`);
  console.log(`- Order Code: ${payload.order_code}`);
  console.log(`- Total Amount: ${payload.total_amount}`);

  return payload;
}

/**
 * استخراج اسم المتجر الرئيسي من قائمة المنتجات
 * @param {Array} items - قائمة المنتجات
 * @returns {string} اسم المتجر الرئيسي أو "متعدد المتاجر"
 */
function getMainStoreName(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'غير معروف';
  }

  // إذا كان هناك متجر واحد فقط
  const uniqueStores = [...new Set(items.map(item => item.main_store_name))];
  
  if (uniqueStores.length === 1) {
    return uniqueStores[0];
  }

  // إذا كان هناك متاجر متعددة
  return 'متعدد المتاجر';
}

/**
 * إرسال الطلب إلى الـ Edge Function
 * @param {Object} payload - البيانات المحضرة
 * @param {string} functionUrl - رابط الـ Edge Function
 * @returns {Promise<Object>} استجابة الخادم
 */
export async function submitOrderToBackend(payload, functionUrl) {
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error submitting order:', error);
    throw error;
  }
}

/**
 * تحديد المتاجر المختلفة في السلة
 * @param {Array} cartItems - قائمة المنتجات
 * @returns {Array} قائمة أسماء المتاجر الفريدة
 */
export function getUniqueStores(cartItems) {
  if (!Array.isArray(cartItems)) return [];
  
  const stores = cartItems.map(item => {
    if (item.main_store_name && typeof item.main_store_name === 'string') {
      return item.main_store_name.trim();
    } else if (item.store_name && typeof item.store_name === 'string') {
      return item.store_name.trim();
    } else if (item.main_store && typeof item.main_store === 'string') {
      return item.main_store.trim();
    }
    return 'غير معروف';
  });

  return [...new Set(stores)].filter(store => store && store !== 'غير معروف');
}

/**
 * مثال على كيفية الاستخدام
 */
export const orderPayloadExamples = {
  // مثال للشحن الموحد
  unifiedShippingExample: () => {
    const cartItems = [
      { id: 1, name: 'منتج أ', price: 100, quantity: 2, main_store_name: 'متجر 1' },
      { id: 2, name: 'منتج ب', price: 50, quantity: 1, main_store_name: 'متجر 2' }
    ];

    const customer = {
      name: 'أحمد محمد',
      phone: '0501234567',
      address: 'الرياض، حي النخيل',
      city: 'الرياض',
      notes: 'التسليم مساءً فقط'
    };

    // استخدام order_code عشوائي أو تمرير null لإنشاء تلقائي
    return prepareOrderPayload(cartItems, customer, 'unified', null, 'key-12345');
  },

  // مثال للشحن السريع
  fastShippingExample: () => {
    const cartItems = [
      { id: 1, name: 'منتج أ', price: 100, quantity: 2, main_store_name: 'متجر 1' },
      { id: 2, name: 'منتج ب', price: 50, quantity: 1, main_store_name: 'متجر 2' }
    ];

    const customer = {
      name: 'سارة أحمد',
      phone: '0507654321',
      address: 'جدة، حي الحمراء',
      city: 'جدة',
      notes: 'شحن سريع مطلوب'
    };

    // استخدام order_code عشوائي
    return prepareOrderPayload(cartItems, customer, 'fast', generateRandomOrderCode(), 'key-67890');
  },

  // مثال مع منتجات مكررة ومعطوبة لاختبار التنظيف
  validationTestExample: () => {
    const cartItems = [
      { id: 1, name: 'منتج صالح', price: 100, quantity: 2, main_store_name: 'متجر 1' },
      { id: 1, name: 'منتج مكرر', price: 100, quantity: 1, main_store_name: 'متجر 1' }, // مكرر
      { id: 2, name: 'منتج معطوب', price: 'invalid', quantity: 1 }, // سعر غير صالح
      { id: 3, name: 'منتج بدون كمية', price: 50 }, // بدون كمية
      { id: 4, name: 'منتج صالح آخر', price: 75, quantity: 3, main_store_name: 'متجر 2' }
    ];

    const customer = {
      name: 'محمد أحمد',
      phone: '0501112233'
    };

    return prepareOrderPayload(cartItems, customer, 'unified');
  }
};
