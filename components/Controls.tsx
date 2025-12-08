import React from 'react';
import { Wand2, Loader2, Sparkles, Image as ImageIcon, AlignJustify, Smartphone, Zap, Star, Type } from 'lucide-react';
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
  setWatermarkText
}) => {
  return (
    <div className="space-y-6">
      
      {/* Model Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Model</label>
        <div className="grid grid-cols-2 gap-3">
            <button
                onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all duration-200 ${
                    selectedModel === 'gemini-2.5-flash-image'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
            >
                <Zap className="w-4 h-4" />
                <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-semibold">Flash</span>
                    <span className="text-[10px] opacity-60">Fast & Efficient</span>
                </div>
            </button>

            <button
                onClick={() => setSelectedModel('gemini-3-pro-image-preview')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all duration-200 ${
                    selectedModel === 'gemini-3-pro-image-preview'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
            >
                <Star className="w-4 h-4" />
                <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-semibold">Pro</span>
                    <span className="text-[10px] opacity-60">High Quality</span>
                </div>
            </button>
        </div>
      </div>

      {/* Prompt Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <button 
                onClick={onEnhance}
                disabled={isEnhancing || !prompt}
                className="text-xs flex items-center space-x-1 text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
            >
                {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Enhance Prompt</span>
            </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A futuristic city with flying cars at sunset..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] resize-none text-base md:text-sm"
        />
      </div>

      {/* Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Art Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.values(ImageStyle).map((s) => (
                <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-2 rounded-md text-xs font-medium border transition-all duration-200 truncate ${
                        style === s 
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                >
                    {s}
                </button>
            ))}
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Format</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onAspectRatioChange('1:1')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
              aspectRatio === '1:1'
                ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <ImageIcon className="w-5 h-5 mb-2" />
            <span className="text-xs">Square</span>
            <span className="text-[10px] opacity-60">Post</span>
          </button>
          
          <button
            onClick={() => onAspectRatioChange('3:4')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
              aspectRatio === '3:4'
                ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <AlignJustify className="w-5 h-5 mb-2" />
            <span className="text-xs">Portrait</span>
            <span className="text-[10px] opacity-60">Feed</span>
          </button>

          <button
            onClick={() => onAspectRatioChange('9:16')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
              aspectRatio === '9:16'
                ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Smartphone className="w-5 h-5 mb-2" />
            <span className="text-xs">Vertical</span>
            <span className="text-[10px] opacity-60">Story</span>
          </button>
        </div>
      </div>

      {/* Watermark Section */}
      <div className="space-y-2">
          <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Watermark
              </label>
              <button
                  onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${watermarkEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${watermarkEnabled ? 'translate-x-5' : ''}`} />
              </button>
          </div>
          
          {watermarkEnabled && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <input 
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="@yourhandle"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
          )}
      </div>

      {/* Action Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !prompt}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg shadow-purple-900/20"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Dreaming...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            <span>Generate Post</span>
          </>
        )}
      </button>
      
      <p className="text-xs text-center text-slate-600">
        Powered by Gemini 2.5 Flash Image & 3.0 Pro
      </p>
    </div>
  );
};