import { supabase } from './supabaseClient';

// دالة لاختبار Edge Function
export async function testGeminiEdgeFunction() {
  try {
    console.log('اختبار Edge Function...');
    
    // اختبار توليد وصف منتج
    const { data: result, error } = await supabase.functions.invoke('ai-add-product', {
      body: {
        action: 'generateDescription',
        productName: 'ساعة ذكية',
        category: 'إلكترونيات'
      }
    });

    if (error) {
      console.error('خطأ في Edge Function:', error);
      return { success: false, error: error.message };
    }

    console.log('نتيجة Edge Function:', result);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('خطأ في الاختبار:', error);
    return { success: false, error: error.message };
  }
}

// دالة لاختبار توليد منتج كامل
export async function testCompleteProductGeneration(description) {
  try {
    console.log('اختبار توليد منتج كامل...');
    
    const { data: result, error } = await supabase.functions.invoke('ai-add-product', {
      body: {
        action: 'generateCompleteProduct',
        description: description
      }
    });

    if (error) {
      console.error('خطأ في توليد المنتج:', error);
      return { success: false, error: error.message };
    }

    console.log('المنتج المولد:', result);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('خطأ في توليد المنتج:', error);
    return { success: false, error: error.message };
  }
}
