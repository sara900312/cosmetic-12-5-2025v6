// مثال تطبيقي لاستخدام نظام idempotency keys
import { 
  createOrderPayload, 
  sendOrderWithIdempotency,
  createPersistentIdempotencyKey 
} from './src/lib/orderNotification.js';

// ===============================
// 1. مثال بيانات طلب كامل
// ===============================
const exampleOrderData = {
  customer_name: 'علي محمد',
  customer_phone: '7803693942',
  customer_address: 'الكاظمية - حي الجامعة',
  customer_city: 'بغداد',
  customer_notes: 'رجاءً التسليم سريع',
  items: [
    {
      product_id: 57,
      product_name: 'Redragon GS513 PC Gaming',
      quantity: 1,
      price: 25000,
      main_store_name: 'hawranj'
    },
    {
      product_id: 12,
      product_name: 'Gaming Mouse',
      quantity: 2,
      price: 15000,
      main_store_name: 'hawranj'
    }
  ],
  subtotal: 55000,
  total_amount: 55000,
  order_code: '3YW1ZME', // نفس رقم الطلب المرسل في الصفحة
  main_store_name: 'hawranj',
  user_id: '62ef1a7b-55c0-4eb1-b08a-7c625de4e0ae',
};

// ===============================
// 2. الطريقة الأولى: استخدام دالة مساعدة
// ===============================
async function sendOrderExample1() {
  const endpoint = 'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification';
  
  try {
    const result = await sendOrderWithIdempotency(
      exampleOrderData, 
      endpoint, 
      exampleOrderData.order_code
    );
    
    console.log('✅ تم إرسال الطلب بنجاح:', result);
    alert('تم إرسال الطلب بنجاح');
    return result;
    
  } catch (error) {
    console.error('❌ فشل في إرسال الطلب:', error);
    alert(`خطأ في إرسال الطلب: ${error.message}`);
    return null;
  }
}

// ===============================
// 3. الطريقة الثانية: إنشاء payload يدوياً
// ===============================
async function sendOrderExample2() {
  // إنشاء payload مع idempotency key
  const payload = createOrderPayload(exampleOrderData, exampleOrderData.order_code);
  
  try {
    const response = await fetch('https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ خطأ في إرسال الطلب:', result.error);
      alert(`خطأ في إرسال الطلب: ${result.error || 'حدث خطأ غير متوقع'}`);
      return null;
    }

    console.log('✅ تم إرسال الطلب بنجاح:', result);
    alert('تم إرسال الطلب بنجاح');
    return result;
    
  } catch (error) {
    console.error('خطأ في الشبكة:', error);
    alert('حدث خطأ في الاتصال بالخادم. حاول مرة أخرى.');
    return null;
  }
}

// ===============================
// 4. الطريقة الثالثة: فقط idempotency key
// ===============================
async function sendOrderExample3() {
  // إنشاء idempotency key مستقل
  const idempotencyKey = createPersistentIdempotencyKey(exampleOrderData.order_code);
  
  const payload = {
    ...exampleOrderData,
    idempotency_key: idempotencyKey
  };

  // باقي منطق الإرسال...
  console.log('📦 Payload جاهز للإرسال:', payload);
}

// ===============================
// 5. اختبار النظام
// ===============================
function testIdempotencySystem() {
  console.log('🧪 اختبار نظام idempotency keys:');
  
  const orderCode = '3YW1ZME';
  
  // إنشاء مفتاح للمرة الأولى
  const key1 = createPersistentIdempotencyKey(orderCode);
  console.log('🔑 المفتاح الأول:', key1);
  
  // محاولة إنشاء مفتاح للطلب نفسه
  const key2 = createPersistentIdempotencyKey(orderCode);
  console.log('🔑 المفتاح الثاني:', key2);
  
  // التحقق من أنهما متماثلان
  if (key1 === key2) {
    console.log('✅ ممتاز! النظام يعيد نفس المفتاح للطلب نفسه');
  } else {
    console.log('❌ خطأ! مفاتيح مختلفة للطلب نفسه');
  }
  
  // عرض المفاتيح المحفوظة
  const savedKeys = Object.keys(localStorage).filter(key => key.startsWith('idempotency_'));
  console.log('💾 المفاتيح المحفوظة:', savedKeys.length);
}

// ===============================
// 6. تشغيل الاختبارات (في المتصفح)
// ===============================
if (typeof window !== 'undefined') {
  // ربط الدوال بـ window للاختبار
  window.sendOrderExample1 = sendOrderExample1;
  window.sendOrderExample2 = sendOrderExample2;
  window.sendOrderExample3 = sendOrderExample3;
  window.testIdempotencySystem = testIdempotencySystem;
  
  console.log('🚀 الدوال جاهزة للاختبار:');
  console.log('- testIdempotencySystem()');
  console.log('- sendOrderExample1()');
  console.log('- sendOrderExample2()');
  console.log('- sendOrderExample3()');
}

export {
  sendOrderExample1,
  sendOrderExample2,
  sendOrderExample3,
  testIdempotencySystem
};
