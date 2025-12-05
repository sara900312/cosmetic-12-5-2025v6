import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { playSound } from '@/lib/soundPlayer';
import { Copy, X as CloseIcon } from 'lucide-react';
import { triggerNeonCascadingWave } from '@/lib/neonCascadingWave';

const OrderConfirmedDisplay = ({ isOpen, orderCode, message, onCopy, onClose }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (isOpen) {
      playSound('confirmProduct');
      if (containerRef.current) {
        triggerNeonCascadingWave(containerRef.current);
      }
    }
  }, [isOpen]);
  return (
    <AnimatePresence>
      {isOpen && (
         <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 confirmation-card-gradient p-6 rounded-xl shadow-2xl z-50 w-full max-w-sm text-white overflow-visible"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </Button>
          <h3 className="text-lg font-bold mb-2">تم إرسال الطلب بنجاح!</h3>
          {message ? (
            <h1 className="text-sm mb-4 leading-6">
              يمكنك إلغاء الطلب خلال <span className="font-bold">6</span> ساعات بإرسال رمز الطلب.
            </h1>
          ) : (
            <>
              <p className="text-sm mb-1">رقم الطلب الخاص بك هو:</p>
              <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg mb-4">
                <span className="font-mono text-yellow-300 text-lg tracking-wider">{orderCode}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onCopy}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  نسخ
                </Button>
              </div>
            </>
          )}
          <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg mb-2">
            <span className="font-mono text-yellow-300 text-lg tracking-wider">{orderCode}</span>
            <Button size="sm" variant="secondary" onClick={onCopy} className="bg-yellow-400 hover:bg-yellow-500 text-black">
              <Copy className="h-4 w-4 mr-2" />
              نسخ
            </Button>
          </div>
          <p className="text-xs text-white/80">سيتم التواصل معك قريباً.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderConfirmedDisplay;
