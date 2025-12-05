import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, productName, category, description, specifications, product } = await req.json()

    // التحقق من صحة المدخلات
    if (!action) {
      throw new Error('Action is required')
    }

    // التحقق من وجود المعاملات المطلوبة لكل action
    if (['generateDescription', 'generateSpecs', 'categorizeProduct', 'generateTags'].includes(action) && !productName) {
      throw new Error('Product name is required for this action')
    }

    if (action === 'optimizeProduct' && !product) {
      throw new Error('Product data is required for optimization')
    }

    if (action === 'generateCompleteProduct' && !description) {
      throw new Error('Description is required to generate complete product')
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`

    let prompt = ''
    
    switch (action) {
      case 'generateDescription':
        prompt = `أنشئ وصفاً جذاباً ومفصلاً للمنتج ا��تالي:
        اسم المنتج: ${productName}
        الفئة: ${category || ''}
        
        يجب أن يتضمن الوصف:
        - الميزات الرئيسية
        - الفوائد للمستخدم
        - تفاصيل تقنية مفيدة
        - سبب اختيار هذا المنتج
        
        اكتب الوصف باللغة العربية بشكل احترافي وجذاب.`
        break

      case 'generateSpecs':
        prompt = `أنشئ قائمة مواصفات تقنية مفصلة للمنتج التالي:
        اسم المنتج: ${productName}
        نوع المنتج: ${category || ''}
        
        يجب أن تشمل المواصفات:
        - المقاسات والأبعاد
        - المواد المستخدمة
        - الميزات التقنية
        - متطلبات التشغيل
        - الضمان والدعم
        
        اعرض النتيجة كقائمة منظمة باللغة العربية.`
        break

      case 'suggestPrice':
        prompt = `اقترح سعراً مناسباً بالريال السعودي للمنتج التالي:
        اسم المنتج: ${productName}
        الفئة: ${category || ''}
        المواصفات: ${specifications || ''}
        
        أرجع النتيجة بتنسيق JSON:
        {
          "originalPrice": number,
          "discountedPrice": number,
          "marketComparison": "string",
          "priceJustification": "string"
        }`
        break

      case 'generateTags':
        prompt = `أنشئ قائمة من 10-15 كلمة مفتاحية باللغة العربية للمنتج التالي:
        اسم المنتج: ${productName}
        الوصف: ${description || ''}
        
        أرجع النتيجة كقائمة مفصولة بالفواصل.`
        break

      case 'categorizeProduct':
        prompt = `صنف المنتج التالي إلى الفئة المناسبة:
        اسم المنتج: ${productName}
        الوصف: ${description || ''}
        
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
        
        أرجع اسم الفئة فقط باللغة العربية.`
        break

      case 'optimizeProduct':
        prompt = `حسن من قائمة المنتج التالية:
        
        المنتج الحالي:
        الاسم: ${product?.name}
        الوصف: ${product?.description}
        السعر: ${product?.price} ريال
        الفئة: ${product?.category}
        
        أرجع النتيجة بتنسيق JSON:
        {
          "optimizedTitle": "string",
          "optimizedDescription": "string",
          "keySellingPoints": ["string", "string", "string"],
          "callToAction": "string"
        }`
        break

      case 'generateCompleteProduct':
        prompt = `بناءً على وصف المستخدم: "${description}", أنشئ منتجاً كاملاً.
        أرجع النتيجة بتنسيق JSON:
        {
          "name": "اسم المنتج",
          "description": "وصف مفصل",
          "price": 100,
          "discounted_price": 0,
          "stock": 10,
          "category": "الفئة",
          "specifications": "المواصفات"
        }`
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    const response = await fetch(GEMINI_API_URL, {
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
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Gemini API Error')
    }

    const data = await response.json()
    let result = data.candidates[0].content.parts[0].text

    // معالجة خاصة للنتائج JSON
    if (action === 'suggestPrice' || action === 'optimizeProduct' || action === 'generateCompleteProduct') {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        // في حالة فشل تحليل JSON، أرجع نتيجة افتراضية
        if (action === 'suggestPrice') {
          result = {
            originalPrice: 100,
            discountedPrice: 85,
            marketComparison: result,
            priceJustification: "سعر تقديري بناء على تحليل السوق"
          }
        } else if (action === 'optimizeProduct') {
          result = {
            optimizedTitle: product?.name || 'عنوان محسن',
            optimizedDescription: product?.description || 'وصف محسن',
            keySellingPoints: ["جودة عالية", "سعر مناسب", "ضمان موثوق"],
            callToAction: "اطلب الآن واحصل على خصم خاص!"
          }
        } else if (action === 'generateCompleteProduct') {
          result = {
            name: "منتج جديد",
            description: "وصف المنتج",
            price: 100,
            discounted_price: 0,
            stock: 10,
            category: "أخرى",
            specifications: "مواصفات أساسية"
          }
        }
      }
    }

    // معالجة خاصة للكلمات المفتاحية
    if (action === 'generateTags') {
      result = result
        .replace(/[.،؛]/g, ',')
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0)
        .slice(0, 15)
    }

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Gemini API Error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
