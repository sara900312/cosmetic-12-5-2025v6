import { supabase } from './supabaseClient';

class GeminiService {
  constructor() {
    // استخدام Edge Functions بدلاً من استدعاء Gemini مباشرة
    this.edgeFunctionUrl = 'ai-add-product'; // اسم Edge Function
  }

  // دالة مساعدة لاستدعاء Edge Function
  async callEdgeFunction(action, data) {
    try {
      const { data: result, error } = await supabase.functions.invoke(this.edgeFunctionUrl, {
        body: {
          action,
          ...data
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      return result.data;
    } catch (error) {
      console.error('Edge Function Error:', error);
      throw new Error(`فشل في الاتصال بخدمة الذكاء الاصطناعي: ${error.message}`);
    }
  }

  // توليد وصف منتج من اسم المنتج
  async generateProductDescription(productName, category = '') {
    return await this.callEdgeFunction('generateDescription', {
      productName,
      category
    });
  }

  // توليد مواصفات المنتج
  async generateProductSpecs(productName, productType) {
    return await this.callEdgeFunction('generateSpecs', {
      productName,
      category: productType
    });
  }

  // اقتراح سعر للمنتج
  async suggestProductPrice(productName, category, specifications = '') {
    return await this.callEdgeFunction('suggestPrice', {
      productName,
      category,
      specifications
    });
  }

  // إنشاء كلمات مفتاحية للمنتج
  async generateProductTags(productName, description) {
    return await this.callEdgeFunction('generateTags', {
      productName,
      description
    });
  }

  // تحسين وصف منتج موجود
  async optimizeProductListing(product) {
    return await this.callEdgeFunction('optimizeProduct', {
      product
    });
  }

  // تصنيف المنتج تلقائياً
  async categorizeProduct(productName, description) {
    return await this.callEdgeFunction('categorizeProduct', {
      productName,
      description
    });
  }
}

export default new GeminiService();
