import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { playSound } from '@/lib/soundPlayer';
import { checkProductStock } from '@/lib/inventoryManager';
import { useSupabase } from '@/contexts/SupabaseContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const savedCart = localStorage.getItem('neomart-cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('neomart-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (toastMessage) {
      toast(toastMessage);
      setToastMessage(null);
    }
  }, [toastMessage]);

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) {
        console.error("Attempted to add an invalid product to the cart.");
        return;
    }

    let didModifyCart = false;

    const existingItem = cartItems.find(item => item.id === product.id);
    const availableStock = product.stock || 0;

    const productToAdd = {
        ...product,
        main_image_url: product.main_image_url || (product.images && product.images.length > 0 ? product.images[0] : null) || 'https://via.placeholder.com/100'
    };

    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > availableStock) {
            setToastMessage({
                title: "كمية غير متوفرة",
                description: `لا يمكنك إضافة أكثر من ${availableStock} قطعة من هذا المنتج.`,
                variant: "destructive",
            });
            setCartItems(prev => prev.map(item =>
                item.id === product.id ? { ...item, quantity: availableStock } : item
            ));
            didModifyCart = true;
        } else {
            setToastMessage({
                title: "تم تحديث السلة",
                description: `تم زيادة كمية ${product.name}`,
            });
            setCartItems(prev => prev.map(item =>
                item.id === product.id ? { ...item, quantity: newQuantity } : item
            ));
            didModifyCart = true;
        }
    } else {
        if (quantity > availableStock) {
            setToastMessage({
                title: "كمية غير متوفرة",
                description: `لا يمكنك إضافة أكثر من ${availableStock} قطعة من هذا المنتج.`,
                variant: "destructive",
            });
            setCartItems(prev => [...prev, { ...productToAdd, quantity: availableStock }]);
            didModifyCart = true;
        } else {
            setToastMessage({
                title: "تم إضافة المنتج",
                description: `تم إضافة ${product.name} إلى السلة`,
            });
            setCartItems(prev => [...prev, { ...productToAdd, quantity }]);
            didModifyCart = true;
        }
    }

    if (didModifyCart) {
      playSound('addToCart');
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    setToastMessage({
      title: "تم حذف المنتج",
      description: "تم حذف المنتج من السلة",
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    const itemToUpdate = cartItems.find(item => item.id === productId);
    if (!itemToUpdate) return;

    const availableStock = itemToUpdate.stock || 0;

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > availableStock) {
        setToastMessage({
            title: "كمية غير متوفرة",
            description: `الكمية المتاحة هي ${availableStock} فقط.`,
            variant: "destructive",
        });
        setCartItems(prev => prev.map(item =>
            item.id === productId ? { ...item, quantity: availableStock } : item
        ));
    } else {
        setCartItems(prev => prev.map(item =>
            item.id === productId ? { ...item, quantity: newQuantity } : item
        ));
    }
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('neomart-cart');
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
        // تحديد ما إذا كان المنتج مخفض حقاً
        const isProductDiscounted = item.is_discounted === true || (item.discount_percent && item.discount_percent > 0);

        // حساب السعر الصحيح: إذا كان discounted_price موجود فهو السعر النهائي
        const finalPrice = isProductDiscounted && item.discounted_price ?
          item.discounted_price :
          item.price;

        return total + (finalPrice * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    isOpen,
    setIsOpen
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
