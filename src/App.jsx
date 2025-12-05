import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext';
import { AuthProvider } from '@/contexts/AuthContext';
import HomePage from '@/pages/HomePage';
import ProductsPage from '@/pages/ProductsPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CheckoutPage from '@/pages/CheckoutPage';
import InventoryPage from '@/pages/InventoryPage';
import StoreAnalyticsPage from '@/pages/StoreAnalyticsPage';
import LoginPage from '@/pages/LoginPage';
import OrderTextParserTest from '@/pages/OrderTextParserTest';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/ahmedloginwith3non" element={<LoginPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:category" element={<ProductsPage />} />
                  <Route path="/product/:category/:cleanName" element={<ProductDetailPage />} />
                  <Route path="/product/:slug" element={<ProductDetailPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/test-order-parser" element={<OrderTextParserTest />} />
                  <Route
                    path="/inventory"
                    element={
                      <ProtectedRoute>
                        <InventoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute>
                        <StoreAnalyticsPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
                <Toaster />
              </div>
            </Router>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;
