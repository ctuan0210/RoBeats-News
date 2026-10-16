import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  Flame, 
  Star, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { NewsArticle, NewsCategory } from '../types';

interface NewsroomDeskProps {
  articles: NewsArticle[];
  onOpenNewArticle: () => void;
  onEditArticle: (article: NewsArticle) => void;
  onDeleteArticle: (id: string) => void;
  onToggleBreaking: (article: NewsArticle) => void;
  onToggleFeatured: (article: NewsArticle) => void;
  onPreviewArticle: (article: NewsArticle) => void;
  onResetSeed: () => void;
}

export const NewsroomDesk: React.FC<NewsroomDeskProps> = ({
  articles,
  onOpenNewArticle,
  onEditArticle,
  onDeleteArticle,
  onToggleBreaking,
  onToggleFeatured,
  onPreviewArticle,
  onResetSeed,
}) => {
  const [filterCategory, setFilterCategory] = useState<NewsCategory>('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'breaking'>('all');
  const [search, setSearch] = useState('');

  // Computed metrics
  const totalArticles = articles.length;
  const publishedCount = articles.filter(a => a.status === 'published').length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const breakingCount = articles.filter(a => a.isBreaking).length;
  const totalViews = articles.reduce((acc, curr) => acc + (curr.views || 0), 0);

  // Filtered list
  const filtered = articles.filter(a => {
    if (filterCategory !== 'All' && a.category !== filterCategory) return false;
    if (filterStatus === 'published' && a.status !== 'published') return false;
    if (filterStatus === 'draft' && a.status !== 'draft') return false;
    if (filterStatus === 'breaking' && !a.isBreaking) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchAuthor = a.author.name.toLowerCase().includes(q);
      const matchCat = a.category.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-numbers text-zinc-500 mb-1">
            <span className="font-semibold text-zinc-800 uppercase">Editorial Management</span>
            <span aria-hidden="true" className="text-zinc-300">·</span>
            <span>Live Dispatch Database</span>
          </div>
          <h1 className="font-editorial-serif text-3xl md:text-4xl font-bold text-zinc-950">
            Newsroom Publishing Desk
          </h1>
          <p className="text-xs md:text-sm text-zinc-600 mt-1 max-w-2xl">
            Update, draft, edit, and organize daily newspaper dispatches. Generate high-definition visual assets and leverage Gemini AI to refine copy and headlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onResetSeed}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer"
            title="Reset to default seed articles"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Articles</span>
          </button>

          <button
            onClick={onOpenNewArticle}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Daily Story</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Clean, Single Elevation) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-zinc-200">
          <div className="text-xs font-medium text-zinc-500">Total Stories</div>
          <div className="text-2xl font-bold font-mono-numbers text-zinc-950 mt-1">
            {totalArticles}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {publishedCount} live · {draftCount} drafts
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-zinc-200">
          <div className="text-xs font-medium text-zinc-500">Breaking Alerts</div>
          <div className="text-2xl font-bold font-mono-numbers text-rose-600 mt-1 flex items-center gap-1.5">
            <Flame className="w-5 h-5 text-rose-500" />
            <span>{breakingCount}</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Active in global ticker</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-zinc-200">
          <div className="text-xs font-medium text-zinc-500">Total Readership</div>
          <div className="text-2xl font-bold font-mono-numbers text-zinc-950 mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>{totalViews.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Total page dispatches viewed</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-zinc-200">
          <div className="text-xs font-medium text-zinc-500">Lead Story Status</div>
          <div className="text-sm font-semibold text-zinc-950 mt-1 truncate">
            {articles.find(a => a.isFeatured)?.title || 'No hero assigned'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Frontpage anchor headline</div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status filters */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-md p-0.5">
            {(['all', 'published', 'draft', 'breaking'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded capitalize font-medium transition-colors cursor-pointer ${
                  filterStatus === st
                    ? 'bg-zinc-900 text-white font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Section filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as NewsCategory)}
            className="bg-white border border-zinc-200 rounded px-3 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Daily mission">Daily mission</option>
            <option value="Weekly mission">Weekly mission</option>
            <option value="Weekly Leaderboard">Weekly Leaderboard</option>
            <option value="New song">New song</option>
            <option value="Updates">Updates</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by title, author, keyword..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-500 text-zinc-900"
          />
        </div>
      </div>

      {/* News Management Table / List */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-600 uppercase font-mono-numbers text-[11px]">
              <tr>
                <th className="py-3 px-4">Story & Headline</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Byline</th>
                <th className="py-3 px-4">Published</th>
                <th className="py-3 px-4 text-center">Breaking</th>
                <th className="py-3 px-4 text-center">Hero</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No daily news stories found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(article => (
                  <tr key={article.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* Story Title & Thumbnail */}
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-3">
                        {article.coverImage && (
                          <img
                            src={article.coverImage}
                            alt=""
                            className="w-12 h-9 object-cover rounded border border-zinc-200 shrink-0"
                          />
                        )}
                        <div className="truncate">
                          <button
                            onClick={() => onPreviewArticle(article)}
                            className="font-editorial-serif text-sm font-semibold text-zinc-950 hover:text-zinc-700 truncate block text-left cursor-pointer transition-colors"
                          >
                            {article.title}
                          </button>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {article.subtitle || article.summary || 'No lede'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-zinc-800">{article.category}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 font-medium ${
                        article.status === 'published' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          article.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        <span className="capitalize">{article.status}</span>
                      </span>
                    </td>

                    {/* Byline */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-zinc-900">{article.author.name}</span>
                    </td>

                    {/* Published Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-500 font-mono-numbers text-[11px]">
                      {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Breaking Toggle */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onToggleBreaking(article)}
                        title={article.isBreaking ? 'Remove from breaking ticker' : 'Set as breaking news'}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          article.isBreaking
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <Flame className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Hero Toggle */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onToggleFeatured(article)}
                        title={article.isFeatured ? 'Assigned as Lead Hero Story' : 'Make Lead Hero Story'}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          article.isFeatured
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPreviewArticle(article)}
                          title="Preview full story"
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditArticle(article)}
                          title="Edit daily news story"
                          className="p-1.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the article: "${article.title}"?`)) {
                              onDeleteArticle(article.id);
                            }
                          }}
                          title="Delete story"
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
