import React, { useState, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import './ImageUploadManager.css';

const IMAGE_TYPE_LABELS = {
  main: 'الصورة الرئيسية',
  image_1: 'صورة فرعية 1',
  image_2: 'صورة فرعية 2',
  image_3: 'صورة فرعية 3',
};

const ImageUploadPrep = ({ onFilesChange }) => {
  const [images, setImages] = useState({
    main: { file: null, preview: null },
    image_1: { file: null, preview: null },
    image_2: { file: null, preview: null },
    image_3: { file: null, preview: null },
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
      const updatedImages = {
        ...images,
        [imageKey]: {
          file,
          preview: e.target.result,
        }
      };
      setImages(updatedImages);
      onFilesChange(updatedImages);
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

  const handleRemoveImage = (imageKey) => {
    const updatedImages = {
      ...images,
      [imageKey]: {
        file: null,
        preview: null,
      }
    };
    setImages(updatedImages);
    onFilesChange(updatedImages);
    if (fileInputRefs[imageKey].current) {
      fileInputRefs[imageKey].current.value = '';
    }
  };

  const renderImageBox = (imageKey) => {
    const imageData = images[imageKey];
    const hasFile = !!imageData.file;

    return (
      <div key={imageKey} className="image-upload-box">
        <div className="image-upload-label-header">
          <label className="image-upload-label">{IMAGE_TYPE_LABELS[imageKey]}</label>
        </div>

        {hasFile && (
          <div className="image-preview-container">
            <img src={imageData.preview} alt="preview" className="image-preview" />
            <div className="image-preview-actions">
              <button 
                onClick={() => handleRemoveImage(imageKey)}
                className="image-cancel-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!hasFile && (
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

export default React.memo(ImageUploadPrep);
