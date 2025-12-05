# Product URL Structure

## New URL Format
Products now use a cleaner URL structure:

**Format:** `/product/{category}/{cleanName}`

## Examples

### Before
```
/product/asus-tuf-gaming-series-5---vg27aq5a-gaming-monitor--27-inch-qhd2560x1440-210hzoc-fast-ips-03ms-stereo-speaker-displaywidget-center-gaming-ai
```

### After
```
/product/monitors/ASUS-TUF-Gaming-Series-5
/product/laptops/Dell-XPS-13
/product/keyboards/Logitech-MX-Keys
/product/cpu/Intel-Core-i7-12700K
```

## Implementation Details

### URL Generation
- **Category**: Generated from `product.category_en` or `product.category` field
- **Clean Name**: Generated from `product.name_en` or `product.name` field, or uses `product.url_name` if available

### URL Processing
1. Removes technical specifications (resolution, refresh rate, etc.)
2. Takes first meaningful part before dashes
3. Keeps brand name and main model/series information
4. Converts to Title-Case-With-Hyphens format

### Backward Compatibility
The system maintains full backward compatibility:
- Old `/product/slug` URLs continue to work
- New URLs automatically redirect to clean format
- Sharing and bookmarks remain functional

### Database Fields
- `category` or `category_en`: Used for category part of URL
- `name_en` or `name`: Used to generate clean name
- `url_name` (optional): Override for custom clean names
- `slug` (legacy): Still supported for backward compatibility

## Functions

### `getProductUrl(product)`
Generates the new URL format for a product.

### `generateCategorySlug(category)`
Converts category names to URL-safe slugs.

### `generateCleanProductName(product)`
Extracts clean product names from full product titles.
