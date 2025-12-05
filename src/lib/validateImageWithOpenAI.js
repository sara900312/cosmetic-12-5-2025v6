export const validateImageWithOpenAI = async (file) => {
  try {
    const apiKey = import.meta.env.VITE_HUMAN_API_KEY;

    if (!apiKey) {
      console.warn('OpenAI API key not configured, skipping validation');
      return 'GOOD';
    }

    // Convert image to Base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and classify it strictly:

Return "PRODUCT" only if the image shows a commercial product with no humans, no body parts, no skin, no shadows or reflections of people, and no sexual or adult content.

Return "BLOCK" if the image contains:
– any human presence or body part
– any AI-generated or real sexual content
– any nudity or erotic shapes
– any NSFW material
– anything that is not a pure product photo

Reply with one word only:
PRODUCT or BLOCK`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle rate limits gracefully
      if (response.status === 429) {
        console.warn('OpenAI rate limit reached - validation temporarily disabled');
        return 'GOOD'; // Allow uploads during rate limit
      }

      console.error('OpenAI API error:', error);
      return 'GOOD'; // Default to allowing if API fails
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content?.trim()?.toUpperCase() || 'BLOCK';

    return result === 'PRODUCT' ? 'GOOD' : 'BAD';
  } catch (err) {
    console.error('Image validation error:', err);
    return 'GOOD'; // Default to allowing if validation fails
  }
};
