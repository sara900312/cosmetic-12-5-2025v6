/**
 * Generate a clean category slug from category name
 */
export const generateCategorySlug = (category) => {
  if (!category) return 'general';

  return category
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generate a clean product name from name_en or name
 * Extracts brand, main product name, and series/model
 * Example: "ASUS TUF Gaming Series 5 - VG27AQ5A Gaming Monitor..."
 * becomes "ASUS-TUF-Gaming-Series-5"
 */
export const generateCleanProductName = (product) => {
  if (!product) return '';

  // Use name_en if available, fallback to name
  const productName = product.name_en || product.name || '';

  // Split by common separators and take the first meaningful part
  const mainPart = productName.split(/[-–—]/)[0].trim();

  // Remove common unnecessary words and specifications
  const cleanName = mainPart
    .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
    .replace(/\s*\[[^\]]*\]/g, '') // Remove anything in brackets
    .replace(/\s*(monitor|keyboard|mouse|laptop|desktop|pc|computer|inch|hz|ms|rgb|led|lcd|oled|4k|hd|fhd|qhd|uhd)\s*/gi, ' ') // Remove tech terms but keep gaming and series
    .replace(/\s*\d+["'']\s*/g, '') // Remove size measurements like 27"
    .replace(/\s*\d+x\d+\s*/g, '') // Remove resolution like 2560x1440
    .replace(/\s*\d+hz\s*/gi, '') // Remove refresh rate
    .replace(/\s*\d+ms\s*/gi, '') // Remove response time
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Split into words and take the most important ones (brand + model/series)
  const words = cleanName.split(/\s+/).filter(word => word.length > 1);

  // Take first 5 meaningful words maximum
  const significantWords = words.slice(0, 5);

  // Convert to slug format
  const slug = significantWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-')
    .replace(/[^a-zA-Z0-9\-]/g, '') // Remove special characters except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return slug || 'product';
};

/**
 * Generate the old short slug for backward compatibility
 */
export const generateShortSlug = (productName) => {
  return generateCleanProductName({ name: productName });
};

/**
 * Generate new category-based product URL structure
 * Format: /product/{category}/{cleanName}
 *
 * Examples:
 * - /product/monitors/ASUS-TUF-Gaming-Series-5
 * - /product/laptops/Dell-XPS-13
 * - /product/keyboards/Logitech-MX-Keys
 */
export const getProductUrl = (product) => {
  const category = generateCategorySlug(product.category_en || product.category);
  const cleanName = product.url_name || generateCleanProductName(product);

  return `/product/${category}/${cleanName}`;
};

/**
 * Generate slug with fallback to database slug or full name slug (for backward compatibility)
 */
export const getProductSlug = (product) => {
  // If product has a custom slug in database, use it
  if (product.slug && product.slug.trim()) {
    return product.slug;
  }

  // Generate short slug from name
  const shortSlug = generateShortSlug(product.name);

  // If short slug is too short or empty, fallback to simple name conversion
  if (shortSlug.length < 3) {
    return product.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
  }

  return shortSlug;
};
