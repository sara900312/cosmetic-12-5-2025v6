import React from 'react';
import { formatPrice } from '@/data/products';

const ProductPriceDisplay = ({
  price,
  discountedPrice = 0,
  className = "",
  originalPriceClassName = "text-[#1A1A1A] line-through text-sm mr-2",
  finalPriceClassName = "text-pink-500 font-bold",
  discountTextClassName = "text-pink-500 text-sm ml-2"
}) => {
  // التحقق من صحة البيانات
  if (!price || price <= 0) {
    return <span className={className}>غير متوفر</span>;
  }

  // إذا كان discountedPrice موجود وأقل من price، فهو السعر النهائي
  const finalPrice = (discountedPrice && discountedPrice > 0 && discountedPrice < price) ? discountedPrice : price;
  const hasDiscount = discountedPrice && discountedPrice > 0 && discountedPrice < price;

  return (
    <div className={`flex flex-col sm:flex-row gap-1 sm:gap-2 ${className}`}>
      {hasDiscount ? (
        <>
          {/* السعر الأصلي مع خط */}
          <span
            className="text-[#5A3E55]/50 line-through text-xs sm:text-sm order-2 sm:order-1"
            style={{
              textShadow: "1px 1px 4px rgba(255, 143, 171, 0.2)",
            }}
          >
            {formatPrice(price)}
          </span>

          {/* السعر بعد الخصم */}
          <span
            className="text-pink-500 font-bold text-lg sm:text-xl md:text-2xl order-1 sm:order-2 break-words"
            style={{
              textShadow: "1px 1px 3px rgba(255, 143, 171, 0.25)",
              lineHeight: "1.1",
              minWidth: "0", // يسمح بالانكماش
              wordBreak: "break-word" // يكسر الكلمات الطويلة
            }}
          >
            {formatPrice(finalPrice)}
          </span>
        </>
      ) : (
        /* السعر العادي بدون خصم */
        <span
          className={`${finalPriceClassName} text-lg sm:text-xl md:text-2xl break-words`}
          style={{
            lineHeight: "1.2",
            wordBreak: "break-word"
          }}
        >
          {formatPrice(price)}
        </span>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
