import React, { useState, useEffect, useRef } from 'react';
import { Controls } from './components/Controls';
import { PostPreview } from './components/PostPreview';
import { generateImage, generateCaption, enhancePrompt } from './services/geminiService';
import { AspectRatio, ImageStyle, ImageModel } from './types';
import { Download, Instagram, AlertCircle, CheckCircle2, Key } from 'lucide-react';

// Helper to apply watermark via Canvas
const applyWatermark = async (base64Image: string, text: string): Promise<string> => {
  if (!text) return base64Image;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Good practice even for base64
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure text styles
      // Scale font based on image width to remain consistent across resolutions
      const fontSize = Math.max(20, img.width * 0.035); 
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      // Add shadow for better visibility against any background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Draw text at bottom right with padding relative to size
      const padding = img.width * 0.04;
      ctx.fillText(text, img.width - padding, img.height - padding);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
        resolve(base64Image); // Fail gracefuly returns original
    };
    img.src = base64Image;
  });
};

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<ImageStyle>(ImageStyle.NONE);
  const [selectedModel, setSelectedModel] = useState<ImageModel>('gemini-2.5-flash-image');
  
  // Watermark State
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('@instagen.ai');

  // Image State
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null); // Stores the original AI generation
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Stores the final processed/watermarked image
  
  const [caption, setCaption] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback for environments where aistudio object isn't available immediately
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  // Effect to apply/re-apply watermark when settings change, without regenerating the whole image
  useEffect(() => {
    const updateImageWithWatermark = async () => {
      if (!rawImageUrl) {
        setImageUrl(null);
        return;
      }

      if (watermarkEnabled && watermarkText.trim()) {
        const marked = await applyWatermark(rawImageUrl, watermarkText.trim());
        setImageUrl(marked);
      } else {
        setImageUrl(rawImageUrl);
      }
    };

    updateImageWithWatermark();
  }, [rawImageUrl, watermarkEnabled, watermarkText]);


  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true); // Assume success per guidelines
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    try {
      const newPrompt = await enhancePrompt(prompt);
      setPrompt(newPrompt);
    } catch (e) {
      // failures silently ignored
    } finally {
      setIsEnhancing(false);
    }
  };

  // Reusable generation function that takes specific parameters
  const executeGeneration = async (
    promptVal: string, 
    ratioVal: AspectRatio, 
    styleVal: ImageStyle, 
    modelVal: ImageModel
  ) => {
    if (!promptVal) return;

    setIsGenerating(true);
    setError(null);
    setRawImageUrl(null); // Clear previous original
    // ImageUrl will be cleared by the useEffect when rawImageUrl becomes null
    setCaption('');
    setShowSuccessToast(false);

    try {
      // 1. Generate Image using selected model and ratio
      const imageBase64 = await generateImage(promptVal, ratioVal, styleVal, modelVal);
      setRawImageUrl(imageBase64); // This triggers the watermark effect

      // 2. Generate Caption in parallel
      const generatedCaption = await generateCaption(promptVal);
      setCaption(generatedCaption);

      // Auto-scroll to preview on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

    } catch (err: any) {
      if (err.message && err.message.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key issue detected. Please select your key again.");
      } else {
        setError(err.message || "Failed to generate content. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Triggered by the main Generate button
  const handleGenerateClick = () => {
    executeGeneration(prompt, aspectRatio, style, selectedModel);
  };

  // Triggered when Format (Aspect Ratio) changes
  const handleAspectRatioChange = (newRatio: AspectRatio) => {
    setAspectRatio(newRatio);
    // If we already have an image and a prompt, auto-regenerate to fit the new aspect ratio
    // This ensures the content is properly composed for the new shape
    if (imageUrl && prompt && !isGenerating) {
      executeGeneration(prompt, newRatio, style, selectedModel);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `instagen-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePostToInstagram = async () => {
    if (!imageUrl) return;

    try {
      await navigator.clipboard.writeText(caption);
      
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "instagen-post.png", { type: "image/png" });

      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'InstaGen Creation',
          text: caption 
        });
        setShowSuccessToast(true); 
      } else {
        handleDownload();
        setShowSuccessToast(true);
      }
    } catch (e) {
      console.error("Sharing failed", e);
      setShowSuccessToast(true);
    }
  };

  // API Key Gatekeeper Screen
  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40">
            <Instagram className="w-10 h-10 text-white" />
         </div>
         <h1 className="text-3xl font-bold text-white mb-3">Welcome to InstaGen AI</h1>
         <p className="text-slate-400 max-w-md mb-8">
           To create stunning visuals with Gemini's high-performance models, please select a billing-enabled API key.
         </p>
         <button 
           onClick={handleSelectKey}
           className="flex items-center space-x-2 bg-white text-slate-950 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
         >
           <Key className="w-5 h-5" />
           <span>Select API Key</span>
         </button>
         <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="mt-6 text-xs text-slate-500 hover:text-slate-400 underline">
            Read about billing requirements
         </a>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Left Sidebar - Controls */}
      {/* Fixed mobile layout: removed sticky from mobile to allow full scrolling of controls */}
      <div className="w-full md:w-[400px] lg:w-[450px] p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-auto md:h-screen relative md:sticky md:top-0 bg-slate-950 z-20 md:overflow-y-auto no-scrollbar">
        <div className="mb-8">
            <div className="flex items-center space-x-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                <Instagram className="w-6 h-6 text-pink-500" />
                <h1 className="text-2xl font-bold tracking-tight">InstaGen AI</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">Concept to Instagram post in seconds.</p>
        </div>

        <Controls
            prompt={prompt}
            setPrompt={setPrompt}
            aspectRatio={aspectRatio}
            onAspectRatioChange={handleAspectRatioChange}
            style={style}
            setStyle={setStyle}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            onGenerate={handleGenerateClick}
            onEnhance={handleEnhancePrompt}
            isGenerating={isGenerating}
            isEnhancing={isEnhancing}
            watermarkEnabled={watermarkEnabled}
            setWatermarkEnabled={setWatermarkEnabled}
            watermarkText={watermarkText}
            setWatermarkText={setWatermarkText}
        />

        {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
            </div>
        )}
      </div>

      {/* Right Content - Preview */}
      <div ref={previewRef} className="flex-1 bg-slate-950 relative">
        <div className="h-full w-full p-4 md:p-8 flex flex-col items-center justify-center min-h-[500px]">
            
            {imageUrl ? (
                <div className="animate-in fade-in zoom-in duration-500 w-full max-w-lg">
                     <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Preview</h2>
                        <div className="flex space-x-2">
                            <button 
                                onClick={handleDownload}
                                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Download Image"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handlePostToInstagram}
                                className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-sm flex items-center space-x-2 transition-all shadow-lg shadow-pink-900/20"
                            >
                                <Instagram className="w-4 h-4" />
                                <span>Post to Instagram</span>
                            </button>
                        </div>
                     </div>

                    <PostPreview 
                        imageUrl={imageUrl} 
                        caption={caption} 
                        aspectRatio={aspectRatio} 
                    />
                </div>
            ) : (
                <div className="text-center space-y-4 opacity-50 max-w-md my-10 md:my-0">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                        <Instagram className="w-10 h-10 text-slate-600" />
                    </div>
                    {isGenerating ? (
                        <>
                            <h3 className="text-xl font-medium text-purple-300 animate-pulse">Designing your post...</h3>
                            <p className="text-slate-500">Creating the perfect composition for your selected format.</p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-medium text-slate-300">Ready to create?</h3>
                            <p className="text-slate-500">
                                Describe your idea on the left. We'll generate a stunning image and a witty caption perfect for your feed or story.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Toast Notification */}
      {showSuccessToast && (
          <div className="fixed bottom-8 right-8 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                  <p className="font-medium text-sm">Caption Copied!</p>
                  <p className="text-xs text-slate-400">Ready to paste in Instagram.</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;