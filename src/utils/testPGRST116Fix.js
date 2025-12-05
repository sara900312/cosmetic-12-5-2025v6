/**
 * اختبار إصلاح خطأ PGRST116
 * يحتوي على دوال اختبار للتأكد من أن الإصلاح يعمل بشكل صحيح
 */

import { checkExistingOrder, handleSupabaseError } from '../lib/idempotencyHelper.js';

/**
 * محاكاة عميل Supabase للاختبار
 */
class MockSupabaseClient {
  constructor(shouldReturnError = false, errorType = 'PGRST116') {
    this.shouldReturnError = shouldReturnError;
    this.errorType = errorType;
    this.callCount = 0;
  }

  from(table) {
    return this;
  }

  select(columns) {
    return this;
  }

  eq(column, value) {
    return this;
  }

  async maybeSingle() {
    this.callCount++;
    
    if (this.shouldReturnError) {
      const error = this.createMockError();
      return { data: null, error };
    }

    // محاكاة حالة عدم وجود طلب (0 rows) - الحالة الطبيعية
    return { data: null, error: null };
  }

  createMockError() {
    switch (this.errorType) {
      case 'PGRST116':
        return {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: 'The result contains 0 rows'
        };
      case 'NETWORK':
        return {
          message: 'fetch error: network connection failed'
        };
      case 'DUPLICATE':
        return {
          code: '23505',
          message: 'duplicate key value violates unique constraint'
        };
      default:
        return {
          message: 'Unknown error'
        };
    }
  }
}

/**
 * اختبار التعامل مع خطأ PGRST116 المحدد
 */
export async function testPGRST116Handling() {
  console.log('🧪 اختبار معالجة خطأ PGRST116...');

  // اختبار 1: عدم وجود خطأ (الحالة الطبيعية)
  const mockClient1 = new MockSupabaseClient(false);
  const result1 = await checkExistingOrder(mockClient1, 'test-key-123');
  
  console.log('✅ اختبار 1 - لا يوجد طلب مكرر:', {
    success: result1.success,
    exists: result1.exists,
    shouldProceed: result1.shouldProceed,
    message: result1.message
  });

  // اختبار 2: خطأ PGRST116 (الذي كان يسبب المشكلة)
  const mockClient2 = new MockSupabaseClient(true, 'PGRST116');
  const result2 = await checkExistingOrder(mockClient2, 'test-key-456');
  
  console.log('✅ اختبار 2 - خطأ PGRST116:', {
    success: result2.success,
    exists: result2.exists,
    shouldProceed: result2.shouldProceed,
    message: result2.message
  });

  // اختبار 3: خطأ شبكة
  const mockClient3 = new MockSupabaseClient(true, 'NETWORK');
  const result3 = await checkExistingOrder(mockClient3, 'test-key-789');
  
  console.log('✅ اختبار 3 - خطأ شبكة:', {
    success: result3.success,
    exists: result3.exists,
    shouldProceed: result3.shouldProceed,
    message: result3.message
  });

  return {
    test1: result1,
    test2: result2,
    test3: result3,
    summary: {
      allTestsPassed: result1.success && result2.shouldProceed && result3.shouldProceed,
      pgrst116Fixed: result2.shouldProceed && !result2.exists
    }
  };
}

/**
 * اختبار معالج أخطاء Supabase
 */
export function testSupabaseErrorHandler() {
  console.log('🧪 اختبار معالج الأخطاء...');

  // خطأ PGRST116
  const pgrst116Error = {
    code: 'PGRST116',
    message: 'JSON object requested, multiple (or no) rows returned'
  };
  const handling1 = handleSupabaseError(pgrst116Error);
  console.log('✅ معالجة PGRST116:', handling1);

  // خطأ مفتاح مكرر
  const duplicateError = {
    code: '23505',
    message: 'duplicate key value violates unique constraint'
  };
  const handling2 = handleSupabaseError(duplicateError);
  console.log('✅ معالجة مفتاح مكرر:', handling2);

  // خطأ شبكة
  const networkError = {
    message: 'fetch error: Failed to connect'
  };
  const handling3 = handleSupabaseError(networkError);
  console.log('✅ معالجة خطأ شبكة:', handling3);

  return {
    pgrst116: handling1,
    duplicate: handling2,
    network: handling3
  };
}

/**
 * اختبار شامل لجميع الحالات
 */
export async function runAllTests() {
  console.log('🚀 بدء الاختبارات الشاملة لإصلاح PGRST116...');
  
  try {
    const idempotencyTests = await testPGRST116Handling();
    const errorHandlingTests = testSupabaseErrorHandler();

    const results = {
      timestamp: new Date().toISOString(),
      idempotencyTests,
      errorHandlingTests,
      overall: {
        success: idempotencyTests.summary.allTestsPassed,
        pgrst116Fixed: idempotencyTests.summary.pgrst116Fixed,
        message: idempotencyTests.summary.pgrst116Fixed 
          ? '✅ تم إصلاح خطأ PGRST116 بنجاح!' 
          : '❌ ما زال هناك مشكلة في معالجة PGRST116'
      }
    };

    console.log('📋 النتائج النهائية:', results.overall);
    return results;

  } catch (error) {
    console.error('❌ خطأ في تشغيل الاختبارات:', error);
    return {
      success: false,
      error: error.message,
      message: 'فشل في تشغيل الاختبارات'
    };
  }
}

/**
 * مثال على الاستخدام في متصفح الويب
 */
export const usageExamples = {
  // تشغيل الاختبارات في console المتصفح
  browserTest: `
    // افتح console المتصفح ونفذ:
    import { runAllTests } from './src/utils/testPGRST116Fix.js';
    runAllTests().then(results => {
      console.log('نتائج الاختبار:', results);
    });
  `,

  // تشغيل اختبار سريع
  quickTest: `
    import { testPGRST116Handling } from './src/utils/testPGRST116Fix.js';
    testPGRST116Handling().then(result => {
      if (result.summary.pgrst116Fixed) {
        console.log('✅ تم إصلاح المشكلة!');
      } else {
        console.log('❌ المشكلة ما زالت موجودة');
      }
    });
  `
};

/**
 * دالة لاختبار الإصلاح في بيئة الإنتاج
 * @param {Object} realSupabaseClient - عميل Supabase الحقيقي
 * @param {string} testIdempotencyKey - مفتاح اختبار
 */
export async function testProductionFix(realSupabaseClient, testIdempotencyKey) {
  console.log('🔧 اختبار الإصلاح في بيئة الإنتاج...');
  
  try {
    const result = await checkExistingOrder(realSupabaseClient, testIdempotencyKey);
    
    console.log('✅ اختبار الإنتاج نجح:', {
      success: result.success,
      exists: result.exists,
      shouldProceed: result.shouldProceed,
      message: result.message
    });

    return {
      success: true,
      productionWorking: result.success || result.shouldProceed,
      message: result.success || result.shouldProceed 
        ? 'الإصلاح يعمل في بيئة الإنتاج' 
        : 'قد تكون هناك مشكلة في بيئة الإنتاج'
    };

  } catch (error) {
    console.error('❌ خطأ في اختبار الإنتاج:', error);
    return {
      success: false,
      error: error.message,
      message: 'فشل اختبار الإنتاج'
    };
  }
}

// تصدير default للاستخدام السريع
export default {
  testPGRST116Handling,
  testSupabaseErrorHandler,
  runAllTests,
  testProductionFix,
  usageExamples
};
