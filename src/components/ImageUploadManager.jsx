import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { processAndUploadImage } from '@/lib/imageUploadService';
import { toast } from '@/components/ui/use-toast';
import './ImageUploadManager.css';

const IMAGE_TYPE_LABELS = {
  main: 'الصورة الرئيسية',
  image_1: 'صورة فرعية 1',
  image_2: 'صورة فرعية 2',
  image_3: 'صورة فرعية 3',
};

const ImageUploadManager = ({
  productId,
  supabase,
  onImageUrlsChange,
  initialUrls = {}
}) => {
  const [images, setImages] = useState({
    main: { file: null, preview: initialUrls.main_image_url || null, url: initialUrls.main_image_url || null },
    image_1: { file: null, preview: initialUrls.image_1 || null, url: initialUrls.image_1 || null },
    image_2: { file: null, preview: initialUrls.image_2 || null, url: initialUrls.image_2 || null },
    image_3: { file: null, preview: initialUrls.image_3 || null, url: initialUrls.image_3 || null },
  });

  // مراقبة تغيرات initialUrls (عند تعديل منتج آخر)
  useEffect(() => {
    if (productId && initialUrls) {
      setImages({
        main: { file: null, preview: initialUrls.main_image_url || null, url: initialUrls.main_image_url || null },
        image_1: { file: null, preview: initialUrls.image_1 || null, url: initialUrls.image_1 || null },
        image_2: { file: null, preview: initialUrls.image_2 || null, url: initialUrls.image_2 || null },
        image_3: { file: null, preview: initialUrls.image_3 || null, url: initialUrls.image_3 || null },
      });
    }
  }, [productId, initialUrls.main_image_url, initialUrls.image_1, initialUrls.image_2, initialUrls.image_3]);

  const [uploading, setUploading] = useState({
    main: false,
    image_1: false,
    image_2: false,
    image_3: false,
  });

  const [uploadProgress, setUploadProgress] = useState({
    main: 0,
    image_1: 0,
    image_2: 0,
    image_3: 0,
  });

  const [dragActive, setDragActive] = useState(null);
  const fileInputRefs = {
    main: useRef(),
    image_1: useRef(),
    image_2: useRef(),
    image_3: useRef(),
  };


  const handleFileSelect = (imageKey, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار صورة فقط',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'خطأ',
        description: 'حجم الملف يجب أن يكون أقل من 10 MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImages(prev => ({
        ...prev,
        [imageKey]: {
          ...prev[imageKey],
          file,
          preview: e.target.result,
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e, imageKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(imageKey);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, imageKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(imageKey, files[0]);
    }
  };

  const handleUpload = async (imageKey) => {
    const imageData = images[imageKey];
    if (!imageData.file) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار صورة أولاً',
        variant: 'destructive',
      });
      return;
    }

    if (!productId) {
      toast({
        title: 'خطأ',
        description: 'معرف المنتج مفقود',
        variant: 'destructive',
      });
      return;
    }

    setUploading(prev => ({ ...prev, [imageKey]: true }));
    setUploadProgress(prev => ({ ...prev, [imageKey]: 0 }));

    try {
      const imageTypeMap = {
        main: 'main',
        image_1: 'image1',
        image_2: 'image2',
        image_3: 'image3',
      };

      const publicUrl = await processAndUploadImage(
        imageData.file,
        supabase,
        productId,
        imageTypeMap[imageKey],
        (progress) => {
          setUploadProgress(prev => ({ ...prev, [imageKey]: progress }));
        }
      );

      setImages(prev => ({
        ...prev,
        [imageKey]: {
          ...prev[imageKey],
          url: publicUrl,
          file: null,
        }
      }));

      onImageUrlsChange(imageKey, publicUrl);

      toast({
        title: 'نجح',
        description: `تم رفع ${IMAGE_TYPE_LABELS[imageKey]} بنجاح`,
      });

      setUploadProgress(prev => ({ ...prev, [imageKey]: 0 }));
    } catch (error) {
      console.error(`Error uploading ${imageKey}:`, error);
      toast({
        title: 'خطأ في الرفع',
        description: error.message || 'حدث خطأ أثناء رفع الصورة',
        variant: 'destructive',
      });
      setUploadProgress(prev => ({ ...prev, [imageKey]: 0 }));
    } finally {
      setUploading(prev => ({ ...prev, [imageKey]: false }));
    }
  };

  const handleRemoveImage = (imageKey) => {
    setImages(prev => ({
      ...prev,
      [imageKey]: {
        file: null,
        preview: null,
        url: null,
      }
    }));
    onImageUrlsChange(imageKey, null);
    if (fileInputRefs[imageKey].current) {
      fileInputRefs[imageKey].current.value = '';
    }
  };

  const renderImageBox = (imageKey) => {
    const imageData = images[imageKey];
    const isUploading = uploading[imageKey];
    const progress = uploadProgress[imageKey];
    const hasFile = !!imageData.file;
    const hasUrl = !!imageData.url;

    return (
      <div key={imageKey} className="image-upload-box">
        <div className="image-upload-label-header">
          <label className="image-upload-label">{IMAGE_TYPE_LABELS[imageKey]}</label>
          {hasUrl && <CheckCircle className="image-upload-success-icon" />}
        </div>

        {hasUrl && !hasFile && (
          <div className="image-url-display">
            <img src={imageData.url} alt={IMAGE_TYPE_LABELS[imageKey]} className="image-url-preview" />
            <div className="image-url-info">
              <p className="image-url-text">✓ تم الرفع بنجاح</p>
              <button 
                onClick={() => handleRemoveImage(imageKey)}
                className="image-remove-button"
                title="حذف الصورة"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {hasFile && !isUploading && (
          <div className="image-preview-container">
            <img src={imageData.preview} alt="preview" className="image-preview" />
            <div className="image-preview-actions">
              <button 
                onClick={() => handleUpload(imageKey)}
                className="image-upload-button"
              >
                <Upload className="w-4 h-4" />
                رفع
              </button>
              <button 
                onClick={() => {
                  setImages(prev => ({
                    ...prev,
                    [imageKey]: { ...prev[imageKey], file: null, preview: null }
                  }));
                  if (fileInputRefs[imageKey].current) {
                    fileInputRefs[imageKey].current.value = '';
                  }
                }}
                className="image-cancel-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="image-upload-progress">
            <div className="image-progress-bar-container">
              <div 
                className="image-progress-bar-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="image-progress-text">{progress}%</p>
          </div>
        )}

        {!hasFile && !hasUrl && !isUploading && (
          <div 
            className={`image-dropzone ${dragActive === imageKey ? 'active' : ''}`}
            onDragEnter={(e) => handleDragEnter(e, imageKey)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, imageKey)}
            onClick={() => fileInputRefs[imageKey].current?.click()}
          >
            <Image className="image-dropzone-icon" />
            <p className="image-dropzone-text">اسحب الصورة هنا أو اضغط للاختيار</p>
            <p className="image-dropzone-hint">PNG, JPG, WebP (أقل من 10 MB)</p>
            <input
              ref={fileInputRefs[imageKey]}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(imageKey, e.target.files?.[0])}
              className="image-file-input-hidden"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="image-upload-manager">
      <div className="image-upload-grid">
        {Object.keys(IMAGE_TYPE_LABELS).map(imageKey => renderImageBox(imageKey))}
      </div>
    </div>
  );
};

export default React.memo(ImageUploadManager);
