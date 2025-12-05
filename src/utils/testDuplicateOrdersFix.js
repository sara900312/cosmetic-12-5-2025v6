/**
 * اختبار حل مشكلة تكرار الطلبات
 * يتحقق من أن الطلبات لا تُنشأ مرتين
 */

/**
 * فحص قاعدة البيانات للطلبات المكررة
 * @param {Object} supabase - عميل Supabase
 * @param {string} orderCode - رقم الطلب للفحص
 * @returns {Promise<Object>} نتيجة الفحص
 */
export async function checkForDuplicateOrders(supabase, orderCode) {
  try {
    console.log(`🔍 فحص الطلبات المكررة للرقم: ${orderCode}`);

    // البحث عن طلبات بنفس الرقم
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_code, created_at, shipping_type')
      .eq('order_code', orderCode);

    if (error) {
      console.error('❌ خطأ في فحص الطلبات:', error);
      return {
        success: false,
        error: error.message,
        hasDuplicates: false
      };
    }

    const orderCount = orders?.length || 0;
    console.log(`📊 عدد الطلبات الموجودة بالرقم ${orderCode}: ${orderCount}`);

    // فحص العناصر لكل طلب
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('id, product_id, product_name, quantity, price')
          .eq('order_id', order.id);

        return {
          ...order,
          items: items || [],
          itemsCount: (items || []).length,
          itemsError: itemsError
        };
      })
    );

    // تحليل النتائج
    const analysis = {
      totalOrders: orderCount,
      hasDuplicates: orderCount > 1,
      orders: ordersWithItems,
      duplicateType: orderCount > 1 ? (ordersWithItems.every(o => o.shipping_type === 'fast') ? 'fast_shipping' : 'mixed') : 'none'
    };

    console.log('📋 تحليل الطلبات:', analysis);

    return {
      success: true,
      analysis,
      hasDuplicates: analysis.hasDuplicates,
      message: analysis.hasDuplicates 
        ? `⚠️ وُجد ${orderCount} طلب مكرر!` 
        : '✅ لا توجد طلبات مكررة'
    };

  } catch (error) {
    console.error('❌ خطأ في فحص الطلبات المكررة:', error);
    return {
      success: false,
      error: error.message,
      hasDuplicates: false
    };
  }
}

/**
 * مراقبة إنشاء طلب جديد للتأكد من عدم التكرار
 * @param {Object} supabase - عميل Supabase
 * @param {string} orderCode - رقم الطلب الجديد
 * @param {number} expectedCount - العدد المتوقع للطلبات
 * @returns {Promise<Object>} نتيجة المراقبة
 */
export async function monitorOrderCreation(supabase, orderCode, expectedCount = 1) {
  console.log(`👀 مراقبة إنشاء الطلب: ${orderCode} (متوقع: ${expectedCount} طلب)`);

  // انتظار قليل للسماح لعملية الإنشاء بالاكتمال
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = await checkForDuplicateOrders(supabase, orderCode);

  if (result.success) {
    const actualCount = result.analysis.totalOrders;
    const isCorrect = actualCount === expectedCount;

    return {
      success: true,
      isCorrect,
      expectedCount,
      actualCount,
      message: isCorrect 
        ? `✅ العدد صحيح: ${actualCount} طلب` 
        : `❌ العدد خاطئ: متوقع ${expectedCount} لكن وُجد ${actualCount}`,
      analysis: result.analysis
    };
  }

  return result;
}

/**
 * اختبار شامل لحل مشكلة التكرار
 * @param {Object} supabase - عميل Supabase
 * @param {Array} recentOrderCodes - أرقام طلبات حديثة للفحص
 * @returns {Promise<Object>} نتيجة الاختبار الشامل
 */
export async function testDuplicateOrdersFix(supabase, recentOrderCodes = []) {
  console.log('🧪 بدء اختبار شامل لحل مشكلة تكرار الطلبات...');

  const results = {
    timestamp: new Date().toISOString(),
    testedOrders: [],
    summary: {
      totalTested: 0,
      duplicatesFound: 0,
      cleanOrders: 0,
      fixWorking: false
    }
  };

  // فحص الطلبات المُمررة
  for (const orderCode of recentOrderCodes) {
    const check = await checkForDuplicateOrders(supabase, orderCode);
    
    results.testedOrders.push({
      orderCode,
      ...check
    });

    results.summary.totalTested++;
    if (check.hasDuplicates) {
      results.summary.duplicatesFound++;
    } else {
      results.summary.cleanOrders++;
    }
  }

  // إذا لم يتم تمرير أرقام طلبات، ابحث عن أحدث الطلبات
  if (recentOrderCodes.length === 0) {
    try {
      const { data: recentOrders, error } = await supabase
        .from('orders')
        .select('order_code, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && recentOrders) {
        console.log(`🔍 فحص آخر ${recentOrders.length} طلب...`);
        
        for (const order of recentOrders) {
          const check = await checkForDuplicateOrders(supabase, order.order_code);
          
          results.testedOrders.push({
            orderCode: order.order_code,
            createdAt: order.created_at,
            ...check
          });

          results.summary.totalTested++;
          if (check.hasDuplicates) {
            results.summary.duplicatesFound++;
          } else {
            results.summary.cleanOrders++;
          }
        }
      }
    } catch (error) {
      console.error('❌ خطأ في جلب الطلبات الحديثة:', error);
    }
  }

  // تحديد ما إذا كان الحل يعمل
  results.summary.fixWorking = results.summary.duplicatesFound === 0;

  // طباعة النتائج
  console.log('���� نتائج اختبار حل التكرار:');
  console.log(`- إجمالي الطلبات المفحوصة: ${results.summary.totalTested}`);
  console.log(`- طلبات مكررة: ${results.summary.duplicatesFound}`);
  console.log(`- طلبات نظيفة: ${results.summary.cleanOrders}`);
  console.log(`- حالة الحل: ${results.summary.fixWorking ? '✅ يعمل' : '❌ لا يعمل'}`);

  return results;
}

/**
 * فحص سريع لآخر طلب تم إنشاؤه
 * @param {Object} supabase - عميل Supabase
 * @returns {Promise<Object>} نتيجة الفحص السريع
 */
export async function quickDuplicateCheck(supabase) {
  try {
    console.log('⚡ فحص سريع لآخر طلب...');

    // جلب آخر طلب
    const { data: lastOrder, error } = await supabase
      .from('orders')
      .select('order_code, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastOrder) {
      return {
        success: false,
        message: 'لا يوجد طلبات للفحص',
        error: error?.message
      };
    }

    const result = await checkForDuplicateOrders(supabase, lastOrder.order_code);
    
    console.log(`⚡ نتيجة الفحص السريع للطلب ${lastOrder.order_code}:`, 
                result.hasDuplicates ? '❌ مكرر' : '✅ نظيف');

    return {
      success: true,
      orderCode: lastOrder.order_code,
      createdAt: lastOrder.created_at,
      isDuplicate: result.hasDuplicates,
      analysis: result.analysis,
      message: result.message
    };

  } catch (error) {
    console.error('❌ خطأ في الفحص السريع:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * مثال على الاستخدام في console المتصفح
 */
export const usageExamples = {
  // فحص طلب محدد
  checkSpecificOrder: `
    import { checkForDuplicateOrders } from './src/utils/testDuplicateOrdersFix.js';
    checkForDuplicateOrders(supabase, 'ORDER-12345').then(console.log);
  `,

  // فحص سريع
  quickCheck: `
    import { quickDuplicateCheck } from './src/utils/testDuplicateOrdersFix.js';
    quickDuplicateCheck(supabase).then(console.log);
  `,

  // اختبار شامل
  fullTest: `
    import { testDuplicateOrdersFix } from './src/utils/testDuplicateOrdersFix.js';
    testDuplicateOrdersFix(supabase).then(results => {
      if (results.summary.fixWorking) {
        console.log('✅ حل التكرار يعمل بنجاح!');
      } else {
        console.log('❌ ما زالت هناك مشكلة في التكرار');
      }
    });
  `,

  // مراقبة طلب جديد
  monitorNew: `
    import { monitorOrderCreation } from './src/utils/testDuplicateOrdersFix.js';
    // بعد إنشاء طلب جديد
    monitorOrderCreation(supabase, 'NEW-ORDER-123', 1).then(console.log);
  `
};

// تصدير default للاستخدام السريع
export default {
  checkForDuplicateOrders,
  monitorOrderCreation,
  testDuplicateOrdersFix,
  quickDuplicateCheck,
  usageExamples
};
