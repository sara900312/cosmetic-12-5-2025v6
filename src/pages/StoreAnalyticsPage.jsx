import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, ShoppingCart, Eye, ArrowLeft } from 'lucide-react';

const StoreAnalyticsPage = () => {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { userRole, loading: authLoading } = useAuth();

  const [topViewedProducts, setTopViewedProducts] = useState([]);
  const [topCartProducts, setTopCartProducts] = useState([]);
  const [conversionMetrics, setConversionMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authorization
  useEffect(() => {
    if (authLoading) return;
    const canUseFeature = userRole === 'admin' || userRole === 'assistant';
    if (!canUseFeature) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to view analytics.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [authLoading, userRole, navigate]);

  // Fetch analytics data function (memoized with useCallback)
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch top viewed products
      const { data: viewedData, error: viewedError } = await supabase.rpc(
        'get_top_viewed_products'
      );

      if (viewedError) throw new Error(`Viewed Products Error: ${viewedError.message}`);
      setTopViewedProducts(viewedData || []);

      // Fetch top cart products
      const { data: cartData, error: cartError } = await supabase.rpc(
        'get_top_cart_products'
      );

      if (cartError) throw new Error(`Cart Products Error: ${cartError.message}`);
      setTopCartProducts(cartData || []);

      // Fetch conversion metrics
      const { data: conversionData, error: conversionError } = await supabase.rpc(
        'get_conversion_metrics'
      );

      if (conversionError) throw new Error(`Conversion Metrics Error: ${conversionError.message}`);
      setConversionMetrics(conversionData || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err.message);
      toast({
        title: 'Error Loading Analytics',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial data load
  useEffect(() => {
    if (authLoading || !supabase) return;
    console.log('Fetching initial analytics data...');
    fetchAnalytics();
  }, [authLoading, fetchAnalytics]);

  // Subscribe to realtime changes for both product views and add to cart
  useEffect(() => {
    const channel = supabase
      .channel("analytics_stream")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_views"
        },
        (payload) => {
          console.log("Realtime view:", payload);
          fetchAnalytics();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_add_to_cart"
        },
        (payload) => {
          console.log("Realtime add_to_cart:", payload);
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchAnalytics]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const AnalyticsCard = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`inventory-card ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        {Icon && <Icon className="w-6 h-6 text-pink-500" />}
        <h3 className="inventory-section-title mb-0">{title}</h3>
      </div>
      {children}
    </div>
  );

  const DataTable = ({ columns, data, emptyMessage }) => (
    <div className="overflow-x-auto">
      {data.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-right py-3 px-4 font-semibold text-gray-600"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-gray-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  const StatBox = ({ label, value, icon: Icon, color = 'pink' }) => (
    <div className="inventory-card flex flex-col items-center justify-center text-center gap-2">
      {Icon && (
        <Icon
          className={`w-8 h-8 text-${color}-500`}
          style={{ color: color === 'pink' ? '#ff4fa3' : color === 'blue' ? '#3b82f6' : '#10b981' }}
        />
      )}
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="inventory-main-container">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <h1 className="inventory-page-header text-4xl flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-pink-500" />
            تحليلات المتجر
          </h1>
          <Button
            onClick={() => navigate('/inventory')}
            variant="outline"
            className="inventory-button-secondary"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للمخزن
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-4">جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold">خطأ في تحميل البيانات</p>
            <p className="text-red-600 mt-2">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="inventory-button-primary mt-4"
            >
              جرب مجددًا
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox
                label="إجمالي المشاهدات"
                value={topViewedProducts.reduce((sum, p) => sum + (p.view_count || 0), 0)}
                icon={Eye}
                color="pink"
              />
              <StatBox
                label="إجمالي الإضافات للسلة"
                value={topCartProducts.reduce((sum, p) => sum + (p.add_to_cart_count || 0), 0)}
                icon={ShoppingCart}
                color="blue"
              />
              <StatBox
                label="المنتجات النشطة"
                value={conversionMetrics.length}
                icon={TrendingUp}
                color="green"
              />
            </div>

            {/* Analytics Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Viewed Products */}
              <AnalyticsCard title="أكثر المنتجات مشاهدة" icon={Eye}>
                <DataTable
                  columns={[
                    { key: 'name', label: 'اسم المنتج' },
                    {
                      key: 'view_count',
                      label: 'المشاهدات',
                      render: (val) => (
                        <span className="font-semibold text-pink-600">{val}</span>
                      ),
                    },
                    {
                      key: 'last_viewed',
                      label: 'آخر مشاهدة',
                      render: (val) => <span className="text-xs text-gray-500">{formatDate(val)}</span>,
                    },
                  ]}
                  data={topViewedProducts.slice(0, 10)}
                  emptyMessage="لا توجد بيانات مشاهدات حتى الآن"
                />
              </AnalyticsCard>

              {/* Top Cart Products */}
              <AnalyticsCard title="أكثر المنتجات إضافة للسلة" icon={ShoppingCart}>
                <DataTable
                  columns={[
                    { key: 'name', label: 'اسم المنتج' },
                    {
                      key: 'add_to_cart_count',
                      label: 'الإضافات',
                      render: (val) => (
                        <span className="font-semibold text-blue-600">{val}</span>
                      ),
                    },
                    {
                      key: 'last_added',
                      label: 'آخر إضافة',
                      render: (val) => <span className="text-xs text-gray-500">{formatDate(val)}</span>,
                    },
                  ]}
                  data={topCartProducts.slice(0, 10)}
                  emptyMessage="لا توجد بيانات إضافات حتى الآن"
                />
              </AnalyticsCard>
            </div>

            {/* Conversion Metrics */}
            <AnalyticsCard
              title="معدلات التحويل (Views → Cart)"
              icon={TrendingUp}
              className="lg:col-span-full"
            >
              <div className="overflow-x-auto">
                {conversionMetrics.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">
                          اسم المنتج
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">
                          المشاهدات
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">
                          الإضافات للسلة
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600">
                          معدل التحويل
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversionMetrics.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 hover:bg-gray-50 transition"
                        >
                          <td className="py-3 px-4 text-gray-700 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{item.total_views}</td>
                          <td className="py-3 px-4 text-center text-gray-600">
                            {item.total_carts}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(item.conversion_rate, 100)}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="font-semibold text-pink-600 min-w-[50px]">
                                {parseFloat(item.conversion_rate).toFixed(2)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>لا توجد بيانات تحويل متاحة</p>
                  </div>
                )}
              </div>
            </AnalyticsCard>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StoreAnalyticsPage;
