/**
 * مثال عملي على استخدام النظام الجديد للطلبات
 * يوضح كيفية حفظ الطلبات وجلبها مع العناصر المرتبطة
 */

import { fetchOrdersWithItems, fetchOrderByCodeWithItems, getOrdersStatistics } from '../lib/ordersFetcher.js';

/**
 * مثال شامل لاختبار النظام الجديد
 */
export class OrdersSystemExample {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * اختبار إنشاء طلب شحن سريع
   */
  async testFastShippingOrder() {
    console.log('🚀 اختبار إنشاء طلب شحن سريع...');

    const orderData = {
      order_code: `FAST-${Date.now()}`,
      customer_name: 'أحمد محمد',
      customer_phone: '07701234567',
      customer_address: 'بغداد - الكرادة',
      customer_city: 'بغداد',
      customer_notes: 'تسليم سريع من فضلك',
      shipping_type: 'fast',
      subtotal: 250000,
      discounted_price: 50000,
      total_amount: 200000,
      order_status: 'pending',
      idempotency_key: `fast-${Date.now()}-${crypto.randomUUID()}`
    };

    try {
      // إنشاء الطلب
      const { data: orderResult, error: orderError } = await this.supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (orderError) throw orderError;

      const orderId = orderResult[0].id;
      console.log('✅ تم إنشاء الطلب:', orderResult[0]);

      // إضافة العناصر
      const orderItems = [
        {
          order_id: orderId,
          product_id: 1,
          name: 'لابتوب ديل',
          name_en: 'Dell Laptop',
          quantity: 1,
          price: 150000,
          discounted_price: 120000,
          main_store: 'متجر الكمبيوتر'
        },
        {
          order_id: orderId,
          product_id: 2,
          name: 'ماوس لاسلكي',
          name_en: 'Wireless Mouse',
          quantity: 2,
          price: 50000,
          discounted_price: 40000,
          main_store: 'متجر الإكسسوارات'
        }
      ];

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      console.log('✅ تم إضافة عناصر الطلب بنجاح');
      return orderData.order_code;

    } catch (error) {
      console.error('❌ خطأ في إنشاء طلب الشحن السريع:', error);
      throw error;
    }
  }

  /**
   * اختبار إنشاء طلب شحن موحد
   */
  async testUnifiedShippingOrder() {
    console.log('📦 اختبار إنشاء طلب شحن موحد...');

    const orderData = {
      order_code: `UNIFIED-${Date.now()}`,
      customer_name: 'فاطمة علي',
      customer_phone: '07789876543',
      customer_address: 'البصرة - العشار',
      customer_city: 'محافظات أخرى',
      customer_notes: 'توصيل عادي',
      shipping_type: 'unified',
      subtotal: 180000,
      discounted_price: 20000,
      total_amount: 160000,
      order_status: 'pending',
      idempotency_key: `unified-${Date.now()}-${crypto.randomUUID()}`
    };

    try {
      // إنشاء الطلب
      const { data: orderResult, error: orderError } = await this.supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (orderError) throw orderError;

      const orderId = orderResult[0].id;
      console.log('✅ تم إنشاء الطلب الموحد:', orderResult[0]);

      // إضافة العناصر من متاجر متعددة في طلب واحد
      const orderItems = [
        {
          order_id: orderId,
          product_id: 3,
          name: 'هاتف سامسونج',
          name_en: 'Samsung Phone',
          quantity: 1,
          price: 120000,
          discounted_price: 110000,
          main_store: 'متجر الهواتف'
        },
        {
          order_id: orderId,
          product_id: 4,
          name: 'سماعات بلوتوث',
          name_en: 'Bluetooth Headphones',
          quantity: 1,
          price: 60000,
          discounted_price: 50000,
          main_store: 'متجر الصوتيات'
        }
      ];

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      console.log('✅ تم إضافة عناصر الطلب الموحد بنجاح');
      return orderData.order_code;

    } catch (error) {
      console.error('❌ خطأ في إنشاء طلب الشحن الموحد:', error);
      throw error;
    }
  }

  /**
   * اختبار جلب الطلبات مع العناصر
   */
  async testFetchOrdersWithItems() {
    console.log('📋 اختبار جلب الطلبات مع العناصر...');

    try {
      // جلب جميع الطلبات
      const allOrders = await fetchOrdersWithItems(this.supabase);
      console.log(`✅ تم جلب ${allOrders.length} طلبات:`);
      
      allOrders.forEach(order => {
        console.log(`📦 الطلب ${order.order_code}:`);
        console.log(`   - نوع الشحن: ${order.shipping_type}`);
        console.log(`   - العميل: ${order.customer_name}`);
        console.log(`   - المبلغ: ${order.total_amount}`);
        console.log(`   - عدد العناصر: ${order.order_items.length}`);
        
        order.order_items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.product_name} - الكمية: ${item.quantity} - المتجر: ${item.main_store}`);
        });
        console.log('---');
      });

      return allOrders;

    } catch (error) {
      console.error('❌ خطأ في جلب الطلبات:', error);
      throw error;
    }
  }

  /**
   * اختبار جلب طلب محدد
   */
  async testFetchSpecificOrder(orderCode) {
    console.log(`🔍 اختبار جلب الطلب المحدد: ${orderCode}`);

    try {
      const order = await fetchOrderByCodeWithItems(this.supabase, orderCode);
      
      if (order) {
        console.log('✅ تم العثور على الطلب:');
        console.log(`📦 الطلب ${order.order_code}:`);
        console.log(`   - العميل: ${order.customer_name} (${order.customer_phone})`);
        console.log(`   - العنوان: ${order.customer_address}`);
        console.log(`   - نوع الشحن: ${order.shipping_type}`);
        console.log(`   - المبلغ الإجمالي: ${order.total_amount}`);
        console.log(`   - العناصر (${order.order_items.length}):`);
        
        order.order_items.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.product_name}`);
          console.log(`        الكمية: ${item.quantity}`);
          console.log(`        السعر: ${item.price}`);
          console.log(`        السعر المخفض: ${item.discounted_price || 'بدون خصم'}`);
          console.log(`        المتجر: ${item.main_store}`);
        });
        
        return order;
      } else {
        console.log('❌ لم يتم العثور على الطلب');
        return null;
      }

    } catch (error) {
      console.error('❌ خطأ في جلب الطلب المحدد:', error);
      throw error;
    }
  }

  /**
   * اختبار الإحصائيات
   */
  async testOrdersStatistics() {
    console.log('📊 اختبار إحصائيات الطلبات...');

    try {
      const stats = await getOrdersStatistics(this.supabase);
      
      console.log('✅ إحصائيات الطلبات:');
      console.log(`📦 إجمالي الطلبات: ${stats.totalOrders}`);
      console.log(`🚀 طلبات الشحن السريع: ${stats.fastShippingOrders}`);
      console.log(`📦 طلبات الشحن الموحد: ${stats.unifiedShippingOrders}`);
      console.log(`⏳ طلبات معلقة: ${stats.pendingOrders}`);
      console.log(`📋 إجمالي العناصر: ${stats.totalItems}`);
      console.log(`💰 إجمالي المبلغ: ${stats.totalAmount.toLocaleString()} دينار`);
      console.log(`📈 متوسط قيمة الطلب: ${Math.round(stats.averageOrderValue).toLocaleString()} دينار`);

      return stats;

    } catch (error) {
      console.error('❌ خطأ في جلب الإحصائيات:', error);
      throw error;
    }
  }

  /**
   * تشغيل جميع الاختبارات
   */
  async runAllTests() {
    console.log('🧪 بدء تشغيل جميع اختبارات النظام الجديد...\n');

    try {
      // إنشاء طلبات تجريبية
      const fastOrderCode = await this.testFastShippingOrder();
      console.log('\n');
      
      const unifiedOrderCode = await this.testUnifiedShippingOrder();
      console.log('\n');

      // اختبار جلب الطلبات
      await this.testFetchOrdersWithItems();
      console.log('\n');

      // اختبار جلب طلب محدد
      await this.testFetchSpecificOrder(fastOrderCode);
      console.log('\n');

      // اختبار الإحصائيات
      await this.testOrdersStatistics();

      console.log('\n✅ تم إكمال جميع الاختبارات بنجاح!');

    } catch (error) {
      console.error('\n❌ فشل في تشغيل الاختبارات:', error);
      throw error;
    }
  }
}

/**
 * دالة مساعدة لتشغيل الاختبارات من الكونسول
 */
export async function runOrdersSystemTests(supabase) {
  const tester = new OrdersSystemExample(supabase);
  return await tester.runAllTests();
}

// إضافة الدوال للـ window للاختبار السريع
if (typeof window !== 'undefined') {
  window.OrdersSystemExample = OrdersSystemExample;
  window.runOrdersSystemTests = runOrdersSystemTests;
  
  console.log('🚀 دوال الاختبار جاهزة:');
  console.log('- new OrdersSystemExample(supabase)');
  console.log('- runOrdersSystemTests(supabase)');
}
