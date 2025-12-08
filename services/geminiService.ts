import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageStyle, ImageModel } from '../types';

// Helper to get a fresh client instance with the latest key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to fix prompts that result in no image (often due to safety filters)
const fixBlockedPrompt = async (originalPrompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The following image generation prompt failed to generate an image (likely due to safety filters or lack of clarity). Rewrite it to be safe, descriptive, and policy-compliant while preserving the core artistic intent. Prompt: "${originalPrompt}"`,
    });
    return response.text?.trim() || originalPrompt;
  } catch (e) {
    return originalPrompt;
  }
};

export const generateImage = async (
  prompt: string,
  ratio: AspectRatio,
  style: ImageStyle,
  model: ImageModel,
  isRetry: boolean = false
): Promise<string> => {
  try {
    const ai = getAiClient();
    let promptToSend = prompt;
    
    // Construct the final prompt with style
    if (style !== ImageStyle.NONE) {
      promptToSend = `${style} style. ${prompt}`;
    }

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
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("No image data found in the response.");
    }

    return base64Image;

  } catch (error) {
    // If it's the first failure, try to fix the prompt and retry
    if (!isRetry) {
      console.warn("Image generation failed. Attempting to auto-fix prompt...", error);
      const fixedPrompt = await fixBlockedPrompt(prompt);
      
      // If the prompt was changed, retry with the new prompt
      if (fixedPrompt !== prompt) {
        return generateImage(fixedPrompt, ratio, style, model, true);
      }
    }
    
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

export const generateCaption = async (imagePrompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
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

  } catch (error) {
    console.error("Gemini Caption Generation Error:", error);
    return "Check out this AI generated image! #AI #Art"; // Fallback
  }
};

export const enhancePrompt = async (originalPrompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rewrite this image prompt to be more descriptive and artistic for an AI image generator. Keep it under 50 words. Original: "${originalPrompt}"`,
    });
    return response.text?.trim() || originalPrompt;
  } catch (e) {
    return originalPrompt;
  }
}