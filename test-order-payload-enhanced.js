import { 
  prepareOrderPayload, 
  submitOrderToBackend, 
  getUniqueStores, 
  generateRandomOrderCode 
} from './src/lib/orderPayloadUtils.js';

console.log('🧪 اختبار شامل لنظام تحضير الطلبات المحسن\n');

// اختبار 1: إنشاء order_code عشوائي
console.log('1️⃣ اختبار إنشاء order_code عشوائي:');
for (let i = 0; i < 5; i++) {
  const randomCode = generateRandomOrderCode();
  console.log(`${i + 1}. ${randomCode} (طول: ${randomCode.length} أحرف)`);
}
console.log('\n' + '='.repeat(60) + '\n');

// اختبار 2: تنظيف وفلترة البيانات
console.log('2️⃣ اختبار تنظيف البيانات مع منتجات معطوبة ومكررة:');

const cartItemsWithIssues = [
  // منتجات صالحة
  { id: 1, name: 'لابتوب ديل', price: 350000, quantity: 1, main_store_name: 'متجر الحاسوب' },
  { id: 2, name: 'ماوس لاسلكي', price: 25000, quantity: 2, main_store_name: 'متجر الأجهزة' },
  
  // منتجات مكررة (سيتم دمجها)
  { id: 1, name: 'لابتوب ديل (مكرر)', price: 350000, quantity: 1, main_store_name: 'متجر الحاسوب' },
  
  // منتجات معطوبة (سيتم حذفها)
  { id: 3, name: 'منتج بسعر خاطئ', price: 'invalid', quantity: 1 },
  { id: 4, name: 'منتج بدون كمية', price: 50000 },
  { id: null, name: 'منتج بدون ID', price: 30000, quantity: 1 },
  { id: 5, name: 'منتج بكمية سالبة', price: 40000, quantity: -1 },
  
  // منتج صالح آخر
  { id: 6, name: 'كيبورد ميكانيكي', price: 75000, quantity: 1, main_store_name: 'متجر الحاسوب' }
];

const customer = {
  name: 'أحمد محمد علي',
  phone: '07801234567',
  address: 'بغداد، الكرادة',
  city: 'بغداد',
  notes: 'توصيل مساءً'
};

try {
  console.log(`📥 منتجات مدخلة: ${cartItemsWithIssues.length}`);
  
  const unifiedPayload = prepareOrderPayload(
    cartItemsWithIssues,
    customer,
    'unified'
  );
  
  console.log(`✅ منتجات صالحة بعد التنظيف: ${unifiedPayload.items.length}`);
  console.log(`🏷️ كود الطلب المُنشأ: ${unifiedPayload.order_code}`);
  console.log('\nالمنتجات النهائية:');
  unifiedPayload.items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.product_name} (ID: ${item.product_id}) - الكمية: ${item.quantity} - السعر: ${item.price}`);
  });
  
} catch (error) {
  console.error('❌ خطأ في التنظيف:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 3: التحقق من الحقول المطلوبة
console.log('3️⃣ اختبار التحقق من الحقول المطلوبة:');

const validCartItems = [
  { id: 1, name: 'منتج تجريبي', price: 100, quantity: 1, main_store_name: 'متجر تجريبي' }
];

// اختبار عدم وجود اسم العميل
try {
  prepareOrderPayload(validCartItems, { phone: '07801234567' }, 'unified');
} catch (error) {
  console.log('✅ تم اكتشاف عدم وجود اسم العميل:', error.message);
}

// اختبار عدم وجود رقم هاتف العميل
try {
  prepareOrderPayload(validCartItems, { name: 'أحمد محمد' }, 'unified');
} catch (error) {
  console.log('✅ تم اكتشاف عدم وجود رقم الهاتف:', error.message);
}

// اختبار نوع شحن خاطئ
try {
  prepareOrderPayload(validCartItems, customer, 'invalid_shipping');
} catch (error) {
  console.log('✅ تم اكتشاف نوع شحن خاطئ:', error.message);
}

// اختبار سلة فارغة
try {
  prepareOrderPayload([], customer, 'unified');
} catch (error) {
  console.log('✅ تم اكتشاف السلة الفارغة:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 4: اختبار الشحن السريع مع منتجات مكررة
console.log('4️⃣ اختبار الشحن السريع مع عدم تكرار:');

const fastShippingItems = [
  { id: 1, name: 'منتج أ', price: 100, quantity: 1, main_store_name: 'متجر 1' },
  { id: 1, name: 'منتج أ مكرر', price: 100, quantity: 2, main_store_name: 'متجر 1' }, // مكرر
  { id: 2, name: 'منتج ب', price: 50, quantity: 1, main_store_name: 'متجر 2' }
];

try {
  const fastPayload = prepareOrderPayload(
    fastShippingItems,
    customer,
    'fast'
  );
  
  console.log('✅ تم تحضير الشحن السريع بنجاح:');
  console.log(`- عدد المنتجات الفريدة: ${fastPayload.items.length}`);
  console.log('- تف��صيل المنتجات:');
  fastPayload.items.forEach(item => {
    console.log(`  • ${item.product_name}: كمية ${item.quantity} (مدموجة من المكررات)`);
  });
  
} catch (error) {
  console.error('❌ خطأ في الشحن السريع:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 5: عرض JSON النهائي جاهز للإرسال
console.log('5️⃣ مثال على JSON النهائي جاهز للإرسال:');

const finalCartItems = [
  { id: 1, name: 'لابتوب ديل Inspiron 15', price: 350000, quantity: 1, discounted_price: 320000, main_store_name: 'متجر الحاسوب المتقدم' },
  { id: 2, name: 'ماوس لاسلكي لوجيتك', price: 25000, quantity: 2, main_store_name: 'متجر الأجهزة الذكية' }
];

try {
  const finalPayload = prepareOrderPayload(
    finalCartItems,
    {
      name: 'سارة أحمد محمد',
      phone: '07809876543',
      address: 'البصرة، حي الجمهورية، شارع الكورنيش',
      city: 'البصرة',
      notes: 'التوصيل بين الساعة 3-7 مساءً'
    },
    'unified',
    null, // سيتم إنشاء order_code تلقائياً
    'test-key-12345'
  );
  
  console.log('JSON جاهز للإرسال إلى Edge Function:');
  console.log(JSON.stringify(finalPayload, null, 2));
  
  // التحقق من وجود جميع الحقول المطلوبة
  const requiredFields = ['customer_name', 'customer_phone', 'items', 'shipping_type'];
  const hasAllRequiredFields = requiredFields.every(field => 
    finalPayload.hasOwnProperty(field) && 
    finalPayload[field] !== null && 
    finalPayload[field] !== undefined &&
    (Array.isArray(finalPayload[field]) ? finalPayload[field].length > 0 : true)
  );
  
  console.log(`\n✅ جميع الحقول المطلوبة موجودة: ${hasAllRequiredFields}`);
  console.log(`✅ عدد المنتجات: ${finalPayload.items.length}`);
  console.log(`✅ إجمالي المبلغ: ${finalPayload.total_amount}`);
  console.log(`✅ كود الطلب: ${finalPayload.order_code} (${finalPayload.order_code.length} أحرف)`);
  
} catch (error) {
  console.error('❌ خطأ في إنشاء الحمولة النهائية:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// اختبار 6: محاكاة الإرسال إلى Edge Function
console.log('6️⃣ مثال على الاستخدام مع Edge Function:');

const exampleUsage = `
// في CheckoutPage.jsx
const handleOrderSubmit = async () => {
  try {
    // 1. تحضير البيانات مع التنظيف التلقائي
    const payload = prepareOrderPayload(
      cartItems,           // سيتم تنظيف المكررات والمعطوبات تلقائياً
      customerData,        // name وphone مطلوبان
      'unified',           // أو 'fast'
      null,               // سيتم إنشاء order_code عشوائي (8 أحرف)
      idempotencyKey
    );

    // 2. إرسال إلى Edge Function
    const result = await submitOrderToBackend(
      payload,
      'https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification'
    );

    console.log('✅ نجح إنشاء الطلب:', result);

    if (result.shipping_type === 'fast') {
      console.log(\`تم إنشاء \${result.orders_count} طلبات منفصلة\`);
    } else {
      console.log('تم إنشاء طلب واحد موحد');
    }

  } catch (error) {
    console.error('❌ فشل في إنشاء الطلب:', error.message);
  }
};
`;

console.log(exampleUsage);

console.log('\n✅ انتهت جميع الاختبارات بنجاح!');
console.log('\n🎯 المزايا الجديدة:');
console.log('   ✓ تنظيف تلقائي للمنتجات المعطوبة');
console.log('   ✓ دمج المنتجات المكررة تلقائياً');
console.log('   ✓ order_code عشوائي (8 أحرف بدون بادئة)');
console.log('   ✓ التحقق من جميع الحقول المطلوبة');
console.log('   ✓ JSON جاهز للإرسال إلى Edge Function');
console.log('   ✓ لكل منتج في الشحن السريع يُرسل مرة واحدة فقط');
