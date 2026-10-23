import React, { useState } from 'react';
import { Article } from '../types';
import { publishToDiscord } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Calendar,
  User,
  Send,
  Disc,
  Trash2,
  Share2,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  Heart,
  Flame,
} from 'lucide-react';
import { SongDetailsModal } from './SongDetailsModal';
import { FramedSongCover } from './FramedSongCover';
import { SongEntry, hasDifficulty } from '../types';

export const ArticleModal: React.FC<{
  article: Article | null;
  onClose: () => void;
  onRefresh: () => void;
  onEdit?: (article: Article) => void;
}> = ({ article, onClose, onRefresh, onEdit }) => {
  const { user, isStaff, isAdmin } = useAuth();
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongEntry | null>(null);

  if (!article) return null;

  const handleDiscordPublish = async () => {
    setPublishStatus('Posting to Discord webhook...');
    try {
      const res = await publishToDiscord(article.id);
      setPublishStatus(res.message || 'Successfully broadcast to Discord!');
      setTimeout(() => setPublishStatus(null), 4000);
    } catch (err: any) {
      setPublishStatus(`Error: ${err.message}`);
      setTimeout(() => setPublishStatus(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0E131F] border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header Controls */}
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
              {article.category}
            </span>
            <span className="text-xs text-zinc-500 font-mono">ID: {article.id}</span>
          </div>

          <div className="flex items-center gap-2">
            {isStaff && (
              <>
                <button
                  onClick={handleDiscordPublish}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Discord</span>
                </button>

                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(article);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                  >
                    Edit Post
                  </button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {publishStatus && (
          <div className="bg-indigo-950/80 border-b border-indigo-500/40 text-indigo-200 text-xs px-6 py-2 flex items-center gap-2 font-mono">
            <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
            {publishStatus}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Title & Author Meta */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight leading-tight">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-sm sm:text-base text-zinc-300 font-medium">
                {article.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold uppercase border border-cyan-800/40">
                  {article.author?.name?.[0] || 'A'}
                </div>
                <span className="text-zinc-200 font-medium">{article.author?.name || 'Staff Author'}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 rounded font-mono uppercase text-zinc-400">
                  {article.author?.role || 'Staff'}
                </span>
              </div>

              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(article.publishedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>

              {article.readTime && <span>• {article.readTime}</span>}
            </div>
          </div>

          {/* Hero Cover Image */}
          {article.coverImage && (
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-[420px]">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover max-h-[420px]"
              />
            </div>
          )}

          {/* Featured Song Charts in this News Post */}
          {article.songs && article.songs.length > 0 && (
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Disc className="w-4 h-4 text-cyan-400" />
                Featured Songs & Missions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {article.songs.map((song, i) => {
                  const diff = typeof song.difficulty === 'object' ? song.difficulty : {};
                  const hasE = hasDifficulty(diff.easy);
                  const hasN = hasDifficulty(diff.normal);
                  const hasH = hasDifficulty(diff.hard);

                  const rawCd = (song.chosenDifficulty || 'N').toUpperCase();
                  let cd = rawCd.startsWith('E') ? 'E' : rawCd.startsWith('H') ? 'H' : 'N';
                  if (cd === 'E' && !hasE) cd = hasN ? 'N' : hasH ? 'H' : 'N';
                  if (cd === 'H' && !hasH) cd = hasN ? 'N' : hasE ? 'E' : 'N';

                  return (
                    <div
                      key={song.id || i}
                      onClick={() => setSelectedSongDetail(song)}
                      className="p-3 bg-black/40 rounded-xl border border-zinc-800 flex items-center gap-3 cursor-pointer hover:border-cyan-500/50 hover:bg-zinc-900/40 transition group"
                      title="Click to view full song details & difficulty frames"
                    >
                      <FramedSongCover
                        coverArt={song.coverArt || song.coverArtNormal || song.coverArtEasy || song.coverArtHard || ''}
                        difficulty={cd}
                        song={song}
                        hasEasyDifficulty={hasE}
                        className="w-12 h-12 rounded-lg shrink-0 shadow"
                        showDifficultyBadge
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors">{song.title}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{song.artist}</div>
                        <div className="flex gap-1 mt-1">
                          {hasE && <span className="text-[9px] px-1 bg-emerald-950 text-emerald-300 rounded font-mono">EZ {diff.easy}</span>}
                          {hasN && <span className="text-[9px] px-1 bg-amber-950 text-amber-300 rounded font-mono">NM {diff.normal}</span>}
                          {hasH && <span className="text-[9px] px-1 bg-rose-950 text-rose-300 rounded font-mono">HD {diff.hard}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Article Text Content */}
          <div className="prose prose-invert prose-zinc max-w-none text-sm sm:text-base leading-relaxed text-zinc-300 whitespace-pre-wrap">
            {article.content}
          </div>

        </div>
      </div>

      {/* Song Details Modal with 3 Difficulty Cover Arts */}
      {selectedSongDetail && (
        <SongDetailsModal
          song={selectedSongDetail}
          onClose={() => setSelectedSongDetail(null)}
          onSongUpdated={(updated) => {
            setSelectedSongDetail(updated);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
