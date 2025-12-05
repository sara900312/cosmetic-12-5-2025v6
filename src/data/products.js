export const categoriesData = [
  { id: 'all', name: 'جميع المنتجات', nameEn: 'All Products' },
  { id: 'hair_care', name: 'العناية بالشعر', nameEn: 'Hair Care' },
  { id: 'skincare', name: 'العناية بالبشرة', nameEn: 'Skincare' },
  { id: 'makeup', name: 'مكياج', nameEn: 'Makeup' },
  { id: 'perfumes', name: 'عطور', nameEn: 'Perfumes' },
  { id: 'serums', name: 'سيرومات', nameEn: 'Serums' },
  { id: 'masks', name: 'ماسكات', nameEn: 'Masks' },
  { id: 'oils', name: 'زيوت', nameEn: 'Oils' },
  { id: 'bath_essentials', name: 'مستلزمات حمّام', nameEn: 'Bath Essentials' },
  { id: 'beauty_tools', name: 'أدوات تجميل', nameEn: 'Beauty Tools' },
  { id: 'nail_care', name: 'العناية بالأظافر', nameEn: 'Nail Care' },
  { id: 'body_care', name: 'العناية بالجسم', nameEn: 'Body Care' }
];

export const formatPrice = (price) => {
  if (price === null || price === undefined) return '';
  const formatted = new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0
  }).format(price);

  // Replace regular spaces with non-breaking spaces, fix currency format
  return formatted
    .replace(/\s/g, '\u00A0')  // Replace spaces with non-breaking spaces
    .replace(/\.+/g, '')       // Remove all dots first
    .replace(/\u200F/g, '')    // Remove Right-to-Left marks if any
    .replace(/دع/g, 'د.ع');    // Add dot between د and ع
};

export const getDiscountedPrice = (price, discountPercent) => {
  if (price === null || price === undefined || discountPercent === null || discountPercent === undefined) return price;
  return price - (price * discountPercent / 100);
};
