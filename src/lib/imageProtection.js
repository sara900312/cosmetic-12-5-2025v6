/**
 * Image Protection Utility
 * Prevents users from copying, dragging, or accessing image context menus
 * Blocks: right-click, long-press, drag, copy, open in new tab
 */

import React from 'react';

const imageProtectionConfig = {
  preventContextMenu: true,
  preventDrag: true,
  preventLongPress: true,
  preventCopy: true,
  preventSelection: true
};

/**
 * Prevent right-click context menu on image
 */
const handleContextMenu = (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
};

/**
 * Prevent drag and drop of image
 */
const handleDragStart = (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
};

/**
 * Prevent long-press and touch-hold on mobile
 */
const handleTouchStart = (e) => {
  // Store the start time
  e.currentTarget.touchStartTime = Date.now();
};

const handleTouchEnd = (e) => {
  // If touch duration is long (>500ms), it's a long-press
  const touchDuration = Date.now() - (e.currentTarget.touchStartTime || 0);
  if (touchDuration > 300) {
    e.preventDefault();
    e.stopPropagation();
  }
};

const handleTouchMove = (e) => {
  // Optional: Prevent touch scrolling on image if needed
};

/**
 * Prevent mouseup with right button (for copy protection)
 */
const handleMouseUp = (e) => {
  if (e.button === 2) {
    e.preventDefault();
    e.stopPropagation();
  }
};

/**
 * Prevent mousedown with right button
 */
const handleMouseDown = (e) => {
  if (e.button === 2) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
};

/**
 * Apply all protection listeners to an image element
 * @param {HTMLElement} imageElement - The image DOM element to protect
 */
export const protectProductImage = (imageElement) => {
  if (!imageElement) return;

  // Add event listeners for protection
  imageElement.addEventListener('contextmenu', handleContextMenu, true);
  imageElement.addEventListener('dragstart', handleDragStart, true);
  imageElement.addEventListener('dragover', handleDragOver, true);
  imageElement.addEventListener('drop', handleDrop, true);
  imageElement.addEventListener('mousedown', handleMouseDown, true);
  imageElement.addEventListener('mouseup', handleMouseUp, true);
  imageElement.addEventListener('touchstart', handleTouchStart, true);
  imageElement.addEventListener('touchend', handleTouchEnd, true);
  imageElement.addEventListener('touchmove', handleTouchMove, true);

  // Prevent selection via CSS
  imageElement.style.userSelect = 'none';
  imageElement.style.WebkitUserSelect = 'none';
  imageElement.style.MozUserSelect = 'none';
  imageElement.style.msUserSelect = 'none';

  // Prevent dragging
  imageElement.draggable = false;

  // Store protection flag
  imageElement.dataset.protected = 'true';
};

/**
 * Remove protection listeners from an image element
 * @param {HTMLElement} imageElement - The image DOM element
 */
export const unprotectProductImage = (imageElement) => {
  if (!imageElement) return;

  imageElement.removeEventListener('contextmenu', handleContextMenu, true);
  imageElement.removeEventListener('dragstart', handleDragStart, true);
  imageElement.removeEventListener('dragover', handleDragOver, true);
  imageElement.removeEventListener('drop', handleDrop, true);
  imageElement.removeEventListener('mousedown', handleMouseDown, true);
  imageElement.removeEventListener('mouseup', handleMouseUp, true);
  imageElement.removeEventListener('touchstart', handleTouchStart, true);
  imageElement.removeEventListener('touchend', handleTouchEnd, true);
  imageElement.removeEventListener('touchmove', handleTouchMove, true);

  imageElement.dataset.protected = 'false';
};

/**
 * React hook to apply protection to an image ref
 * Usage: useProtectImage(imageRef)
 */
export const useProtectImage = (imageRef) => {
  React.useEffect(() => {
    if (imageRef?.current) {
      protectProductImage(imageRef.current);

      return () => {
        unprotectProductImage(imageRef.current);
      };
    }
  }, [imageRef]);
};

export default {
  protectProductImage,
  unprotectProductImage,
  useProtectImage
};
