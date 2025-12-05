/**
 * مكون اختبار لعرض الأسعار على الموبايل
 * يساعد في التحقق من أن الأسعار تظهر بشكل صحيح على جميع أحجام الشاشات
 */

import React, { useState } from 'react';
import ProductPriceDisplay from './ProductPriceDisplay';

const PriceDisplayTest = () => {
  const [selectedPrice, setSelectedPrice] = useState('long');

  const testCases = {
    short: {
      price: 50000,
      discountedPrice: 45000,
      label: 'سعر قصير (50,000 د.ع)'
    },
    medium: {
      price: 850000,
      discountedPrice: 800000,
      label: 'سعر متوسط (850,000 د.ع)'
    },
    long: {
      price: 2500000,
      discountedPrice: 2250000,
      label: 'سعر طويل (2,500,000 د.ع)'
    },
    veryLong: {
      price: 15750000,
      discountedPrice: 14250000,
      label: 'سعر طويل جداً (15,750,000 د.ع)'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          اختبار عرض الأسعار على الموبايل
        </h1>

        {/* أزرار التحكم */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {Object.entries(testCases).map(([key, testCase]) => (
            <button
              key={key}
              onClick={() => setSelectedPrice(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPrice === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {testCase.label}
            </button>
          ))}
        </div>

        {/* شبكة اختبار بأحجام مختلفة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* شاشة صغيرة جداً (محاكاة موبايل صغير) */}
          <div className="glass-effect rounded-lg p-4">
            <h3 className="text-white font-bold mb-3 text-center">
              شاشة صغيرة (280px)
            </h3>
            <div className="w-[280px] mx-auto">
              <div className="bg-gray-800/50 rounded-lg p-4 border">
                <h4 className="text-white text-sm mb-2">Gaming PC Ryzen 5</h4>
                <ProductPriceDisplay
                  price={testCases[selectedPrice].price}
                  discountedPrice={testCases[selectedPrice].discountedPrice}
                  className="w-full"
                />
                <div className="mt-2 text-xs text-white/60">
                  عرض: 280px
                </div>
              </div>
            </div>
          </div>

          {/* شاشة متوسطة (محاكاة موبايل عادي) */}
          <div className="glass-effect rounded-lg p-4">
            <h3 className="text-white font-bold mb-3 text-center">
              شاشة متوسطة (375px)
            </h3>
            <div className="w-[375px] mx-auto">
              <div className="bg-gray-800/50 rounded-lg p-4 border">
                <h4 className="text-white text-sm mb-2">Gaming PC Ryzen 5</h4>
                <ProductPriceDisplay
                  price={testCases[selectedPrice].price}
                  discountedPrice={testCases[selectedPrice].discountedPrice}
                  className="w-full"
                />
                <div className="mt-2 text-xs text-white/60">
                  عرض: 375px
                </div>
              </div>
            </div>
          </div>

          {/* شاشة كبيرة (محاكاة تابلت) */}
          <div className="glass-effect rounded-lg p-4">
            <h3 className="text-white font-bold mb-3 text-center">
              شاشة كبيرة (768px)
            </h3>
            <div className="w-full max-w-[400px] mx-auto">
              <div className="bg-gray-800/50 rounded-lg p-4 border">
                <h4 className="text-white text-sm mb-2">Gaming PC Ryzen 5</h4>
                <ProductPriceDisplay
                  price={testCases[selectedPrice].price}
                  discountedPrice={testCases[selectedPrice].discountedPrice}
                  className="w-full"
                />
                <div className="mt-2 text-xs text-white/60">
                  عرض: مرن (حتى 400px)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* اختبار في بطاقة منتج كاملة */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            اختبار في بطاقة منتج كاملة
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* بطاقة منتج محاكاة */}
            <div className="glass-effect rounded-xl overflow-hidden">
              {/* صورة المنتج */}
              <div className="aspect-square bg-gray-800/30 flex items-center justify-center">
                <div className="w-24 h-24 bg-gray-600/50 rounded-lg flex items-center justify-center">
                  <span className="text-white/40 text-sm">صورة</span>
                </div>
              </div>
              
              {/* محتوى البطاقة */}
              <div className="p-4 flex flex-col">
                <h3 className="text-white font-semibold mb-2 leading-tight">
                  Gaming PC Ryzen 5 RTX 3060
                </h3>
                
                {/* منطقة السعر - هذا ما نختبره */}
                <div className="mb-3 min-h-[3rem] flex items-start">
                  <ProductPriceDisplay
                    price={testCases[selectedPrice].price}
                    discountedPrice={testCases[selectedPrice].discountedPrice}
                    className="w-full"
                    finalPriceClassName="text-green-400 font-bold"
                    originalPriceClassName="text-white/50 line-through"
                  />
                </div>
                
                {/* معلومات إضافية */}
                <div className="flex items-center justify-between mb-3 pt-2 border-t border-white/10">
                  <span className="text-white/50 text-xs bg-white/5 px-2 py-1 rounded">
                    #PC-001
                  </span>
                  <span className="text-white/60 text-xs">
                    📦 متوفر: 5
                  </span>
                </div>
                
                {/* أزرار */}
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded-lg">
                    إضافة للسلة
                  </button>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg">
                    عرض
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* معلومات التحسينات */}
        <div className="mt-8 glass-effect rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">التحسينات المطبقة</h2>
          <div className="grid md:grid-cols-2 gap-4 text-white/80 text-sm">
            <div>
              <h3 className="font-bold text-green-400 mb-2">✅ المشاكل المحلولة:</h3>
              <ul className="space-y-1">
                <li>• إزالة العرض الثابت (width: 126.9px)</li>
                <li>• تحسين التخطيط للشاشات الصغيرة</li>
                <li>• إضافة word-break للنصوص الطويلة</li>
                <li>• تحسين المسافات والتباعد</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-blue-400 mb-2">🔧 التقنيات المستخدمة:</h3>
              <ul className="space-y-1">
                <li>• Flexbox مع flex-col على الموبايل</li>
                <li>• أحجام نصوص تتكيف (responsive text sizes)</li>
                <li>• minWidth: 0 لتجنب overflow</li>
                <li>• break-words و overflow-wrap</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceDisplayTest;
