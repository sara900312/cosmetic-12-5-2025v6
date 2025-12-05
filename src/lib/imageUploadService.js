/**
 * Image Upload Service
 * Handles WebP conversion, optimization, and Supabase upload
 */

/**
 * Convert image to WebP format with optimization
 * @param {File} file - Image file to convert
 * @param {number} quality - Compression quality (0-1), default 0.8
 * @returns {Promise<Blob>} WebP blob
 */
export const convertToWebP = async (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert to WebP'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Resize image if it's too large
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @returns {Promise<Blob>} Resized WebP blob
 */
export const resizeAndOptimizeImage = async (file, maxWidth = 2000, maxHeight = 2000) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          'image/webp',
          0.85
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Upload image to Supabase Storage
 * @param {Object} supabase - Supabase client instance
 * @param {Blob} imageBlob - WebP blob to upload
 * @param {string} productId - Product ID for folder structure
 * @param {string} imageType - 'main', 'image1', 'image2', 'image3'
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<string>} Public CDN URL
 */
export const uploadImageToSupabase = async (
  supabase,
  imageBlob,
  productId,
  imageType,
  onProgress = () => {}
) => {
  if (!supabase || !imageBlob || !productId) {
    throw new Error('Missing required parameters');
  }

  const bucketName = 'products';
  const folderPath = `${productId}`;

  let fileName;
  if (imageType === 'main') {
    fileName = 'main.webp';
  } else if (imageType === 'image1') {
    fileName = 'gallery/image1.webp';
  } else if (imageType === 'image2') {
    fileName = 'gallery/image2.webp';
  } else if (imageType === 'image3') {
    fileName = 'gallery/image3.webp';
  } else {
    throw new Error('Invalid image type');
  }

  const filePath = `${folderPath}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Generate public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicData || !publicData.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    onProgress(100);
    return publicData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Process and upload a single image file
 * @param {File} file - Image file from input
 * @param {Object} supabase - Supabase client
 * @param {string} productId - Product ID
 * @param {string} imageType - 'main', 'image1', 'image2', 'image3'
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Public URL
 */
export const processAndUploadImage = async (
  file,
  supabase,
  productId,
  imageType,
  onProgress = () => {}
) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  onProgress(10);

  // Validate image content with client-side NSFWJS and face-api.js
  try {
    const { validateImageClientSide } = await import('./validateImageClientSide');
    onProgress(20);
    const validationResult = await validateImageClientSide(file);

    if (validationResult === 'BAD_FACES') {
      throw new Error('❌ الصورة تحتوي على بشر ولا يمكن رفعها');
    }
    if (validationResult === 'BAD_NSFW') {
      throw new Error('❌ الصورة تحتوي محتوى غير لائق');
    }
    onProgress(30);
  } catch (validationError) {
    if (validationError.message.includes('❌')) {
      throw validationError;
    }
    console.warn('Image validation warning:', validationError);
    // Continue even if validation fails (graceful degradation)
  }

  try {
    const optimizedBlob = await resizeAndOptimizeImage(file);
    onProgress(65);

    const publicUrl = await uploadImageToSupabase(
      supabase,
      optimizedBlob,
      productId,
      imageType,
      onProgress
    );

    return publicUrl;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

/**
 * Batch upload multiple images
 * @param {Object} files - Object with image files { main, image1, image2, image3 }
 * @param {Object} supabase - Supabase client
 * @param {string} productId - Product ID
 * @param {Function} onProgress - Callback for overall progress
 * @returns {Promise<Object>} Object with uploaded URLs
 */
export const batchUploadImages = async (
  files,
  supabase,
  productId,
  onProgress = () => {}
) => {
  const results = {
    main_image_url: null,
    image_1: null,
    image_2: null,
    image_3: null,
  };

  const imageTypes = ['main', 'image1', 'image2', 'image3'];
  const fileKeys = ['main', 'image_1', 'image_2', 'image_3'];

  let completed = 0;

  for (let i = 0; i < fileKeys.length; i++) {
    const key = fileKeys[i];
    const file = files[key];

    if (file) {
      try {
        const url = await processAndUploadImage(
          file,
          supabase,
          productId,
          imageTypes[i],
          (progress) => {
            const totalProgress = ((completed + progress / 100) / fileKeys.filter(k => files[k]).length) * 100;
            onProgress(Math.round(totalProgress));
          }
        );

        const resultKey = key === 'main' ? 'main_image_url' : key;
        results[resultKey] = url;
        completed++;
      } catch (error) {
        console.error(`Error uploading ${key}:`, error);
        // Continue with other images instead of failing
      }
    }
  }

  return results;
};

export default {
  convertToWebP,
  resizeAndOptimizeImage,
  uploadImageToSupabase,
  processAndUploadImage,
  batchUploadImages,
};
