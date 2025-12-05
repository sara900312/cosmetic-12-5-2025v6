import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// إعدادات CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface GeminiRequest {
  action: string;
  productName?: string;
  category?: string;
  description?: string;
  specifications?: string;
  price?: number;
  product?: any;
}

interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// تكوين Gemini API
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';

// دالة لإرسال طلب إلى Gemini
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API Error');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// توليد وصف منتج
async function generateProductDescription(productName: string, category: string = ''): Promise<string> {
  const prompt = `
    أنشئ وصفاً جذاباً ومفصلاً للمنتج التالي:
    اسم المنتج: ${productName}
    الفئة: ${category}
    
    يجب أن يتضمن الوصف:
    - الميزات الرئيسية
    - الفوائد للمستخدم
    - تفاصيل تقنية مفيدة
    - سبب اختيار هذا المنتج
    
    اكتب الوصف باللغة العربية بشكل احترافي وجذاب.
  `;

  return await callGemini(prompt);
}

// توليد مواصفات المنتج
async function generateProductSpecs(productName: string, productType: string): Promise<string> {
  const prompt = `
    أنشئ قائمة مواصفات تقنية مفصلة للمنتج التالي:
    اسم المنتج: ${productName}
    نوع المنتج: ${productType}
    
    يجب أن تشمل المواصفات (حسب نوع المنتج):
    - المقاسات والأبعاد
    - المواد المستخدمة
    - الميزات التقنية
    - متطلبات التشغيل
    - الضمان والدعم
    
    اعرض النتيجة كقائمة منظمة باللغة العربية.
  `;

  return await callGemini(prompt);
}

// اقتراح سعر للمنتج
async function suggestProductPrice(productName: string, category: string, specifications: string = ''): Promise<any> {
  const prompt = `
    اقترح سعراً مناسباً بالريال السعودي للمنتج التالي:
    اسم المنتج: ${productName}
    الفئة: ${category}
    المواصفات: ${specifications}
    
    قدم:
    1. السعر المقترح
    2. السعر بعد الخصم (خصم 15%)
    3. مقارنة مع منتجات مماثلة في السوق
    4. مبرر للسعر
    
    أرجع النتيجة بتنسيق JSON مع المفاتيح التالية:
    {
      "originalPrice": number,
      "discountedPrice": number,
      "marketComparison": "string",
      "priceJustification": "string"
    }
  `;

  const response = await callGemini(prompt);
  
  // محاولة استخراج JSON من النص
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // fallback
    }
  }
  
  // إذا لم يكن JSON، أرجع تنسيق افتراضي
  return {
    originalPrice: 100,
    discountedPrice: 85,
    marketComparison: response,
    priceJustification: "سعر تقديري بناء على تحليل السوق"
  };
}

// إنشاء كلمات مفتاحية للمنتج
async function generateProductTags(productName: string, description: string): Promise<string[]> {
  const prompt = `
    أنشئ قائمة من 10-15 كلمة مفتاحية باللغة العربية للمنتج التالي:
    اسم المنتج: ${productName}
    الوصف: ${description}
    
    يجب أن تشمل الكلمات المفتاحية:
    - كلمات متعلقة بالمنتج مباشرة
    - كلمات بحثية شائعة
    - فئات وتصنيفات
    - استخدامات المنتج
    
    أرجع النتيجة كقائمة مفصولة بالفواصل.
  `;

  const response = await callGemini(prompt);
  const tags = response
    .replace(/[.،؛]/g, ',')
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 15);
  
  return tags;
}

// تحسين وصف منتج موجود
async function optimizeProductListing(product: any): Promise<any> {
  const prompt = `
    حسن من قائمة المنتج التالية لجعلها أكثر جاذبية للمتسوقين:
    
    المنتج الحالي:
    الاسم: ${product.name}
    الوصف: ${product.description}
    السعر: ${product.price} ريال
    الفئة: ${product.category}
    
    قدم اقتراحات لـ:
    1. عنوان أكثر ج��ذبية
    2. وصف محسن ومُحسَّن للـ SEO
    3. نقاط بيع رئيسية
    4. دعوة للعمل جذابة
    
    أرجع النتيجة بتنسيق JSON:
    {
      "optimizedTitle": "string",
      "optimizedDescription": "string",
      "keySellingPoints": ["string", "string", "string"],
      "callToAction": "string"
    }
  `;

  const response = await callGemini(prompt);
  
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // fallback
    }
  }
  
  return {
    optimizedTitle: product.name,
    optimizedDescription: product.description,
    keySellingPoints: ["جودة عالية", "سعر مناسب", "ضمان موثوق"],
    callToAction: "اطلب الآن واحصل على خصم خاص!"
  };
}

// تصنيف المنتج تلقائياً
async function categorizeProduct(productName: string, description: string): Promise<string> {
  const prompt = `
    صنف المنتج التالي إلى الفئة المناسبة:
    اسم المنتج: ${productName}
    الوصف: ${description}
    
    الفئات المتاحة:
    - إلكترونيات
    - أزياء وملابس
    - المنزل والحديقة
    - الصحة والجمال
    - الرياضة واللياقة
    - الكتب والتعليم
    - الألعاب والترفيه
    - السيارات
    - الطعام والمشروبات
    - أخرى
    
    أرجع اسم الفئة فقط باللغة العربية.
  `;

  const response = await callGemini(prompt);
  return response.trim();
}

// إنشاء منتج كامل من وصف مختصر
async function generateCompleteProduct(prompt: string): Promise<any> {
  const generationPrompt = `
    بناءً على وصف المستخدم: "${prompt}", أنشئ منتجاً كاملاً.
    استخرج/ولد الحقول التالية في تنسيق JSON صالح:
    - name: اسم منتج مختصر ووصفي
    - description: وصف مفصل للمنتج. إذا قدم المستخدم اسماً فقط، ولد وصفاً كاملاً
    - price: سعر مقترح كرقم، بدون رموز عملة
    - discounted_price: مقدار خصم اختياري (0 إذا لم يكن هناك خصم)
    - stock: كمية مقترحة كرقم
    - category: فئة مناسبة من الفئات المتاحة
    - specifications: مواصفات تقنية مفصلة
    
    أرجع فقط كائن JSON.
  `;

  const response = await callGemini(generationPrompt);
  
  // تنظيف النص واستخراج JSON
  let text = response.replace(/```json|```/g, '').trim();
  
  try {
    const productData = JSON.parse(text);
    
    // التحقق من وجود الحقول المطلوبة
    if (!productData.name || !productData.price || !productData.stock) {
      throw new Error("البيانات المطلوبة غير مكتملة");
    }
    
    return productData;
  } catch (e) {
    throw new Error("فشل في تحليل البيانات المولدة");
  }
}

serve(async (req) => {
  // التعامل مع CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestData: GeminiRequest = await req.json()
    const { action } = requestData

    let result: any;

    switch (action) {
      case 'generateDescription':
        result = await generateProductDescription(
          requestData.productName!, 
          requestData.category || ''
        );
        break;

      case 'generateSpecs':
        result = await generateProductSpecs(
          requestData.productName!, 
          requestData.category || ''
        );
        break;

      case 'suggestPrice':
        result = await suggestProductPrice(
          requestData.productName!, 
          requestData.category || '', 
          requestData.specifications || ''
        );
        break;

      case 'generateTags':
        result = await generateProductTags(
          requestData.productName!, 
          requestData.description || ''
        );
        break;

      case 'optimizeProduct':
        result = await optimizeProductListing(requestData.product!);
        break;

      case 'categorizeProduct':
        result = await categorizeProduct(
          requestData.productName!, 
          requestData.description || ''
        );
        break;

      case 'generateCompleteProduct':
        result = await generateCompleteProduct(requestData.description!);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response: GeminiResponse = {
      success: true,
      data: result
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    const response: GeminiResponse = {
      success: false,
      error: error.message
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
