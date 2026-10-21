import React from 'react';
import { Article } from '../types';
import { MessageSquare, Calendar, User, Send, Disc, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ArticleCard: React.FC<{
  article: Article;
  onClick: () => void;
  onPublishDiscord?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}> = ({ article, onClick, onPublishDiscord, onEdit, onDelete }) => {
  const { isStaff, isAdmin } = useAuth();

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Daily mission':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Weekly mission':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'New song':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-zinc-900/80 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 overflow-hidden cursor-pointer flex flex-col transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/5"
    >
      {/* Cover Image */}
      {article.coverImage && (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md ${getCategoryBadge(article.category)}`}>
              {article.category}
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {!article.coverImage && (
            <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadge(article.category)}`}>
              {article.category}
            </span>
          )}

          <h3 className="text-base font-bold text-zinc-100 group-hover:text-cyan-400 transition line-clamp-2">
            {article.title}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
            {article.subtitle || article.summary || article.content}
          </p>
        </div>

        {/* Songs Included Preview */}
        {article.songs && article.songs.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-800/60">
            <Disc className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] text-zinc-400 font-medium">Tracks:</span>
            {article.songs.slice(0, 3).map((s, idx) => (
              <span key={s.id || idx} className="text-[10px] px-1.5 py-0.5 bg-black/50 rounded text-zinc-300 border border-zinc-800">
                {s.title}
              </span>
            ))}
            {article.songs.length > 3 && (
              <span className="text-[10px] text-zinc-500">+{article.songs.length - 3} more</span>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-[10px] text-zinc-300">
              {article.author?.avatar ? (
                <img src={article.author.avatar} alt={article.author.name} className="w-full h-full object-cover" />
              ) : (
                article.author?.name?.[0] || 'A'
              )}
            </div>
            <span>{article.author?.name || 'News Desk'}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(article.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {article.comments?.length || 0}
            </span>

            {/* Admin Discord Trigger */}
            {isStaff && onPublishDiscord && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPublishDiscord(e);
                }}
                title="Post to Discord category channel"
                className="p-1 rounded hover:bg-indigo-950 text-zinc-400 hover:text-indigo-400 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
