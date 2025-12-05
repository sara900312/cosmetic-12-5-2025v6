/**
 * مجموعة دوال لجلب الطلبات مع العناصر المرتبطة بها من قاعدة البيانات
 */

/**
 * جلب جميع الطلبات مع العناصر المرتبطة بها
 * @param {Object} supabase - عميل Supabase
 * @param {Object} filters - فلاتر اختيارية للطلبات
 * @returns {Promise<Array>} مصفوفة الطلبات مع العناصر
 */
export async function fetchOrdersWithItems(supabase, filters = {}) {
  try {
    // جلب جميع الطلبات أولاً
    let query = supabase.from('orders').select('*');
    
    // تطبيق الفلاتر إذا وجدت
    if (filters.shipping_type) {
      query = query.eq('shipping_type', filters.shipping_type);
    }
    if (filters.order_status) {
      query = query.eq('order_status', filters.order_status);
    }
    if (filters.customer_phone) {
      query = query.eq('customer_phone', filters.customer_phone);
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    query = query.order('created_at', { ascending: false });

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw new Error(`خطأ في جلب الطلبات: ${ordersError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log('No orders found');
      return [];
    }

    // جلب العناصر المرتبطة بكل طلب وإضافتها للطلب نفسه
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('order_id,product_id,product_name,quantity,price,discounted_price,main_store_name,created_at')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });

        if (itemsError) {
          console.error(`Error fetching items for order ${order.id}:`, itemsError);
          return { ...order, order_items: [] };
        }

        return { ...order, order_items: items || [] };
      })
    );

    console.log(`تم جلب ${ordersWithItems.length} طلبات مع عناصرها بنجاح`);
    return ordersWithItems;

  } catch (error) {
    console.error('Unexpected error in fetchOrdersWithItems:', error);
    throw error;
  }
}

/**
 * جلب طلب واحد مع العناصر المرتبطة به
 * @param {Object} supabase - عميل Supabase
 * @param {string} orderCode - رقم الطلب
 * @returns {Promise<Object|null>} الطلب مع العناصر أو null إذا لم يوجد
 */
export async function fetchOrderByCodeWithItems(supabase, orderCode) {
  try {
    // جلب الطلب حسب رقم الطلب
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_code', orderCode)
      .limit(1);

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw new Error(`خطأ في جلب الطلب: ${orderError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log(`لم يتم العثور على طلب برقم: ${orderCode}`);
      return null;
    }

    const order = orders[0];

    // جلب العناصر المرتبطة بالطلب
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id,product_id,product_name,quantity,price,discounted_price,main_store_name,created_at')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error(`Error fetching items for order ${order.id}:`, itemsError);
      return { ...order, order_items: [] };
    }

    const orderWithItems = { ...order, order_items: items || [] };
    
    console.log(`تم جلب الطلب ${orderCode} مع ${items?.length || 0} عنصر`);
    return orderWithItems;

  } catch (error) {
    console.error('Unexpected error in fetchOrderByCodeWithItems:', error);
    throw error;
  }
}

/**
 * جلب الطلبات الخاصة بعميل معين
 * @param {Object} supabase - عميل Supabase
 * @param {string} customerPhone - رقم هاتف العميل
 * @returns {Promise<Array>} مصفوفة الطلبات مع العناصر
 */
export async function fetchCustomerOrdersWithItems(supabase, customerPhone) {
  return fetchOrdersWithItems(supabase, { customer_phone: customerPhone });
}

/**
 * جلب الطلبات حسب نوع الشحن
 * @param {Object} supabase - عميل Supabase
 * @param {string} shippingType - نوع الشحن ('fast' أو 'unified')
 * @returns {Promise<Array>} مصفوفة الطلبات مع العناصر
 */
export async function fetchOrdersByShippingTypeWithItems(supabase, shippingType) {
  return fetchOrdersWithItems(supabase, { shipping_type: shippingType });
}

/**
 * إحصائيات الطلبات مع التفاصيل
 * @param {Object} supabase - عميل Supabase
 * @returns {Promise<Object>} إحصائيات مفصلة
 */
export async function getOrdersStatistics(supabase) {
  try {
    const allOrders = await fetchOrdersWithItems(supabase);
    
    const stats = {
      totalOrders: allOrders.length,
      fastShippingOrders: allOrders.filter(order => order.shipping_type === 'fast').length,
      unifiedShippingOrders: allOrders.filter(order => order.shipping_type === 'unified').length,
      pendingOrders: allOrders.filter(order => order.order_status === 'pending').length,
      totalItems: allOrders.reduce((total, order) => total + (order.order_items?.length || 0), 0),
      totalAmount: allOrders.reduce((total, order) => total + (order.total_amount || 0), 0),
      averageOrderValue: allOrders.length > 0 ? 
        allOrders.reduce((total, order) => total + (order.total_amount || 0), 0) / allOrders.length : 0
    };

    console.log('إحصائيات الطلبات:', stats);
    return stats;

  } catch (error) {
    console.error('Error getting orders statistics:', error);
    throw error;
  }
}

/**
 * مثال على كيفية الاستخدام
 */
export const usageExamples = {
  // جلب جميع الطلبات
  async getAllOrders(supabase) {
    const orders = await fetchOrdersWithItems(supabase);
    console.log('جميع الطلبات:', orders);
    return orders;
  },

  // جلب طلب محدد
  async getSpecificOrder(supabase, orderCode) {
    const order = await fetchOrderByCodeWithItems(supabase, orderCode);
    console.log('الطلب المحدد:', order);
    return order;
  },

  // جلب طلبات عميل معين
  async getCustomerOrders(supabase, customerPhone) {
    const orders = await fetchCustomerOrdersWithItems(supabase, customerPhone);
    console.log('طلبات العميل:', orders);
    return orders;
  },

  // جلب طلبات الشحن السريع فقط
  async getFastShippingOrders(supabase) {
    const orders = await fetchOrdersByShippingTypeWithItems(supabase, 'fast');
    console.log('طلبات الشحن السريع:', orders);
    return orders;
  }
};
