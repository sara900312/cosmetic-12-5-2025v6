import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/data/products';
import { useNavigate } from 'react-router-dom';
import ProductPriceDisplay from '@/components/ProductPriceDisplay';

const CartSidebar = () => {
  const { cartItems, isOpen, setIsOpen, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };
 
  const CartIcon = ShoppingCart; 

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-50"
            aria-hidden="true"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-pink-200/30 z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-sidebar-title"
          >
            <div className="flex items-center justify-between p-4 border-b border-pink-200/30">
              <h2 id="cart-sidebar-title" className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <CartIcon className="h-5 w-5" strokeWidth={2} />
                سلة التسوق
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-[#5A3E55] hover:bg-transparent"
                aria-label="Close shopping cart"
              >
                <X className="h-5 w-5" strokeWidth={2}/>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <div className="text-center text-[#1A1A1A] mt-8">
                  <CartIcon className="h-16 w-16 mx-auto mb-4 opacity-100" strokeWidth={1.5} />
                  <p>السلة فارغة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="rounded-lg p-4 border border-pink-200 bg-white"
                    >
                      <div className="flex gap-3">
                        <img
                          src={item.main_image_url || 'https://via.placeholder.com/100'}
                          alt={item.name}
                          crossOrigin="anonymous"
                          onError={(e) => {e.target.src = 'https://via.placeholder.com/100';}}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-[#1A1A1A] font-medium text-sm mb-1">
                            {item.name}
                          </h3>
                          <ProductPriceDisplay
                            price={item.price}
                            discountedPrice={item.discounted_price}
                            finalPriceClassName="text-pink-500 font-bold text-sm"
                            originalPriceClassName="text-[#1A1A1A] text-xs line-through mr-1"
                            discountTextClassName="text-pink-500 text-xs ml-1"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-8 w-8 text-[#1A1A1A] hover:bg-transparent"
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                <Minus className="h-4 w-4" strokeWidth={2} />
                              </Button>
                              <span className="text-[#1A1A1A] w-8 text-center" aria-live="polite">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 text-[#1A1A1A] hover:bg-transparent"
                                aria-label={`Increase quantity of ${item.name}`}
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus className="h-4 w-4" strokeWidth={2} />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-rose-400 hover:text-rose-500 hover:bg-transparent"
                              aria-label={`Remove ${item.name} from cart`}
                            >
                              حذف
                            </Button>
                          </div>
                           {item.quantity >= item.stock && (
                              <p className="text-rose-400 text-xs mt-1">الحد الأقصى للكمية المتاحة</p>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-4 border-t border-pink-200/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#1A1A1A] font-bold">المجموع:</span>
                  <span className="text-pink-500 font-bold text-lg">
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full gradient-bg hover:opacity-90 text-white font-bold"
                >
                  إتمام الطلب
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
