import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Eye, 
  Volume2, 
  VolumeX, 
  Share2, 
  Edit3, 
  Check, 
  Bookmark, 
  Calendar, 
  Tag 
} from 'lucide-react';
import { NewsArticle } from '../types';

interface FullStoryModalProps {
  article: NewsArticle | null;
  onClose: () => void;
  onEdit: (article: NewsArticle) => void;
}

export const FullStoryModal: React.FC<FullStoryModalProps> = ({
  article,
  onClose,
  onEdit,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [article]);

  if (!article) return null;

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const toggleTextToSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in your browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${article.title}. ${article.subtitle || ''}. ${article.content.replace(/###/g, '')}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#10141D] rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 bg-[#10141D]/95 backdrop-blur-md border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-mono-numbers text-zinc-400">
            <span className="font-semibold text-cyan-400 uppercase tracking-wider">{article.category}</span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <span>{article.readTime}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTextToSpeech}
              title={isPlayingAudio ? 'Stop audio' : 'Listen to story'}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                isPlayingAudio 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-zinc-400" />
                  <span className="hidden sm:inline">Listen</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              title="Copy story link"
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setBookmarked(!bookmarked)}
              title="Bookmark story"
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-cyan-400 text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit(article);
              }}
              title="Edit in newsroom"
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Story Article Body */}
        <div className="overflow-y-auto px-6 sm:px-10 py-8 space-y-6">
          {/* Header & Title */}
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono-numbers mb-3">
              {article.isBreaking && (
                <>
                  <span className="text-rose-400 font-bold uppercase tracking-wider text-[11px]">
                    Alert
                  </span>
                  <span aria-hidden="true" className="text-zinc-700">·</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {publishedDate}
              </span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                {(article.views || 0).toLocaleString()} Views
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="mt-3 text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
                {article.subtitle}
              </p>
            )}
          </div>

          {/* Author Byline */}
          <div className="flex items-center justify-between border-y border-zinc-800/80 py-3.5">
            <div className="flex items-center gap-3">
              {article.author.avatar ? (
                <img
                  src={article.author.avatar}
                  alt={article.author.name}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 text-sm">
                  {article.author.name[0]}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-zinc-100">{article.author.name}</div>
                <div className="text-xs text-zinc-400">{article.author.role}</div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 font-mono-numbers flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{article.readTime}</span>
            </div>
          </div>

          {/* Cover Image */}
          {article.coverImage && (
            <figure className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full max-h-[460px] object-cover"
                />
              </div>
              {article.coverImageCaption && (
                <figcaption className="text-xs text-zinc-500 italic">
                  {article.coverImageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Summary Box */}
          {article.summary && (
            <div className="bg-zinc-900/80 border-l-4 border-cyan-500 p-4 rounded-r-xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                Quick Summary
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                {article.summary}
              </p>
            </div>
          )}

          {/* Main Article Content */}
          <div className="space-y-4 text-[15px] sm:text-[16px] text-zinc-300 leading-relaxed font-sans font-normal">
            {article.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xl sm:text-2xl font-bold text-white mt-6 pt-3 border-t border-zinc-800/80">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }

              if (paragraph.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="italic text-lg text-zinc-200 border-l-2 border-cyan-500 pl-4 my-4 py-1 bg-zinc-900/40 rounded-r-lg">
                    {paragraph.replace('> ', '')}
                  </blockquote>
                );
              }

              return (
                <p key={idx} className="text-zinc-300">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-300">Tags:</span>
                {article.tags.map((tag, i) => (
                  <span key={i} className="text-cyan-400/80 hover:text-cyan-300 transition-colors">
                    #{tag}{i < article.tags.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>RoBeats News · Dispatch #{article.id}</div>
          <button
            onClick={() => {
              onClose();
              onEdit(article);
            }}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 cursor-pointer"
          >
            Edit This RoBeats Update
          </button>
        </div>
      </div>
    </div>
  );
};
