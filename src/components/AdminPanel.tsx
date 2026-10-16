import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  Key, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Check, 
  X, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Sliders,
  RefreshCw,
  Crown,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Disc,
  Image as ImageIcon,
  Radio,
  Send,
  ExternalLink,
  Sun,
  Calendar,
  Bell,
  Award,
  ChevronDown,
  ChevronUp,
  Layers,
  Trophy,
  Copy,
  FileText,
  Code,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, UserPermissions, UserRole, ElementConfig, RankConfig } from '../types';
import { 
  fetchElementsList, 
  updateElementsList, 
  fetchDiscordWebhooks, 
  updateDiscordWebhooks, 
  testDiscordWebhook,
  fetchDailyMissionTemplate,
  fetchRanksList,
  updateAllRanks,
  updateRankConfig
} from '../services/fandomService';
import { buildDefaultElements, ELEMENT_BASE_COLORS } from '../constants/elements';
import { CloudflareD1Tab } from './CloudflareD1Tab';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccount?: (tab?: 'login' | 'signup' | 'profile') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onOpenAccount }) => {
  const { 
    user: currentUser, 
    login,
    adminGetUsers, 
    adminGetStats, 
    adminUpdateUser, 
    adminResetPassword, 
    adminDeleteUser, 
    adminCreateUser 
  } = useAuth();

  const isCurrentAdmin = currentUser?.role === 'admin';

  // Admin authentication state if not logged in as Admin
  const [adminAuthIdentifier, setAdminAuthIdentifier] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [isAdminAuthLoading, setIsAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'users' | 'elements' | 'webhooks' | 'ranks' | 'd1'>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Elements Configuration State
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [isLoadingElements, setIsLoadingElements] = useState(false);
  const [isSavingElements, setIsSavingElements] = useState(false);
  const [elementSearch, setElementSearch] = useState('');

  // RoBeats Ranks Configuration State
  const [ranks, setRanks] = useState<RankConfig[]>([
    { id: 'star', name: 'Star', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/star.svg', color: '#F59E0B', description: 'Elite RoBeats master rhythm players' },
    { id: 'pro', name: 'Pro', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/zap.svg', color: '#A855F7', description: 'High tier competitive rhythm champions' },
    { id: 'amateur', name: 'Amateur', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/award.svg', color: '#3B82F6', description: 'Skilled rhythm players clearing advanced charts' },
    { id: 'novice', name: 'Novice', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/activity.svg', color: '#10B981', description: 'Intermediate rhythm players learning higher speeds' },
    { id: 'beginner', name: 'Beginner', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/disc.svg', color: '#64748B', description: 'Starting rhythm players beginning their journey' },
  ]);
  const [isSavingRanks, setIsSavingRanks] = useState(false);

  // Discord Webhooks Configuration State
  const [webhooks, setWebhooks] = useState<Record<string, any>>({
    'Daily mission': { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } },
    'Weekly mission': { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } },
    'Weekly Leaderboard': { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } },
    'New song': { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } },
    'Updates': { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } },
  });
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [isSavingWebhooks, setIsSavingWebhooks] = useState(false);
  const [testingCategory, setTestingCategory] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ category: string; success: boolean; message: string } | null>(null);

  // Daily Mission Template States
  const [copiedTemplateState, setCopiedTemplateState] = useState<string | null>(null);
  const [dailySampleText, setDailySampleText] = useState<string>('');
  const [dailyRawTemplateText, setDailyRawTemplateText] = useState<string>('');
  const [showDailyPreview, setShowDailyPreview] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('player');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    canManageUsers: false,
    canChangePasswords: false,
    canEditProfiles: false,
    canManageRoles: false,
    canPublishNews: false,
    canDeleteContent: false,
    canAccessAdminPanel: false,
  });

  // Reset Password Modal State
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Create User State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('player');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userList, statsData, elementList, webhookData, rankList] = await Promise.all([
        adminGetUsers().catch(() => []),
        adminGetStats().catch(() => null),
        fetchElementsList().catch(() => []),
        fetchDiscordWebhooks().catch(() => ({})),
        fetchRanksList().catch(() => [])
      ]);
      setUsers(Array.isArray(userList) ? userList : []);
      setStats(statsData);
      setElements(Array.isArray(elementList) && elementList.length > 0 ? elementList : buildDefaultElements());
      if (Array.isArray(rankList) && rankList.length > 0) {
        setRanks(rankList);
      }
      if (webhookData && typeof webhookData === 'object') {
        const webhookObj = webhookData as Record<string, any>;
        const normalized: Record<string, any> = {};
        for (const cat of ['Daily mission', 'Weekly mission', 'Weekly Leaderboard', 'New song', 'Updates']) {
          const entry = webhookObj[cat];
          if (typeof entry === 'string') {
            normalized[cat] = {
              url: entry,
              template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' }
            };
          } else if (entry && typeof entry === 'object') {
            normalized[cat] = {
              url: entry.url || '',
              template: {
                titleTemplate: entry.template?.titleTemplate || '',
                bodyTemplate: entry.template?.bodyTemplate || '',
                footerTemplate: entry.template?.footerTemplate || '',
              }
            };
          } else {
            normalized[cat] = { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } };
          }
        }
        setWebhooks(normalized);
      }

      // Preload Daily Mission Discord Webhook template and live sample
      fetchDailyMissionTemplate().then(tmpl => {
        if (tmpl) {
          setDailyRawTemplateText(tmpl.rawTemplate);
          setDailySampleText(tmpl.sampleFormatted);
        }
      }).catch(() => {});
    } catch {
      setErrorMsg('Failed to load administrator data');
      setUsers([]);
      setElements(buildDefaultElements());
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDailyMissionTemplate = () => {
    const currentUrl = webhooks['Daily mission']?.url || '';
    setWebhooks(prev => ({
      ...prev,
      'Daily mission': {
        url: currentUrl,
        template: {
          titleTemplate: 'Header: " {title}"',
          bodyTemplate: '## <:star:1295611495383695451> - Star missions\n{star_songs}\n\n## <:pro:1295611421866070016> - Pro missions\n{pro_songs}\n\n## <:amateur:1295611203325792287> - Amateur missions\n{amateur_songs}\n\n## <:novice:1284381928044367944> - Novice missions\n{novice_songs}\n\n## <:beginner:1284381903578861578> \n - Beginner missions\n{beginner_songs}',
          footerTemplate: 'Poster: "{author}" | Post date: "{date}"'
        }
      }
    }));
    setSuccessMsg('Applied Daily Mission template! Click "Save Webhook Settings" to persist changes.');
  };

  const handleCopyText = (text: string, stateKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateState(stateKey);
    setTimeout(() => setCopiedTemplateState(null), 2500);
  };

  const handleSaveWebhooks = async () => {
    setIsSavingWebhooks(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const saved = await updateDiscordWebhooks(webhooks);
      if (saved && typeof saved === 'object') {
        const normalized: Record<string, any> = {};
        for (const cat of ['Daily mission', 'Weekly mission', 'Weekly Leaderboard', 'New song', 'Updates']) {
          const entry = saved[cat];
          if (typeof entry === 'string') {
            normalized[cat] = {
              url: entry,
              template: webhooks[cat]?.template || { titleTemplate: '', bodyTemplate: '', footerTemplate: '' }
            };
          } else if (entry && typeof entry === 'object') {
            normalized[cat] = {
              url: entry.url || '',
              template: {
                titleTemplate: entry.template?.titleTemplate || '',
                bodyTemplate: entry.template?.bodyTemplate || '',
                footerTemplate: entry.template?.footerTemplate || '',
              }
            };
          } else {
            normalized[cat] = { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } };
          }
        }
        setWebhooks(normalized);
      }
      setSuccessMsg('Discord Webhook URLs and templates successfully saved!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Discord webhooks');
    } finally {
      setIsSavingWebhooks(false);
    }
  };

  const handleSaveRanks = async () => {
    setIsSavingRanks(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const saved = await updateAllRanks(ranks);
      setRanks(saved);
      setSuccessMsg('RoBeats rank icons and configurations successfully updated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update rank configurations');
    } finally {
      setIsSavingRanks(false);
    }
  };

  const handleTestWebhook = async (category: string) => {
    setTestingCategory(category);
    setTestResult(null);
    try {
      const entry = webhooks[category];
      const url = typeof entry === 'string' ? entry : entry?.url || '';
      const res = await testDiscordWebhook(category, url);
      setTestResult({
        category,
        success: res.success,
        message: res.message || 'Test message sent successfully!'
      });
    } catch (err: any) {
      setTestResult({
        category,
        success: false,
        message: err.message || 'Webhook test failed'
      });
    } finally {
      setTestingCategory(null);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser?.role === 'admin') {
      loadData();
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, currentUser?.role]);

  // Filter users (Hooks called unconditionally before early return)
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter(u => {
      if (!u) return false;
      const uname = (u.username || '').toLowerCase();
      const uemail = (u.email || '').toLowerCase();
      const udisplay = (u.displayName || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || uname.includes(q) || uemail.includes(q) || udisplay.includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Filter elements (Hooks called unconditionally before early return)
  const filteredElements = useMemo(() => {
    if (!Array.isArray(elements)) return [];
    if (!elementSearch.trim()) return elements;
    const q = elementSearch.toLowerCase();
    return elements.filter(el => 
      (el?.name || '').toLowerCase().includes(q) || 
      (el?.color || '').toLowerCase().includes(q)
    );
  }, [elements, elementSearch]);

  if (!isOpen || currentUser?.role !== 'admin') return null;

  const handleStartEdit = (target: User) => {
    setEditingUser(target);
    setEditDisplayName(target.displayName || target.username);
    setEditUsername(target.username);
    setEditEmail(target.email);
    setEditBio(target.bio || '');
    setEditAvatar(target.avatar || '');
    setEditRole(target.role);
    setEditPermissions({
      canManageUsers: target.permissions?.canManageUsers ?? (target.role === 'admin'),
      canChangePasswords: target.permissions?.canChangePasswords ?? (target.role === 'admin'),
      canEditProfiles: target.permissions?.canEditProfiles ?? (target.role === 'admin'),
      canManageRoles: target.permissions?.canManageRoles ?? (target.role === 'admin'),
      canPublishNews: target.permissions?.canPublishNews ?? (target.role === 'admin' || target.role === 'staff'),
      canDeleteContent: target.permissions?.canDeleteContent ?? (target.role === 'admin'),
      canAccessAdminPanel: target.permissions?.canAccessAdminPanel ?? (target.role === 'admin'),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await adminUpdateUser(editingUser.id, {
      displayName: editDisplayName,
      username: editUsername,
      email: editEmail,
      bio: editBio,
      avatar: editAvatar,
      role: editRole,
      permissions: editPermissions,
    });

    if (res.success && res.user) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? res.user! : u));
      setEditingUser(null);
      setSuccessMsg(`Successfully updated user @${editUsername}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser || !newPasswordValue) return;

    const res = await adminResetPassword(passwordTargetUser.id, newPasswordValue);
    if (res.success) {
      setPasswordTargetUser(null);
      setNewPasswordValue('');
      setSuccessMsg(`Password successfully reset for @${passwordTargetUser.username}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (targetId: string) => {
    const res = await adminDeleteUser(targetId);
    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== targetId));
      setDeleteConfirmId(null);
      setSuccessMsg('User successfully deleted from system');
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res.error || 'Failed to delete user');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await adminCreateUser({
      username: newUsername.trim(),
      email: newEmail.trim(),
      password: newPassword,
      displayName: newDisplayName.trim() || newUsername.trim(),
      role: newRole,
    });

    if (res.success && res.user) {
      setUsers(prev => [res.user!, ...prev]);
      setIsCreatingUser(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setSuccessMsg(`Successfully created account for @${res.user.username}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res.error || 'Failed to create user');
    }
  };

  // Elements update handler
  const handleElementImageUrlChange = (elementName: string, newUrl: string) => {
    setElements(prev => prev.map(el => {
      if (el.name.toLowerCase() === elementName.toLowerCase()) {
        return { ...el, imageUrl: newUrl };
      }
      return el;
    }));
  };

  const handleSaveElements = async () => {
    setIsSavingElements(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateElementsList(elements);
      setSuccessMsg('Elements image URLs saved successfully! Linked across all songs, details, and posts.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save elements configuration');
    } finally {
      setIsSavingElements(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminAuthLoading(true);
    setAdminAuthError(null);
    try {
      const ok = await login(adminAuthIdentifier.trim(), adminAuthPassword);
      if (!ok) {
        setAdminAuthError('Invalid credentials. Please enter valid administrator credentials.');
      } else {
        await loadData();
      }
    } catch (err: any) {
      setAdminAuthError(err.message || 'Failed to authenticate administrator');
    } finally {
      setIsAdminAuthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85">
      <div 
        className="w-full max-w-5xl bg-[#0F131C] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#141A26] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  RoBeats Admin Panel
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Meelo Authority
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                User management, song elements URL images & system permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-cyan-500/30 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Non-Admin Auth Screen or Admin Tabs */}
        {!isCurrentAdmin ? (
          <div className="p-8 flex flex-col items-center text-center max-w-md mx-auto space-y-4 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
              <Shield className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Administrator Access Required</h3>
              <p className="text-xs text-zinc-400 mt-1">
                The RoBeats Admin Panel requires administrator privileges. Please sign in with an Admin account.
              </p>
            </div>

            {adminAuthError && (
              <div className="w-full p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-left flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="w-full space-y-3 pt-2 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  value={adminAuthIdentifier}
                  onChange={e => setAdminAuthIdentifier(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={adminAuthPassword}
                  onChange={e => setAdminAuthPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAdminAuthLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isAdminAuthLoading ? 'Authenticating...' : 'Sign In as Administrator'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="px-6 border-b border-zinc-800 bg-[#111622] flex items-center gap-3">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'users'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users & Permissions ({users.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('elements')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'elements'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Elements URL Images (25 Elements)</span>
              </button>

              <button
                onClick={() => setActiveTab('webhooks')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'webhooks'
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Discord Webhooks</span>
              </button>

              <button
                onClick={() => setActiveTab('ranks')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'ranks'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>RoBeats Ranks (Icons & Ranks)</span>
              </button>

              <button
                onClick={() => setActiveTab('d1')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  activeTab === 'd1'
                    ? 'border-orange-400 text-orange-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Database className="w-4 h-4 text-orange-400" />
                <span>Cloudflare D1 Database</span>
              </button>
            </div>

        {/* Dashboard Stat Ribbon (for Users tab) */}
        {activeTab === 'users' && stats && (
          <div className="px-6 py-2.5 bg-[#111622] border-b border-zinc-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px]">Total Accounts</span>
              <span className="text-base font-black text-white">{stats.totalUsers}</span>
            </div>
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px]">Admins</span>
              <span className="text-base font-black text-cyan-300">{stats.admins}</span>
            </div>
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px]">Staff</span>
              <span className="text-base font-black text-emerald-300">{stats.staff || 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px]">RoBeatsDev</span>
              <span className="text-base font-black text-purple-300">{stats.robeatsdev || 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px]">Players</span>
              <span className="text-base font-black text-zinc-300">{stats.players}</span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Notifications */}
          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: USERS & PERMISSIONS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search user by username, email, display name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Administrators</option>
                    <option value="staff">Staff</option>
                    <option value="robeatsdev">RoBeatsDev</option>
                    <option value="player">Players</option>
                  </select>
                </div>

                <button
                  onClick={() => setIsCreatingUser(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create User</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-[#0C1017]">
                <div className="grid grid-cols-12 px-4 py-2.5 bg-[#121622] border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  <div className="col-span-5 sm:col-span-3">User</div>
                  <div className="hidden sm:block col-span-3">Email</div>
                  <div className="col-span-3 sm:col-span-2 text-center sm:text-left">Role</div>
                  <div className="col-span-4 text-right">Actions</div>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No accounts found matching search filters.
                    </div>
                  ) : (
                    filteredUsers.map(u => {
                      const isMeelo = (u?.username || '').toLowerCase() === 'meelo';
                      const isSelf = u?.id === currentUser?.id;

                      return (
                        <div key={u.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-zinc-900/40 text-xs">
                          {/* User info */}
                          <div className="col-span-5 sm:col-span-3 flex items-center gap-2.5 overflow-hidden">
                            <img
                              src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                              alt={u.username}
                              className="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0"
                            />
                            <div className="truncate">
                              <div className="font-bold text-white truncate flex items-center gap-1">
                                <span>{u.displayName || u.username}</span>
                                {isMeelo && (
                                  <span title="Super Administrator">
                                    <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 block truncate">@{u.username}</span>
                            </div>
                          </div>

                          {/* Email */}
                          <div className="hidden sm:block col-span-3 text-zinc-400 truncate">
                            {u.email}
                          </div>

                          {/* Role Pill */}
                          <div className="col-span-3 sm:col-span-2">
                            <span className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                              u.role === 'admin'
                                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                : u.role === 'staff'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : u.role === 'robeatsdev'
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}>
                              {u.role === 'robeatsdev' ? 'RoBeatsDev' : u.role}
                            </span>
                          </div>

                          {/* Controls */}
                          <div className="col-span-4 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPasswordTargetUser(u);
                                setNewPasswordValue('');
                              }}
                              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 hover:bg-amber-500/15 text-zinc-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/30 flex items-center gap-1 cursor-pointer"
                              title="Change user password"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden md:inline text-[11px]">Password</span>
                            </button>

                            <button
                              onClick={() => handleStartEdit(u)}
                              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 hover:bg-cyan-500/15 text-zinc-300 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                              title="Edit user profile & permissions"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="hidden md:inline text-[11px]">Edit</span>
                            </button>

                            {!isMeelo && !isSelf && (
                              deleteConfirmId === u.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-1 text-zinc-400 hover:text-white text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                  title="Delete account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ELEMENTS URL IMAGES CONFIGURATION (25 ELEMENTS) */}
          {activeTab === 'elements' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111622] p-3 rounded-xl border border-zinc-800">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search element by name (Rush, Flow, Beat, Vibe, Chill)..."
                    value={elementSearch}
                    onChange={e => setElementSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  onClick={handleSaveElements}
                  disabled={isSavingElements}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingElements ? 'Saving...' : 'Save Elements Configuration'}</span>
                </button>
              </div>

              {/* Elements List */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredElements.map(el => {
                    const parts = (el?.name || 'Standard').split('/');
                    const primary = parts[0] || 'Standard';
                    const secondary = parts[1];
                    const primColor = (primary && ELEMENT_BASE_COLORS[primary]) || ELEMENT_BASE_COLORS.Standard;
                    const secColor = secondary ? (ELEMENT_BASE_COLORS[secondary] || ELEMENT_BASE_COLORS.Standard) : undefined;

                    return (
                      <div 
                        key={el.name}
                        className="p-3 bg-[#0C1017] border border-zinc-800 rounded-xl space-y-2.5"
                      >
                        {/* Element Title & Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Live Thumbnail Box */}
                            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                              {el.imageUrl ? (
                                <img
                                  src={el.imageUrl}
                                  alt={el.name}
                                  className="w-full h-full object-contain"
                                  onError={e => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Disc className="w-4 h-4 text-zinc-600" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{el.name}</span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${primColor?.bg || 'bg-cyan-500/15'} ${primColor?.border || 'border-cyan-500/30'} ${primColor?.text || 'text-cyan-400'}`}>
                                  {el.color}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Hex: {el.hexColor} {el.secondaryHexColor ? `| ${el.secondaryHexColor}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Image URL Input */}
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">
                            Element Icon Image URL
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              value={el.imageUrl || ''}
                              onChange={e => handleElementImageUrlChange(el.name, e.target.value)}
                              placeholder="https://... or data:image/svg+xml..."
                              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                            />
                            {el.imageUrl && (
                              <button
                                type="button"
                                onClick={() => handleElementImageUrlChange(el.name, '')}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                                title="Clear URL"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Save Bar */}
              <div className="p-3 bg-[#111622] rounded-xl border border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Configure custom image URLs for each element to link across all songs, details, and posts.
                </span>
                <button
                  onClick={handleSaveElements}
                  disabled={isSavingElements}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingElements ? 'Saving...' : 'Save Elements Configuration'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ----------------- TAB: DISCORD WEBHOOKS ----------------- */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              {/* Banner Info */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Automated Discord Webhook Broadcasting
                    </h4>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                      Whenever an <span className="text-amber-300 font-semibold">Admin</span> or <span className="text-indigo-300 font-semibold">Staff</span> broadcasts a post, the system formats it exclusively into a Discord embed (embeds only, no external images) directly to the designated Discord channel webhook.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-medium self-start sm:self-auto shrink-0">
                  Admin Only Feature
                </div>
              </div>

              {/* Webhook Configurations List */}
              <div className="space-y-3">
                {[
                  {
                    category: 'Daily mission',
                    title: 'Daily Mission Channel Webhook',
                    desc: "Broadcasts daily missions with today's songs, difficulty ratings, and rotation notes.",
                    icon: Sun,
                    accent: 'cyan',
                    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                    iconClass: 'text-cyan-400',
                  },
                  {
                    category: 'Weekly mission',
                    title: 'Weekly Mission Channel Webhook',
                    desc: "Broadcasts weekly endurance mission songs (Star & Pro), score requirements, and rotation announcements.",
                    icon: Calendar,
                    accent: 'orange',
                    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                    iconClass: 'text-orange-400',
                  },
                  {
                    category: 'Weekly Leaderboard',
                    title: 'Weekly Leaderboard Channel Webhook',
                    desc: "Broadcasts leaderboard updates, weekly rankings, and competition score announcements.",
                    icon: Trophy,
                    accent: 'amber',
                    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    iconClass: 'text-amber-400',
                  },
                  {
                    category: 'New song',
                    title: 'New Song Releases Webhook',
                    desc: "Broadcasts newly released songs with song title, artist, chosen difficulty, and element in an embed.",
                    icon: Sparkles,
                    accent: 'emerald',
                    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    iconClass: 'text-emerald-400',
                  },
                  {
                    category: 'Updates',
                    title: 'Updates & Patch Notes Webhook',
                    desc: "Broadcasts game version update details, patch notes with clickable hyperlinks, and announcements.",
                    icon: Bell,
                    accent: 'sky',
                    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                    iconClass: 'text-sky-400',
                  },
                ].map(item => {
                  const ItemIcon = item.icon;
                  const catData = webhooks[item.category] || { url: '', template: { titleTemplate: '', bodyTemplate: '', footerTemplate: '' } };
                  const currentUrl = typeof catData === 'string' ? catData : catData.url || '';
                  const template = typeof catData === 'object' && catData.template ? catData.template : { titleTemplate: '', bodyTemplate: '', footerTemplate: '' };
                  const isTestingThis = testingCategory === item.category;
                  const resultForThis = testResult?.category === item.category ? testResult : null;
                  const isExpanded = Boolean(expandedTemplates[item.category]);

                  return (
                    <div
                      key={item.category}
                      className="p-4 bg-[#111622] border border-zinc-800 rounded-xl space-y-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.badgeClass}`}>
                            <ItemIcon className={`w-4 h-4 ${item.iconClass}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{item.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.badgeClass}`}>
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedTemplates(prev => ({ ...prev, [item.category]: !prev[item.category] }))}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Customize Discord webhook template for this category"
                          >
                            <Sliders className="w-3 h-3 text-cyan-400" />
                            <span>{isExpanded ? 'Hide Template' : 'Edit Template'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTestWebhook(item.category)}
                            disabled={isTestingThis || !currentUrl.trim()}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={currentUrl.trim() ? "Send a test notification to this Discord webhook" : "Enter a Webhook URL first"}
                          >
                            <Send className={`w-3 h-3 ${isTestingThis ? 'animate-pulse text-indigo-400' : 'text-zinc-400'}`} />
                            <span>{isTestingThis ? 'Sending...' : 'Test Webhook'}</span>
                          </button>
                        </div>
                      </div>

                      {/* URL Input Box */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={currentUrl}
                            onChange={e => {
                              const val = e.target.value;
                              setWebhooks(prev => ({
                                ...prev,
                                [item.category]: {
                                  url: val,
                                  template: prev[item.category]?.template || { titleTemplate: '', bodyTemplate: '', footerTemplate: '' }
                                }
                              }));
                            }}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setWebhooks(prev => ({
                                ...prev,
                                [item.category]: {
                                  url: '',
                                  template: prev[item.category]?.template || { titleTemplate: '', bodyTemplate: '', footerTemplate: '' }
                                }
                              }));
                            }}
                            className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/80 cursor-pointer"
                            title="Clear webhook URL"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Webhook Template Customization Drawer */}
                      {isExpanded && (
                        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800/60 pb-1.5">
                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                              Custom Webhook Template · {item.category}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {item.category === 'Daily mission'
                                ? 'Tags: {title}, {author}, {date}, {star_songs}, {pro_songs}, {amateur_songs}, {novice_songs}, {beginner_songs}'
                                : 'Tags: {title}, {author}, {category}, {content}'}
                            </span>
                          </div>

                          {/* Daily Mission Specialized Template Controls */}
                          {item.category === 'Daily mission' && (
                            <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-xs font-bold text-cyan-200">Daily Mission Template Preset</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleApplyDailyMissionTemplate}
                                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                    title="Apply Star/Pro/Amateur/Novice/Beginner mission template"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Apply Template Preset</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(dailyRawTemplateText || `Header: " Today daily missions"\n## <:star:1295611495383695451> - Star missions\n- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]\n- :star: [Level] SongElement / SongName - Artist [Easy/Normal/Hard] (No Misses)\n...[Type the rest until no more Novice rank songs]\n\n## <:pro:1295611421866070016> - Pro missions\n- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]\n- :star: [Level] SongElement / SongName - Artist [Easy/Normal/Hard] (No Misses)\n...[Type the rest until no more Novice rank songs]\n\n## <:amateur:1295611203325792287> - Amateur missions\n- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]\n- :star: [Level] SongElement / SongName - Artist [Easy/Normal/Hard] (No Misses)\n...[Type the rest until no more Novice rank songs]\n\n## <:novice:1284381928044367944> - Novice missions\n- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]\n...[Type the rest until no more Novice rank songs]\n\n## <:beginner:1284381903578861578> \n - Beginner missions\n- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]\n...[Type the rest until no more Novice rank songs]\n\nPoster: "Poster" | Post date: "Post date"`, 'rawTemplate')}
                                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Copy raw markdown template to clipboard"
                                  >
                                    {copiedTemplateState === 'rawTemplate' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                                    <span>{copiedTemplateState === 'rawTemplate' ? 'Copied Template!' : 'Copy Raw Template'}</span>
                                  </button>

                                  {dailySampleText && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(dailySampleText, 'sampleText')}
                                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Copy rendered Discord message with today's songs"
                                    >
                                      {copiedTemplateState === 'sampleText' ? <Check className="w-3 h-3 text-emerald-400" /> : <FileText className="w-3 h-3 text-cyan-400" />}
                                      <span>{copiedTemplateState === 'sampleText' ? 'Copied Live Text!' : 'Copy Live Discord Text'}</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setShowDailyPreview(!showDailyPreview)}
                                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Code className="w-3 h-3 text-zinc-400" />
                                    <span>{showDailyPreview ? 'Hide Preview' : 'Preview Live'}</span>
                                  </button>
                                </div>
                              </div>

                              {showDailyPreview && (
                                <div className="mt-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                                  {dailySampleText || dailyRawTemplateText}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                                Embed Title Template
                              </label>
                              <input
                                type="text"
                                value={template.titleTemplate}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWebhooks(prev => ({
                                    ...prev,
                                    [item.category]: {
                                      url: currentUrl,
                                      template: { ...template, titleTemplate: val }
                                    }
                                  }));
                                }}
                                placeholder={`🎶 {title} (Default: 🎶 {title})`}
                                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                                Embed Description / Body Template
                              </label>
                              <textarea
                                rows={2}
                                value={template.bodyTemplate}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWebhooks(prev => ({
                                    ...prev,
                                    [item.category]: {
                                      url: currentUrl,
                                      template: { ...template, bodyTemplate: val }
                                    }
                                  }));
                                }}
                                placeholder={`{content} (Default: Post description & content)`}
                                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                                Embed Footer Template
                              </label>
                              <input
                                type="text"
                                value={template.footerTemplate}
                                onChange={e => {
                                  const val = e.target.value;
                                  setWebhooks(prev => ({
                                    ...prev,
                                    [item.category]: {
                                      url: currentUrl,
                                      template: { ...template, footerTemplate: val }
                                    }
                                  }));
                                }}
                                placeholder={`RoBeats News Network • Posted by {author}`}
                                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Test feedback banner */}
                      {resultForThis && (
                        <div
                          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                            resultForThis.success
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {resultForThis.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span>{resultForThis.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Bar */}
              <div className="p-3 bg-[#111622] rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-zinc-400 text-center sm:text-left">
                  Configured webhooks & templates are securely stored on the server and only triggered when an Admin creates a post.
                </span>
                <button
                  type="button"
                  onClick={handleSaveWebhooks}
                  disabled={isSavingWebhooks}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingWebhooks ? 'Saving...' : 'Save Webhook Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: ROBEATS RANKS CONFIGURATION (ADMIN ONLY) */}
          {/* ========================================================== */}
          {activeTab === 'ranks' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#111622] border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>RoBeats Official Ranks</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 font-mono border border-amber-500/30">
                        Admin Only
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure rank badges and icon image URLs for: <strong>Star, Pro, Amateur, Novice, Beginner</strong>. Rank icons can only be edited by administrators.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRanks}
                  disabled={isSavingRanks}
                  className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingRanks ? 'Saving...' : 'Save Rank Icons'}</span>
                </button>
              </div>

              {/* Ranks Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ranks.map((rank, rIdx) => {
                  return (
                    <div
                      key={rank.id || rank.name}
                      className="p-4 bg-[#111622] border border-zinc-800 rounded-xl space-y-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          {/* Rank Icon Preview */}
                          <div 
                            className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner"
                            style={{ borderColor: rank.color ? `${rank.color}40` : undefined }}
                          >
                            {rank.iconUrl ? (
                              <img
                                src={rank.iconUrl}
                                alt={rank.name}
                                className="w-6 h-6 object-contain"
                                onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Award className="w-5 h-5 text-amber-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-sm font-black text-white"
                                style={{ color: rank.color || '#F59E0B' }}
                              >
                                {rank.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                Tier {rIdx + 1}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400 block mt-0.5">
                              {rank.description || 'RoBeats Rank'}
                            </span>
                          </div>
                        </div>

                        {/* Color swatch */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
                          <span 
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: rank.color || '#F59E0B' }}
                          />
                          <span className="text-zinc-300">{rank.color || '#F59E0B'}</span>
                        </div>
                      </div>

                      {/* Icon Image URL Input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          Rank Icon URL (Image URL)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={rank.iconUrl}
                            onChange={e => {
                              const val = e.target.value;
                              setRanks(prev => prev.map(r => r.id === rank.id ? { ...r, iconUrl: val } : r));
                            }}
                            placeholder="https://... rank icon SVG or PNG image URL"
                            className="flex-1 px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                          {rank.iconUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setRanks(prev => prev.map(r => r.id === rank.id ? { ...r, iconUrl: '' } : r));
                              }}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                              title="Clear URL"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Color & Description Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            Theme Color Hex
                          </label>
                          <input
                            type="text"
                            value={rank.color}
                            onChange={e => {
                              const val = e.target.value;
                              setRanks(prev => prev.map(r => r.id === rank.id ? { ...r, color: val } : r));
                            }}
                            placeholder="#F59E0B"
                            className="w-full px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={rank.description || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setRanks(prev => prev.map(r => r.id === rank.id ? { ...r, description: val } : r));
                            }}
                            placeholder="Rank description..."
                            className="w-full px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Bar for Ranks */}
              <div className="p-3 bg-[#111622] rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-zinc-400 text-center sm:text-left">
                  Saved rank icons will automatically appear next to players on the leaderboard, user profiles, and comments.
                </span>
                <button
                  type="button"
                  onClick={handleSaveRanks}
                  disabled={isSavingRanks}
                  className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingRanks ? 'Saving...' : 'Save Rank Icons'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CLOUDFLARE D1 DATABASE */}
          {activeTab === 'd1' && (
            <CloudflareD1Tab onDataChanged={loadData} />
          )}
        </div>
        </>
      )}
      </div>

      {/* ----------------- MODAL: RESET PASSWORD ----------------- */}
      {passwordTargetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div 
            className="w-full max-w-md bg-[#111622] border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Reset Password for @{passwordTargetUser.username}
                </h3>
              </div>
              <button 
                onClick={() => setPasswordTargetUser(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-zinc-300 text-xs font-semibold mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    placeholder="Enter new password"
                    value={newPasswordValue}
                    onChange={e => setNewPasswordValue(e.target.value)}
                    className="w-full px-3 py-2 pr-9 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EDIT USER ----------------- */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div 
            className="w-full max-w-xl bg-[#111622] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Edit Account: @{editingUser.username}
                </h3>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={e => setEditDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Account Role</label>
                  <select
                    value={editRole}
                    onChange={e => {
                      const newR = e.target.value as UserRole;
                      setEditRole(newR);
                      if (newR === 'admin') {
                        setEditPermissions({
                          canManageUsers: true,
                          canChangePasswords: true,
                          canEditProfiles: true,
                          canManageRoles: true,
                          canPublishNews: true,
                          canDeleteContent: true,
                          canAccessAdminPanel: true,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="player">Player</option>
                    <option value="robeatsdev">RoBeatsDev</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl shadow-md"
                >
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: CREATE USER ----------------- */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div 
            className="w-full max-w-md bg-[#111622] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Create New RoBeats Account</h3>
              </div>
              <button 
                onClick={() => setIsCreatingUser(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="rhythm_pro"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="player@robeats.news"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="Player"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="player">Player</option>
                    <option value="robeatsdev">RoBeatsDev</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
