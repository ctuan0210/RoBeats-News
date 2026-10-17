import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Save, 
  Check, 
  Loader2, 
  Wand2, 
  Flame, 
  Star, 
  Download,
  AlertCircle
} from 'lucide-react';
import { NewsArticle, NewsCategory, ImageSize, AspectRatio } from '../types';

interface StoryEditorModalProps {
  article: Partial<NewsArticle> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (articleData: Partial<NewsArticle>) => Promise<void>;
  onOpenNewsroomChatWithContext?: (context: { title: string; category: string; content: string }) => void;
}

const CATEGORIES: Exclude<NewsCategory, 'All' | 'Song List'>[] = [
  'Daily mission',
  'Weekly mission',
  'Weekly Leaderboard',
  'New song',
  'Updates',
];

const STYLE_PRESETS = [
  'Cyberpunk Neon Rhythm Game',
  'Anime Arcade Album Art',
  'High-contrast Minimalist Vector',
  'Dynamic Concert Stage Lighting',
  'Electronic Music Visualizer',
  'Futuristic UI & Sound Waves',
];

export const StoryEditorModal: React.FC<StoryEditorModalProps> = ({
  article,
  isOpen,
  onClose,
  onSave,
  onOpenNewsroomChatWithContext,
}) => {
  // Form State
  const [title, setTitle] = useState(article?.title || '');
  const [subtitle, setSubtitle] = useState(article?.subtitle || '');
  const [content, setContent] = useState(article?.content || '');
  const [summary, setSummary] = useState(article?.summary || '');
  const [category, setCategory] = useState<Exclude<NewsCategory, 'All'>>(article?.category || 'Daily mission');
  const [authorName, setAuthorName] = useState(article?.author?.name || 'RhythmMaster');
  const [authorRole, setAuthorRole] = useState(article?.author?.role || 'RoBeats Staff');
  const [coverImage, setCoverImage] = useState(article?.coverImage || '');
  const [coverImageCaption, setCoverImageCaption] = useState(article?.coverImageCaption || '');
  const [isBreaking, setIsBreaking] = useState(article?.isBreaking || false);
  const [isFeatured, setIsFeatured] = useState(article?.isFeatured || false);
  const [isTrending, setIsTrending] = useState(article?.isTrending || false);
  const [status, setStatus] = useState<'published' | 'draft'>(article?.status || 'published');
  const [tags, setTags] = useState(article?.tags?.join(', ') || '');

  // Image Generation Studio State (Feature 1: gemini-3-pro-image-preview with 1K, 2K, 4K)
  const [showImageStudio, setShowImageStudio] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageGenError, setImageGenError] = useState<string | null>(null);

  // AI Headline Generator State
  const [headlineSuggestions, setHeadlineSuggestions] = useState<string[]>([]);
  const [isGeneratingHeadlines, setIsGeneratingHeadlines] = useState(false);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (article) {
      setTitle(article.title || '');
      setSubtitle(article.subtitle || '');
      setContent(article.content || '');
      setSummary(article.summary || '');
      setCategory(article.category || 'Daily mission');
      setAuthorName(article.author?.name || 'RhythmMaster');
      setAuthorRole(article.author?.role || 'RoBeats Staff');
      setCoverImage(article.coverImage || '');
      setCoverImageCaption(article.coverImageCaption || '');
      setIsBreaking(article.isBreaking || false);
      setIsFeatured(article.isFeatured || false);
      setIsTrending(article.isTrending || false);
      setStatus(article.status || 'published');
      setTags(article.tags?.join(', ') || '');
    }
  }, [article]);

  if (!isOpen) return null;

  const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;
  const readTimeEst = `${Math.max(1, Math.round(wordCount / 200))} min read`;

  // Feature 1 Handler: Generate image using gemini-3-pro-image-preview with 1K, 2K, 4K affordance
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;

    setIsGeneratingImage(true);
    setImageGenError(null);

    try {
      const response = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          imageSize,
          aspectRatio,
          style: selectedStyle,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Image generation failed');
      }

      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      console.error('Image gen error:', err);
      setImageGenError(err.message || 'Failed to generate image. Please verify connection and retry.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleApplyGeneratedImageAsCover = () => {
    if (generatedImage) {
      setCoverImage(generatedImage);
      if (!coverImageCaption) {
        setCoverImageCaption(`RoBeats visual: ${imagePrompt.slice(0, 80)} (${imageSize})`);
      }
      setShowImageStudio(false);
    }
  };

  const handleAutofillPromptFromTitle = () => {
    if (title) {
      setImagePrompt(`Neon arcade rhythm game artwork illustrating: ${title}. Glowing 4-key rhythm highway, cybernetic aesthetics, high detail.`);
    }
  };

  const handleGenerateHeadlineSuggestions = async () => {
    if (!title && !content) return;
    setIsGeneratingHeadlines(true);

    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/assist/headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (data.suggestions) {
        const lines = data.suggestions
          .split('\n')
          .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter(Boolean);
        setHeadlineSuggestions(lines);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingHeadlines(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please provide a title and content for the update.');
      return;
    }

    setIsSaving(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      await onSave({
        title,
        subtitle,
        content,
        summary: summary || subtitle,
        category,
        author: {
          name: authorName,
          role: authorRole,
          avatar: article?.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        readTime: readTimeEst,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80',
        coverImageCaption,
        isBreaking,
        isFeatured,
        isTrending,
        status,
        tags: tagList,
      });
      onClose();
    } catch (err: any) {
      alert('Failed to save article: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#10141D] text-zinc-100 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#121620]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{article?.id ? 'Edit RoBeats News Update' : 'Post RoBeats News Update'}</span>
              <span className="text-xs font-normal text-zinc-400 font-mono-numbers">
                ({readTimeEst} · {wordCount} words)
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Publish or update verified missions, songs, shop rotations, and patch notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewsroomChatWithContext && (
              <button
                type="button"
                onClick={() => onOpenNewsroomChatWithContext({ title, category, content })}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-lg transition-colors cursor-pointer border border-cyan-500/30"
                title="Send current draft to RoBeats AI Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Assist</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6 space-y-6 flex-1">
          {/* Status & Prominence Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3.5 bg-zinc-900/70 rounded-xl border border-zinc-800 text-xs">
            <div>
              <label className="block font-medium text-zinc-300 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="published">Published (Live)</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-300 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isBreaking"
                checked={isBreaking}
                onChange={e => setIsBreaking(e.target.checked)}
                className="w-4 h-4 text-rose-500 rounded border-zinc-700 bg-zinc-800 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="isBreaking" className="font-semibold text-rose-400 cursor-pointer flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Alert Notice
              </label>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isFeatured"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded border-zinc-700 bg-zinc-800 focus:ring-cyan-500 cursor-pointer"
              />
              <label htmlFor="isFeatured" className="font-semibold text-amber-300 cursor-pointer flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                Lead Story
              </label>
            </div>
          </div>

          {/* Headline Field & AI Generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Title / Headline <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateHeadlineSuggestions}
                disabled={isGeneratingHeadlines}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingHeadlines ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3 text-cyan-400" />
                )}
                <span>Suggest AI Titles</span>
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Daily Missions: 300 Stars Rush & 8-Star FC"
              required
              className="w-full px-3.5 py-2.5 text-base font-bold text-white bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-cyan-500/80 placeholder:text-zinc-600"
            />

            {/* AI suggestions */}
            {headlineSuggestions.length > 0 && (
              <div className="mt-2 p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs space-y-1.5">
                <div className="font-semibold text-cyan-400">AI Suggested Titles:</div>
                {headlineSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => setTitle(s)}
                    className="p-1.5 hover:bg-zinc-800/80 rounded-lg cursor-pointer text-zinc-300 hover:text-white flex items-center justify-between group transition-colors"
                  >
                    <span>{s}</span>
                    <span className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100">
                      Apply
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtitle / Lede */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Subtitle / Overview
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Reset is live! Earn 450 Star Coins and 2 Mission Crates."
              className="w-full px-3.5 py-2 text-sm text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-cyan-500/80 placeholder:text-zinc-600"
            />
          </div>

          {/* Cover Image Section with Feature 1: Gemini 3 Pro Image Generator Studio */}
          <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cover Artwork & Image Generation</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Generate high-definition imagery with Gemini 3 Pro Image (<span className="font-mono text-cyan-400">gemini-3-pro-image-preview</span>) with 1K, 2K, 4K resolutions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowImageStudio(!showImageStudio)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  showImageStudio
                    ? 'bg-cyan-500 text-black border-cyan-400'
                    : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showImageStudio ? 'Close Studio' : 'AI Image Studio (1K/2K/4K)'}</span>
              </button>
            </div>

            {/* AI Image Studio Panel */}
            {showImageStudio && (
              <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Gemini 3 Pro Image Studio</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutofillPromptFromTitle}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Draft Prompt from Title
                  </button>
                </div>

                {/* Prompt Input */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Visual Prompt & Scene Description
                  </label>
                  <textarea
                    rows={2}
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    placeholder="Glowing neon anime arcade cabinet playing Camellia song, holographic rhythm notes and fever sparkles..."
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>

                {/* Mandatory Affordance: Resolution Selector (1K, 2K, 4K) & Aspect Ratio & Style */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Image Size (1K, 2K, 4K) */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Resolution (Affordance)
                    </label>
                    <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-900">
                      {(['1K', '2K', '4K'] as ImageSize[]).map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setImageSize(size)}
                          className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                            imageSize === size
                              ? 'bg-cyan-500 text-black font-bold shadow-xs'
                              : 'text-zinc-400 hover:text-zinc-100'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Aspect Ratio
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={e => setAspectRatio(e.target.value as AspectRatio)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="16:9">16:9 (Landscape Hero)</option>
                      <option value="4:3">4:3 (Arcade Screen)</option>
                      <option value="1:1">1:1 (Album Art / Square)</option>
                      <option value="3:4">3:4 (Portrait Feed)</option>
                      <option value="9:16">9:16 (Vertical Mobile)</option>
                    </select>
                  </div>

                  {/* Aesthetic Style */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Visual Style
                    </label>
                    <select
                      value={selectedStyle}
                      onChange={e => setSelectedStyle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    >
                      {STYLE_PRESETS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-zinc-500 font-mono-numbers">
                    Selected: {imageSize} · {aspectRatio}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-950/40"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering {imageSize} Artwork...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate {imageSize} Artwork</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Error Banner */}
                {imageGenError && (
                  <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{imageGenError}</span>
                  </div>
                )}

                {/* Generated Image Result Preview */}
                {generatedImage && (
                  <div className="pt-3 border-t border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Artwork rendered ({imageSize})
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={generatedImage}
                          download={`robeats-art-${Date.now()}.png`}
                          className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleApplyGeneratedImageAsCover}
                          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-md text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Use as Article Cover</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-72 flex items-center justify-center">
                      <img
                        src={generatedImage}
                        alt="Generated preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct URL input fallback & preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Cover Image Caption
                </label>
                <input
                  type="text"
                  value={coverImageCaption}
                  onChange={e => setCoverImageCaption(e.target.value)}
                  placeholder="Camellia song chart visualizer."
                  className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-100"
                />
              </div>
            </div>

            {/* Current Cover Preview */}
            {coverImage && (
              <div className="flex items-center gap-4 p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-20 h-14 object-cover rounded-lg border border-zinc-800 shrink-0"
                />
                <div className="text-xs truncate flex-1">
                  <div className="font-medium text-zinc-200 truncate">Current Active Cover</div>
                  <div className="text-[11px] text-zinc-500 italic truncate">
                    {coverImageCaption || 'No caption set'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-xs text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Author Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={authorRole}
                onChange={e => setAuthorRole(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-100"
              />
            </div>
          </div>

          {/* Story Body Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Full Content (Markdown Supported) <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-zinc-500 font-mono-numbers">
                Use ### for headings, &gt; for quotes
              </span>
            </div>
            <textarea
              rows={10}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write the full RoBeats update here...&#10;&#10;### Mission Details&#10;Clear 10 songs on 8+ difficulty...&#10;&#10;> 'Remember to equip fever bonus gear!'"
              required
              className="w-full px-3.5 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-cyan-500/80 font-mono text-zinc-100 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Daily Mission, Star Coins, Camellia, Freedom Dive"
              className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-100"
            />
          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-[#121620] border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-950/30"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{article?.id ? 'Update News' : 'Publish News'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
