import React, { useState, useEffect, useTransition } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { categoriesData } from '@/data/products';
import { useSupabase } from '@/contexts/SupabaseContext';
import { toast } from "@/components/ui/use-toast";
import { fetchSubcategoriesByCategory, filterProductsBySubcategories, parseSubcategoryParam, createSubcategoryParam, fetchSubcategoryIdsBySlugs } from '@/lib/subcategoryService';

const ProductsPage = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterByAvailability, setFilterByAvailability] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const productsPerPage = 12;
  const { supabase } = useSupabase();
  const [aiSearching, setAiSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        let query = supabase.from('products').select('id, *').eq('published', true);
        const { data, error } = await query;

        if (error) throw error;
        setAllProducts(data || []);
      } catch (error) {
        console.error("Error fetching all products:", error?.message || error);
        // Only show error toast for non-network errors
        if (error?.message && !error.message.includes('Failed to fetch')) {
          toast({
            title: "خطأ في تحميل المنتجات",
            description: "لم نتمكن من تحميل جميع المنتجات. يرجى المحاولة مرة أخرى.",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };
    if (supabase) {
      fetchAllProducts();
    }
  }, [supabase]);

  // Fetch subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      // Clear previous subcategories and selection
      setSubcategories([]);
      setSelectedSubcategories([]);

      if (category && category !== 'all') {
        setLoadingSubcategories(true);
        try {
          const data = await fetchSubcategoriesByCategory(supabase, category);
          setSubcategories(data);

          // Parse subcategory parameter from URL (these are slugs)
          const subcategoryParam = searchParams.get('subcategory');
          if (subcategoryParam) {
            const slugs = parseSubcategoryParam(subcategoryParam);
            // Convert slugs to numeric IDs by fetching from database
            const ids = await fetchSubcategoryIdsBySlugs(supabase, slugs);
            setSelectedSubcategories(ids);
          }
        } catch (error) {
          console.error('Error loading subcategories:', error);
        } finally {
          setLoadingSubcategories(false);
        }
      }
    };

    loadSubcategories();
  }, [category, supabase, searchParams]);

  useEffect(() => {
    if (loading || aiSearching) return;

    let result = [...allProducts];
    const filterParam = searchParams.get('filter');
    const isAllView = (!category || category === 'all') && !filterParam;

    // التحقق من الفلترة بناءً على النوع أولاً
    if (filterParam === 'discounted') {
      result = result.filter(product => product.is_discounted);
    } else if (filterParam === 'featured') {
      result = result.filter(product => product.is_featured);
    }

    // تصفية حسب الفئة - التأكد من عدم عرض جميع المنتجات إلا إذا كانت الفئة 'all' صراحة
    if (category && category !== 'all') {
      result = result.filter(product => product.category === category);
    } else if (!category && !filterParam) {
      // فقط في حالة عدم وجود فئة أو فلتر، أظهر جميع المنتجات
      result = allProducts;
    }

    // Filter by subcategories if any are selected
    if (selectedSubcategories.length > 0) {
      result = filterProductsBySubcategories(result, selectedSubcategories);
    }

    // في صفحة "جميع المنتجات"، اعر�� النتائج ب��رتيب عشوائي ما لم يختَر المستخدم نوع فرز مختلف
    if (isAllView && sortBy === 'name' && !searchTerm && filterByAvailability === 'all' && selectedSubcategories.length === 0) {
      result = shuffleArray(result);
    }

    if (searchTerm) {
      result = result.filter(product =>
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.name_en && product.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description_en && product.description_en.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterByAvailability === 'discounted') {
      result = result.filter(product => product.is_discounted);
    } else if (filterByAvailability === 'low-stock') {
      result = result.filter(product => product.stock <= 5 && product.stock > 0);
    } else if (filterByAvailability === 'out-of-stock') {
      result = result.filter(product => product.stock === 0);
    }

    if (!(isAllView && sortBy === 'name' && !searchTerm && filterByAvailability === 'all')) {
      result.sort((a, b) => {
        const priceA = a.is_discounted ? getDiscountedPrice(a.price, a.discount_percent) : a.price;
        const priceB = b.is_discounted ? getDiscountedPrice(b.price, b.discount_percent) : b.price;
        switch (sortBy) {
          case 'price-low':
            return priceA - priceB;
          case 'price-high':
            return priceB - priceA;
          case 'name':
          default:
            return (a.name || '').localeCompare(b.name || '', 'ar');
        }
      });
    }

    startTransition(() => {
      setFilteredProducts(result);
      setCurrentPage(1);
    });
  }, [category, searchParams, searchTerm, sortBy, filterByAvailability, selectedSubcategories, allProducts, loading, aiSearching]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  const currentCategoryInfo = categoriesData.find(cat => cat.id === category);
  const filterParam = searchParams.get('filter');
  
  let pageTitle = 'جميع المنتجات';
  if (filterParam === 'discounted') pageTitle = 'المنتجات المخفضة';
  else if (filterParam === 'featured') pageTitle = 'الكمية المحدودة';
  else if (currentCategoryInfo) pageTitle = currentCategoryInfo.name;

  const getDiscountedPrice = (price, discountPercent) => {
    if (!price || !discountPercent) return price;
    return price - (price * discountPercent / 100);
  };

  const handleCategoryClick = (catId) => {
    // منع التنقل إذا كنا في نفس الفئة بالفعل
    if (catId === category || (catId === 'all' && !category)) {
      return;
    }

    setAiSearching(false);
    navigate(catId === 'all' ? '/products' : `/products/${catId}`);
  };

  const handleSubcategoryToggle = (subcategoryId) => {
    let updated = [...selectedSubcategories];
    const index = updated.indexOf(subcategoryId);

    if (index > -1) {
      // Remove if already selected
      updated.splice(index, 1);
    } else {
      // Add if not selected
      updated.push(subcategoryId);
    }

    setSelectedSubcategories(updated);

    // Update URL with selected subcategories using slugs (for readability)
    const selectedSlugs = updated.map(id => {
      const subcategory = subcategories.find(sub => sub.id === id);
      return subcategory?.slug || '';
    }).filter(slug => slug);

    const queryParam = selectedSlugs.length > 0 ? selectedSlugs.join(',') : '';
    const newSearchParams = new URLSearchParams(searchParams);

    if (queryParam) {
      newSearchParams.set('subcategory', queryParam);
    } else {
      newSearchParams.delete('subcategory');
    }

    const queryString = newSearchParams.toString();
    navigate(`/products/${category}${queryString ? '?' + queryString : ''}`);
  };

  const handleClearSubcategories = () => {
    setSelectedSubcategories([]);

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('subcategory');

    const queryString = newSearchParams.toString();
    navigate(`/products/${category}${queryString ? '?' + queryString : ''}`);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 py-8 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#FF2F92] mb-4">{pageTitle}</h1>
          {!loading && (
            <p className="text-[#1A1A1A] font-medium">
              عرض {filteredProducts.length} منتج
            </p>
          )}
          {(loading || aiSearching) && <p className="text-[#5A3E55]/70">جاري تحميل المنتجات...</p>}
        </motion.div>

        <div className="mb-2 hidden md:flex items-center gap-2">
          {categoriesData.filter(c => c.id === 'all').map(cat => (
            <Button
              key={cat.id}
              variant={!category && cat.id === 'all' && !filterParam ? "default" : "outline"}
              className={`${(!category && cat.id === 'all' && !filterParam) ? "gradient-bg text-white font-bold rounded-full" : "border-[#FF2F92]/30 text-[#5A3E55] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/60 rounded-full font-semibold"}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
          <Button
            variant="outline"
            className="border-[#FF2F92]/30 text-[#5A3E55] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/60 flex items-center gap-2 font-semibold rounded-full"
            onClick={() => setIsDesktopFilterOpen(v => !v)}
          >
            <Filter className="h-4 w-4" />
            <span>فلترة الفئات</span>
            <ChevronDown className={`h-4 w-4 transition-transform text-[#FF2F92] ${isDesktopFilterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        <AnimatePresence>
          {isDesktopFilterOpen && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              className="hidden md:block mt-2 mb-6 origin-top overflow-hidden"
            >
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="flex flex-wrap gap-2"
                style={{ willChange: 'transform' }}
              >
                {categoriesData.filter(c => c.id !== 'all').map((cat) => (
                  <motion.div key={cat.id} variants={itemVariants}>
                    <Button
                      variant={category === cat.id ? "default" : "outline"}
                      className={`${category === cat.id ? "gradient-bg text-white font-bold rounded-full" : "border-[#FF2F92]/30 text-[#5A3E55] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/60 rounded-full font-semibold"}`}
                      onClick={() => handleCategoryClick(cat.id)}
                    >
                      {cat.name}
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        <div className="grid lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-2 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#FF2F92]/50 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث عن المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-lg bg-pink-100/20 border border-[#FF2F92]/30 text-[#5A3E55] placeholder-[#5A3E55]/50 focus:outline-none focus:ring-2 focus:ring-[#FF2F92] font-medium"
            />
          </div>

          <div className="relative">
            <select
              value={filterByAvailability}
              onChange={(e) => setFilterByAvailability(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-pink-100/20 border border-[#FF2F92]/30 text-[#5A3E55] focus:outline-none focus:ring-2 focus:ring-[#FF2F92] appearance-none font-medium"
            >
              <option value="all">كل حالات التوفر</option>
              <option value="discounted">المنتجات المخفضة</option>
              <option value="low-stock">مخزون قليل (1-5)</option>
              <option value="out-of-stock">نفد المخزون</option>
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#FF2F92]/50 h-5 w-5 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-pink-100/20 border border-[#FF2F92]/30 text-[#5A3E55] focus:outline-none focus:ring-2 focus:ring-[#FF2F92] appearance-none font-medium"
            >
              <option value="name">ترتيب حسب الاسم</option>
              <option value="price-low">السعر: من الأقل للأعلى</option>
              <option value="price-high">السعر: من الأعلى للأقل</option>
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#FF2F92]/50 h-5 w-5 pointer-events-none" />
          </div>
        </div>

        {/* Subcategory Filter - Glass Card Style (Desktop) - Always Mounted */}
        {category && category !== 'all' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="filter-glass-card mb-6 hidden lg:block"
          >
            <div className="filter-glass-header">
              <div className="filter-glass-title">
                تصفية حسب النوع
              </div>
              {selectedSubcategories.length > 0 && (
                <button
                  onClick={handleClearSubcategories}
                  className="filter-glass-clear-btn"
                >
                  <X className="h-3 w-3" />
                  مسح
                </button>
              )}
            </div>

            <div className="filter-glass-panel">
              {loadingSubcategories ? (
                <p className="filter-glass-loading">جاري تحميل...</p>
              ) : subcategories.length > 0 ? (
                <div className="filter-glass-options">
                  {subcategories.map((sub) => (
                    <label key={sub.id} className="filter-glass-label">
                      <input
                        type="checkbox"
                        checked={selectedSubcategories.includes(sub.id)}
                        onChange={() => handleSubcategoryToggle(sub.id)}
                        className="filter-glass-checkbox"
                      />
                      <span className="filter-glass-text">
                        {sub.name_ar || sub.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="filter-glass-empty">لا توجد أنواع متاحة في هذه الفئة</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Mobile Subcategory Filter Toggle - Always Mounted */}
        {category && category !== 'all' && (
          <div className="md:hidden mb-4">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="w-full px-4 py-3 rounded-lg bg-pink-100/20 border border-[#FF2F92]/30 text-[#5A3E55] font-medium flex items-center justify-between hover:bg-[#FF2F92]/5 transition-colors"
            >
              <span>تصفية حسب النوع</span>
              <ChevronDown className={`h-5 w-5 text-[#FF2F92] transition-transform ${mobileFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {mobileFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-4 bg-white rounded-lg border border-[#FF2F92]/20"
                >
                  {loadingSubcategories ? (
                    <p className="text-[#5A3E55]/50 text-sm">جاري تحميل الأنواع...</p>
                  ) : subcategories.length > 0 ? (
                    <div className="space-y-3">
                      {subcategories.map((sub) => (
                        <label key={sub.id} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedSubcategories.includes(sub.id)}
                            onChange={() => handleSubcategoryToggle(sub.id)}
                            className="w-4 h-4 rounded border-[#FF2F92]/30 text-[#FF2F92] focus:ring-[#FF2F92] cursor-pointer"
                          />
                          <span className="text-sm text-[#5A3E55] group-hover:text-[#FF2F92] transition-colors">
                            {sub.name_ar || sub.name}
                          </span>
                        </label>
                      ))}
                      {selectedSubcategories.length > 0 && (
                        <button
                          onClick={handleClearSubcategories}
                          className="w-full mt-3 pt-3 border-t border-[#FF2F92]/20 text-xs text-[#FF2F92] hover:text-[#FF2F92]/70 font-medium flex items-center justify-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          مسح الكل
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[#5A3E55]/50 text-sm text-center">لا توجد أنواع متاحة في هذه الفئة</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="md:hidden mb-4 relative">
          <div className="flex gap-2 mb-2">
            {categoriesData.filter(c => c.id === 'all').map(cat => (
              <Button
                key={cat.id}
                variant={!category && cat.id === 'all' && !filterParam ? "default" : "outline"}
                className={`${(!category && cat.id === 'all' && !filterParam) ? "gradient-bg text-white font-bold rounded-full" : "border-[#FF2F92]/30 text-[#5A3E55] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/60 rounded-full font-semibold"} flex-1`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
            {categoriesData.filter(c => c.id !== 'all').map(cat => (
              <Button
                key={cat.id}
                variant={category === cat.id ? "default" : "outline"}
                className={`${category === cat.id ? "gradient-bg text-white font-bold rounded-full" : "border-[#FF2F92]/30 text-[#5A3E55] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/60 rounded-full font-semibold"} shrink-0 whitespace-nowrap`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="mb-8">
          {loading || aiSearching ? (
              <div className="text-center py-16 text-[#5A3E55]/70 font-medium">{aiSearching ? 'جاري البحث بذكاء...' : 'جاري تحميل المنتجات...'}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-[#1A1A1A] text-lg font-medium">
                لم يتم العثور على منتجات مطابقة لبحثك أو الفلترة المختارة.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>

        {!loading && !aiSearching && totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                className={`${
                  currentPage === page
                    ? "gradient-bg text-white font-bold rounded-full"
                    : "border-[#FF2F92]/30 text-[#5A3E55] hover:bg-[#FF2F92]/10 hover:border-[#FF2F92]/60 rounded-full font-semibold"
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
};

export default ProductsPage;
