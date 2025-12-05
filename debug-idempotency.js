// Debug script للتحقق من idempotency keys في localStorage
console.log('🔍 فحص idempotency keys في localStorage:');

// عرض جميع المفاتيح المحفوظة
const allKeys = Object.keys(localStorage);
const idempotencyKeys = allKeys.filter(key => key.startsWith('idempotency_'));

if (idempotencyKeys.length === 0) {
  console.log('❌ لا توجد idempotency keys محفوظة');
} else {
  console.log(`✅ وُجد ${idempotencyKeys.length} مفتاح idempotency:`);
  idempotencyKeys.forEach(key => {
    const value = localStorage.getItem(key);
    const orderCode = key.replace('idempotency_', '');
    console.log(`  📝 Order: ${orderCode} → Key: ${value}`);
  });
}

// دالة لمحاكاة إرسال طلب جديد
function testIdempotencyKey() {
  const testOrderCode = 'TEST_' + Date.now();
  const { createPersistentIdempotencyKey } = require('./src/lib/orderNotification');
  
  console.log('\n🧪 اختبار إنشاء idempotency key جديد:');
  const key1 = createPersistentIdempotencyKey(testOrderCode);
  console.log(`  🔑 المفتاح الأول: ${key1}`);
  
  // محاولة إنشاء مفتاح للطلب نفسه مرة أخرى
  const key2 = createPersistentIdempotencyKey(testOrderCode);
  console.log(`  🔑 المفتاح الثاني: ${key2}`);
  
  if (key1 === key2) {
    console.log('✅ نجح! نفس المفتاح تم إرجاعه للطلب نفسه');
  } else {
    console.log('❌ خطأ! مفاتيح مختلفة للطلب نفسه');
  }
}

// تشغيل الاختبار
if (typeof window !== 'undefined') {
  testIdempotencyKey();
}
