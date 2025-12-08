import React from 'react';
import { Wand2, Loader2, Sparkles, Image as ImageIcon, AlignJustify, Smartphone, Zap, Star, Type, Bot } from 'lucide-react';
import { AspectRatio, ImageStyle, ImageModel } from '../types';

interface ControlsProps {
  prompt: string;
  setPrompt: (value: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (value: AspectRatio) => void;
  style: ImageStyle;
  setStyle: (value: ImageStyle) => void;
  selectedModel: ImageModel;
  setSelectedModel: (value: ImageModel) => void;
  onGenerate: () => void;
  onEnhance: () => void;
  isGenerating: boolean;
  isEnhancing: boolean;
  watermarkEnabled: boolean;
  setWatermarkEnabled: (value: boolean) => void;
  watermarkText: string;
  setWatermarkText: (value: string) => void;
  openAiKey: string;
  setOpenAiKey: (value: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  prompt,
  setPrompt,
  aspectRatio,
  onAspectRatioChange,
  style,
  setStyle,
  selectedModel,
  setSelectedModel,
  onGenerate,
  onEnhance,
  isGenerating,
  isEnhancing,
  watermarkEnabled,
  setWatermarkEnabled,
  watermarkText,
  setWatermarkText,
  openAiKey,
  setOpenAiKey
}) => {
  return (
    <div className="space-y-8">
      
      {/* Model Selection */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Model</label>
        <div className="grid grid-cols-3 gap-2">
            <button
                onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                    selectedModel === 'gemini-2.5-flash-image'
                    ? 'bg-slate-800/50 border-purple-500/50 text-white shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                }`}
            >
                <div className={`mb-1.5 p-1.5 rounded-lg ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                   <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">Gemini Flash</span>
            </button>

            <button
                onClick={() => setSelectedModel('gemini-3-pro-image-preview')}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                    selectedModel === 'gemini-3-pro-image-preview'
                    ? 'bg-slate-800/50 border-purple-500/50 text-white shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                }`}
            >
                 <div className={`mb-1.5 p-1.5 rounded-lg ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                   <Star className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">Gemini Pro</span>
            </button>

            <button
                onClick={() => setSelectedModel('dall-e-3')}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                    selectedModel === 'dall-e-3'
                    ? 'bg-slate-800/50 border-green-500/50 text-white shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                }`}
            >
                 <div className={`mb-1.5 p-1.5 rounded-lg ${selectedModel === 'dall-e-3' ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                   <Bot className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">DALL-E 3</span>
            </button>
        </div>

        {/* OpenAI Key Input (Conditional) */}
        {selectedModel === 'dall-e-3' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">OpenAI API Key (sk-...)</label>
                <input 
                    type="password"
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Key is only used for this session and not stored.</p>
            </div>
        )}
      </div>

      {/* Prompt Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
            <button 
                onClick={onEnhance}
                disabled={isEnhancing || !prompt}
                className="text-xs flex items-center space-x-1.5 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Enhance</span>
            </button>
        </div>
        <div className="relative group">
            <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A futuristic city with flying cars at sunset..."
            className="w-full bg-slate-900 border border-slate-700 group-hover:border-slate-600 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all min-h-[110px] resize-none text-base md:text-sm shadow-inner"
            />
            <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 font-medium bg-slate-900/80 px-1 rounded">
                {prompt.length} chars
            </div>
        </div>
      </div>

      {/* Style Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Art Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.values(ImageStyle).map((s) => (
                <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 truncate ${
                        style === s 
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)]' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                >
                    {s}
                </button>
            ))}
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Format</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onAspectRatioChange('1:1')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
              aspectRatio === '1:1'
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)]' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-5 h-5 mb-2" />
            <span className="text-xs font-medium">Square</span>
          </button>
          
          <button
            onClick={() => onAspectRatioChange('3:4')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
              aspectRatio === '3:4'
               ? 'bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)]' 
               : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
            }`}
          >
            <AlignJustify className="w-5 h-5 mb-2" />
            <span className="text-xs font-medium">Portrait</span>
          </button>

          <button
            onClick={() => onAspectRatioChange('9:16')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
              aspectRatio === '9:16'
               ? 'bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)]' 
               : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-5 h-5 mb-2" />
            <span className="text-xs font-medium">Story</span>
          </button>
        </div>
      </div>

      {/* Watermark Section */}
      <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  Watermark
              </label>
              <button
                  onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${watermarkEnabled ? 'bg-purple-600' : 'bg-slate-800 border border-slate-700'}`}
              >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${watermarkEnabled ? 'translate-x-5' : ''}`} />
              </button>
          </div>
          
          {watermarkEnabled && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="relative">
                    <Type className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="@yourhandle"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>
              </div>
          )}
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt}
            className="w-full group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transform active:scale-[0.98]"
        >
            {isGenerating ? (
            <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Dreaming...</span>
            </>
            ) : (
            <>
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Generate Post</span>
            </>
            )}
        </button>
      </div>
    </div>
  );
};