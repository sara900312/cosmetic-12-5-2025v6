// اختبار حل مشكلة "body stream already read"
import { v4 as uuidv4 } from 'uuid';

// ✅ الحل الصحيح لمشكلة body stream already read
export async function sendOrderFixed(orderData) {
  try {
    // 🔑 النقطة المهمة: إنشاء payload جديد كل مرة
    const idempotencyKey = uuidv4();
    const fullPayload = {
      ...orderData, // نس�� البيانات الأصلية
      idempotency_key: idempotencyKey // إضافة المفتاح الجديد
    };

    console.log('📦 إنشاء payload جديد:', {
      idempotencyKey,
      payloadSize: JSON.stringify(fullPayload).length
    });

    const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // ✅ إنشاء JSON string جديد كل مرة
      body: JSON.stringify(fullPayload)
    });

    console.log('📡 Response status:', response.status);

    // ✅ فحص الخطأ قبل محاولة قراءة JSON
    if (!response.ok) {
      let errorResult;
      try {
        errorResult = await response.json();
      } catch (parseError) {
        console.warn('❌ فشل في قراءة error response:', parseError);
        errorResult = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error('❌ خطأ من الخادم:', errorResult);
      throw new Error(errorResult?.error || 'Server error');
    }

    // ✅ قراءة النتيجة الناجحة
    const result = await response.json();
    console.log('✅ نتيجة الطلب:', result);

    return result;

  } catch (error) {
    console.error('🚨 خطأ عام:', error);
    throw error;
  }
}

// 🧪 اختبار مع بيانات الطلب الحالي
const testOrderData = {
  customer_name: 'Test Customer',
  customer_phone: '07801234567',
  customer_address: 'Baghdad',
  customer_city: 'Baghdad',
  customer_notes: 'Test order',
  items: [
    {
      product_id: 1,
      product_name: 'Test Product',
      quantity: 1,
      price: 25000,
      main_store_name: 'hawranj',
    }
  ],
  subtotal: 25000,
  total_amount: 25000,
  order_code: '53PLNYQ', // من الصفحة الحالية
  main_store_name: 'hawranj',
  user_id: 'test-user-id',
};

// 🧪 دالة اختبار متعددة
export async function testMultipleSends() {
  console.log('🧪 اختبار إرسال طلبات متعددة:');
  
  try {
    // محاولة إرسال الطلب للمرة الأولى
    console.log('📤 المحاولة الأولى:');
    const result1 = await sendOrderFixed(testOrderData);
    console.log('✅ نتيجة المحاولة الأولى:', result1);
    
    // محاولة إرسال نفس الطلب مرة أخرى (يجب أن يكون محمي بـ idempotency)
    console.log('\n📤 المحاولة الثانية (مع order code نفسه):');
    const result2 = await sendOrderFixed(testOrderData);
    console.log('✅ نتيجة المحاولة الثانية:', result2);
    
    return { first: result1, second: result2 };
    
  } catch (error) {
    console.error('❌ فشل الاختبار:', error);
    throw error;
  }
}

// 🔧 دالة فحص حالة الشبكة
export async function checkNetworkConnection() {
  try {
    console.log('🌐 فحص الاتصال بالخادم...');
    
    const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification', {
      method: 'HEAD' // فقط للفحص
    });
    
    console.log('📡 حالة الخادم:', response.status);
    return response.status;
    
  } catch (error) {
    console.error('❌ خطأ في الشبكة:', error);
    throw error;
  }
}

// للاستخدام في المتصفح
if (typeof window !== 'undefined') {
  window.sendOrderFixed = sendOrderFixed;
  window.testMultipleSends = testMultipleSends;
  window.checkNetworkConnection = checkNetworkConnection;
  
  console.log('🚀 دوال الاختبار جاهزة:');
  console.log('- sendOrderFixed(orderData)');
  console.log('- testMultipleSends()');
  console.log('- checkNetworkConnection()');
}

export { testOrderData };
