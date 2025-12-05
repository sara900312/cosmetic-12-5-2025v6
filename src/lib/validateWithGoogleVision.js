export const validateWithGoogleVision = async (file) => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;

    if (!apiKey) {
      console.warn('Google Vision API key not configured, skipping validation');
      return 'GOOD';
    }

    // Convert image to Base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64,
              },
              features: [
                {
                  type: 'FACE_DETECTION',
                },
                {
                  type: 'SAFE_SEARCH_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Vision API error:', error);

      // Handle rate limits gracefully
      if (response.status === 429) {
        console.warn('Google Vision rate limit reached - validation temporarily disabled');
        return 'GOOD';
      }

      return 'GOOD'; // Default to allowing if API fails
    }

    const data = await response.json();

    if (!data.responses || !data.responses[0]) {
      return 'GOOD';
    }

    const response_data = data.responses[0];

    // Check for human faces
    if (response_data.faceAnnotations && response_data.faceAnnotations.length > 0) {
      return 'BAD';
    }

    // Check safe search annotations
    if (response_data.safeSearchAnnotation) {
      const safeSearch = response_data.safeSearchAnnotation;

      // Reject if adult content is LIKELY or VERY_LIKELY
      if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
        return 'BAD';
      }

      // Reject if racy content is LIKELY or VERY_LIKELY
      if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
        return 'BAD';
      }

      // Reject if violence is LIKELY or VERY_LIKELY
      if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
        return 'BAD';
      }
    }

    return 'GOOD';
  } catch (err) {
    console.error('Google Vision validation error:', err);
    return 'GOOD'; // Default to allowing if validation fails
  }
};
