import React from 'react';
import { Clock, Eye, Edit3, ArrowUpRight } from 'lucide-react';
import { NewsArticle } from '../types';

interface LeadHeroStoryProps {
  article: NewsArticle;
  onRead: (article: NewsArticle) => void;
  onEdit: (article: NewsArticle) => void;
}

export const LeadHeroStory: React.FC<LeadHeroStoryProps> = ({
  article,
  onRead,
  onEdit,
}) => {
  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="border-b border-zinc-800/80 pb-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Headline, Lede, Byline & Excerpt (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3 font-mono-numbers">
              {article.isBreaking && (
                <>
                  <span className="text-rose-400 font-semibold tracking-wider uppercase text-[11px]">
                    Alert
                  </span>
                  <span aria-hidden="true" className="text-zinc-700">·</span>
                </>
              )}
              <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[11px]">{article.category}</span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span>{publishedDate}</span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className="flex items-center gap-1 text-zinc-500">
                <Clock className="w-3 h-3 text-zinc-500" />
                {article.readTime}
              </span>
            </div>

            {/* Dominant Headline */}
            <h2 
              onClick={() => onRead(article)}
              className="text-2xl sm:text-3xl md:text-4xl leading-[1.2] font-black tracking-tight text-white hover:text-cyan-300 cursor-pointer transition-colors"
            >
              {article.title}
            </h2>

            {/* Subtitle / Lede */}
            {article.subtitle && (
              <p className="mt-3 text-base md:text-lg text-zinc-300 leading-relaxed font-normal">
                {article.subtitle}
              </p>
            )}

            {/* Body Preview Paragraph */}
            <div className="mt-4 text-sm text-zinc-400 leading-relaxed line-clamp-3">
              {article.summary || article.content.split('\n\n')[0]}
            </div>
          </div>

          {/* Author byline & Actions */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {article.author.avatar && (
                <img
                  src={article.author.avatar}
                  alt={article.author.name}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                />
              )}
              <div>
                <div className="text-xs font-semibold text-zinc-200">{article.author.name}</div>
                <div className="text-[11px] text-zinc-500">{article.author.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-500 font-mono-numbers flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                {(article.views || 0).toLocaleString()}
              </span>

              <button
                onClick={() => onEdit(article)}
                title="Edit this news article"
                className="text-zinc-400 hover:text-zinc-100 font-medium px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => onRead(article)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <span>Read Full Update</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Cover Image (5 cols) */}
        <div className="lg:col-span-5">
          <div 
            onClick={() => onRead(article)}
            className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 aspect-[16/10] shadow-lg shadow-black/40"
          >
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/80 via-transparent to-transparent opacity-60" />
          </div>

          {article.coverImageCaption && (
            <p className="mt-2 text-[11px] text-zinc-500 leading-normal font-sans italic">
              {article.coverImageCaption}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};
