import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { NewsArticle } from '../types';

interface BreakingTickerProps {
  breakingArticles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
}

export const BreakingTicker: React.FC<BreakingTickerProps> = ({
  breakingArticles,
  onSelectArticle,
}) => {
  if (!breakingArticles || breakingArticles.length === 0) return null;

  const current = breakingArticles[0];

  return (
    <div className="bg-[#11161B] text-white border-b border-[#2A313C] py-2 px-4 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400 shrink-0 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <AlertCircle className="w-3.5 h-3.5 inline" />
            <span>Breaking Dispatch</span>
          </div>

          <button
            onClick={() => onSelectArticle(current)}
            className="text-left text-zinc-200 hover:text-white truncate font-medium flex items-center gap-1.5 transition-colors group cursor-pointer"
          >
            <span className="truncate">{current.title}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-rose-400" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-zinc-400 shrink-0 font-mono-numbers text-[11px]">
          <span>Updated {new Date(current.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span>{breakingArticles.length} Active {breakingArticles.length === 1 ? 'Alert' : 'Alerts'}</span>
        </div>
      </div>
    </div>
  );
};
