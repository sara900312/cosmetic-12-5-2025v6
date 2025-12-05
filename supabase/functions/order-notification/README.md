# Order Notification Edge Function

هذه الدالة تستقبل طلبات الإشعار بالطلبات الجديدة وترسل إشعارات عبر البريد الإلكتروني باستخدام EmailJS.

## المتطلبات

### متغيرات البيئة المطلوبة:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# EmailJS Configuration  
EMAILJS_SERVICE_ID=service_zzp53hs
EMAILJS_TEMPLATE_ID=template_g1rrsih
EMAILJS_USER_ID=cVdEpzhAh3w1WMlMi
EMAILJS_ACCESS_TOKEN=your-emailjs-access-token
```

### جدول قاعدة البيانات:

يجب وجود جدول `stores` مع الحقول:
- `name` (نص): اسم المتجر
- `owner_email` (نص): بريد صاحب المتجر

## الاستخدام

### طلب POST:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/order-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "customerName": "أحمد محمد",
    "productName": "سماعات بلوتوث",
    "quantity": 2,
    "storeName": "hawranj"
  }'
```

### تنسيق البيانات المطلوبة:

```typescript
{
  customerName: string,  // اسم العميل
  productName: string,   // اسم المنتج
  quantity: number,      // الكمية
  storeName: string      // اسم المتجر (كما هو مسجل في جدول stores)
}
```

## الاستجابات

### نجاح (200):
```json
{
  "success": true,
  "message": "Order notification sent successfully",
  "details": {
    "customerName": "أحمد محمد",
    "productName": "سماعات بلوتوث", 
    "quantity": 2,
    "storeName": "hawranj",
    "storeOwnerEmail": "owner@hawranj.com",
    "emailResult": {
      "success": true,
      "message": "Email sent successfully"
    }
  }
}
```

### خطأ - حقول ناقصة (400):
```json
{
  "error": "Missing required fields: customerName, productName, quantity, storeName"
}
```

### خطأ - متجر غير موجود (404):
```json
{
  "error": "Store not found: storeName",
  "details": "No rows found"
}
```

### خطأ - فشل في إرسال البريد (500):
```json
{
  "error": "Failed to send email notification",
  "message": "EmailJS API error: 401 Unauthorized",
  "details": {
    "customerName": "أحمد محمد",
    "productName": "سماعات بلوتوث",
    "quantity": 2,
    "storeName": "hawranj",
    "storeOwnerEmail": "owner@hawranj.com"
  }
}
```

## التنصيب

1. تأكد من وجود جدول `stores` في قاعدة البيانات
2. أضف متغيرات البيئة المطلوبة في Supabase Dashboard
3. انشر الدالة باستخدام Supabase CLI:

```bash
supabase functions deploy order-notification
```

## اختبار الدالة

```bash
# اختبار محلي
supabase functions serve order-notification

# اختبار الإنتاج
curl -X POST https://your-project.supabase.co/functions/v1/order-notification \
  -H "Content-Type: application/json" \
  -d '{"customerName":"test","productName":"test","quantity":1,"storeName":"hawranj"}'
```
