/**
 * نظام شامل لإدارة المخزون والتحقق الفوري
 * يحل مشاكل التحقق من الكمية والمخزون المتاح
 */

/**
 * التحقق من توفر المنتج في المخزون
 * @param {Object} supabase - عميل Supabase
 * @param {number} productId - معرف المنتج
 * @param {number} requestedQuantity - الكمية المطلوبة
 * @returns {Promise<Object>} نتيجة التحقق
 */
export async function checkProductStock(supabase, productId, requestedQuantity) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, stock, reserved_stock')
      .eq('id', productId)
      .single();

    if (error) {
      throw new Error(`خطأ في جلب بيانات المنتج: ${error.message}`);
    }

    if (!product) {
      return {
        available: false,
        reason: 'المنتج غير موجود',
        availableStock: 0,
        requestedQuantity
      };
    }

    const availableStock = (product.stock || 0) - (product.reserved_stock || 0);
    const isAvailable = availableStock >= requestedQuantity;

    return {
      available: isAvailable,
      availableStock,
      requestedQuantity,
      productName: product.name,
      reason: isAvailable ? 'متوفر' : `الكمية المتاحة: ${availableStock} فقط`
    };

  } catch (error) {
    console.error('خطأ في التحقق من المخزون:', error);
    return {
      available: false,
      reason: `خطأ في النظام: ${error.message}`,
      availableStock: 0,
      requestedQuantity
    };
  }
}

/**
 * التحقق من توفر جميع المنتجات في السلة
 * @param {Object} supabase - عميل Supabase
 * @param {Array} cartItems - عناصر السلة
 * @returns {Promise<Object>} نتيجة التحقق الشامل
 */
export async function checkCartStock(supabase, cartItems) {
  try {
    const results = await Promise.all(
      cartItems.map(item => 
        checkProductStock(supabase, item.id, item.quantity)
      )
    );

    const unavailableItems = results.filter(result => !result.available);
    const allAvailable = unavailableItems.length === 0;

    return {
      allAvailable,
      unavailableItems,
      availableItems: results.filter(result => result.available),
      totalItems: cartItems.length,
      checkedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('خطأ في التحقق من مخزون السلة:', error);
    throw error;
  }
}

/**
 * حجز المنتجات في المخزون (تحديث reserved_stock)
 * @param {Object} supabase - عميل Supabase
 * @param {Array} items - المنتجات للحجز
 * @returns {Promise<Object>} نتيجة الحجز
 */
export async function reserveProducts(supabase, items) {
  try {
    const reservations = [];

    for (const item of items) {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, stock, reserved_stock')
        .eq('id', item.product_id || item.id)
        .single();

      if (fetchError) {
        throw new Error(`خطأ في جلب المنتج ${item.product_id}: ${fetchError.message}`);
      }

      const currentReserved = product.reserved_stock || 0;
      const newReserved = currentReserved + item.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ reserved_stock: newReserved })
        .eq('id', item.product_id || item.id);

      if (updateError) {
        throw new Error(`خطأ في حجز المنتج ${item.product_id}: ${updateError.message}`);
      }

      reservations.push({
        productId: item.product_id || item.id,
        quantity: item.quantity,
        previousReserved: currentReserved,
        newReserved
      });
    }

    console.log('✅ تم حجز المنتجات بنجاح:', reservations);
    return { success: true, reservations };

  } catch (error) {
    console.error('❌ خطأ في حجز المنتجات:', error);
    // محاولة التراجع عن الحجوزات المكتملة
    await rollbackReservations(supabase, reservations);
    throw error;
  }
}

/**
 * التراجع عن حجز المنتجات
 * @param {Object} supabase - عميل Supabase
 * @param {Array} reservations - الحجوزات للتراجع عنها
 */
async function rollbackReservations(supabase, reservations) {
  for (const reservation of reservations) {
    try {
      await supabase
        .from('products')
        .update({ reserved_stock: reservation.previousReserved })
        .eq('id', reservation.productId);
    } catch (error) {
      console.error(`خطأ في التراجع عن حجز المنتج ${reservation.productId}:`, error);
    }
  }
}

/**
 * تأكيد الطلب وتحديث المخزون النهائي
 * @param {Object} supabase - عميل Supabase
 * @param {Array} items - عناصر الطلب المؤكد
 * @returns {Promise<Object>} نتيجة التحديث
 */
export async function confirmOrderStock(supabase, items) {
  try {
    const updates = [];

    for (const item of items) {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, stock, reserved_stock')
        .eq('id', item.product_id)
        .single();

      if (fetchError) {
        throw new Error(`خطأ في جلب المنتج ${item.product_id}: ${fetchError.message}`);
      }

      const newStock = (product.stock || 0) - item.quantity;
      const newReserved = (product.reserved_stock || 0) - item.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: Math.max(0, newStock),
          reserved_stock: Math.max(0, newReserved)
        })
        .eq('id', item.product_id);

      if (updateError) {
        throw new Error(`خطأ في تحديث مخزون المنتج ${item.product_id}: ${updateError.message}`);
      }

      updates.push({
        productId: item.product_id,
        quantity: item.quantity,
        previousStock: product.stock,
        newStock: Math.max(0, newStock),
        previousReserved: product.reserved_stock,
        newReserved: Math.max(0, newReserved)
      });
    }

    console.log('✅ تم تحديث المخزون بنجاح:', updates);
    return { success: true, updates };

  } catch (error) {
    console.error('❌ خطأ في تحديث المخزون:', error);
    throw error;
  }
}

/**
 * إلغاء حجز المنتجات (في حالة إلغاء الطلب)
 * @param {Object} supabase - عميل Supabase
 * @param {Array} items - عناصر الطلب الملغي
 * @returns {Promise<Object>} نتيجة الإلغاء
 */
export async function cancelOrderReservation(supabase, items) {
  try {
    for (const item of items) {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('reserved_stock')
        .eq('id', item.product_id)
        .single();

      if (fetchError) continue; // تجاهل الأخطاء في الإلغاء

      const newReserved = Math.max(0, (product.reserved_stock || 0) - item.quantity);

      await supabase
        .from('products')
        .update({ reserved_stock: newReserved })
        .eq('id', item.product_id);
    }

    console.log('✅ تم إلغاء حجز المنتجات');
    return { success: true };

  } catch (error) {
    console.error('❌ خطأ في إلغاء حجز المنتجات:', error);
    return { success: false, error: error.message };
  }
}

/**
 * الحصول على مع��ومات مفصلة عن المخزون
 * @param {Object} supabase - عميل Supabase
 * @param {number} productId - معرف المنتج
 * @returns {Promise<Object>} معلومات المخزون
 */
export async function getProductStockInfo(supabase, productId) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, stock, reserved_stock, price, discounted_price')
      .eq('id', productId)
      .single();

    if (error) {
      throw new Error(`خطأ في جلب معلومات المنتج: ${error.message}`);
    }

    const availableStock = (product.stock || 0) - (product.reserved_stock || 0);

    return {
      productId: product.id,
      name: product.name,
      totalStock: product.stock || 0,
      reservedStock: product.reserved_stock || 0,
      availableStock,
      price: product.price,
      discountedPrice: product.discounted_price,
      status: availableStock > 0 ? 'متوفر' : 'غير متوفر'
    };

  } catch (error) {
    console.error('خطأ في جلب معلومات المخزون:', error);
    throw error;
  }
}

/**
 * دالة شاملة للتعامل مع الطلب (حجز + تأكيد)
 * @param {Object} supabase - عميل Supabase
 * @param {Array} cartItems - عناصر السلة
 * @returns {Promise<Object>} نتيجة شاملة
 */
export async function processOrderStock(supabase, cartItems) {
  try {
    // 1. التحقق من توفر جميع المنتجات
    console.log('🔍 التحقق من توفر المنتجات...');
    const stockCheck = await checkCartStock(supabase, cartItems);
    
    if (!stockCheck.allAvailable) {
      return {
        success: false,
        step: 'stock_check',
        error: 'بعض المنتجات غير متوفرة',
        unavailableItems: stockCheck.unavailableItems
      };
    }

    // 2. حجز المنتجات
    console.log('📦 حجز المنتجات...');
    const reservation = await reserveProducts(supabase, cartItems);

    return {
      success: true,
      step: 'reserved',
      stockCheck,
      reservation,
      message: 'تم حجز المنتجات بنجاح'
    };

  } catch (error) {
    console.error('❌ خطأ في معالجة مخزون الطلب:', error);
    return {
      success: false,
      step: 'error',
      error: error.message
    };
  }
}

/**
 * أمثلة على الاستخدام
 */
export const inventoryExamples = {
  // التحقق من منتج واحد
  async checkSingleProduct(supabase, productId, quantity) {
    return await checkProductStock(supabase, productId, quantity);
  },

  // التحقق من السلة كاملة
  async checkFullCart(supabase, cartItems) {
    return await checkCartStock(supabase, cartItems);
  },

  // معالجة طلب كامل
  async processOrder(supabase, cartItems) {
    return await processOrderStock(supabase, cartItems);
  }
};

console.log('📦 نظام إدارة المخزون جاهز للاستخدام');
