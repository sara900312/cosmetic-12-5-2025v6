// Test file to verify shipping choice functionality

const testFastShipping = {
  customer_name: "أحمد محمد",
  customer_phone: "07901234567",
  customer_address: "بغداد، الكرادة، شارع 62، زقاق 7، دار 12",
  customer_city: "بغداد",
  customer_notes: "شحن سريع مطلوب",
  items: [
    {
      product_id: "1",
      quantity: 1,
      price: 500000,
      discounted_price: null,
      product_name: "لابتوب ديل",
      main_store_name: "متجر الكمبيوتر",
    },
    {
      product_id: "2", 
      quantity: 2,
      price: 25000,
      discounted_price: null,
      product_name: "ماوس لاسلكي",
      main_store_name: "متجر الإكسسوارات",
    }
  ],
  subtotal: 550000,
  discounted_price: 0,
  total_amount: 550000,
  order_code: "FAST123",
  main_store_name: "متجر الكمبيوتر",
  user_id: null,
  idempotency_key: "test-fast-shipping-123",
  shipping_type: "fast" // سيُنشئ طلبين منفصلين
};

const testUnifiedShipping = {
  customer_name: "سارة علي",
  customer_phone: "07801234567",
  customer_address: "بغداد، الجادرية، شارع 15، دار 8",
  customer_city: "بغداد",
  customer_notes: "شحن موحد للتوفير",
  items: [
    {
      product_id: "3",
      quantity: 1,
      price: 300000,
      discounted_price: null,
      product_name: "هاتف سامسونج",
      main_store_name: "متجر الهواتف",
    },
    {
      product_id: "4",
      quantity: 1,
      price: 50000,
      discounted_price: null,
      product_name: "غطاء حماية",
      main_store_name: "متجر الإكسسوارات",
    }
  ],
  subtotal: 350000,
  discounted_price: 0,
  total_amount: 350000,
  order_code: "UNIFIED456",
  main_store_name: "متجر الهواتف",
  user_id: null,
  idempotency_key: "test-unified-shipping-456",
  shipping_type: "unified" // سيُنشئ طلب واحد موحد
};

console.log("🚀 Fast Shipping Test Data:");
console.log(JSON.stringify(testFastShipping, null, 2));

console.log("\n📦 Unified Shipping Test Data:");
console.log(JSON.stringify(testUnifiedShipping, null, 2));

console.log("\n📝 Expected Results:");
console.log("Fast Shipping: Should create 2 separate orders (one per store)");
console.log("Unified Shipping: Should create 1 combined order");

export { testFastShipping, testUnifiedShipping };
