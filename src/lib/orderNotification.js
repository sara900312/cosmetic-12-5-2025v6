import { v4 as uuidv4 } from 'uuid';

/**
 * Creates and manages persistent idempotency keys using localStorage
 * @param {string} orderCode - Unique order code to associate with the key
 * @returns {string} Idempotency key
 */
export function createPersistentIdempotencyKey(orderCode) {
  const key = `idempotency_${orderCode}`;

  // Check if we already have a key for this order
  let storedKey = localStorage.getItem(key);

  if (!storedKey) {
    // Generate new key and store it
    storedKey = uuidv4();
    localStorage.setItem(key, storedKey);

    console.log(`🔑 إنشاء idempotency key جديد للطلب ${orderCode}:`, storedKey);

    // Set expiration (clean up after 24 hours)
    setTimeout(() => {
      localStorage.removeItem(key);
      console.log(`🧹 تم حذف idempotency key للطلب ${orderCode} بعد انتهاء المدة`);
    }, 24 * 60 * 60 * 1000);
  } else {
    console.log(`♻️ استخدام idempotency key موجود للطلب ${orderCode}:`, storedKey);
  }

  return storedKey;
}

/**
 * Cleans up old idempotency keys from localStorage
 */
export function cleanupIdempotencyKeys() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('idempotency_')) {
      // Could add timestamp checking here for more sophisticated cleanup
      const timestamp = localStorage.getItem(`${key}_timestamp`);
      if (timestamp && Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    }
  });
}

/**
 * Creates a complete order payload with idempotency key
 * @param {Object} orderData - Order data object
 * @param {string} [orderCode] - Optional order code for persistent key
 * @returns {Object} Complete payload with idempotency key
 */
export function createOrderPayload(orderData, orderCode = null) {
  // Generate idempotency key
  let idempotencyKey;
  if (orderCode) {
    idempotencyKey = createPersistentIdempotencyKey(orderCode);
  } else {
    idempotencyKey = uuidv4();
  }

  // Create complete payload
  const payload = {
    ...orderData,
    idempotency_key: idempotencyKey,
  };

  console.log('✅ تم إنشاء payload الطلب مع idempotency key:', {
    orderCode: orderCode || 'مؤقت',
    idempotencyKey,
    payloadSize: JSON.stringify(payload).length
  });

  return payload;
}

/**
 * Sends order with automatic idempotency key generation
 * Example usage like the provided code sample
 * @param {Object} orderData - Complete order data
 * @param {string} endpoint - Supabase edge function URL
 * @param {string} [orderCode] - Optional order code for persistent key
 * @returns {Promise<Object>} Response object
 */
export async function sendOrderWithIdempotency(orderData, endpoint, orderCode = null) {
  // Create payload with idempotency key
  const payload = createOrderPayload(orderData, orderCode);

  try {
    console.log('📤 إرسال الطلب مع idempotency key إلى:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ خطأ في إرسال الطلب:', result.error);
      throw new Error(result.error || 'حدث خطأ غير متوقع');
    }

    console.log('✅ تم إرسال الطلب بنجاح:', result);
    return result;

  } catch (error) {
    console.error('🚨 خطأ في الشبكة أو خطأ غير متوقع:', error);
    throw error;
  }
}

/**
 * Simple order sender exactly like the provided example
 * دالة إرسال الطلب كما في المثال المطلوب
 * @param {Object} orderData - Order data object
 * @returns {Promise<Object|null>} Result or null on error
 */
export async function sendOrder(orderData) {
  try {
    // إنشاء مفتاح idempotency مناسب حسب نوع الشحن
    let idempotencyKey;

    if (orderData.shipping_type === 'fast') {
      // للشحن السريع: مفتاح فريد مستقل تماماً لضمان عدم الدمج
      idempotencyKey = orderData.idempotency_key || `fast-${Date.now()}-${uuidv4()}`;
      console.log('🚀 الشحن السريع: استخدام مفتاح فريد مستقل:', idempotencyKey);
    } else {
      // للشحن الموحد: استخدام المفتاح المرسل أو إنشاء جديد
      idempotencyKey = orderData.idempotency_key || uuidv4();
      console.log('📦 الشحن الموحد: استخدام مفتاح:', idempotencyKey);
    }

    const fullPayload = {
      ...orderData,
      idempotency_key: idempotencyKey
    };

    console.log('📤 إرسال الطلب مع idempotency key:', idempotencyKey);

    const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // تأكد من أنك تستخدم JSON.stringify كل مرة مع payload جديد
      body: JSON.stringify(fullPayload)
    });

    // التحقق من status code أولاً
    if (!response.ok) {
      let errorResult;
      try {
        errorResult = await response.json();
      } catch (parseError) {
        errorResult = { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      console.error('❌ خطأ في الطلب:', errorResult);
      throw new Error(errorResult?.error || 'Unknown error');
    }

    // قراءة النتيجة
    const result = await response.json();

    if (result.success) {
      console.log('✅ تم إرسال الطلب بنجاح:', result);
      return result;
    } else {
      console.warn('⚠️ الطلب غير ناجح:', result);
      throw new Error(result.message || result.error || 'يرجى المحاولة لاحقًا');
    }

  } catch (error) {
    console.error('🚨 خطأ في الشبكة أو الخادم:', error);
    throw error;
  }
}

/**
 * Sends order notification to Supabase Edge Function
 * @param {string} orderCode - Order code/ID to identify the order
 * @param {string} productName - Name of the product(s)
 * @param {number} quantity - Quantity of items
 * @param {string} storeName - Name of the store
 * @param {string} [idempotencyKey] - Optional idempotency key for duplicate prevention
 * @returns {Promise<Object>} Response object with success/error status
 */
export async function sendOrderNotification(orderCode, productName, quantity, storeName, idempotencyKey = null) {
  // Input validation
  if (!orderCode || !productName || !quantity || !storeName) {
    throw new Error('All parameters are required: orderCode, productName, quantity, storeName');
  }

  if (typeof quantity !== 'number' || quantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  // Generate idempotency key if not provided
  const finalIdempotencyKey = idempotencyKey || uuidv4();

  const endpoint = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification';

  const requestBody = {
    orderCode: String(orderCode).trim(),
    productName: String(productName).trim(),
    quantity: Number(quantity),
    storeName: String(storeName).trim(),
    idempotency_key: finalIdempotencyKey
  };

  try {
    console.log('Sending order notification:', requestBody);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(`Failed to send notification: ${errorMessage}`);
    }

    // Parse successful response
    const data = await response.json();
    
    if (data.success) {
      console.log('Order notification sent successfully:', data);
      return {
        success: true,
        message: 'تم إرسال إشعار الطلب بنجاح',
        details: data.details
      };
    } else {
      throw new Error(data.error || 'Unknown error occurred');
    }

  } catch (error) {
    console.error('Error sending order notification:', error);
    
    // Handle different types of errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error
      return {
        success: false,
        message: 'خطأ في الشبكة - يرجى التحقق من الاتصال بالإنترنت',
        error: 'Network error'
      };
    } else if (error.name === 'AbortError') {
      // Request timeout
      return {
        success: false,
        message: 'انتهت مهلة الطلب - يرجى المحاولة مرة أخرى',
        error: 'Request timeout'
      };
    } else {
      // Other errors
      return {
        success: false,
        message: `خطأ في إرسال الإشعار: ${error.message}`,
        error: error.message
      };
    }
  }
}

/**
 * Sends order notification with timeout support
 * @param {string} orderCode - Order code/ID to identify the order
 * @param {string} productName - Name of the product(s)
 * @param {number} quantity - Quantity of items
 * @param {string} storeName - Name of the store
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @param {string} [idempotencyKey] - Optional idempotency key for duplicate prevention
 * @returns {Promise<Object>} Response object with success/error status
 */
export async function sendOrderNotificationWithTimeout(orderCode, productName, quantity, storeName, timeoutMs = 10000, idempotencyKey = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Input validation
    if (!orderCode || !productName || !quantity || !storeName) {
      throw new Error('All parameters are required: orderCode, productName, quantity, storeName');
    }

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || uuidv4();

    const endpoint = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification';

    const requestBody = {
      orderCode: String(orderCode).trim(),
      productName: String(productName).trim(),
      quantity: Number(quantity),
      storeName: String(storeName).trim(),
      idempotency_key: finalIdempotencyKey
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: 'تم إرسال إشعار الطلب بنجاح',
      details: data.details
    };

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'انتهت مهلة الطلب - يرجى المحاولة مرة أخرى',
        error: 'Request timeout'
      };
    }

    return {
      success: false,
      message: `خطأ في إرسال الإشعار: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Utility function for checkout integration
 * Formats cart items and sends notification
 * @param {Object} formData - Customer form data
 * @param {Array} cartItems - Array of cart items
 * @param {string} [orderCode] - Optional order code for persistent idempotency key
 * @returns {Promise<Object>} Response object
 */
export async function sendCheckoutNotification(formData, cartItems, orderCode = null) {
  if (!formData || !cartItems || cartItems.length === 0) {
    throw new Error('Customer data and cart items are required');
  }

  // Format product names and calculate total quantity
  const productNames = cartItems.map(item =>
    `${item.name} (x${item.quantity})`
  ).join(', ');

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Get store name from first item or use default
  const storeName = cartItems[0]?.main_store || 'المتجر الرئيسي';

  // Create persistent idempotency key if order code is provided
  const idempotencyKey = orderCode ? createPersistentIdempotencyKey(orderCode) : null;

  return await sendOrderNotification(
    orderCode || `ORDER-${Date.now().toString().slice(-6)}`,
    productNames,
    totalQuantity,
    storeName,
    idempotencyKey
  );
}
