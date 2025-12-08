export type AspectRatio = '1:1' | '3:4' | '9:16';

export type ImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export interface GenerationResult {
  imageUrl: string;
  caption: string;
}

export interface GenerationState {
  isGeneratingImage: boolean;
  isGeneratingCaption: boolean;
  error: string | null;
}

export enum ImageStyle {
  PHOTOREALISTIC = 'Photorealistic',
  CINEMATIC = 'Cinematic',
  ANIME = 'Anime',
  DIGITAL_ART = 'Digital Art',
  VINTAGE = 'Vintage Film',
  MINIMALIST = 'Minimalist',
  IMPRESSIONISM = 'Impressionism',
  SURREALISM = 'Surrealism',
  ABSTRACT = 'Abstract',
  NONE = 'None'
}