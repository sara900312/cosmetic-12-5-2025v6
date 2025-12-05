import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Star, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/components/ui/use-toast";

const HomePage = () => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [homepageImages, setHomepageImages] = useState({
    banner: null,
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  // Helper function to check if URL is a video file
  const isVideoFile = (url) => {
    if (!url) return false;
    const videoExtensions = ['.webm', '.mp4', '.ogg', '.avi', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Component to render media (image or video)
  const MediaRenderer = ({ src, alt, className }) => {
    if (isVideoFile(src)) {
      return (
        <video
          className={className}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          crossOrigin="anonymous"
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => console.error('Video load error:', e?.message || 'Unknown error')}
          style={{ userSelect: 'none' }}
        >
          {alt && <track kind="captions" />}
        </video>
      );
    }
    return <img className={className} src={src} alt={alt} crossOrigin="anonymous" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none' }} onError={(e) => {e.target.style.display = 'none';}} />;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const [productsResponse, imagesResponse] = await Promise.all([
          supabase
            .from("products")
            .select("id, *")
            .eq("is_popular", true)
            .limit(10),
          supabase
            .from("homepage_images")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
        ]);

        if (productsResponse.error) throw productsResponse.error;
        if (imagesResponse.error) throw imagesResponse.error;

        setPopularProducts(productsResponse.data || []);

        const banner = imagesResponse.data.find((img) => img.type === "banner");
        const categories = imagesResponse.data.filter(
          (img) => img.type === "category",
        );

        setHomepageImages({
          banner: banner || null,
          categories: categories || [],
        });
      } catch (error) {
        console.error("Error fetching data:", error?.message || error);
        // Only show error toast for non-network errors
        if (error?.message && !error.message.includes('Failed to fetch')) {
          toast({
            title: "خطأ في تحميل البيانات",
            description: "لم نتمكن من تحميل البيانات. يرجى المحاولة مرة أخرى.",
            variant: "destructive",
          });
        }
        // Continue rendering page even if data fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative overflow-hidden py-20 lg:pb-20 pb-8 bg-white">
        <div className="absolute inset-0 bg-white" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col text-center lg:text-right"
            >
              <h2 className="text-xl text-[#1A1A1A] mb-1">مرحباً بكم في</h2>
              <h1 className="text-4xl lg:text-6xl font-bold text-gradient mb-6" style={{ minHeight: "62px" }}>
                <strong>NEOMART Beauty</strong>
              </h1>
              <div className="text-xl text-[#1A1A1A]" style={{ margin: "0 auto 32px 0" }}>
                <p>
                  <strong>
                    اكتشفي أحدث منتجات العناية والجمال من أشهر الماركات،
                    بجودة عالية وأسعار تنافسية في العراق.
                  </strong>
                </p>
              </div>
              <Link to="/products">
                <Button className="gradient-bg hover:opacity-90 text-white text-lg px-8 py-3 neon-glow">
                  عرض المنتجات
                  <ArrowLeft className="mr-2 h-5 w-5" strokeWidth={2} />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative overflow-hidden flex justify-center items-center lg:order-last order-last mt-8 lg:mt-0"
            >
              {!loading && homepageImages.banner ? (
                <MediaRenderer
                  className="w-full max-w-[400px] lg:max-w-[800px] h-auto lg:h-[600px] object-contain rounded-2xl block"
                  src={homepageImages.banner.image_url}
                  alt={homepageImages.banner.alt_text}
                />
              ) : null}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 -mt-8 lg:-mt-5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-right mb-12"
          >
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">المجموعات</h2>
            <div className="h-1 w-full bg-gradient-to-l from-pink-400/50 via-rose-300/50 to-transparent"></div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "عرض جميع المنتجات",
                link: "/products",
                icon: <Star className="h-6 w-6" strokeWidth={2} />,
              },
              {
                title: "الخصومات",
                link: "/products?filter=discounted",
                icon: <Zap className="h-6 w-6" strokeWidth={2} />,
              },
              {
                title: "الكمية المحدودة",
                link: "/products?filter=featured",
                icon: <Shield className="h-6 w-6" strokeWidth={2} />,
              },
            ].map((collection, index) => {
              const categoryImage = homepageImages.categories[index];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group overflow-hidden rounded-2xl hover-lift"
                >
                  {!loading && categoryImage && (
                    <MediaRenderer
                      className="w-full h-64 object-cover"
                      src={categoryImage.image_url}
                      alt={categoryImage.alt_text}
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 mb-2 text-white">
                      {React.cloneElement(collection.icon, { strokeWidth: 2 })}
                      <h3 className="text-xl font-bold neon-pink-text">{collection.title}</h3>
                    </div>
                    <Link to={collection.link}>
                      <Button className="gradient-bg hover:opacity-90 text-white">
                        عرض المجموعة
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl glass-effect p-8 lg:p-16 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-300/20 to-rose-300/20" />
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-6">
                ابحث عن المنتج الذي يناسبك
              </h2>
              <p className="text-xl text-[#1A1A1A] mb-8">
                خدمة البحث الذكي غير متاحة حالياً — ستتوفّر قريباً
              </p>
              <Button className="gradient-bg text-white text-lg px-8 py-3 opacity-70 cursor-not-allowed select-none" aria-disabled="true" title="قريباً">
                البحث الذكي
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">
              المنتجات الشائعة
            </h2>
            <p className="text-[#1A1A1A]/60">أكثر المنتجات طلباً من عملائنا</p>
          </motion.div>

          {loading ? (
            <p className="text-center text-[#1A1A1A]/60">
              جاري تحميل المنتجات الشائعة...
            </p>
          ) : popularProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {popularProducts.slice(0, 5).map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                  />
                ))}
              </div>

              {popularProducts.length > 5 && (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {popularProducts.slice(5, 10).map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={index + 5}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-[#1A1A1A]/60">
              لا توجد منتجات شائعة حالياً.
            </p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
