import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Package, User, CreditCard, Copy, X as CloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import ConfirmationModal from '@/components/checkout/ConfirmationModal';
import OrderConfirmedDisplay from '@/components/checkout/OrderConfirmedDisplay';

import { formatPrice } from '@/data/products';
import { useSupabase } from '@/contexts/SupabaseContext';
import { sendOrder } from '@/lib/orderService';
import { createPersistentIdempotencyKey, sendOrderNotification } from '@/lib/orderNotification';
import {
  generateIdempotencyKey,
  generateOrderCode,
  sanitizeOrderData,
  sanitizeOrderItems,
  getStoreName,
  normalizeOrdersResponse
} from '@/lib/uuidUtils';
import { processOrderStock, checkCartStock } from '@/lib/inventoryManager';
import {
  processOrderResponse,
  handleOrderError,
  showOrderToast,
  createOrderSummary
} from '@/lib/orderResponseHandler';
import {
  prepareOrderPayload,
  submitOrderToBackend,
  getUniqueStores,
  generateRandomOrderCode
} from '@/lib/orderPayloadUtils';
import { checkExistingOrder } from '@/lib/idempotencyHelper';
import { sanitizeText, safeNumber } from '@/lib/utils';
import { playSound } from '@/lib/soundPlayer';


const CheckoutPage = () => {
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const checkoutFormRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [showOrderCodeSection, setShowOrderCodeSection] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });


  // Ref to track if order is being processed to prevent duplicates
  const isProcessingOrder = useRef(false);
  const hasSubmitted = useRef(false);
  const shouldFocusInput = useRef(true);

  // إنشاء مر��ع لمفتاح التكرار
  const idempotencyKeyRef = useRef(null);

  const subtotal = getTotalPrice();
  const totalAmount = subtotal;

  // حساب إجمالي مبلغ الخصم للطلب
  const getTotalDiscountAmount = () => {
    return cartItems.reduce((totalDiscount, item) => {
      const isProductDiscounted = item.is_discounted === true || (item.discount_percent && item.discount_percent > 0);
      // حساب مقدار الخصم = السعر الأصلي - السعر النهائي
      const finalPrice = isProductDiscounted && item.discounted_price ? item.discounted_price : item.price;
      const discountPerItem = isProductDiscounted ? Math.max(0, item.price - finalPrice) : 0;
      return totalDiscount + (discountPerItem * item.quantity);
    }, 0);
  };

  const totalDiscountAmount = getTotalDiscountAmount();

  // Helper function to check if cart has products from multiple stores
  const hasMultipleStores = () => {
    const uniqueStores = getUniqueStores(cartItems);
    return uniqueStores.length > 1;
  };

  // Helper function to get list of stores in cart
  const getStoresList = () => {
    return getUniqueStores(cartItems);
  };

  // Focus the name input field when user navigates directly to checkout
  useEffect(() => {
    if (shouldFocusInput.current && checkoutFormRef.current && formData.name === '') {
      setTimeout(() => {
        checkoutFormRef.current?.focusNameInput?.();
      }, 500);
      shouldFocusInput.current = false;
    }
  }, []);

  // إنشاء مفتاح التكرار عند بدء العملية
  const createIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
    return idempotencyKeyRef.current;
  };

  // دالة محسّنة لإرسال الطلب بالتنسيق الصحيح
  const handleSubmitOrder = () => {
    const firstCartItem = cartItems.length > 0 ? cartItems[0] : {};
    const rawStoreData = firstCartItem.main_store_name || firstCartItem.main_store;
    const mainStoreValue = extractStoreName(rawStoreData);
    const currentOrderCode = generateRandomOrderCode();

    const sName = sanitizeText(formData.name, 160);
    const sPhone = (formData.phone || '').replace(/\D/g, '').slice(0, 20);
    const sAddress = sanitizeText(formData.address, 1000);
    const sNotes = sanitizeText(formData.notes || 'رجاءً توصيل سريع', 1000);

    const orderData = {
      customer_name: sName,
      customer_phone: sPhone,
      customer_address: sAddress,
      customer_city: sAddress ? (sAddress.toLowerCase().includes('بغداد') || sAddress.toLowerCase().includes('baghdad') ? 'بغداد' : 'محافظات أخرى') : 'غير محدد',
      customer_notes: sNotes,
      subtotal: safeNumber(subtotal, { min: 0 }),
      discounted_price: safeNumber(totalDiscountAmount, { min: 0 }),
      total_amount: safeNumber(totalAmount, { min: 0 }),
      order_code: currentOrderCode,
      main_store_name: mainStoreValue,
      user_id: null, // uuid-المستخدم-هنا
      idempotency_key: generateIdempotencyKey(), // استخدام المفتاح الموحد

      // **مهم**: عناصر الطلب، كل عنصر يحتوي على:
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: safeNumber(item.quantity, { min: 1 }),
        price: safeNumber(item.price, { min: 0 }),
        discounted_price: item.discounted_price ? safeNumber(item.discounted_price, { min: 0 }) : null,
        product_name: sanitizeText(item.name, 300),
        main_store_name: extractStoreName(item.main_store_name || item.main_store) || mainStoreValue,
      }))
    };

    sendOrder(orderData)
      .then(result => {
        const storeName = result?.storeName ?? "غير محدد";
        console.log("تم إرسال الطلب. اسم المتجر:", storeName);

        // ✅ التأكد من أن toast ��ا يتم استدعاؤه داخل render مباشرة
        setTimeout(() => {
          toast({
            title: "تم إرسال الطلب بنجاح!",
            description: `تم إرسال الطلب بنجاح إلى ${storeName}\nرقم طلبك هو: ${currentOrderCode}`,
          });
        }, 0);

        clearCart();
        setOrderCode(currentOrderCode);
        setOrderConfirmed(true);
        setShowOrderCodeSection(true);
      })
      .catch(err => {
        console.error("خطأ أثناء إرسال الطلب:", err?.message || err);

        // ⚠️ التحقق من تكرار المفتاح
        const isDuplicate = err.message?.includes('duplicate key') ||
                           err.message?.includes('idempotency') ||
                           err.message?.includes('already exists') || false;

        setTimeout(() => {
          if (!isDuplicate) {
            toast({
              title: "خطأ في إرسال الطلب",
              description: err.message || "حدث خطأ غير متوقع أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.",
              variant: "destructive",
            });
          }
          // No message for duplicate orders
        }, 0);
      });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

    const handleFormSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmitting || isProcessingOrder.current) {
      return;
    }

    // Validation is now handled in CheckoutForm component

    // إذا كانت المنتجات من متاجر متعددة، استخدم الشحن السريع تلقائياً
    if (hasMultipleStores()) {
      proceedWithOrder('fast');
      return;
    }

    // متجر واحد: شحن موحد
    proceedWithOrder('unified');
    };


  // Proceed with order after shipping choice
  const proceedWithOrder = (shippingType) => {
    setIsSubmitting(true);
    const newOrderCode = generateRandomOrderCode();
    setOrderCode(newOrderCode);

    // ✨ للشحن السريع: إنشاء مفتاح فريد جديد تماماً لضمان الاستقلالية
    // للشحن الموحد: استخدام مفتاح موحد لكامل الطلب
    if (shippingType === 'fast') {
      // للطلبات السريعة: كل طلب مست��ل بمفتاح فريد
      idempotencyKeyRef.current = `fast-${Date.now()}-${crypto.randomUUID()}`;
    } else {
      // للطلبات الموحدة: مفتاح واحد للطلب الكامل
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    setShowConfirmation(true);
    setOrderConfirmed(false);

    // Play placing order sound when user starts the order (starts confirmation)
    playSound('placingOrder');

    if (window.countdownIntervalId) {
      clearInterval(window.countdownIntervalId);
    }

    // Start countdown with proper cleanup
    let countdownValue = 10;
    setCountdown(countdownValue);

    window.countdownIntervalId = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);

      if (countdownValue <= 0) {
        clearInterval(window.countdownIntervalId);
        processOrderSubmission(newOrderCode, shippingType);
      }
    }, 1000);
  };

  // إرسال الإشعار عبر Edge Function المرتبطة بقاعدة البيانات
  const sendOrderNotification = async (orderCode, mainStoreValue) => {
    try {
      if (hasSubmitted.current) return;
      hasSubmitted.current = true;

      console.log('📧 إرسال إشعار طلب عبر Edge Function');

      const sName = sanitizeText(formData.name, 160);
      const sPhone = (formData.phone || '').replace(/\D/g, '').slice(0, 20);
      const sAddress = sanitizeText(formData.address, 1000);
      const sNotes = sanitizeText(formData.notes || '', 1000);

      const orderData = {
        customer_name: sName,
        customer_phone: sPhone,
        customer_address: sAddress,
        customer_city: sAddress ? (sAddress.toLowerCase().includes('بغداد') || sAddress.toLowerCase().includes('baghdad') ? 'بغداد' : 'محافظا�� أخرى') : 'غير محدد',
        customer_notes: sNotes,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: safeNumber(item.quantity, { min: 1 }),
          price: safeNumber(item.price, { min: 0 }),
          discounted_price: item.discounted_price ? safeNumber(item.discounted_price, { min: 0 }) : null,
          product_name: sanitizeText(item.name, 300),
          main_store_name: extractStoreName(item.main_store_name || item.main_store) || mainStoreValue
        })),
        subtotal: safeNumber(subtotal, { min: 0 }),
        discounted_price: safeNumber(totalDiscountAmount, { min: 0 }),
        total_amount: safeNumber(totalAmount, { min: 0 }),
        order_code: orderCode,
        main_store_name: mainStoreValue,
        user_id: null,
        idempotency_key: generateIdempotencyKey(), // استخدام المفتاح الموحد
      };

      // إرسال الإشعار عبر Edge Function باستخدام الخدمة الج��يدة
      const result = await sendOrder(orderData);
      return { success: true, data: result };
    } catch (error) {
      // طباعة تفاصيل الخطأ الكاملة للتشخيص
      console.error('Network or Server Error:', error?.message || error);

      // استخراج رسالة الخط�� المناسبة من كائن EmailJS
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  };

      // دالة لاستخراج اسم المتجر من كائن أو نص
  const extractStoreName = (storeData) => {
    // إذا كان null أو undefined
    if (!storeData) return null;

    // إذا كان نص مباشر
    if (typeof storeData === 'string') {
      return storeData.trim() || null;
    }

    // إذا كان كائن، نحاول استخراج الاسم من خصائص مختلفة
    // نعطي أولوية لـ main_store_name
    if (typeof storeData === 'object') {
      return storeData.main_store_name ||
             storeData.name ||
             storeData.storeName ||
             storeData.title ||
             null; // لا نستخدم JSON.stringify كحل أخير
    }

    // في أي حالة أخرى، نحوله إلى نص
    return String(storeData).trim() || null;
  };

    // دالة مساعدة لطباعة معلومات تشخيص واضحة
  const getStoreDebugInfo = (storeData) => {
    return {
      raw: storeData,
      rawJson: JSON.stringify(storeData),
      type: typeof storeData,
      extracted: extractStoreName(storeData),
      isValid: isValidStoreName(storeData),
      constructor: storeData?.constructor?.name || 'Unknown'
    };
  };

  // دالة للتحقق من صحة اسم المتجر
  const isValidStoreName = (storeData) => {
    const storeName = extractStoreName(storeData);

    if (!storeName || typeof storeName !== 'string') {
      return false;
    }

    const invalidStoreNames = [
      'المتجر الرئيسي غير محدد',
      'المتجر الرئيسي',
      'غير محدد',
      'لا يوجد',
      'غير معروف',
      'متجر افتراضي',
      'null',
      'undefined',
      '{}',
      '[object Object]'
    ];

    const trimmedName = storeName.trim();
    return trimmedName.length > 0 && !invalidStoreNames.includes(trimmedName);
  };

    const processOrderSubmission = async (currentOrderCode, shippingType = 'unified') => {
    // Prevent multiple submissions using ref
    if (isProcessingOrder.current || orderConfirmed) {
      return;
    }

    // Set processing flag
    isProcessingOrder.current = true;
    // Reset notification submission flag for new order
    hasSubmitted.current = false; 

            try {
            // تحقق مبكر من صحة بيانات المتاجر
      const firstCartItem = cartItems.length > 0 ? cartItems[0] : {};
      // نعطي أولوية لـ main_store_name، ثم main_store كبديل
      const rawStoreData = firstCartItem.main_store_name || firstCartItem.main_store;
      const mainStoreValue = extractStoreName(rawStoreData);

      // طباعة معلومات مفيدة للتشخيص
                  console.log('🔍 تشخيص بيانات المتجر:', {
        main_store_name: firstCartItem.main_store_name,
        main_store: JSON.stringify(firstCartItem.main_store),
        selectedStoreData: getStoreDebugInfo(rawStoreData),
        extractedValue: mainStoreValue
      });

      if (!isValidStoreName(rawStoreData)) {
                        console.error('❌ فشل التحقق المبكر: اسم المتجر غير صحيح:', {
          storeDebugInfo: getStoreDebugInfo(rawStoreData),
          cartItemsStores: cartItems.map(item => ({
            name: item.name,
            main_store_name: item.main_store_name,
            main_store: JSON.stringify(item.main_store),
            storeDebugInfo: getStoreDebugInfo(item.main_store_name || item.main_store)
          }))
        });

        // استخدام useCallback أو setTimeout لتجنب setState أثناء الريند��
        setTimeout(() => {
          toast({
            title: "خطأ في بيانات المتجر",
            description: "لا يمكن إتمام الطلب بسبب معلومات متجر غير صحيحة. يرجى إضافة المنتجات من متجر محدد.",
            variant: "destructive",
            duration: 8000,
          });

          setIsSubmitting(false);
          setShowConfirmation(false);
        }, 0);

        return;
      }

      const orderDataForEmail = {
        name: formData.name,
        phone: formData.phone,
        email: 'لا يوجد', 
        detailed_address: formData.address,
        city: formData.address ? (formData.address.toLowerCase().includes('بغداد') || formData.address.toLowerCase().includes('baghdad') ? 'بغداد' : 'محافظات أخرى') : 'غير محدد', 
        notes: formData.notes || 'لا توجد ملاحظات',
        product_name: cartItems.map(item => `${item.name} (x${item.quantity})`).join(', '),
        product_price: formatPrice(subtotal),
        order_date: new Date().toLocaleDateString('ar-IQ'),
        order_code: currentOrderCode,
        all_items_details: cartItems.map(item => 
          `المنتج: ${item.name}\nالكمية: ${item.quantity}\nالسعر للقطعة: ${formatPrice(item.price)}\nالإجمالي للمنتج: ${formatPrice(item.price * item.quantity)}`
        ).join('\n\n'),
        subtotal_amount: formatPrice(subtotal),
        discounted_price: totalDiscountAmount,
        total_order_amount: formatPrice(totalAmount),
        main_store: mainStoreValue,
      };
      

      
      // إرسال الإشعار مع idempotency key
      const idempotencyKey = generateIdempotencyKey();

      // للشحن السري��: إنشاء مفتاح فريد جديد لضمان عدم الدمج مع طلبات سابقة
      let finalIdempotencyKey = idempotencyKey;
      if (shippingType === 'fast') {
        finalIdempotencyKey = `fast-${Date.now()}-${crypto.randomUUID()}-main`;
        console.log(`🚀 الشحن السريع: إنشاء مفتاح فريد جديد: ${finalIdempotencyKey}`);
      }

      // تحضير بيانات العميل
      const sName = sanitizeText(formData.name, 160);
      const sPhone = (formData.phone || '').replace(/\D/g, '').slice(0, 20);
      const sAddress = sanitizeText(formData.address, 1000);
      const sNotes = sanitizeText(formData.notes || '', 1000);

      const customerData = {
        name: sName,
        phone: sPhone,
        address: sAddress,
        city: sAddress ? (sAddress.toLowerCase().includes('بغداد') || sAddress.toLowerCase().includes('baghdad') ? 'بغداد' : 'محافظات أخرى') : 'غير محدد',
        notes: sNotes
      };

      // تحضير البيانات باستخدام الدالة الجديدة
      const orderDataForEdgeFunction = prepareOrderPayload(
        cartItems,
        customerData,
        shippingType,
        currentOrderCode,
        finalIdempotencyKey
      );

      // إرسال الطلب إلى Edge Function
      const edgeFunctionUrl = 'https://ykyzviqwscrjjkucorlp.supabase.co/functions/v1/order-notification';
      const notificationResult = await submitOrderToBackend(orderDataForEdgeFunction, edgeFunctionUrl);

            // نخزن نتيجة الإشعار لاستخدامها في رسالة النجاح النهائية
      const notificationSuccess = notificationResult.success;
      const notificationError = notificationResult.error;

      if (!notificationSuccess) {
        console.warn('⚠️ تحذير: فشل في إرسال إشعار الطلب:', notificationError);
      } else {
        const store = mainStoreValue || '��ير معروف';
        console.log('✅ تم إرسال إشعار الطلب بنجاح إلى متجر:', store);
      }

      // ✅ للشحن الموحد فقط: تحقق من الطلب المكرر باستخدام المساعد الآمن
      // للشحن السريع: تجاهل الفحص لضمان إنشاء طلبات مستقلة جديدة
      if (shippingType !== 'fast') {
        const idempotencyCheck = await checkExistingOrder(supabase, finalIdempotencyKey);

        if (idempotencyCheck.exists) {
          // الطلب موجود مسبقًا - لن ترسل مرة ثانية
          console.warn('⛔ تم إرسال هذا الطلب مسبقًا:', idempotencyCheck.existingOrder.order_code);

          setOrderCode(idempotencyCheck.existingOrder.order_code);
          setOrderConfirmed(true);
          setShowOrderCodeSection(true);
          setShowConfirmation(false);
          clearCart();
          return;
        } else if (!idempotencyCheck.shouldProceed) {
          // خطأ في الفحص ولا يمكن المتابعة
          console.error('❌ خطأ في فحص idempotency:', idempotencyCheck.message);

          setTimeout(() => {
            toast({
              title: "خطأ في التحقق من الطلب",
              description: idempotencyCheck.message,
              variant: "destructive",
              duration: 8000,
            });
          }, 0);

          setIsSubmitting(false);
          setShowConfirmation(false);
          return;
        } else {
          console.log('✅ لا يوجد طلب مكرر، متابعة إنشاء طلب جديد');
        }
      } else {
        console.log('🚀 الشحن السريع: تجاهل فحص الطلبات المكررة لضمان الاستقلالية');
      }

      // ✅ إنشاء الطلبات يتم بالكامل في Edge Function لتجنب التكرار
      // Edge Function أنشأ الطل��ات بالفعل، هنا فقط نتعامل مع النتيجة
      console.log('✅ تم إنشاء الطلبات بنجاح عبر Edge Function فقط (بدون تكرار)');

      // استخراج معلومات الطلبات من استجابة Edge Function
      if (notificationResult && notificationResult.success && notificationResult.orders) {
        console.log(`📦 تم إنشاء ${notificationResult.orders.length} طلب عبر Edge Function`);

        // استخدام رقم الطلب من Edge Function
        if (notificationResult.orders.length > 0) {
          const firstOrder = notificationResult.orders[0];
          currentOrderCode = firstOrder.order_code || currentOrderCode;
          console.log(`📝 رقم الطلب المُعاد من Edge Function: ${currentOrderCode}`);
        }
      } else {
        console.warn('⚠️ لم يتم الحصول على معلومات طلبات من Edge Function', notificationResult);
        // إذا لم تحتوي الاستجابة على طلبات، استخدم الكود المحلي
        console.log(`📝 استخدام رقم الطلب المحلي: ${currentOrderCode}`);
      }

        // رسالة نجاح مبسطة
        const successMessage = 'يمكنك إلغاء الطلب خلال ٦ ساعات ��إرسال رمز الطلب.';

        // إظهار البطاقة فقط برسالة النجاح
        setSuccessMessage(successMessage);
        setOrderConfirmed(true);
        setShowOrderCodeSection(true);
        setShowConfirmation(false);
        clearCart();

        // 🔧 إعادة تعيين مفتاح التكرار بعد نجاح الطلب لضمان طلبات جديدة
        idempotencyKeyRef.current = null;
        } catch (error) {
      console.error('Error sending order (generic):', JSON.stringify(error, null, 2));
      if (!(error.message.includes('Supabase error:') && error.message.includes('orders_order_code_key'))) {
        // ⚠️ التحقق من تكرار المفتاح في أخطاء قاعدة البيانات
        const isDuplicate = error.message?.includes('duplicate key') ||
                           error.message?.includes('idempotency') ||
                           error.message?.includes('orders_order_code_key') || false;

        setTimeout(() => {
          if (!isDuplicate) {
            toast({
              title: "خطأ في إرسال الطلب",
              description: `حدث خطأ: ${error.message}. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.`,
              variant: "destructive",
              duration: 9000,
            });
          }
          // No message for duplicate orders
        }, 0);
      }
      setOrderConfirmed(false); 
      setShowConfirmation(false);
    } finally {
            setIsSubmitting(false);
      setCountdown(10);
      // Reset processing flag
      isProcessingOrder.current = false; 
    }
  };

      const cancelOrder = () => {
    if (window.countdownIntervalId) {
      clearInterval(window.countdownIntervalId);
    }
    setShowConfirmation(false);
    setIsSubmitting(false);
    setCountdown(10);
    setOrderCode('');
    // Reset processing flag
    isProcessingOrder.current = false;
    // إعادة تعيين مفتاح التكرار عند الإلغاء
    idempotencyKeyRef.current = null;
  };

  const confirmOrderImmediately = () => {
    if (window.countdownIntervalId) {
      clearInterval(window.countdownIntervalId);
    }
    processOrderSubmission(orderCode, hasMultipleStores() ? 'fast' : 'unified');
  };

  const handleCopyOrderCode = () => {
    if (orderCode) {
      navigator.clipboard.writeText(orderCode);
      toast({
        title: "تم نسخ رقم الطلب!",
        description: orderCode,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (window.countdownIntervalId) {
        clearInterval(window.countdownIntervalId);
      }
    };
  }, []);

  if (cartItems.length === 0 && !orderConfirmed) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 mx-auto text-themed-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold text-themed-foreground mb-4">السلة فارغة</h1>
          <p className="text-themed-foreground/60 mb-8">لا توجد منتجات في سلة التسوق</p>
          <Button onClick={() => navigate('/products')} className="gradient-bg text-white">
            تصفح المنتجات
          </Button>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 checkout-breadcrumb mb-8"
        >
          <button onClick={() => navigate(-1)} className="hover:text-cosmetic-dark-purple transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold checkout-page-title">إتمام الطلب</h1>
        </motion.div>

        <div className="grid lg:grid-cols-2 checkout-grid">
          <CheckoutForm
            ref={checkoutFormRef}
            formData={formData}
            handleInputChange={handleInputChange}
            onAutoSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
          <OrderSummary
            items={cartItems || []}
            subtotal={subtotal}
          />
        </div>
      </div>


      <ConfirmationModal
        isOpen={showConfirmation && !orderConfirmed}
        countdown={countdown}
        orderCode={orderCode}
        onCancel={cancelOrder}
        onConfirmImmediately={confirmOrderImmediately}
      />

      <OrderConfirmedDisplay
        isOpen={orderConfirmed && showOrderCodeSection}
        orderCode={orderCode}
        message={successMessage}
        onCopy={handleCopyOrderCode}
        onClose={() => setShowOrderCodeSection(false)}
      />

      <Footer />
    </div>
  );
};

export default CheckoutPage;
