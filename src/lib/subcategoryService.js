/**
 * Subcategory Service
 * Handles fetching subcategories from Supabase and product filtering
 */

/**
 * Fetch all subcategories for a given parent category
 * @param {Object} supabase - Supabase client instance
 * @param {string} parentCategory - The parent category slug (e.g., 'hair_care')
 * @returns {Promise<Array>} Array of subcategory objects with slug field
 */
export const fetchSubcategoriesByCategory = async (supabase, parentCategory) => {
  if (!supabase || !parentCategory) return [];

  try {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('parent_category', parentCategory)
      .order('name_ar', { ascending: true });

    if (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }

    // Custom ordering for specific categories
    let result = (data || []).map(subcategory => ({
      ...subcategory,
      slug: subcategory.slug || getSubcategorySlug(subcategory.name_ar || subcategory.name)
    }));

    // Swap positions of Lipstick (أحمر شفاه) and Concealer (كونسيلر) for makeup category
    if (parentCategory === 'makeup') {
      const lipsticIndex = result.findIndex(sub => sub.name_ar === 'أحمر شفاه' || sub.slug === 'lipstick');
      const concealerIndex = result.findIndex(sub => sub.name_ar === 'كونسيلر' || sub.slug === 'concealer');

      if (lipsticIndex !== -1 && concealerIndex !== -1) {
        [result[lipsticIndex], result[concealerIndex]] = [result[concealerIndex], result[lipsticIndex]];
      }
    }

    return result;
  } catch (error) {
    console.error('Unexpected error fetching subcategories:', error);
    return [];
  }
};

/**
 * Get subcategory slug for URL
 * @param {string} subcategoryName - The subcategory name
 * @returns {string} URL-safe slug
 */
export const getSubcategorySlug = (subcategoryName) => {
  if (!subcategoryName) return '';
  return subcategoryName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-');
};

/**
 * Convert slug back to display name
 * @param {string} slug - The URL slug
 * @returns {string} Display name
 */
export const slugToName = (slug) => {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Parse subcategory query parameter
 * @param {string} subcategoryParam - The query parameter value (can contain multiple slugs separated by comma)
 * @returns {Array<string>} Array of subcategory slugs
 */
export const parseSubcategoryParam = (subcategoryParam) => {
  if (!subcategoryParam) return [];
  return subcategoryParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

/**
 * Create query parameter from selected subcategories
 * @param {Array<string>} selectedSubcategories - Array of subcategory IDs
 * @returns {string} Comma-separated query parameter value
 */
export const createSubcategoryParam = (selectedSubcategories) => {
  if (!selectedSubcategories || selectedSubcategories.length === 0) return '';
  return selectedSubcategories.join(',');
};

/**
 * Filter products by subcategory IDs
 * @param {Array} products - Array of product objects
 * @param {Array<string>} subcategoryIds - Array of subcategory IDs to filter by
 * @returns {Array} Filtered products
 */
export const filterProductsBySubcategories = (products, subcategoryIds) => {
  if (!subcategoryIds || subcategoryIds.length === 0) return products;
  
  return products.filter(product => 
    product.subcategory_id && subcategoryIds.includes(product.subcategory_id)
  );
};

/**
 * Format subcategory for display
 * @param {Object} subcategory - Subcategory object from database
 * @returns {Object} Formatted subcategory with slug
 */
export const formatSubcategory = (subcategory) => {
  return {
    ...subcategory,
    slug: getSubcategorySlug(subcategory.name),
    displayName: subcategory.name_ar || subcategory.name
  };
};

/**
 * Get subcategory by slug from list
 * @param {Array} subcategories - Array of subcategory objects
 * @param {string} slug - The slug to search for
 * @returns {Object|null} Subcategory object or null
 */
export const getSubcategoryBySlug = (subcategories, slug) => {
  return subcategories.find(sub => getSubcategorySlug(sub.name) === slug) || null;
};

/**
 * Fetch subcategory ID by slug from database
 * @param {Object} supabase - Supabase client instance
 * @param {string} slug - The subcategory slug
 * @returns {Promise<string|null>} Subcategory ID or null
 */
export const fetchSubcategoryIdBySlug = async (supabase, slug) => {
  if (!supabase || !slug) return null;

  try {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.error('Error fetching subcategory ID by slug:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Unexpected error fetching subcategory ID:', error);
    return null;
  }
};

/**
 * Fetch subcategory IDs by array of slugs
 * @param {Object} supabase - Supabase client instance
 * @param {Array<string>} slugs - Array of subcategory slugs
 * @returns {Promise<Array>} Array of subcategory IDs
 */
export const fetchSubcategoryIdsBySlugs = async (supabase, slugs) => {
  if (!supabase || !slugs || slugs.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id')
      .in('slug', slugs);

    if (error || !data) {
      console.error('Error fetching subcategory IDs by slugs:', error);
      return [];
    }

    return data.map(item => item.id);
  } catch (error) {
    console.error('Unexpected error fetching subcategory IDs:', error);
    return [];
  }
};

export default {
  fetchSubcategoriesByCategory,
  getSubcategorySlug,
  slugToName,
  parseSubcategoryParam,
  createSubcategoryParam,
  filterProductsBySubcategories,
  formatSubcategory,
  getSubcategoryBySlug,
  fetchSubcategoryIdBySlug,
  fetchSubcategoryIdsBySlugs
};
