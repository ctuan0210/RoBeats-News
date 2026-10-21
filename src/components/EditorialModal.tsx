import React, { useState } from 'react';
import { Article, Song } from '../types';
import { saveArticle, generateAiImage, fetchSongsList } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Image as ImageIcon, Disc, Plus, Trash2, Send } from 'lucide-react';

export const EditorialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialArticle?: Article | null;
}> = ({ isOpen, onClose, onSaved, initialArticle }) => {
  const { user } = useAuth();

  const [title, setTitle] = useState(initialArticle?.title || '');
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle || '');
  const [content, setContent] = useState(initialArticle?.content || '');
  const [category, setCategory] = useState<string>(initialArticle?.category || 'Daily mission');
  const [coverImage, setCoverImage] = useState(initialArticle?.coverImage || '');
  const [songs, setSongs] = useState<Song[]>(initialArticle?.songs || []);

  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleGenerateAiImage = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const res = await generateAiImage(aiPrompt);
      if (res.imageUrl) {
        setCoverImage(res.imageUrl);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI image');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const payload: Partial<Article> = {
        title,
        subtitle,
        content,
        summary: subtitle || content.slice(0, 150),
        category,
        coverImage,
        songs,
        author: {
          name: user?.username || 'Staff',
          role: user?.role || 'Staff',
          avatar: user?.avatar,
        },
        publishedAt: initialArticle?.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveArticle(payload, initialArticle?.id);
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save news post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0E131F] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {initialArticle ? 'Edit RoBeats News Article' : 'Draft New RoBeats News Post'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          <div>
            <label className="text-zinc-300 font-medium block mb-1">Headline Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Daily Missions: Tuesday Rhythm Showcase"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-300 font-medium block mb-1">News Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-xs text-zinc-100"
              >
                <option value="Daily mission">Daily mission</option>
                <option value="Weekly mission">Weekly mission</option>
                <option value="New song">New song</option>
                <option value="Updates">Updates</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Subtitle / Summary</label>
              <input
                type="text"
                placeholder="Short teaser description..."
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-xs text-zinc-100"
              />
            </div>
          </div>

          {/* Cover Image & Gemini AI Generator */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <label className="text-zinc-200 font-medium block">Cover Image URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or paste image URL"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="flex-1 px-3 py-2 bg-black/60 border border-zinc-700 rounded-lg text-xs text-zinc-100 font-mono"
              />
            </div>

            {/* AI Image Generation Panel */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-1 w-full">
                <Sparkles className="w-3.5 h-3.5 absolute left-3 top-2.5 text-cyan-400" />
                <input
                  type="text"
                  placeholder="AI Image prompt: e.g. Neon anime rhythm game notes falling cyber city..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-zinc-700/60 rounded-lg text-xs text-zinc-200 placeholder-zinc-500"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateAiImage}
                disabled={generatingAi || !aiPrompt.trim()}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {generatingAi ? 'Generating...' : 'Generate AI Image'}
              </button>
            </div>

            {coverImage && (
              <div className="mt-2 rounded-lg overflow-hidden max-h-36 border border-zinc-800">
                <img src={coverImage} alt="Preview" className="w-full h-36 object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="text-zinc-300 font-medium block mb-1">Article Content *</label>
            <textarea
              rows={8}
              required
              placeholder="Write breaking RoBeats news updates, mission requirements, or song notes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-xs text-zinc-100 leading-relaxed font-sans focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg shadow-md transition disabled:opacity-50"
            >
              {saving ? 'Publishing...' : 'Save & Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
