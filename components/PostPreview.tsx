import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { AspectRatio } from '../types';

interface PostPreviewProps {
  imageUrl: string;
  caption: string;
  aspectRatio: AspectRatio;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ imageUrl, caption, aspectRatio }) => {
  const [liked, setLiked] = useState(false);

  // Calculate container class based on aspect ratio for the preview container
  const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-[3/4]';
      case '9:16': return 'aspect-[9/16]';
      default: return 'aspect-square';
    }
  };

  const isStory = aspectRatio === '9:16';

  if (isStory) {
    return (
      <div className="mx-auto w-full max-w-sm bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative h-[600px] flex items-center justify-center">
         {/* Story UI Overlay */}
         <div className="absolute top-4 left-0 right-0 z-10 px-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                   <div className="w-full h-full rounded-full bg-slate-900 border border-white" />
                </div>
                <span className="text-white text-sm font-semibold shadow-black drop-shadow-md">You</span>
                <span className="text-white/70 text-xs shadow-black drop-shadow-md">1m</span>
            </div>
            <MoreHorizontal className="text-white drop-shadow-md" />
         </div>

         {/* Image */}
         <img src={imageUrl} alt="Generated Story" className="absolute inset-0 w-full h-full object-cover" />

         {/* Bottom UI */}
         <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
             <div className="flex items-center space-x-3">
                <input 
                  disabled
                  type="text" 
                  placeholder="Send message" 
                  className="bg-transparent border border-white/40 rounded-full px-4 py-2.5 text-white w-full placeholder:text-white/70 focus:outline-none backdrop-blur-md"
                />
                <Heart className="text-white w-7 h-7" />
                <Send className="text-white w-7 h-7" />
             </div>
         </div>
      </div>
    );
  }

  // Feed Post Style
  return (
    <div className="mx-auto w-full max-w-sm bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
             <img src="https://picsum.photos/32/32" alt="Avatar" className="w-full h-full rounded-full border-2 border-black" />
          </div>
          <span className="text-white text-sm font-semibold">insta_gen_ai</span>
        </div>
        <MoreHorizontal className="text-white w-5 h-5 cursor-pointer" />
      </div>

      {/* Image */}
      <div className={`w-full bg-slate-900 ${getAspectRatioClass(aspectRatio)} relative`}>
        <img 
            src={imageUrl} 
            alt="Generated Content" 
            className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex space-x-4">
            <button onClick={() => setLiked(!liked)} className="transition-transform active:scale-90">
                <Heart className={`w-6 h-6 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
            <MessageCircle className="w-6 h-6 text-white" />
            <Send className="w-6 h-6 text-white" />
          </div>
          <Bookmark className="w-6 h-6 text-white" />
        </div>

        {/* Likes */}
        <div className="text-white text-sm font-semibold mb-2">
          {liked ? '1 like' : '0 likes'}
        </div>

        {/* Caption */}
        <div className="text-white text-sm">
          <span className="font-semibold mr-2">insta_gen_ai</span>
          <span className="whitespace-pre-wrap text-slate-200">{caption}</span>
        </div>
        
        <div className="text-slate-500 text-xs mt-2 uppercase">
            Just now
        </div>
      </div>
    </div>
  );
};
