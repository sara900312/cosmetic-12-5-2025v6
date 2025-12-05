import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Truck, Package, Clock, DollarSign } from 'lucide-react';

const ShippingChoiceModal = ({ 
  isOpen, 
  onClose, 
  onChooseShipping, 
  multipleStores = false,
  storesList = []
}) => {
  if (!isOpen) return null;

  const handleChoice = (shippingType) => {
    onChooseShipping(shippingType);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-effect rounded-xl p-6 w-full max-w-md border border-white/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="h-6 w-6 text-primary" />
                اختر نوع الشحن
              </h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* معلومات المتاجر */}
            {multipleStores && storesList.length > 0 && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">
                  طلبك يحتوي على منتجات من متاجر متعددة:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {storesList.map((store, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded"
                    >
                      {store}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* خيارات الشحن */}
            <div className="space-y-4">
              {/* خيار الشحن السريع */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border border-green-500/30 rounded-lg p-4 bg-green-500/10 cursor-pointer transition-all hover:border-green-500/50"
                onClick={() => handleChoice('fast')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Truck className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">شحن سريع 🚀</h3>
                      <p className="text-green-300 text-sm">تسليم سريع ومنفصل</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-white/80 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-400" />
                    <span>1-2 يوم تسليم</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-400" />
                    <span>عدد الشحنات: {storesList.length} شحنة منفصلة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-300">تكلفة شحن أعلى (كل متجر منفصل)</span>
                  </div>
                </div>

                <div className="bg-green-500/20 rounded-lg p-3 mb-4">
                  <p className="text-green-200 text-xs">
                    ✅ سيتم إنشاء طلب منفصل لكل متجر للحصول على أسرع تسليم ممكن
                  </p>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleChoice('fast')}
                >
                  اختر الشحن السريع
                </Button>
              </motion.div>

              {/* خيار الشحن الموحد */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/10 cursor-pointer transition-all hover:border-blue-500/50"
                onClick={() => handleChoice('unified')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">شحن موحد 📦</h3>
                      <p className="text-blue-300 text-sm">توفير في التكلفة</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-white/80 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span>2-3 أيام إضافية للتجميع</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-400" />
                    <span>عدد الشحنات: شحنة واحدة موحدة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-green-300">تكلفة شحن أوفر (شحنة واحدة)</span>
                  </div>
                </div>

                <div className="bg-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-blue-200 text-xs">
                    💰 سيتم تجميع جميع المنتجات في طلب واحد لتوفير تكلفة الشحن
                  </p>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleChoice('unified')}
                >
                  اختر الشحن الموحد
                </Button>
              </motion.div>
            </div>

            {/* ملاحظة */}
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
              <div className="text-center">
                <p className="text-yellow-300 text-sm font-medium mb-2">
                  💡 نصيحة: اختر الشحن الموحد لتوفير التوصيل لكنه يحتاج وقت أطول
                </p>
                <p className="text-yellow-200/80 text-xs">
                  يمكنك تغيير نوع الشحن من خلال التواصل معنا قبل التسليم
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShippingChoiceModal;
