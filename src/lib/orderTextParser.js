/**
 * دالة لتحليل نص الطلب وتحويله إلى JSON
 * @param {string} promptText - النص المدخل من المستخدم
 * @returns {Object} - بيانات الطلب في صيغة JSON
 */
export function parseOrderPrompt(promptText) {
  try {
    const order = {
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      customer_city: '',
      customer_notes: '',
      items: [],
      subtotal: 0,
      delivery_cost: 5000, // قيمة افترا��ية
      total_amount: 0,
      discounted_price: 0,
      order_code: generateOrderCode(),
      main_store_name: '',
      user_id: null,
      idempotency_key: crypto.randomUUID()
    };

    // تحليل معلومات العميل
    const nameMatch = promptText.match(/الاسم\s*[:\-]\s*([^\n]+)/i);
    if (nameMatch) order.customer_name = nameMatch[1].trim();

    const phoneMatch = promptText.match(/الهاتف\s*[:\-]\s*([^\n]+)/i);
    if (phoneMatch) order.customer_phone = phoneMatch[1].trim();

    const addressMatch = promptText.match(/العنوان\s*[:\-]\s*([^\n]+)/i);
    if (addressMatch) order.customer_address = addressMatch[1].trim();

    const cityMatch = promptText.match(/المدينة\s*[:\-]\s*([^\n]+)/i);
    if (cityMatch) order.customer_city = cityMatch[1].trim();

    const notesMatch = promptText.match(/ملاحظات\s*[:\-]\s*([^\n]+)/i);
    if (notesMatch) order.customer_notes = notesMatch[1].trim();

    // تحليل المنتجات
    const productPattern = /(\d+)\.\s*([^،]+)،\s*كمية\s*(\d+)،\s*السعر\s*(\d+)،\s*متجر[:\s]*([^\n]+)/gi;
    let match;
    
    while ((match = productPattern.exec(promptText)) !== null) {
      const [, , productName, quantity, price, storeName] = match;
      
      order.items.push({
        product_id: generateProductId(productName.trim()),
        product_name: productName.trim(),
        quantity: parseInt(quantity),
        price: parseInt(price),
        discounted_price: null,
        assigned_store_id: getStoreId(storeName.trim()),
        main_store_name: storeName.trim()
      });
    }

    // حساب المجاميع
    order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.total_amount = order.subtotal + order.delivery_cost;

    // تحديد المدينة إذا لم تُحدد
    if (!order.customer_city && order.customer_address) {
      order.customer_city = order.customer_address.toLowerCase().includes('بغداد') || 
                           order.customer_address.toLowerCase().includes('baghdad') 
                           ? 'بغداد' : 'محافظات أخرى';
    }

    // تحديد المتجر الرئيسي
    if (order.items.length > 0) {
      order.main_store_name = order.items[0].main_store_name;
    }

    return order;

  } catch (error) {
    console.error('خطأ في تحليل النص:', error);
    throw new Error('فشل في تحليل النص المدخل');
  }
}

/**
 * إرسال الطلب المحلل إلى Edge Function
 * @param {string} promptText - النص المدخل من المستخدم
 * @param {string} edgeFunctionUrl - رابط Edge Function
 * @returns {Promise<Object>} - نتيجة الطلب
 */
export async function sendOrderFromPrompt(promptText, edgeFunctionUrl) {
  try {
    const orderPayload = parseOrderPrompt(promptText);
    
    console.log('📤 إرسال الطلب:', orderPayload);
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ نجح الطلب:', data);
    return data;

  } catch (error) {
    console.error('❌ خطأ في إرسال الطلب:', error);
    throw error;
  }
}

/**
 * توليد رقم طلب فريد
 * @returns {string} - رقم الطلب
 */
function generateOrderCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD-';
  
  // إضافة التاريخ
  const date = new Date();
  result += date.getFullYear().toString().substr(-2);
  result += String(date.getMonth() + 1).padStart(2, '0');
  result += String(date.getDate()).padStart(2, '0');
  result += '-';
  
  // إضافة أرقام عشوائية
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * توليد معرف منتج بناءً على الاسم
 * @param {string} productName - اسم المنتج
 * @returns {string} - معرف المنتج
 */
function generateProductId(productName) {
  // تحويل اسم المنتج إلى معرف فريد
  return productName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .substring(0, 50) + '-' + Date.now().toString().substr(-6);
}

/**
 * الحصول على معرف المتجر بناءً على الاسم
 * @param {string} storeName - اسم المتجر
 * @returns {string} - معرف المتجر
 */
function getStoreId(storeName) {
  // خريطة أسماء المتاجر إلى معرفاتها
  const storeMap = {
    'hawranj': 'hawranj-store-id',
    'sara': 'sara-store-id',
    'techno': 'techno-store-id',
    'digital': 'digital-store-id'
  };
  
  const normalizedName = storeName.toLowerCase().trim();
  return storeMap[normalizedName] || null;
}

/**
 * مثال على ��لاستخدام
 */
export const exampleUsage = {
  promptText: `
أريد طلبية جديدة:
- الاسم: أحمد علي
- الهاتف: 0912345678
- العنوان: شارع المثال 123
- المدينة: بغداد
- ملاحظات: لا تتصل قبل التسليم
- المنتجات:
   1. LogitechG915X، كمية 1، السعر 20000، متجر: hawranj
   2. AMD Ryzen 9 7950X، كمية 1، السعر 700000، متجر: sara
  `,
  
  async sendExample() {
    const edgeFunctionUrl = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification';
    try {
      const result = await sendOrderFromPrompt(this.promptText, edgeFunctionUrl);
      console.log('نتيجة المثال:', result);
      return result;
    } catch (error) {
      console.error('خطأ في المثال:', error);
      return { error: error.message };
    }
  }
};
