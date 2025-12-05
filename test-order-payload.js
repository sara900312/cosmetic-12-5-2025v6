import { prepareOrderPayload, submitOrderToBackend, getUniqueStores } from './src/lib/orderPayloadUtils.js';

// اختبار البيانات
const cartItems = [
  {
    id: 1,
    name: 'لابتوب ديل Inspiron 15',
    price: 350000,
    quantity: 1,
    discounted_price: 320000,
    main_store_name: 'متجر الحاسوب المتقدم'
  },
  {
    id: 2,
    name: 'ماوس لاسلكي لوجيتك',
    price: 25000,
    quantity: 2,
    discounted_price: null,
    main_store_name: 'متجر الأجهزة الذكية'
  },
  {
    id: 3,
    name: 'كيبورد ميكانيكي',
    price: 75000,
    quantity: 1,
    discounted_price: 65000,
    main_store_name: 'متجر الحاسوب المتقدم'
  }
];

const customer = {
  name: 'أحمد محمد علي',
  phone: '07801234567',
  address: 'بغداد، حي الكرادة، شارع ابو نؤاس، بناية رقم 15',
  city: 'بغداد',
  notes: 'يرجى التوصيل بين الساعة 2-6 مساءً'
};

console.log('🧪 اختبار دوال تحضير البيانات\n');

// اختبار 1: الحصول على المتاجر الفريدة
console.log('1️⃣ اختبار getUniqueStores:');
const uniqueStores = getUniqueStores(cartItems);
console.log('المتاجر الفريدة:', uniqueStores);
console.log(`عدد المتاجر: ${uniqueStores.length}\n`);

// اختبار 2: الشحن الموحد
console.log('2️⃣ اختبار الشحن الموحد:');
try {
  const unifiedPayload = prepareOrderPayload(
    cartItems,
    customer,
    'unified',
    'ORD-1642501234',
    'unified-key-test-12345'
  );
  
  console.log('✅ نجح تحضير البيانات للشحن الموحد:');
  console.log(JSON.stringify(unifiedPayload, null, 2));
} catch (error) {
  console.error('❌ خطأ في الشحن الموحد:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 3: الشحن السريع
console.log('3️⃣ اختبار الشحن السريع:');
try {
  const fastPayload = prepareOrderPayload(
    cartItems,
    customer,
    'fast',
    'ORD-1642501235',
    'fast-key-test-67890'
  );
  
  console.log('✅ نجح تحضير البيانات للشحن السريع:');
  console.log(JSON.stringify(fastPayload, null, 2));
} catch (error) {
  console.error('❌ خطأ في الشحن السريع:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 4: اختبار حالات الخطأ
console.log('4️⃣ اختبار حالات الخطأ:');

// سلة فارغة
try {
  prepareOrderPayload([], customer, 'unified', 'ORD-123', 'key-123');
} catch (error) {
  console.log('✅ تم اكتشاف السلة الفارغة:', error.message);
}

// نوع شحن خاطئ
try {
  prepareOrderPayload(cartItems, customer, 'invalid', 'ORD-123', 'key-123');
} catch (error) {
  console.log('✅ تم اكتشاف نوع الشحن الخاطئ:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 5: عرض مثال على الاستخدام مع Edge Function
console.log('5️⃣ مثال على الاستخدام مع Edge Function:');

const exampleUsage = `
// في الفرونت إند (React/JavaScript)
const handleOrderSubmit = async () => {
  try {
    // تحضير البيانات
    const payload = prepareOrderPayload(
      cartItems,
      customerData,
      'unified', // أو 'fast'
      'ORD-1642501236',
      'key-unique-12345'
    );

    // إرسال إلى الباك إند
    const result = await submitOrderToBackend(
      payload,
      'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification'
    );

    console.log('نجح إنشاء الطلب:', result);
    
    if (result.shipping_type === 'fast') {
      console.log(\`تم إنشاء \${result.orders_count} طلبات منفصلة للشحن السريع\`);
    } else {
      console.log('تم إنشاء طلب واحد موحد');
    }

  } catch (error) {
    console.error('فشل في إنشاء الطلب:', error.message);
  }
};
`;

console.log(exampleUsage);

console.log('\n✅ انتهت جميع الاختبارات بنجاح!');
console.log('📝 يمكنك الآن استخدام الدوال في CheckoutPage.jsx');
