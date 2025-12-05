import { v4 as uuidv4 } from 'uuid';

// دالة إرسال الطلب (محدثة لحل خطأ body stream already read)
async function sendOrder(orderData) {
  try {
    // إنشاء نسخة جديدة من البيانات لتجنب تعديل الأصل
    const idempotencyKey = uuidv4();
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
      alert(`خطأ في إرسال الطلب: ${errorResult?.error || 'خطأ غير معروف'}`);
      return null;
    }

    // قراءة النتيجة
    const result = await response.json();

    if (result.success) {
      console.log('✅ تم إرسال الطلب بنجاح:', result);
      alert('تم إرسال الطلب بنجاح!');
      return result;
    } else {
      console.warn('⚠️ الطلب غير ناجح:', result);
      alert(`الطلب مكرر أو حدث خطأ: ${result.message || result.error || 'يرجى المحاولة لاحقًا'}`);
      return null;
    }

  } catch (error) {
    console.error('🚨 خطأ في الشبكة أو الخادم:', error);
    alert('حدث خطأ في الإتصال بالخادم. يرجى المحاولة مرة أخرى.');
    return null;
  }
}

// مثال بيانات الطلب (تأكد من ملء الحقول حسب نموذجك)
const orderDataExample = {
  customer_name: 'Ali Mohammed',
  customer_phone: '7803693942',
  customer_address: 'Al Kadhimiya',
  customer_city: 'Baghdad',
  customer_notes: 'يرجى التوصيل خلال الصباح',
  items: [
    {
      product_id: 57,
      product_name: 'Redragon GS513 PC Gaming',
      quantity: 1,
      price: 25000,
      main_store_name: 'hawranj',
    }
  ],
  subtotal: 25000,
  total_amount: 25000,
  order_code: 'VKNRUPU',
  main_store_name: 'hawranj',
  user_id: 'user-uuid-if-any', // يمكن تركه null إذا لا يوجد
  // لا تحدد idempotency_key هنا، سيتم توليدها تلقائياً
};

// استدعاء الدالة لإرسال الطلب
sendOrder(orderDataExample);

// ====================================
// مثال آخر مع order code من الصفحة الحالية
// ====================================
const currentOrderExample = {
  customer_name: 'علي محمد الحسني',
  customer_phone: '07801234567',
  customer_address: 'بغداد - الكاظمية',
  customer_city: 'بغداد',
  customer_notes: 'التوصيل خلال ساعات العمل',
  items: [
    {
      product_id: 1,
      product_name: 'Gaming Laptop',
      quantity: 1,
      price: 850000,
      main_store_name: 'hawranj',
    }
  ],
  subtotal: 850000,
  total_amount: 850000,
  order_code: '753I79F', // رقم الطلب من الصفحة الحالية
  main_store_name: 'hawranj',
  user_id: '62ef1a7b-55c0-4eb1-b08a-7c625de4e0ae',
};

// ===================================
// اختبار النظام للطلب الحالي
// ===================================
function testCurrentOrder() {
  console.log('🧪 اختبار إرسال الطلب الحالي:', currentOrderExample.order_code);
  return sendOrder(currentOrderExample);
}

// ===================================
// تصدير الدوال للاستخدام
// ===================================
export { sendOrder, testCurrentOrder, orderDataExample, currentOrderExample };

// ===================================
// ربط بـ window للاختبار في المتصفح
// ===================================
if (typeof window !== 'undefined') {
  window.sendOrder = sendOrder;
  window.testCurrentOrder = testCurrentOrder;
  window.orderDataExample = orderDataExample;
  window.currentOrderExample = currentOrderExample;
  
  console.log('🚀 دوال الاختبار جاهزة:');
  console.log('- sendOrder(orderData)');
  console.log('- testCurrentOrder()');
  console.log('- orderDataExample (بيانات تجريبية)');
  console.log('- currentOrderExample (الطلب الحالي)');
}
