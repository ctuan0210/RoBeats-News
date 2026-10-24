import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Send,
  Layers,
  X,
  Shield,
  Trash2,
  Edit2,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Lock,
  RotateCcw,
  Square,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminEditUserModal } from './AdminEditUserModal';
import { AdminCreateUserModal } from './AdminCreateUserModal';
import {
  fetchElementsList,
  updateElementsList,
  fetchDiscordWebhooks,
  updateDiscordWebhooks,
  fetchRanksList,
  updateRanksList,
} from '../services/api';
import {
  ElementConfig,
  RankConfig,
  DiscordWebhooksConfig,
  User,
  DEFAULT_ROBEATS_RANKS,
  RoBeatsRank,
  DifficultyFramesConfig,
  DEFAULT_DIFFICULTY_FRAMES,
} from '../types';
import { fetchDifficultyFrames, updateDifficultyFrames } from '../services/fandomService';
import { FramedSongCover } from './FramedSongCover';
import { safeJson } from '../utils/safeJson';

export const AdminPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  onOpenAccount?: (tab?: 'login' | 'profile' | 'signup') => void;
}> = ({ isOpen, onClose, onDataChanged, onOpenAccount }) => {
  const { 
    user: currentUser,
    adminGetUsers,
    adminUpdateUser,
    adminCreateUser,
    adminDeleteUser,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'webhooks' | 'ranks' | 'elements' | 'frames'>('users');

  // Users state
  const [userList, setUserList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<DiscordWebhooksConfig>({
    'Daily mission': '',
    'Weekly mission': '',
    'New song': '',
    'Updates': '',
  });

  // Ranks state
  const [ranks, setRanks] = useState<RankConfig[]>([]);

  // Elements state
  const [elements, setElements] = useState<ElementConfig[]>([]);

  // Difficulty Cover Art Frames state
  const [frames, setFrames] = useState<DifficultyFramesConfig>(DEFAULT_DIFFICULTY_FRAMES);

  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAllSettings();
    }
  }, [isOpen]);

  const loadAllSettings = async () => {
    try {
      const [elList, rankList, hookConfig, framesConfig] = await Promise.all([
        fetchElementsList().catch(() => []),
        fetchRanksList().catch(() => []),
        fetchDiscordWebhooks().catch(() => ({})),
        fetchDifficultyFrames().catch(() => DEFAULT_DIFFICULTY_FRAMES),
      ]);
      setElements(elList);
      setRanks(rankList);
      setWebhooks(hookConfig);
      setFrames(framesConfig);

      loadUsers();
    } catch (err) {
      console.error('Error loading admin settings:', err);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem('robeats_token') || localStorage.getItem('robeats_auth_token');
      const res = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await safeJson(res, []);
        if (Array.isArray(data)) {
          setUserList(data);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleOpenEditUser = (user: User) => {
    setSelectedUserForEdit(user);
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditedUser = async (updatedData: any) => {
    if (!selectedUserForEdit) return { success: false, error: 'No user selected' };
    const res = await adminUpdateUser(selectedUserForEdit.id, updatedData);
    if (res.success) {
      showBanner(`User @${selectedUserForEdit.username} updated successfully!`);
      loadUsers();
      if (onDataChanged) onDataChanged();
    }
    return res;
  };

  const handleOpenCreateUser = () => {
    setIsCreateUserModalOpen(true);
  };

  const handleCreateNewUser = async (userData: any) => {
    const res = await adminCreateUser(userData);
    if (res.success) {
      showBanner(`User @${userData.username} created successfully!`);
      loadUsers();
      if (onDataChanged) onDataChanged();
    }
    return res;
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username.toLowerCase() === 'meelo') {
      alert('The primary administrator account (@meelo) cannot be deleted.');
      return;
    }
    if (currentUser?.id === userId) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete the user account @${username}?`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const res = await adminDeleteUser(userId);
      if (res.success) {
        showBanner(`Account @${username} deleted.`);
        loadUsers();
        if (onDataChanged) onDataChanged();
      } else {
        alert(res.error || 'Failed to delete user');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSaveWebhooks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDiscordWebhooks(webhooks);
      showBanner('Discord Webhook configurations updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update webhooks');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRanks = async () => {
    setSaving(true);
    try {
      await updateRanksList(ranks);
      showBanner('Player ranks updated successfully!');
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to update ranks');
    } finally {
      setSaving(false);
    }
  };

  const handleResetRanks = () => {
    if (confirm('Reset player ranks to the 5 official RoBeats tiers (Star, Pro, Amateur, Novice, Beginner)?')) {
      setRanks([...DEFAULT_ROBEATS_RANKS]);
    }
  };

  const handleAddRank = () => {
    const existingNames = new Set(ranks.map(r => r.name.toLowerCase()));
    const missing = DEFAULT_ROBEATS_RANKS.find(r => !existingNames.has(r.name.toLowerCase()));
    if (missing) {
      setRanks([...ranks, { ...missing }]);
    } else {
      const newId = `rank_${Date.now()}`;
      setRanks([
        ...ranks,
        {
          id: newId,
          name: 'Beginner' as RoBeatsRank,
          iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/disc.svg',
          color: '#64748B',
          description: 'Custom RoBeats rhythm rank tier',
        },
      ]);
    }
  };

  const handleDeleteRank = (idx: number) => {
    if (ranks.length <= 1) {
      alert('You must keep at least one rank tier.');
      return;
    }
    const copy = [...ranks];
    copy.splice(idx, 1);
    setRanks(copy);
  };

  const handleSaveElements = async () => {
    setSaving(true);
    try {
      await updateElementsList(elements);
      showBanner('Elements and icons updated successfully!');
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to update elements');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFrames = async () => {
    setSaving(true);
    try {
      const updated = await updateDifficultyFrames(frames);
      setFrames(updated);
      showBanner('Difficulty cover art frames updated successfully!');
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to update difficulty frames');
    } finally {
      setSaving(false);
    }
  };

  const handleResetFrames = () => {
    if (!window.confirm('Reset difficulty frames to default settings? (Easy frame, Normal nothing frame, Hard frame)')) return;
    setFrames(DEFAULT_DIFFICULTY_FRAMES);
  };

  const showBanner = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#0E131F] border border-zinc-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-100">RoBeats Newsroom Administration</h1>
              <p className="text-xs text-zinc-400">Database bindings, edge APIs, permissions, and webhook automations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/40 px-6 overflow-x-auto gap-2 py-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'users'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Users & Roles
          </button>

          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'webhooks'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Send className="w-4 h-4" />
            Discord Webhooks
          </button>

          <button
            onClick={() => setActiveTab('ranks')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'ranks'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Award className="w-4 h-4" />
            RoBeats Ranks
          </button>

          <button
            onClick={() => setActiveTab('elements')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'elements'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Song Elements
          </button>

          <button
            onClick={() => setActiveTab('frames')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'frames'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Square className="w-4 h-4" />
            Difficulty Frames
          </button>
        </div>

        {/* Notification Banner */}
        {savedBanner && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/30 text-emerald-200 text-xs px-6 py-2.5 flex items-center gap-2 font-mono">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {savedBanner}
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* TAB 2: DISCORD WEBHOOKS */}
          {activeTab === 'webhooks' && (
            <form onSubmit={handleSaveWebhooks} className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Discord Category Webhook Endpoints</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  When publishing breaking news, the system posts an embed directly to the category's Discord channel.
                </p>
              </div>

              {(['Daily mission', 'Weekly mission', 'New song', 'Updates'] as const).map((cat) => {
                const curVal = typeof webhooks[cat] === 'string' ? (webhooks[cat] as string) : (webhooks[cat] as any)?.url || '';
                return (
                  <div key={cat} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      {cat} Discord Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={curVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWebhooks({
                          ...webhooks,
                          [cat]: typeof webhooks[cat] === 'object'
                            ? { ...(webhooks[cat] as any), url: val }
                            : val,
                        });
                      }}
                      className="w-full px-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Discord Webhooks
              </button>
            </form>
          )}

          {/* TAB 3: ROBEATS RANKS */}
          {activeTab === 'ranks' && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    RoBeats Player Ranks & Badge Icons
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Official RoBeats ranks: <strong>Star, Pro, Amateur, Novice, Beginner</strong>. Customize colors, icons, and descriptions.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetRanks}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
                    title="Reset to official 5 RoBeats rank tiers"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    Reset Official 5 Tiers
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRank}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium rounded-lg border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Rank
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {ranks.map((r, idx) => (
                  <div key={r.id || idx} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner"
                      style={{ borderColor: r.color, backgroundColor: `${r.color}18` }}
                    >
                      {r.iconUrl ? (
                        <img src={r.iconUrl} alt={r.name} className="w-7 h-7 object-contain" />
                      ) : (
                        <Award className="w-7 h-7" style={{ color: r.color }} />
                      )}
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs w-full">
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium">Rank Tier Name</span>
                        <input
                          type="text"
                          value={r.name}
                          placeholder="e.g. Star, Pro, Amateur, Novice, Beginner"
                          onChange={(e) => {
                            const copy = [...ranks];
                            copy[idx].name = e.target.value as any;
                            setRanks(copy);
                          }}
                          className="w-full px-2.5 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-zinc-100 font-semibold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium">Theme Color</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={r.color.startsWith('#') && r.color.length === 7 ? r.color : '#F59E0B'}
                            onChange={(e) => {
                              const copy = [...ranks];
                              copy[idx].color = e.target.value;
                              setRanks(copy);
                            }}
                            className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={r.color}
                            onChange={(e) => {
                              const copy = [...ranks];
                              copy[idx].color = e.target.value;
                              setRanks(copy);
                            }}
                            className="w-full px-2 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium">Icon SVG / Image URL</span>
                        <input
                          type="text"
                          value={r.iconUrl}
                          placeholder="https://..."
                          onChange={(e) => {
                            const copy = [...ranks];
                            copy[idx].iconUrl = e.target.value;
                            setRanks(copy);
                          }}
                          className="w-full px-2.5 py-1.5 bg-black/60 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-xs truncate focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-zinc-400 block font-medium">Description</span>
                        <input
                          type="text"
                          value={r.description || ''}
                          placeholder="Short description of this rank..."
                          onChange={(e) => {
                            const copy = [...ranks];
                            copy[idx].description = e.target.value;
                            setRanks(copy);
                          }}
                          className="w-full px-2.5 py-1.5 bg-black/40 border border-zinc-800 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRank(idx)}
                        disabled={ranks.length <= 1}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Delete rank tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveRanks}
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save RoBeats Ranks
                </button>
                <span className="text-xs text-zinc-400">
                  {ranks.length} rank tier{ranks.length !== 1 ? 's' : ''} configured
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: SONG ELEMENTS */}
          {activeTab === 'elements' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Song Elements Configuration</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage element colors and custom icons (Rush, Flow, Beat, Vibe, Chill, Dual elements).
                </p>
              </div>

              <div className="space-y-3">
                {elements.map((el, idx) => (
                  <div key={el.name || idx} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
                    <span
                      className="w-6 h-6 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: el.hexColor || el.color || '#94A3B8' }}
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Element</span>
                        <input
                          type="text"
                          value={el.name}
                          onChange={(e) => {
                            const copy = [...elements];
                            copy[idx].name = e.target.value;
                            setElements(copy);
                          }}
                          className="w-full px-2 py-1.5 bg-black/60 border border-zinc-700 rounded text-zinc-100"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Hex Color</span>
                        <input
                          type="text"
                          value={el.hexColor || ''}
                          onChange={(e) => {
                            const copy = [...elements];
                            copy[idx].hexColor = e.target.value;
                            setElements(copy);
                          }}
                          className="w-full px-2 py-1.5 bg-black/60 border border-zinc-700 rounded text-zinc-100 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Custom Icon URL</span>
                        <input
                          type="text"
                          placeholder="Optional image url..."
                          value={el.imageUrl || ''}
                          onChange={(e) => {
                            const copy = [...elements];
                            copy[idx].imageUrl = e.target.value;
                            setElements(copy);
                          }}
                          className="w-full px-2 py-1.5 bg-black/60 border border-zinc-700 rounded text-zinc-100 font-mono truncate"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveElements}
                disabled={saving}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Song Elements
              </button>
            </div>
          )}

          {/* TAB: DIFFICULTY COVER ART FRAMES */}
          {activeTab === 'frames' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Square className="w-4 h-4 text-emerald-400" />
                    Difficulty Cover Art Frame Overlays
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Per song 1 cover art. Per difficulty will have its own frame overlay (Easy has Easy frame, Hard has Hard frame, Normal has nothing frame). Edit any frame with an image link below.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleResetFrames}
                    className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                    title="Reset to standard frames"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFrames}
                    disabled={saving}
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Frames'}</span>
                  </button>
                </div>
              </div>

              {/* The 3 Difficulty Frame Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. EASY FRAME */}
                <div className="p-4 bg-zinc-950/70 border border-emerald-500/30 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                        <span>Easy Difficulty Frame</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/40">
                        Easy Overlay
                      </span>
                    </div>

                    {/* Sample Preview */}
                    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                      <FramedSongCover
                        coverArt="https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704"
                        difficulty="easy"
                        frames={frames}
                        className="w-28 h-28 rounded-xl shadow-lg"
                        showDifficultyBadge
                      />
                      <span className="text-[10px] text-zinc-400 mt-2 font-mono">Live Preview (Easy Frame)</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        Frame Image Link (PNG / SVG URL)
                      </label>
                      <input
                        type="text"
                        value={frames.easy}
                        onChange={(e) => setFrames({ ...frames, easy: e.target.value })}
                        placeholder="https://... direct image link for Easy frame"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => setFrames({ ...frames, easy: '/frames/easy-frame.svg' })}
                      className="text-[10px] text-zinc-400 hover:text-emerald-400 cursor-pointer"
                    >
                      Use Default SVG Frame
                    </button>
                    {frames.easy && (
                      <button
                        type="button"
                        onClick={() => setFrames({ ...frames, easy: '' })}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. NORMAL FRAME (NOTHING FRAME) */}
                <div className="p-4 bg-zinc-950/70 border border-blue-500/30 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                        <span>Normal Difficulty Frame</span>
                      </span>
                      <span className="text-[10px] font-mono text-blue-300 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/40">
                        Nothing Frame (Clean)
                      </span>
                    </div>

                    {/* Sample Preview */}
                    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                      <FramedSongCover
                        coverArt="https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704"
                        difficulty="normal"
                        frames={frames}
                        className="w-28 h-28 rounded-xl shadow-lg"
                        showDifficultyBadge
                      />
                      <span className="text-[10px] text-zinc-400 mt-2 font-mono">Live Preview (Normal - Nothing Frame)</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        Frame Image Link (Optional, default empty)
                      </label>
                      <input
                        type="text"
                        value={frames.normal}
                        onChange={(e) => setFrames({ ...frames, normal: e.target.value })}
                        placeholder="Leave empty for nothing frame (default)"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => setFrames({ ...frames, normal: '' })}
                      className="text-[10px] text-zinc-400 hover:text-blue-400 cursor-pointer"
                    >
                      Clear (Nothing Frame)
                    </button>
                  </div>
                </div>

                {/* 3. HARD FRAME */}
                <div className="p-4 bg-zinc-950/70 border border-rose-500/30 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                        <span>Hard Difficulty Frame</span>
                      </span>
                      <span className="text-[10px] font-mono text-rose-300 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/40">
                        Hard Overlay
                      </span>
                    </div>

                    {/* Sample Preview */}
                    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                      <FramedSongCover
                        coverArt="https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704"
                        difficulty="hard"
                        frames={frames}
                        className="w-28 h-28 rounded-xl shadow-lg"
                        showDifficultyBadge
                      />
                      <span className="text-[10px] text-zinc-400 mt-2 font-mono">Live Preview (Hard Frame)</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        Frame Image Link (PNG / SVG URL)
                      </label>
                      <input
                        type="text"
                        value={frames.hard}
                        onChange={(e) => setFrames({ ...frames, hard: e.target.value })}
                        placeholder="https://... direct image link for Hard frame"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => setFrames({ ...frames, hard: '/frames/hard-frame.svg' })}
                      className="text-[10px] text-zinc-400 hover:text-rose-400 cursor-pointer"
                    >
                      Use Default SVG Frame
                    </button>
                    {frames.hard && (
                      <button
                        type="button"
                        onClick={() => setFrames({ ...frames, hard: '' })}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: USERS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Registered Accounts & Role Management
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Admins have <strong>full permissions</strong> (manage users, passwords, avatars, nicknames, roles). Staff <strong>can post posts</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenCreateUser}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-cyan-950/40 flex items-center gap-1.5 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Create Account
                  </button>
                  <button
                    onClick={loadUsers}
                    disabled={usersLoading}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  Loading accounts...
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/60 shadow-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-300 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">User Profile</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Capabilities</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {userList.map((u) => {
                        const isSelf = currentUser?.id === u.id;
                        const isPrimaryAdmin = u.username.toLowerCase() === 'meelo';

                        return (
                          <tr key={u.id} className="hover:bg-zinc-800/30 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  {u.avatar ? (
                                    <img
                                      src={u.avatar}
                                      alt={u.displayName || u.username}
                                      className="w-8 h-8 rounded-lg object-cover border border-zinc-700/60"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-800/40 uppercase">
                                      {u.username[0]}
                                    </div>
                                  )}
                                  {u.role === 'admin' && (
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-zinc-950 flex items-center justify-center text-[7px] text-white">
                                      ★
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-zinc-100 flex items-center gap-1.5 truncate">
                                    <span>{u.displayName || u.username}</span>
                                    {isSelf && (
                                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                                    <span>@{u.username}</span>
                                    {u.email && <span className="text-zinc-600">• {u.email}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-orange-950/80 text-orange-400 border border-orange-700/50'
                                  : u.role === 'staff'
                                  ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-700/50'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                              }`}>
                                {u.role === 'admin' && <Shield className="w-3 h-3 text-orange-400" />}
                                {u.role}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-zinc-400 text-[11px]">
                              {u.role === 'admin' ? (
                                <span className="text-orange-300 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                  Fully permissions (All access)
                                </span>
                              ) : u.role === 'staff' ? (
                                <span className="text-cyan-300 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  Can post posts (Staff publisher)
                                </span>
                              ) : (
                                <span className="text-zinc-500">Standard Player Access</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-700/50 border border-transparent text-zinc-300 text-xs rounded-lg transition flex items-center gap-1.5 font-medium"
                                  title="Edit user role, nickname, avatar, or password"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                                  Edit User
                                </button>

                                {!isPrimaryAdmin && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                    disabled={deletingUserId === u.id}
                                    className="p-1.5 hover:bg-red-950 text-zinc-500 hover:text-red-400 rounded-lg transition"
                                    title="Delete Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Edit User Modal */}
      <AdminEditUserModal
        isOpen={isEditUserModalOpen}
        user={selectedUserForEdit}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        onSave={handleSaveEditedUser}
      />

      {/* Admin Create User Modal */}
      <AdminCreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onCreate={handleCreateNewUser}
      />
    </div>
  );
};
