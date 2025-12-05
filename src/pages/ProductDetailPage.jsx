import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Share2, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { formatPrice, getDiscountedPrice } from '@/data/products';
import { useSupabase } from '@/contexts/SupabaseContext';
import ProductPriceDisplay from '@/components/ProductPriceDisplay';
import { toast } from '@/components/ui/use-toast';
import { getProductSlug, generateShortSlug, generateCategorySlug, generateCleanProductName } from '@/lib/slugUtils';
import { triggerNeonBurst } from '@/lib/neonBurst';
import { protectProductImage, unprotectProductImage } from '@/lib/imageProtection';

// Function to get icon for specification
const getSpecIcon = (specText) => {
  const iconClass = "w-5 h-5 inline-block mr-2 text-purple-400";

  if (specText.includes('المعالج (CPU)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M8 3v5m8 0V3m0 18v-5m-8 5v-5M3 8h5m10 0h5M8 16H3m18 0h-5" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    );
  }
  if (specText.includes('الذاكرة (RAM)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="8" width="20" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M6 8V6a1 1 0 011-1h2a1 1 0 011 1v2M14 8V6a1 1 0 011-1h2a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="6" cy="12" r="1" fill="currentColor"/>
        <circle cx="10" cy="12" r="1" fill="currentColor"/>
        <circle cx="14" cy="12" r="1" fill="currentColor"/>
        <circle cx="18" cy="12" r="1" fill="currentColor"/>
      </svg>
    );
  }
  if (specText.includes('التخزين (SSD)') || specText.includes('التخزين (HDD)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="7" cy="8" r="1" fill="currentColor"/>
        <path d="M10 8h8M10 12h8M10 16h4" stroke="currentColor" strokeWidth="2"/>
        <circle cx="7" cy="12" r="1" fill="currentColor"/>
        <circle cx="7" cy="16" r="1" fill="currentColor"/>
      </svg>
    );
  }
  if (specText.includes('بطاقة الرسوميات (GPU)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="5" y="9" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M1 10h1m0 4h-1M22 10h1m0 4h-1" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    );
  }
  if (specText.includes('اللوحة الأم (Motherboard)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="5" y="5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="15" y="5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="5" y="15" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="10" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M9 7h6M7 9v6M17 9v6M9 17h6" stroke="currentColor" strokeWidth="1"/>
      </svg>
    );
  }
  if (specText.includes('مزود الطاقة (PSU)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="8" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M7 8V6a1 1 0 011-1h8a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
        <path d="M10 10v8M12 10v8M14 10v8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M21 11h-2M5 11H3M21 15h-2M5 15H3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    );
  }
  if (specText.includes('التبريد (Cooler)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M12 3v6m0 6v6M3 12h6m6 0h6" stroke="currentColor" strokeWidth="2"/>
        <path d="M6.34 6.34l4.24 4.24m5.66 0l4.24-4.24M6.34 17.66l4.24-4.24m5.66 0l4.24 4.24" stroke="currentColor" strokeWidth="1"/>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
      </svg>
    );
  }
  if (specText.includes('الهيكل (Case)')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="8" y="5" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="15" cy="9" r="1" fill="currentColor"/>
        <rect x="8" y="11" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="8" y="17" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M10 13h4M11 13.5h2" stroke="currentColor" strokeWidth="1"/>
      </svg>
    );
  }

  return null;
};

// Function to format specifications for desktop devices
const formatDesktopSpecifications = (description, category) => {
  // Only apply formatting to computers/desktop devices category
  if (category !== 'computers' && category !== 'أجهزة مكتبية') {
    return description;
  }

  // List of specifications to make bold
  const specLabels = [
    'المعالج (CPU):',
    'الذاكرة (RAM):',
    'التخزين (SSD):',
    'بطاقة الرسوميات (GPU):',
    'اللوحة الأم (Motherboard):',
    'مزود الطاقة (PSU):',
    'التبريد (Cooler):',
    'الهيكل (Case):'
  ];

  let formattedDescription = description;

  specLabels.forEach(label => {
    const regex = new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    formattedDescription = formattedDescription.replace(regex, `**$1**`);
  });

  return formattedDescription;
};

const MAGNIFIER_LENS_SIZE = 160;
const MAGNIFIER_ZOOM = 2.4;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ProductDetailPage = () => {
  const { slug, category, cleanName } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();
  const [allProductImages, setAllProductImages] = useState([]);
  const [lensState, setLensState] = useState({
    visible: false,
    left: 0,
    top: 0,
    backgroundSize: '0px 0px',
    backgroundPosition: '0px 0px',
  });

  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);
  const naturalDimensionsRef = useRef({ width: 0, height: 0 });

  const captureNaturalDimensions = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    naturalDimensionsRef.current = {
      width: img.naturalWidth || 0,
      height: img.naturalHeight || 0,
    };
  }, []);

  const updateLensPosition = useCallback((clientX, clientY) => {
    const container = imageContainerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (!imgRect.width || !imgRect.height) return;

    const { width: naturalWidth, height: naturalHeight } = naturalDimensionsRef.current;
    const scaleX = naturalWidth && imgRect.width ? naturalWidth / imgRect.width : MAGNIFIER_ZOOM;
    const scaleY = naturalHeight && imgRect.height ? naturalHeight / imgRect.height : MAGNIFIER_ZOOM;
    const backgroundWidth = naturalWidth || imgRect.width * MAGNIFIER_ZOOM;
    const backgroundHeight = naturalHeight || imgRect.height * MAGNIFIER_ZOOM;

    const offsetX = clientX - imgRect.left;
    const offsetY = clientY - imgRect.top;

    const clampedX = clamp(offsetX, 0, imgRect.width);
    const clampedY = clamp(offsetY, 0, imgRect.height);

    const baseLeft = imgRect.left - containerRect.left;
    const baseTop = imgRect.top - containerRect.top;

    const lensLeft = clamp(
      baseLeft + clampedX - MAGNIFIER_LENS_SIZE / 2,
      baseLeft,
      baseLeft + Math.max(imgRect.width - MAGNIFIER_LENS_SIZE, 0),
    );

    const lensTop = clamp(
      baseTop + clampedY - MAGNIFIER_LENS_SIZE / 2,
      baseTop,
      baseTop + Math.max(imgRect.height - MAGNIFIER_LENS_SIZE, 0),
    );

    setLensState({
      visible: true,
      left: lensLeft,
      top: lensTop,
      backgroundSize: `${backgroundWidth}px ${backgroundHeight}px`,
      backgroundPosition: `-${clampedX * scaleX - MAGNIFIER_LENS_SIZE / 2}px -${
        clampedY * scaleY - MAGNIFIER_LENS_SIZE / 2
      }px`,
    });
  }, []);

  const hideLens = useCallback(() => {
    setLensState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  const handleMouseMove = useCallback(
    (event) => {
      updateLensPosition(event.clientX, event.clientY);
    },
    [updateLensPosition],
  );

  const handleTouchInteraction = useCallback(
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      if (!event.touches || event.touches.length === 0) return;
      const touch = event.touches[0];
      updateLensPosition(touch.clientX, touch.clientY);
    },
    [updateLensPosition],
  );

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    hideLens();
    captureNaturalDimensions();

    if (img.complete) {
      captureNaturalDimensions();
    } else {
      img.addEventListener('load', captureNaturalDimensions, { once: true });
    }

    return () => {
      img.removeEventListener('load', captureNaturalDimensions);
    };
  }, [mainImage, hideLens, captureNaturalDimensions]);

  useEffect(() => {
    const handleResize = () => hideLens();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hideLens]);

  useEffect(() => {
    if (imageRef.current) {
      protectProductImage(imageRef.current);
    }

    // Also protect all product thumbnail images
    const thumbnailImages = document.querySelectorAll('img.product-image');
    thumbnailImages.forEach(img => {
      if (img !== imageRef.current) {
        protectProductImage(img);
      }
    });

    return () => {
      if (imageRef.current) {
        unprotectProductImage(imageRef.current);
      }
      thumbnailImages.forEach(img => {
        unprotectProductImage(img);
      });
    };
  }, [mainImage, allProductImages]);

  // Force Tracking View even if product loaded from fallback
  useEffect(() => {
    if (!product || !product.id) return;

    const trackView = async () => {
      try {
        console.log('Tracking product view for product:', product.id);
        await supabase.from('product_views').insert({
          product_id: product.id
        });
        console.log('Product view tracked successfully');
      } catch (error) {
        console.log('ViewTrackError:', error.message);
      }
    };

    // Run after slight delay to ensure slug/product are fully loaded
    setTimeout(trackView, 200);
  }, [product?.id, supabase]);

  useEffect(() => {
    const fetchProductAndRelated = async () => {
      // If route params missing entirely, stop with not-found; otherwise wait for supabase without clearing loading
      if (!slug && (!category || !cleanName)) {
        setLoading(false);
        return;
      }
      if (!supabase) {
        return; // wait for supabase to be available
      }
      setLoading(true);
      try {
        let productData = null;

        // New URL structure: /product/{category}/{cleanName}
        if (category && cleanName) {
          const { data: allProducts, error: allProductsError } = await supabase
            .from('products')
            .select('id, *');

          if (!allProductsError && allProducts) {
            productData = allProducts.find(p => {
              const productCategory = generateCategorySlug(p.category_en || p.category);
              const productCleanName = p.url_name || generateCleanProductName(p);

              return productCategory === category && productCleanName === cleanName;
            });
          }
        }

        // Fallback: Old URL structure with slug
        if (!productData && slug) {
          // First try to find by slug
          let { data: slugProductData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('slug', slug)
            .single();

          if (slugProductData) {
            productData = slugProductData;
          } else if (productError) {
            // If not found by slug, try to find by matching the generated short slug
            const { data: allProducts, error: allProductsError } = await supabase
              .from('products')
              .select('id, *');

            if (!allProductsError && allProducts) {
              productData = allProducts.find(p => getProductSlug(p) === slug);
            }
          }
        }

        if (!productData) {
          console.error("Error fetching product:", productError?.message);
          toast({
            title: "المنتج غير موجود",
            description: "لم نتمكن من العثو�� على هذا المنتج. ربما تم حذفه.",
            variant: "destructive",
          });
          navigate('/products');
          return;
        }
        setProduct(productData);

        const images = [
          productData.main_image_url,
          productData.image_1,
          productData.image_2,
          productData.image_3,
          productData.image_4,
        ].filter(Boolean).slice(0, 5);
        
        setAllProductImages(images);
        setMainImage(images.length > 0 ? images[0] : 'https://via.placeholder.com/600x400?text=No+Image');
        
        const { data: relatedData, error: relatedError } = await supabase
          .from('products')
          .select('id, *')
          .neq('id', productData.id)
          .or(`category.eq.${productData.category},is_discounted.eq.true`)
          .limit(4);

        if (relatedError) {
          console.error("Error fetching related products:", relatedError?.message || relatedError);
        } else {
          setRelatedProducts(relatedData || []);
        }

      } catch (error) {
        console.error("Unexpected error:", error?.message || error);
        toast({
          title: "خطأ غير متوقع",
          description: "حدث خطأ غير متوقع. يرجى ��لمحاولة مرة أخرى.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndRelated();
    window.scrollTo(0, 0);
  }, [slug, category, cleanName, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">جاري التح��يل...</div>
      </div>
    );
  }

  if (!product) {
    return (
       <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">المنتج غير موجود</h1>
            <p className="text-white/70">عذراً، لم نتمكن من العثور على المنتج الذي تبحث عنه.</p>
            <Button onClick={() => navigate('/products')} className="mt-6">العودة للمنتجات</Button>
        </div>
        <Footer />
      </div>
    );
  }

  // تحديد ما إذا كان المنتج مخفض حقاً
  const isProductDiscounted = product.is_discounted === true || (product.discount_percent && product.discount_percent > 0);

  const discountedPrice = product.is_discounted && product.discount_percent
    ? getDiscountedPrice(product.price, product.discount_percent)
    : product.price;

  const handleAddToCart = async () => {
    addToCart(product, quantity);

    try {
      console.log('Tracking add to cart for product:', product.id);
      await supabase
        .from('product_add_to_cart')
        .insert({ product_id: product.id });
      console.log('Add to cart tracked successfully');
    } catch (error) {
      console.log('AddCartTrackError:', error.message);
    }
  };

  const handleBuyNow = async () => {
    addToCart(product, quantity);

    try {
      console.log('Tracking add to cart for buy now with product:', product.id);
      await supabase
        .from('product_add_to_cart')
        .insert({ product_id: product.id });
      console.log('Buy now tracked successfully');
    } catch (error) {
      console.log('AddCartTrackError:', error.message);
    }

    toast({
      title: "تم إضافة المنتج ✓",
      description: "يرجى ملء بيانات العميل لإتمام الطلب",
      duration: 3000
    });
    navigate('/checkout');
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = product.name;
    const shareText = `اطلع على ${product.name}: ${product.description}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "تمت المشاركة!",
          description: "تم مشاركة رابط المنتج بنجاح.",
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "تم النسخ!",
          description: "تم نسخ رابط المنتج إلى الحافظة.",
        });
      }
    } catch (error) {
      console.error('Error sharing product:', error?.message || error);
      toast({
        title: "خطأ في المشاركة",
        description: "لم نتمكن من مشاركة المنتج. حاول مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8"
        >
          <button onClick={() => navigate('/products')} className="breadcrumb-link">
            المنتجات
          </button>
          <ArrowLeft className="h-4 w-4 breadcrumb-link" />
          <span className="breadcrumb-current">{product.name}</span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div
              className="relative overflow-hidden rounded-2xl shadow-2xl bg-white flex justify-center items-center product-magnifier-container"
              ref={imageContainerRef}
              onMouseEnter={handleMouseMove}
              onMouseMove={handleMouseMove}
              onMouseLeave={hideLens}
              onTouchStart={handleTouchInteraction}
              onTouchMove={handleTouchInteraction}
              onTouchEnd={hideLens}
              onTouchCancel={hideLens}
            >
              <img
                ref={imageRef}
                src={mainImage}
                alt={product.name}
                crossOrigin="anonymous"
                className="product-image product-detail-image max-w-full max-h-[500px] h-auto object-contain transition-all duration-300 ease-in-out p-4 select-none"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
                onError={(e) => {e.target.style.display = 'none';}}
              />
              <div
                className={`product-magnifier-lens ${lensState.visible ? 'product-magnifier-lens-visible' : 'product-magnifier-lens-hidden'}`}
                style={{
                  width: MAGNIFIER_LENS_SIZE,
                  height: MAGNIFIER_LENS_SIZE,
                  left: lensState.left,
                  top: lensState.top,
                  backgroundImage: `url(${mainImage})`,
                  backgroundSize: lensState.backgroundSize,
                  backgroundPosition: lensState.backgroundPosition,
                }}
                aria-hidden="true"
              />
              {product.is_discounted && product.discount_percent > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                  -{product.discount_percent}%
                </div>
              )}
            </div>
            
            {allProductImages.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {allProductImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setMainImage(image)}
                    className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ease-in-out aspect-square
                      ${mainImage === image ? 'border-purple-500 scale-105 shadow-lg' : 'border-gray-700 hover:border-purple-400'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name_en || product.name} thumbnail ${index + 1}`}
                      crossOrigin="anonymous"
                      onError={(e) => {e.target.src = 'https://via.placeholder.com/100';}}
                      className="product-image w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 flex flex-col"
          >
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold product-title-dark-pink mb-3">{product.name}</h1>
              <div className="product-description-cosmetic text-lg leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
                {formatDesktopSpecifications(product.description, product.category).split('\n').map((line, index) => {
                  // Check if line contains bold markers
                  if (line.includes('**')) {
                    const parts = line.split(/(\*\*.*?\*\*)/);
                    return (
                      <div key={index} className="mb-1">
                        {parts.map((part, partIndex) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            const specText = part.slice(2, -2);
                            const icon = getSpecIcon(specText);
                            return (
                              <span key={partIndex} className="font-bold text-black inline-flex items-center">
                                {icon}
                                {specText}
                              </span>
                            );
                          }
                          return <span key={partIndex} className="inline">{part}</span>;
                        })}
                      </div>
                    );
                  }
                  return <div key={index} className="mb-1">{line}</div>;
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <ProductPriceDisplay
                price={product.price}
                discountedPrice={isProductDiscounted && product.discounted_price ? product.discounted_price : 0}
                finalPriceClassName="text-4xl font-bold text-purple-400"
                originalPriceClassName="text-white/50 text-xl line-through ml-4"
                discountTextClassName="text-green-400 text-lg ml-4"
                className="flex flex-col items-start"
              />
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-black font-semibold">المخزون:</span>
              <span className="stock-value font-bold px-2 py-0.5 rounded-md">
                {product.stock > 0 ? `${product.stock} قطعة متوفرة` : 'نفد المخزون'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-black font-semibold">الرمز (Barcode):</span>
              <span className="barcode-value">{product.barcode}</span>
            </div>

            {product.stock > 0 && (
              <div className="flex items-center gap-4 pt-2">
                <span className="text-black font-semibold">الكمية:</span>
                <div className="quantity-selector-box">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="quantity-control-button"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="quantity-display">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="quantity-control-button"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={(e) => { triggerNeonBurst(e.currentTarget); handleAddToCart(); }}
                className="flex-1 add-to-cart-button text-white text-lg py-3 shadow-lg hover:shadow-lg transition-all relative overflow-visible"
                disabled={product.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.stock === 0 ? 'نفد المخزون' : 'إضافة للسلة'}
              </Button>
              <Button
                onClick={handleBuyNow}
                className="flex-1 order-now-button text-white text-lg py-3 shadow-lg hover:shadow-lg transition-all"
                style={{ color: "rgba(255, 255, 255, 1)" }}
                disabled={product.stock === 0}
              >
                اطلب الآن
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                variant="ghost" 
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5 mr-2" />
                مشاركة المنتج
              </Button>
            </div>
          </motion.div>
        </div>

        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-6">قد يعجبك أيضاً</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((relatedProduct, index) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
