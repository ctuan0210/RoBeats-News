import React from 'react';
import { Clock, Eye, Edit3 } from 'lucide-react';
import { NewsArticle } from '../types';

interface StoryCardProps {
  article: NewsArticle;
  onRead: (article: NewsArticle) => void;
  onEdit: (article: NewsArticle) => void;
  compact?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  article,
  onRead,
  onEdit,
  compact = false,
}) => {
  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (compact) {
    return (
      <article className="group py-3.5 border-b border-zinc-800/80 last:border-b-0 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono-numbers mb-1">
            <span className="font-semibold text-cyan-400 uppercase tracking-wider">{article.category}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>{publishedDate}</span>
          </div>
          <h4 
            onClick={() => onRead(article)}
            className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-300 cursor-pointer leading-snug line-clamp-2 transition-colors"
          >
            {article.title}
          </h4>
        </div>
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title}
            onClick={() => onRead(article)}
            className="w-16 h-14 object-cover rounded-lg border border-zinc-800 cursor-pointer shrink-0"
          />
        )}
      </article>
    );
  }

  return (
    <article className="group flex flex-col justify-between h-full bg-[#121620]/80 rounded-xl border border-zinc-800/90 overflow-hidden hover:border-cyan-500/40 transition-all hover:shadow-lg hover:shadow-cyan-950/20 backdrop-blur-xs">
      <div>
        {/* Cover Image */}
        <div 
          onClick={() => onRead(article)}
          className="relative aspect-[16/10] overflow-hidden bg-zinc-950 cursor-pointer"
        >
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104 opacity-90 group-hover:opacity-100"
          />
          {article.isBreaking && (
            <div className="absolute top-3 left-3 bg-rose-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
              Alert
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5">
          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono-numbers mb-2">
            <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[11px]">{article.category}</span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <span>{publishedDate}</span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Clock className="w-3 h-3 text-zinc-500" />
              {article.readTime}
            </span>
          </div>

          {/* Headline */}
          <h3 
            onClick={() => onRead(article)}
            className="text-base sm:text-lg font-bold text-zinc-100 group-hover:text-cyan-300 cursor-pointer leading-snug line-clamp-2 transition-colors"
          >
            {article.title}
          </h3>

          {/* Excerpt */}
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {article.subtitle || article.summary || article.content.slice(0, 120)}
          </p>
        </div>
      </div>

      {/* Card Footer: Byline & Controls */}
      <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 truncate">
          {article.author.avatar && (
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-6 h-6 rounded-full object-cover border border-zinc-700 shrink-0"
            />
          )}
          <span className="text-zinc-300 font-medium truncate text-xs">{article.author.name}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 shrink-0">
          <span className="flex items-center gap-1 font-mono-numbers text-[11px]">
            <Eye className="w-3 h-3 text-zinc-500" />
            {article.views || 0}
          </span>

          <button
            onClick={() => onEdit(article)}
            title="Edit story"
            className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
