import { createClient } from 'npm:@supabase/supabase-js@2.42.0';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!body.customer_name || !body.customer_phone || !body.idempotency_key) {
      return new Response(JSON.stringify({ error: 'Missing required fields: customer_name, customer_phone, or idempotency_key' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // تحديد نوع الشحن بناءً على fast_shipping parameter أو shipping_type للتوافق العكسي
    const isFastShipping = body.fast_shipping === true || body.shipping_type === 'fast';
    const shippingType = isFastShipping ? 'fast' : 'unified';
    const createdOrders = [];

    // إنشاء order_code إذا لم يتم توفيره
    const finalOrderCode = body.order_code || `ORDER-${Date.now().toString().slice(-6)}`;

    // تحقق من وجود طلب سابق - فقط للشحن الموحد
    // للشحن السريع: تجاهل الفحص لضمان إنشاء طلبات مستقلة جديدة
    if (!isFastShipping) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('idempotency_key', body.idempotency_key)
        .maybeSingle();

      if (existingOrder) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Order already exists',
          orders: [existingOrder],
        }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    } else {
      console.log('🚀 الشحن السريع: تجاهل فحص الطلبات المكررة لضمان الاستقلالية الكاملة');
    }

    if (shippingType === 'fast') {
      // الشحن السريع: إنشاء طلب منفصل لكل منتج حسب متجره الخاص
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        
        // استخراج اسم المتجر من البيانات النصية فقط (بدون UUID)
        let storeName = 'متجر افتراضي';
        if (item.main_store_name) {
          storeName = item.main_store_name;
        } else if (item.main_store) {
          storeName = item.main_store;
        }

        // إنشاء كود طلب فرعي للشحن السريع
        const fastOrderCode = body.items.length > 1 ? `${finalOrderCode}-${i + 1}` : finalOrderCode;

        // إنشاء idempotency_key فريد ومستقل لكل طلب سريع
        const uniqueIdempotencyKey = `fast-${Date.now()}-${crypto.randomUUID()}-${i}`;

        // التحقق من عدم وجود طلب سابق بنفس المفتاح (للأمان الإضافي)
        const { data: existingFastOrder } = await supabase
          .from('orders')
          .select('order_code')
          .eq('idempotency_key', uniqueIdempotencyKey)
          .maybeSingle();

        if (existingFastOrder) {
          console.warn(`⚠️ طلب سريع موجود مسبقاً مع المفتاح: ${uniqueIdempotencyKey}`);
          continue; // تجاهل هذا الطلب والانتقال للتالي
        }

        // إنشاء الطلب بدون أي حقول UUID
        const { data: newOrder, error: insertError } = await supabase.from('orders').insert({
          customer_name: body.customer_name,
          customer_phone: body.customer_phone,
          customer_address: body.customer_address,
          customer_city: body.customer_city,
          customer_notes: body.customer_notes,
          subtotal: item.price * item.quantity,
          delivery_cost: body.delivery_cost || 0,
          total_amount: (item.price * item.quantity) + (body.delivery_cost || 0),
          discounted_price: item.discounted_price ? (item.discounted_price * item.quantity) : null,
          order_code: fastOrderCode,
          order_status: 'pending',
          main_store_name: storeName,
          idempotency_key: uniqueIdempotencyKey,
          shipping_type: 'fast',
        }).select().single();

        if (insertError || !newOrder) throw insertError ?? new Error('Error inserting fast shipping order');

        // إضافة عنصر الطلب
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discounted_price: item.discounted_price ?? null,
          product_name: item.product_name,
          main_store_name: storeName,
        });

        createdOrders.push(newOrder);

        console.log(`✅ تم إنشاء طلب سريع مستقل للمنتج "${item.product_name}" من متجر "${storeName}": ${fastOrderCode}`);
      }
    } else {
      // الشحن الموحد: جميع المنتجات في طلب واحد
      const { data: newOrder, error: insertError } = await supabase.from('orders').insert({
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_address: body.customer_address,
        customer_city: body.customer_city,
        customer_notes: body.customer_notes,
        subtotal: body.subtotal || body.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
        delivery_cost: body.delivery_cost || 0,
        total_amount: body.total_amount || ((body.subtotal || body.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0) + (body.delivery_cost || 0)),
        discounted_price: body.discounted_price ?? null,
        order_code: finalOrderCode,
        order_status: 'pending',
        main_store_name: body.main_store_name || 'متجر افتراضي',
        idempotency_key: body.idempotency_key,
        shipping_type: 'unified',
      }).select().single();

      if (insertError || !newOrder) throw insertError ?? new Error('Error inserting unified order');

      // إضافة جميع عناصر الطلب بدون الاعتماد على UUID
      const itemsPayload = body.items.map((item) => {
        // استخراج اسم المتجر من البيانات النصية فقط
        let storeName = 'متجر افتراضي';
        if (item.main_store_name) {
          storeName = item.main_store_name;
        } else if (item.main_store) {
          storeName = item.main_store;
        }
        
        return {
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discounted_price: item.discounted_price ?? null,
          product_name: item.product_name,
          main_store_name: storeName,
        };
      });

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      createdOrders.push(newOrder);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Orders created successfully with ${shippingType} shipping`,
      shipping_type: shippingType,
      orders_count: createdOrders.length,
      orders: createdOrders,
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Unknown server error' 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
