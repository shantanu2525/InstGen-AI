import React, { useState, useEffect, useRef } from 'react';
import { Controls } from './components/Controls';
import { PostPreview } from './components/PostPreview';
import { generateImage, generateCaption, enhancePrompt } from './services/geminiService';
import { AspectRatio, ImageStyle, ImageModel } from './types';
import { Download, Instagram, AlertCircle, CheckCircle2, Key, Github, LogOut, ArrowRight } from 'lucide-react';

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
  // --- Auth State ---
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showManualLogin, setShowManualLogin] = useState(false);
  // ------------------
  
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

  // Initialize Auth from LocalStorage or URL params
  useEffect(() => {
    // 1. Check URL Params (Backend Redirect Flow)
    const params = new URLSearchParams(window.location.search);
    const keyFromUrl = params.get('api_key') || params.get('key');
    
    if (keyFromUrl) {
      const cleanedKey = keyFromUrl.trim();
      localStorage.setItem('gemini_api_key', cleanedKey);
      setGeminiApiKey(cleanedKey);
      setHasKey(true);
      // Clean URL without refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // 2. Check LocalStorage
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setGeminiApiKey(storedKey.trim());
      setHasKey(true);
    }
  }, []);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    if (cleanKey.length > 10) {
      localStorage.setItem('gemini_api_key', cleanKey);
      setGeminiApiKey(cleanKey);
      setHasKey(true);
    }
  };

  const handleDemoLogin = () => {
    // Using the user-provided key for quick access/demo purposes
    const demoKey = "AIzaSyB33IGftG1Jj3jld9tygz3BzIqn3RjippA";
    localStorage.setItem('gemini_api_key', demoKey);
    setGeminiApiKey(demoKey);
    setHasKey(true);
  }

  const handleLogout = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiApiKey('');
    setHasKey(false);
    setInputKey('');
    setShowManualLogin(false);
  };

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


  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    try {
      const newPrompt = await enhancePrompt(prompt, style, geminiApiKey);
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
    
    if (!geminiApiKey) {
        setError("API Key is missing. Please try logging out and back in.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    setRawImageUrl(null); // Clear previous original
    // ImageUrl will be cleared by the useEffect when rawImageUrl becomes null
    setCaption('');
    setShowSuccessToast(false);

    try {
      // 1. Generate Image using selected model and ratio
      const imageBase64 = await generateImage(promptVal, ratioVal, styleVal, modelVal, geminiApiKey, false, openAiKey);
      setRawImageUrl(imageBase64); // This triggers the watermark effect

      // 2. Generate Caption in parallel (always uses Gemini for text)
      const generatedCaption = await generateCaption(promptVal, geminiApiKey);
      setCaption(generatedCaption);

      // Auto-scroll to preview on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

    } catch (err: any) {
      if (err.message && (err.message.includes("Requested entity was not found") || err.message.includes("API Key is invalid") || err.message.includes("API Key not found"))) {
        setError("Session expired or API Key invalid. Please log out and try again.");
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

  // Login / Gatekeeper Screen
  if (!hasKey) {
    return (
      <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
         {/* Background Decor */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20">
            <div className="absolute top-10 left-10 w-64 h-64 bg-purple-600 rounded-full blur-[100px]" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-600 rounded-full blur-[120px]" />
         </div>

         <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40">
                <Instagram className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">InstaGen AI</h1>
            <p className="text-slate-400 max-w-sm mb-10 text-base leading-relaxed">
              Create stunning, Instagram-ready visuals and captions in seconds using the power of Gemini.
            </p>

            <div className="max-w-sm w-full space-y-4">
                {/* Main Login Options */}
                {!showManualLogin ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <button 
                        onClick={handleDemoLogin}
                        className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-3.5 rounded-xl flex items-center justify-center space-x-3 transition-colors shadow-lg shadow-white/10 group"
                      >
                         <div className="w-5 h-5 flex items-center justify-center">
                           <svg viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                         </div>
                         <span>Sign in with Google</span>
                         <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-slate-950 px-2 text-slate-500">Or</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => setShowManualLogin(true)}
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-colors"
                      >
                         <Key className="w-4 h-4" />
                         <span>Enter API Key Manually</span>
                      </button>
                  </div>
                ) : (
                  <form onSubmit={handleManualLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <input 
                            type="password" 
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="Paste Gemini API Key (AIzaSy...)"
                            autoFocus
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3.5 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                        />
                      </div>
                      <div className="flex space-x-3">
                          <button 
                            type="button"
                            onClick={() => setShowManualLogin(false)}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-semibold py-3 rounded-xl transition-colors text-sm"
                          >
                            Back
                          </button>
                          <button 
                            type="submit"
                            disabled={!inputKey}
                            className="flex-[2] bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-colors text-sm shadow-lg shadow-purple-900/20"
                          >
                            <span>Connect</span>
                          </button>
                      </div>
                  </form>
                )}
            </div>

            <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-600">
                  By continuing, you agree to use the Gemini API <br/> in accordance with Google's Terms of Service.
                </p>
            </div>
         </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Left Sidebar - Controls */}
      <div className="w-full md:w-[400px] lg:w-[450px] p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-auto md:h-dvh relative md:sticky md:top-0 bg-slate-950 z-20 md:overflow-y-auto no-scrollbar">
        <div className="mb-8 flex-shrink-0 flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                  <Instagram className="w-6 h-6 text-pink-500" />
                  <h1 className="text-2xl font-bold tracking-tight">InstaGen AI</h1>
              </div>
              <p className="text-slate-500 text-sm mt-1">Concept to Instagram post in seconds.</p>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
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