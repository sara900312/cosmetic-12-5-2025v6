import { sendOrderNotification, sendOrderNotificationWithTimeout, sendCheckoutNotification } from './orderNotification.js';

// Example 1: Basic usage
export async function basicExample() {
  try {
    const result = await sendOrderNotification('علي أحمد', 'كيبورد لوجيتك', 2, 'متجر الإلكترونيات');
    console.log('Success:', result.message);
    console.log('Details:', result.details);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: With timeout
export async function timeoutExample() {
  try {
    const result = await sendOrderNotificationWithTimeout(
      'فاطمة محمد', 
      'ماوس لاسلكي', 
      1, 
      'متجر الكمبيوتر',
      5000 // 5 second timeout
    );
    
    if (result.success) {
      console.log('✅ Notification sent:', result.message);
    } else {
      console.log('❌ Failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Checkout integration
export async function checkoutExample() {
  const formData = {
    name: 'محمد العلي',
    phone: '07501234567',
    address: 'شارع الرشيد، بغداد'
  };

  const cartItems = [
    {
      name: 'لابتوب ديل XPS 13',
      quantity: 1,
      price: 1200000,
      main_store: 'متجر اللابتوبات'
    },
    {
      name: 'ماوس لوجيتك',
      quantity: 2,
      price: 25000,
      main_store: 'متجر اللابتوبات'
    }
  ];

  try {
    const result = await sendCheckoutNotification(formData, cartItems);
    
    if (result.success) {
      console.log('🎉 Order notification sent successfully!');
      console.log('📧 Emails sent to:', result.details?.emailsSent || 'N/A');
      return { success: true, message: result.message };
    } else {
      console.error('❌ Notification failed:', result.message);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return { success: false, error: error.message };
  }
}

// Example 4: Form submission handler
export function createFormSubmissionHandler(onSuccess, onError) {
  return async function handleOrderSubmission(customerData, cartItems) {
    try {
      // Show loading state
      console.log('Sending order notification...');
      
      const result = await sendCheckoutNotification(customerData, cartItems);
      
      if (result.success) {
        onSuccess && onSuccess(result);
      } else {
        onError && onError(new Error(result.message));
      }
      
      return result;
    } catch (error) {
      console.error('Form submission error:', error);
      onError && onError(error);
      return { success: false, error: error.message };
    }
  };
}

// Example 5: React hook usage example
export function useOrderNotification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendNotification = useCallback(async (customerName, productName, quantity, storeName) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendOrderNotification(customerName, productName, quantity, storeName);
      
      if (result.success) {
        // Could trigger a toast notification here
        console.log('✅ Order notification sent successfully');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendNotification, isLoading, error };
}

// Run basic example
// basicExample();

// Example usage as requested:
// sendOrderNotification('Ali', 'Keyboard', 2, 'a').then(console.log).catch(console.error);
