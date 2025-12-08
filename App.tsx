import React, { useState, useEffect, useRef } from 'react';
import { Controls } from './components/Controls';
import { PostPreview } from './components/PostPreview';
import { generateImage, generateCaption, enhancePrompt } from './services/geminiService';
import { AspectRatio, ImageStyle, ImageModel } from './types';
import { Download, Instagram, AlertCircle, CheckCircle2, Key, Settings, Github } from 'lucide-react';

// Fallback key also defined here to initialize state correctly without service import lag
const API_KEY_FALLBACK = "AIzaSyB33IGftG1Jj3jld9tygz3BzIqn3RjippA";

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
  // Initialize hasKey using the fallback logic. 
  // We check safe process.env OR if we have a hardcoded fallback.
  const [hasKey, setHasKey] = useState(() => {
    if (API_KEY_FALLBACK) return true;
    
    try {
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        const k = process.env.API_KEY;
        return !!(k && k.length > 0 && k !== 'undefined');
      }
    } catch(e) {}

    return false;
  });
  
  const [isAiStudio, setIsAiStudio] = useState(false);
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<ImageStyle>(ImageStyle.NONE);
  const [selectedModel, setSelectedModel] = useState<ImageModel>('gemini-2.5-flash-image');
  
  // OpenAI Specific State
  const [openAiKey, setOpenAiKey] = useState('');

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
      // Check if we are running in the Google AI Studio environment
      if ((window as any).aistudio) {
        setIsAiStudio(true);
        // In AI Studio, we respect the studio's key selector if explicitly used,
        // but since we have a fallback, we default to true to allow preview to work immediately.
        if (API_KEY_FALLBACK) {
          setHasKey(true);
        } else if ((window as any).aistudio.hasSelectedApiKey) {
          const has = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(has);
        }
      } else {
        // Standard environment (Vercel, Local, etc.)
        setIsAiStudio(false);
        if (API_KEY_FALLBACK) {
          setHasKey(true);
        } else {
          try {
            const key = typeof process !== 'undefined' ? process.env.API_KEY : null;
            if (key && key.length > 0 && key !== 'undefined') {
              setHasKey(true);
            } else {
              setHasKey(false);
            }
          } catch(e) { setHasKey(false); }
        }
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
      const newPrompt = await enhancePrompt(prompt, style);
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
      const imageBase64 = await generateImage(promptVal, ratioVal, styleVal, modelVal, false, openAiKey);
      setRawImageUrl(imageBase64); // This triggers the watermark effect

      // 2. Generate Caption in parallel (always uses Gemini for text)
      const generatedCaption = await generateCaption(promptVal);
      setCaption(generatedCaption);

      // Auto-scroll to preview on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

    } catch (err: any) {
      if (err.message && (err.message.includes("Requested entity was not found") || err.message.includes("API Key is invalid"))) {
        // This specific error suggests the key/project is invalid or missing
        setHasKey(false);
        setError("API Key issue detected. Please check your configuration.");
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
      <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40">
            <Instagram className="w-10 h-10 text-white" />
         </div>
         <h1 className="text-3xl font-bold text-white mb-3">Welcome to InstaGen AI</h1>
         <p className="text-slate-400 max-w-md mb-8">
           To create stunning visuals with Gemini's high-performance models, this app requires an API Key.
         </p>

         {isAiStudio ? (
           // Button for AI Studio Environment
           <>
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
           </>
         ) : (
           // Instructions for Vercel/Local Environment
           <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-left shadow-2xl">
              <div className="flex items-start space-x-3 mb-4">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Settings className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">API Key Missing</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      The <code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-400 font-mono text-xs">API_KEY</code> environment variable is not set.
                    </p>
                  </div>
              </div>
              
              <div className="space-y-4 text-sm text-slate-300">
                  <p>To fix this in Vercel:</p>
                  <ol className="list-decimal pl-4 space-y-2 text-slate-400">
                    <li>Go to your Vercel Project Settings.</li>
                    <li>Navigate to <strong>Environment Variables</strong>.</li>
                    <li>Add a new variable named <code className="text-white">API_KEY</code>.</li>
                    <li>Paste your Gemini API key as the value.</li>
                    <li>Redeploy your project.</li>
                  </ol>
              </div>
           </div>
         )}
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Left Sidebar - Controls */}
      <div className="w-full md:w-[400px] lg:w-[450px] p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-auto md:h-dvh relative md:sticky md:top-0 bg-slate-950 z-20 md:overflow-y-auto no-scrollbar">
        <div className="mb-8 flex-shrink-0">
            <div className="flex items-center space-x-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                <Instagram className="w-6 h-6 text-pink-500" />
                <h1 className="text-2xl font-bold tracking-tight">InstaGen AI</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">Concept to Instagram post in seconds.</p>
        </div>

        <div className="flex-1">
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
                openAiKey={openAiKey}
                setOpenAiKey={setOpenAiKey}
            />
        </div>

        {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
            </div>
        )}
        
        <div className="mt-8 mb-4 text-center space-y-2">
            <p className="text-xs text-slate-700">
                Powered by Gemini 2.5 Flash & 3.0 Pro, & OpenAI
            </p>
            <p className="text-xs text-slate-600 flex items-center justify-center gap-1">
                Developed by 
                <a href="https://github.com/shantanu2525" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-500 hover:text-purple-400 transition-colors border-b border-transparent hover:border-purple-500/30">
                    <Github className="w-3 h-3" />
                    <span>Shantanu Metri</span>
                </a>
            </p>
        </div>
      </div>

      {/* Right Content - Preview */}
      <div ref={previewRef} className="flex-1 bg-slate-950 relative min-h-[500px] flex flex-col">
        <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center">
            
            {imageUrl ? (
                <div className="animate-in fade-in zoom-in duration-500 w-full max-w-lg flex flex-col h-full justify-center">
                     <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Preview</h2>
                        <div className="flex space-x-2">
                            <button 
                                onClick={handleDownload}
                                className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ring-1 ring-slate-700"
                                title="Download Image"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handlePostToInstagram}
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-sm flex items-center space-x-2 transition-all shadow-lg shadow-pink-900/20"
                            >
                                <Instagram className="w-4 h-4" />
                                <span>Share</span>
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
                <div className="text-center space-y-6 opacity-60 max-w-md my-auto px-4">
                    <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800 shadow-xl shadow-black/50">
                        <Instagram className="w-12 h-12 text-slate-600" />
                    </div>
                    {isGenerating ? (
                        <div className="space-y-2">
                            <h3 className="text-xl font-medium text-purple-300 animate-pulse">Designing your post...</h3>
                            <p className="text-slate-500 text-sm">We are crafting the pixel-perfect composition for your feed.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h3 className="text-xl font-medium text-slate-300">Ready to create?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Describe your vision on the left sidebar. We will generate a high-quality image and a witty caption, ready for Instagram.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Toast Notification */}
      {showSuccessToast && (
          <div className="fixed bottom-8 right-8 max-w-sm w-full md:w-auto bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                  <p className="font-medium text-sm">Caption Copied!</p>
                  <p className="text-xs text-slate-400">Image is ready to be shared.</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;