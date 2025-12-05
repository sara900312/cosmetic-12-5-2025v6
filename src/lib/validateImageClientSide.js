import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as nsfwjs from 'nsfwjs';
import * as faceapi from '@vladmandic/face-api';

let nsfwModel = null;
let faceApiModelsLoaded = false;

const NSFW_THRESHOLD = 0.40; // 40% probability threshold for Porn, Hentai, Sexy

/**
 * Load NSFW model
 */
const loadNSFWModel = async () => {
  if (nsfwModel) return nsfwModel;
  try {
    nsfwModel = await nsfwjs.load();
    return nsfwModel;
  } catch (error) {
    console.error('Error loading NSFW model:', error);
    return null;
  }
};

/**
 * Load face-api.js models
 */
const loadFaceApiModels = async () => {
  if (faceApiModelsLoaded) return true;
  try {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    faceApiModelsLoaded = true;
    return true;
  } catch (error) {
    console.error('Error loading face-api models:', error);
    return false;
  }
};

/**
 * Convert File to HTMLImageElement
 */
const fileToImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Check for human faces using face-api.js
 */
const checkForFaces = async (image) => {
  try {
    const detection = await faceapi.detectAllFaces(
      image,
      new faceapi.TinyFaceDetectorOptions()
    );
    return detection.length > 0;
  } catch (error) {
    console.error('Error in face detection:', error);
    return false; // Default to allowing if detection fails
  }
};

/**
 * Check for NSFW content using NSFWJS
 */
const checkForNSFWContent = async (image) => {
  try {
    const predictions = await nsfwModel.classify(image);

    // Check for Porn, Hentai, and Sexy predictions
    const isNSFW = predictions.some((prediction) => {
      const isBadCategory =
        prediction.className === 'Porn' ||
        prediction.className === 'Hentai' ||
        prediction.className === 'Sexy';

      return isBadCategory && prediction.probability > NSFW_THRESHOLD;
    });

    return isNSFW;
  } catch (error) {
    console.error('Error in NSFW classification:', error);
    return false; // Default to allowing if classification fails
  }
};

/**
 * Main validation function
 */
export const validateImageClientSide = async (file) => {
  try {
    // Load models in parallel
    const [_, modelsLoaded] = await Promise.all([
      loadNSFWModel(),
      loadFaceApiModels(),
    ]);

    if (!modelsLoaded) {
      console.warn('Models failed to load, skipping validation');
      return 'GOOD';
    }

    // Convert file to image
    const image = await fileToImage(file);

    // Check for faces
    const hasFaces = await checkForFaces(image);
    if (hasFaces) {
      return 'BAD_FACES';
    }

    // Check for NSFW content
    const hasNSFW = await checkForNSFWContent(image);
    if (hasNSFW) {
      return 'BAD_NSFW';
    }

    return 'GOOD';
  } catch (error) {
    console.error('Image validation error:', error);
    return 'GOOD'; // Default to allowing if validation fails
  }
};

/**
 * Clean up TensorFlow resources
 */
export const cleanupValidation = () => {
  tf.disposeVariables();
};
