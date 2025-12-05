import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const ConfirmationModal = ({ isOpen, countdown, orderCode, onCancel, onConfirmImmediately }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="confirmation-modal-backdrop"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="confirmation-modal-content"
          >
            <div className="confirmation-countdown">{countdown}</div>
            <h3 className="confirmation-title">
              تأكيد الطلب
            </h3>
            <p className="confirmation-order-label">
              رقم طلبك المؤقت: <span className="confirmation-order-code">{orderCode}</span>
            </p>
            <p className="confirmation-message">
              لا تغلق هذه النافذة لتأكيد طلبك. سيتم إرسال الطلب تلقائياً.
            </p>
            <div className="confirmation-button-container">
              <Button
                onClick={onCancel}
                className="confirmation-cancel-button"
              >
                إلغاء الطلب
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
