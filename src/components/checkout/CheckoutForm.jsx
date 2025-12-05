import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Send } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { forwardRef, useImperativeHandle } from 'react';

const CheckoutForm = forwardRef(({ formData, handleInputChange, onAutoSubmit, isSubmitting }, ref) => {
  const { isDark } = useTheme();
  const [countdown, setCountdown] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const timeoutRef = useRef(null);
  const submittedRef = useRef(false);
  const nameInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusNameInput: () => {
      if (nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Delay focus to allow scroll animation to complete
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 1000);
      }
    }
  }));

  // Cosmetic theme colors
  const inputBgClass = 'bg-white';
  const inputBorderClass = 'border-cosmetic-lilac border-2';
  const inputTextClass = 'text-cosmetic-dark-purple';
  const placeholderTextClass = 'placeholder-cosmetic-label';
  const labelTextClass = 'text-cosmetic-label';

  // Validation functions - memoized to prevent recreation
  const isValidPhone = useCallback((phone) => /^\d+$/.test(phone), []);
  const hasLink = useCallback((text) => /(http|https|www\.)/.test(text), []);

  // Memoized validation errors calculation
  const validationErrorsCalculated = useMemo(() => {
    const errors = {};

    if (!formData.name || hasLink(formData.name)) {
      errors.name = !formData.name ? 'الاسم مطلوب' : 'الاسم لا يجب أن يحتوي على روابط';
    }

    if (!formData.phone || !isValidPhone(formData.phone)) {
      errors.phone = !formData.phone ? 'رقم الهاتف مطلوب' : 'رقم الهاتف يجب أن يحتوي على أرقام فقط';
    }

    if (!formData.address || hasLink(formData.address)) {
      errors.address = !formData.address ? 'العنوان مطلوب' : 'العنوان لا يجب أن يحتوي على روابط';
    }

    if (formData.notes && hasLink(formData.notes)) {
      errors.notes = 'الملاحظات لا يجب أن تحتوي على روابط';
    }

    return errors;
  }, [formData.name, formData.phone, formData.address, formData.notes, hasLink, isValidPhone]);

  // Update validation errors when calculated errors change
  useEffect(() => {
    setValidationErrors(validationErrorsCalculated);
  }, [validationErrorsCalculated]);

  // Check if form is valid for showing submit button
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrorsCalculated).length === 0;
  }, [validationErrorsCalculated]);

  // Handle manual input change - memoized to prevent recreation
  const handleFieldChange = useCallback((e) => {
    // Reset submitted flag when user makes changes
    submittedRef.current = false;

    // Allow only numbers for phone field
    if (e.target.name === 'phone') {
      const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
      const modifiedEvent = {
        target: {
          name: 'phone',
          value: value
        }
      };
      handleInputChange(modifiedEvent);
    } else {
      handleInputChange(e);
    }
  }, [handleInputChange]);


  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="customer-info-section p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <User className="h-5 w-5" />
          معلومات العميل
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-cosmetic-dark-purple font-semibold">الاسم الكامل *</label>
            <input
              ref={nameInputRef}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFieldChange}
              className={`cosmetic-input w-full px-4 py-3 ${inputBgClass} ${inputBorderClass} ${inputTextClass} ${placeholderTextClass} ${validationErrors.name ? 'border-red-500' : ''}`}
              placeholder="أدخل اسمك الكامل"
            />
            {validationErrors.name && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-cosmetic-dark-purple font-semibold">رقم الهاتف *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFieldChange}
              pattern="\d*"
              className={`cosmetic-input w-full px-4 py-3 ${inputBgClass} ${inputBorderClass} ${inputTextClass} ${placeholderTextClass} ${validationErrors.phone ? 'border-red-500' : ''}`}
              placeholder="07XX XXX XXXX"
            />
            {validationErrors.phone && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-cosmetic-dark-purple font-semibold">العنوان الكامل (المحافظة، المدينة، المنطقة، رقم الشارع/الزقاق، رقم الدار، أقرب نقطة دالة) *</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleFieldChange}
              rows={4}
              className={`cosmetic-input w-full px-4 py-3 bg-white ${inputBgClass} ${inputBorderClass} ${inputTextClass} ${placeholderTextClass} ${validationErrors.address ? 'border-red-500' : ''}`}
              placeholder="مثال: بغداد، الكرادة، شارع 62، زقاق 7، دار 12، قرب مدرسة..."
            />
            {validationErrors.address && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-cosmetic-dark-purple font-semibold">ملاحظات إضافية</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleFieldChange}
              rows={2}
              className={`cosmetic-input w-full px-4 py-3 ${inputBgClass} ${inputBorderClass} ${inputTextClass} ${placeholderTextClass} ${validationErrors.notes ? 'border-red-500' : ''}`}
              placeholder="أي ملاحظات خاصة بالطلب..."
            />
            {validationErrors.notes && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.notes}</p>
            )}
          </div>

          <div className="payment-method-section p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              طريقة الدفع
            </h3>
            <p>الدفع عند الاستلام (COD)</p>
          </div>

          {/* Submit button - appears when form is valid */}
          {isFormValid && !isSubmitting && !submittedRef.current && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                submittedRef.current = true;
                onAutoSubmit();
              }}
              className="cosmetic-checkout-button w-full text-white text-lg py-4 px-6 font-bold transition-all duration-200 hover:scale-105 focus:outline-none flex items-center justify-center gap-2"
            >
              <Send className="h-5 w-5" />
              تأكيد الطلب الآن
            </motion.button>
          )}

          {isSubmitting && (
            <div className="customer-info-section p-4 text-center">
              <p className="font-bold">
                جاري معالجة الطلب...
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}, { displayName: 'CheckoutForm' });

export default CheckoutForm;
