import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageStyle, ImageModel } from '../types';

// Helper to get a fresh client instance with the provided key
const getAiClient = (apiKey: string) => {
  const key = apiKey ? apiKey.trim() : '';
  
  if (!key) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (error: any) {
    if (error.message && error.message.includes("An API Key must be set")) {
        throw new Error("API Key is invalid.");
    }
    throw error;
  }
};

// Helper function to pause execution
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fix prompts that result in no image (often due to safety filters)
const fixBlockedPrompt = async (originalPrompt: string, apiKey: string): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The following image generation prompt failed to generate an image (likely due to safety filters or lack of clarity). Rewrite it to be safe, descriptive, and policy-compliant while preserving the core artistic intent. Prompt: "${originalPrompt}"`,
    });
    return response.text?.trim() || originalPrompt;
  } catch (e) {
    return originalPrompt;
  }
};

// --- OpenAI Integration ---
const generateOpenAIImage = async (
  prompt: string,
  ratio: AspectRatio,
  openAiKey: string
): Promise<string> => {
  if (!openAiKey) {
    throw new Error("OpenAI API Key is required for DALL-E 3 generation.");
  }

  // Map AspectRatio to DALL-E 3 supported sizes
  // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
  let size = "1024x1024";
  if (ratio === '3:4' || ratio === '9:16') {
    size = "1024x1792";
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openAiKey.trim()}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size,
      response_format: "b64_json"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data.error?.message || "Failed to generate image with OpenAI";
    throw new Error(`OpenAI Error: ${msg}`);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image data returned from OpenAI.");
  }

  return `data:image/png;base64,${b64}`;
};
// --------------------------

export const generateImage = async (
  prompt: string,
  ratio: AspectRatio,
  style: ImageStyle,
  model: ImageModel,
  apiKey: string,
  isRetry: boolean = false,
  openAiKey?: string // Optional key for OpenAI calls
): Promise<string> => {
  
  const validApiKey = apiKey ? apiKey.trim() : '';

  let promptToSend = prompt;
  // Construct the final prompt with style
  if (style !== ImageStyle.NONE) {
    promptToSend = `${style} style. ${prompt}`;
  }

  // Route to OpenAI if selected
  if (model === 'dall-e-3') {
    if (!openAiKey) throw new Error("Please enter your OpenAI API Key to use DALL-E 3.");
    return generateOpenAIImage(promptToSend, ratio, openAiKey);
  }

  // Otherwise, use Gemini
  try {
    const ai = getAiClient(validApiKey);
    
    // Use the selected model (Flash Image or Pro Image)
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: promptToSend }],
      },
      config: {
        imageConfig: {
          aspectRatio: ratio,
        },
      },
    });

    // Extract the base64 image data
    let base64Image: string | null = null;
    
    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("No image data found in the response.");
    }

    return base64Image;

  } catch (error: any) {
    // Attempt to parse JSON error message from Google
    let errorMessage = error.message;
    
    // Check for Rate Limit / Quota Exceeded (429)
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        (errorMessage && (errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')));

    if (isRateLimit) {
      if (!isRetry) {
        console.warn("Rate limit hit (429). Retrying in 5 seconds...");
        await wait(5000); // Wait 5 seconds to clear the rate limit
        return generateImage(prompt, ratio, style, model, validApiKey, true, openAiKey);
      } else {
        throw new Error("High traffic detected (Quota Exceeded). Please wait a minute before trying again.");
      }
    }

    // Check for 400 API Key Invalid explicitly
    if (error.status === 400 || (errorMessage && errorMessage.includes("API Key not found"))) {
      throw new Error("API Key is invalid or missing. Please log in again.");
    }

    // If it's the first failure (and NOT a rate limit), try to fix the prompt and retry
    if (!isRetry) {
      console.warn("Image generation failed. Attempting to auto-fix prompt...", error);
      const fixedPrompt = await fixBlockedPrompt(prompt, validApiKey);
      
      // If the prompt was changed, retry with the new prompt
      if (fixedPrompt !== prompt) {
        return generateImage(fixedPrompt, ratio, style, model, validApiKey, true, openAiKey);
      }
    }
    
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

export const generateCaption = async (imagePrompt: string, apiKey: string): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    const prompt = `
      You are a social media expert. Write a catchy, engaging Instagram caption for an image described as: "${imagePrompt}".
      Include 2-3 short sentences and a set of 10-15 relevant, trending hashtags at the end.
      Use emojis where appropriate. Keep the tone fun and authentic.
    `;

    // Using gemini-2.5-flash for text generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8, // Slightly creative
      }
    });

    const text = response.text;
    if (!text) return "Check out this AI generated image! #AI #Art";
    return text.trim();

  } catch (error: any) {
    // Simple retry for caption as well if rate limited
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
       console.warn("Caption generation rate limited. Returning fallback.");
       // For captions, we can just fail gracefully to the fallback instead of waiting 5s to keep UI snappy
       return "Check out this AI generated image! #AI #Art";
    }

    console.error("Gemini Caption Generation Error:", error);
    return "Check out this AI generated image! #AI #Art"; // Fallback
  }
};

export const enhancePrompt = async (originalPrompt: string, style: ImageStyle = ImageStyle.NONE, apiKey: string): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    
    let instructions = `Rewrite the following image prompt to be more descriptive, artistic, and detailed for an AI image generator.`;
    
    if (style !== ImageStyle.NONE) {
       instructions += ` The desired art style is "${style}", so include visual descriptors, lighting, techniques, and textures specific to this style.`;
    }
    
    instructions += ` Keep it under 60 words. Preserve the original subject but make the description vivid and compelling. Do not add quotes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${instructions} Original prompt: "${originalPrompt}"`,
    });
    return response.text?.trim() || originalPrompt;
  } catch (e) {
    return originalPrompt;
  }
}