import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Eye, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { formatPrice, getDiscountedPrice } from "@/data/products";
import { useNavigate } from "react-router-dom";
import ProductPriceDisplay from "@/components/ProductPriceDisplay";
import { getProductUrl } from "@/lib/slugUtils";
import { triggerNeonBurst } from "@/lib/neonBurst";
import { protectProductImage, unprotectProductImage } from "@/lib/imageProtection";

const ProductCard = ({ product, index = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const audioRef = useRef(null);
  const imageRef = useRef(null);
  const { addToCart } = useCart();
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  // Track add to cart event (fire and forget, non-blocking)
  const trackAdd = async (productId) => {
    try {
      const { data, error } = await supabase
        .from('product_add_to_cart')
        .insert([{ product_id: productId }]);

      if (error) {
        console.error('AddCartTrackError(Card):', error.message);
        return;
      }

      console.log('Added to cart tracking:', data);
    } catch (err) {
      console.error('Unexpected error in trackAdd:', err);
    }
  };

  // Apply image protection when component mounts or image changes
  useEffect(() => {
    if (imageRef.current) {
      protectProductImage(imageRef.current);

      return () => {
        unprotectProductImage(imageRef.current);
      };
    }
  }, [product.id]);

  if (!product) {
    return null;
  }

  const handleViewProduct = () => {
    navigate(getProductUrl(product));
  };

  // حساب الأسعار والخصومات بشكل صحيح
  const originalPrice = product.price;

  // تحديد ما إذا كان الم��تج مخفض حقاً
  const isProductDiscounted = product.is_discounted === true || (product.discount_percent && product.discount_percent > 0);

  // إذا كان discounted_price موجو��، فهو السعر النهائي، وإلا فهو السع�� الأصلي
  const finalPrice = isProductDiscounted && product.discounted_price ? product.discounted_price : originalPrice;
  const discountAmount = isProductDiscounted ? Math.max(0, originalPrice - finalPrice) : 0;
  const discountPercentage = isProductDiscounted && discountAmount > 0 && originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) :
                           (isProductDiscounted && product.discount_percent ? product.discount_percent : 0);
  const hasDiscount = isProductDiscounted && (discountAmount > 0 || discountPercentage > 0);

  const mainImage =
    product.main_image_url ||
    "https://via.placeholder.com/300x200?text=No+Image";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: imageLoaded || imageError ? 1 : 0, y: 20 }}
      transition={{
        duration: imageLoaded || imageError ? 0.2 : 0,
        delay: (imageLoaded || imageError) ? index * 0.05 : 0,
        ease: "easeOut"
      }}
      className="product-card glass-effect rounded-2xl overflow-hidden hover-lift group flex flex-col h-full shadow-lg hover:shadow-2xl transition-all duration-300 border border-pink-200/40 hover:border-pink-300/60 mobile-card-height hover:scale-105"
    >
      <div className="relative overflow-hidden bg-white flex justify-center items-center p-0 m-0 border-b border-white/20 min-h-[250px] image-container">
        {!imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-pink-50 z-5 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 rounded-full border-3 border-pink-200 border-t-pink-500 animate-spin"></div>
                  <p className="text-xs text-pink-600 mt-2 font-medium">جاري التحميل...</p>
                </div>
              </div>
            )}
            <img
              ref={imageRef}
              src={mainImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              crossOrigin="anonymous"
              onError={() => setImageError(true)}
              onLoad={() => setImageLoaded(true)}
              style={{ maxWidth: "103%" }}
              className={`product-image relative z-10 block w-auto h-auto max-w-full max-h-full group-hover:scale-105 transition-all duration-300 drop-shadow-xl filter group-hover:brightness-110 ${!imageLoaded ? 'opacity-0' : 'opacity-100'} ${product.stock === 0 ? 'out-of-stock-blur' : ''}`}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-pink-100 to-pink-50">
            <div className="text-5xl mb-2">🖼️</div>
            <p className="text-sm text-[#1A1A1A] text-center px-2">{product.name}</p>
            <p className="text-xs text-[#1A1A1A] mt-1">لم تتمكن من تحميل الصورة</p>
          </div>
        )}

        {(imageLoaded || imageError) && hasDiscount && (
          <div
            className="absolute top-2 left-2 bg-gradient-to-r from-[#FF2F92] to-[#FF6BB3] text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold z-20 shadow-xl max-w-[65%] whitespace-nowrap"
            style={{
              backgroundColor: "rgba(255, 47, 146, 0.95)",
              border: "1px solid rgba(255, 107, 179, 0.6)"
            }}
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs">💥</span>
              <span>خصم {discountPercentage}%</span>
            </div>
          </div>
        )}

        {(imageLoaded || imageError) && product.is_featured && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-[#FF2F92] to-[#FF6BB3] text-white px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold z-20 max-w-[34%] whitespace-nowrap shadow-md">
            محدودة
          </div>
        )}

        {(imageLoaded || imageError) && product.stock === 0 && (
          <div className="ribbon-out-of-stock">غير متوفر</div>
        )}

        {(imageLoaded || imageError) && (
          <div className="absolute inset-0 bg-white/85 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 p-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewProduct}
              className="bg-gradient-to-r from-[#FFE8EF] to-[#FFD4E5] text-[#FF2F92] hover:from-[#FFD4E5] hover:to-[#FFC0DB] text-xs sm:text-sm px-2 sm:px-3 border border-[#FF2F92] font-bold"
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" strokeWidth={2} />
              <span className="hidden sm:inline">عرض</span>
              <span className="sm:hidden">عرض</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                triggerNeonBurst(e.currentTarget);
                addToCart(product);
                trackAdd(product.id);
              }}
              className="bg-gradient-to-r from-[#FF2F92] to-[#FF6BB3] hover:from-[#E01F7F] hover:to-[#FF5BA8] text-white text-xs sm:text-sm px-2 sm:px-3 shadow-md relative overflow-visible font-bold"
              disabled={product.stock === 0}
            >
              <ShoppingCart
                className="h-3 w-3 sm:h-4 sm:w-4 mr-1"
                strokeWidth={2}
              />
              <span className="hidden sm:inline">
                {product.stock === 0 ? "غير متوفر" : "إضافة"}
              </span>
              <span className="sm:hidden">
                {product.stock === 0 ? "غير متوفر" : "+"}
              </span>
            </Button>
          </div>
        )}
      </div>

      {(imageLoaded || imageError) && (
        <div className="p-4 flex flex-col flex-grow product-card-content" style={{ backgroundColor: "rgba(253, 243, 248, 1)" }}>
          <div className="flex items-start justify-between mb-3">
            <h3 className="product-title text-[#1A1A1A] font-semibold leading-tight flex-1" title={product.name}>
              {product.name}
            </h3>
            <span className="text-[#1A1A1A] text-xs ml-2">⯆</span>
          </div>

          {/* Product description removed for cleaner card design */}

          <div className="mb-3 min-h-[3rem] flex items-start">
            <ProductPriceDisplay
              price={originalPrice}
              discountedPrice={hasDiscount ? finalPrice : 0}
              className="w-full"
              finalPriceClassName={hasDiscount ? "text-pink-500 font-bold" : "text-rose-400 font-bold"}
              originalPriceClassName="text-[#1A1A1A] line-through"
              discountTextClassName="neon-discount-text text-sm font-semibold"
            />
          </div>

          <div className="flex items-center justify-between mb-3 pt-2 border-t border-pink-200">
            <div className="flex items-center gap-1">
              <span className="text-[#1A1A1A] text-xs bg-white px-1.5 py-0.5 rounded flex items-center gap-1 sm:px-2 sm:py-1">
                <span className="hidden sm:inline">🏷️</span>
                <span className="hidden sm:inline">كود: </span>
                <span className="sm:hidden">#</span>
                <span className="sm:hidden text-[10px]">{product.barcode?.substring(0, 6) || 'N/A'}</span>
                <span className="hidden sm:inline">{product.barcode}</span>
              </span>
            </div>
            <span className="text-[#1A1A1A] text-xs flex items-center gap-1">
              <span>📦</span>
              <span className="hidden sm:inline">متوفر: {product.stock}</span>
              <span className="sm:hidden">{product.stock}</span>
            </span>
          </div>

          {product.audio_url && (
            <div className="mb-3">
              <audio
                ref={audioRef}
                src={product.audio_url}
                preload="none"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  const a = audioRef.current;
                  if (!a) return;
                  if (isPlaying) a.pause();
                  else a.play().catch(() => {});
                }}
                className="border-[#FF2F92] text-[#FF2F92] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/80 text-xs py-1 px-2 font-bold"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                <span>{isPlaying ? "إيقاف" : "استماع"}</span>
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
            <Button
              onClick={(e) => {
                triggerNeonBurst(e.currentTarget);
                addToCart(product);
                trackAdd(product.id);
              }}
              className="flex-1 gradient-bg add-to-cart-image-bg hover:shadow-lg text-white font-bold py-2 px-3 transition-all duration-200 sm:py-2.5 sm:px-4 relative overflow-visible disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
              disabled={product.stock === 0}
              aria-disabled={product.stock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-1 sm:mr-2" strokeWidth={2} />
              <span className="truncate text-sm sm:text-base">
                {product.stock === 0 ? "غير متوفر" : "إضافة للسلة"}
              </span>
            </Button>
            <Button
              onClick={handleViewProduct}
              variant="outline"
              className="border-[#FF2F92] text-[#FF2F92] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/80 font-bold py-2 px-3 min-w-[70px] transition-all duration-200 sm:py-2.5 sm:px-4 sm:min-w-[80px]"
            >
              <Eye className="h-4 w-4 mr-1" strokeWidth={2} />
              <span className="text-sm sm:text-base">عرض</span>
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProductCard;
