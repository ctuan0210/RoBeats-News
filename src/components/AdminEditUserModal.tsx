import React, { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon, Lock, Image, Check, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import { User, UserRole, UserPermissions } from '../types';

interface AdminEditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    displayName?: string;
    avatar?: string;
    role?: UserRole;
    permissions?: UserPermissions;
    newPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const PRESET_AVATARS = [
  { label: 'Admin Crest', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { label: 'Neon Cyber', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80' },
  { label: 'Rhythm Staff', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { label: 'Synth Gamer', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
];

export const AdminEditUserModal: React.FC<AdminEditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canPublishNews: false,
    canManageUsers: false,
    canChangePasswords: false,
    canEditProfiles: false,
    canManageRoles: false,
    canDeleteContent: false,
    canAccessAdminPanel: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setAvatar(user.avatar || '');
      setRole(user.role || 'player');
      setNewPassword('');
      setError(null);
      setPermissions({
        canPublishNews: user.permissions?.canPublishNews || false,
        canManageUsers: user.permissions?.canManageUsers || false,
        canChangePasswords: user.permissions?.canChangePasswords || false,
        canEditProfiles: user.permissions?.canEditProfiles || false,
        canManageRoles: user.permissions?.canManageRoles || false,
        canDeleteContent: user.permissions?.canDeleteContent || false,
        canAccessAdminPanel: user.permissions?.canAccessAdminPanel || false,
        canEditAllNews: user.permissions?.canEditAllNews || false,
        canManageSongs: user.permissions?.canManageSongs || false,
        canManageWebhooks: user.permissions?.canManageWebhooks || false,
        canManageRanks: user.permissions?.canManageRanks || false,
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Change role handler with auto-preset permissions:
  // Admin: Fully permissions
  // Staff: Can post posts
  // Player: Standard access
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setPermissions({
        canPublishNews: true,
        canManageUsers: true,
        canChangePasswords: true,
        canEditProfiles: true,
        canManageRoles: true,
        canDeleteContent: true,
        canAccessAdminPanel: true,
        canEditAllNews: true,
        canManageSongs: true,
        canManageWebhooks: true,
        canManageRanks: true,
      });
    } else if (newRole === 'staff') {
      setPermissions({
        canPublishNews: true, // Staff can post posts
        canManageUsers: false,
        canChangePasswords: false,
        canEditProfiles: false,
        canManageRoles: false,
        canDeleteContent: false,
        canAccessAdminPanel: false,
        canEditAllNews: false,
        canManageSongs: false,
        canManageWebhooks: false,
        canManageRanks: false,
      });
    } else {
      setPermissions({
        canPublishNews: false,
        canManageUsers: false,
        canChangePasswords: false,
        canEditProfiles: false,
        canManageRoles: false,
        canDeleteContent: false,
        canAccessAdminPanel: false,
        canEditAllNews: false,
        canManageSongs: false,
        canManageWebhooks: false,
        canManageRanks: false,
      });
    }
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        displayName: displayName.trim(),
        avatar: avatar.trim(),
        role,
        permissions,
      };
      if (newPassword.trim()) {
        payload.newPassword = newPassword.trim();
      }

      const res = await onSave(payload);
      if (!res.success) {
        setError(res.error || 'Failed to update user');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMeelo = user.username.toLowerCase() === 'meelo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Manage User: @{user.username}
                {isMeelo && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800/40">
                    Lead Admin
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">Update role, permissions, avatar, nickname, and password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Preview & Avatar Section */}
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 flex items-center gap-4">
            <div className="relative group shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName || user.username}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-cyan-500/50 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-cyan-950 text-cyan-400 font-bold text-xl flex items-center justify-center border-2 border-cyan-800/40 uppercase">
                  {user.username[0]}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-400 font-mono">User ID: {user.id}</div>
              <div className="text-sm font-semibold text-zinc-100 truncate">
                {displayName || user.username}
              </div>
              <div className="text-xs text-zinc-400 truncate font-mono">{user.email || 'No email registered'}</div>
            </div>
          </div>

          {/* 1. Nickname / Display Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              Change Nickname / Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. DJ Spark, Rhythm Master"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* 2. Avatar URL & Presets */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-purple-400" />
              Change Avatar URL
            </label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
            />
            {/* Quick presets */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
              </span>
              {PRESET_AVATARS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setAvatar(p.url)}
                  className="px-2 py-0.5 rounded text-[10px] bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  {p.label}
                </button>
              ))}
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="px-2 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 hover:bg-red-900/60 transition ml-auto"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              Change Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Admin Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  role === 'admin'
                    ? 'bg-orange-950/40 border-orange-500 text-orange-200 shadow-md shadow-orange-950/30 ring-1 ring-orange-500/50'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Admin</span>
                    {role === 'admin' && <Check className="w-4 h-4 text-orange-400" />}
                  </div>
                  <p className="text-[11px] mt-1 text-zinc-300 font-sans">
                    <strong>Fully permissions</strong>: users, passwords, news, webhooks, ranks, & settings.
                  </p>
                </div>
              </button>

              {/* Staff Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('staff')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  role === 'staff'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/50'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Staff</span>
                    {role === 'staff' && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] mt-1 text-zinc-300 font-sans">
                    <strong>Can post posts</strong>: publish articles, updates, and missions across all news categories.
                  </p>
                </div>
              </button>

              {/* Player Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('player')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  role === 'player'
                    ? 'bg-zinc-800/60 border-zinc-500 text-zinc-200 shadow-md ring-1 ring-zinc-500/50'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Player</span>
                    {role === 'player' && <Check className="w-4 h-4 text-zinc-300" />}
                  </div>
                  <p className="text-[11px] mt-1 text-zinc-400 font-sans">
                    Standard player access: browse news, comment on posts, and view songs list.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Detailed Permissions Toggler */}
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:bg-zinc-800/40 transition"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Detailed Role Permissions ({Object.values(permissions).filter(Boolean).length} enabled)
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">
                {showPermissions ? 'Hide' : 'Configure'}
              </span>
            </button>

            {showPermissions && (
              <div className="p-4 border-t border-zinc-800/80 space-y-2.5 bg-zinc-950/40">
                <div className="text-[11px] text-zinc-400 mb-2">
                  Toggle fine-grained system capabilities for this user account:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canPublishNews)}
                      onChange={() => handleTogglePermission('canPublishNews')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Publish News</span>
                      <p className="text-[10px] text-zinc-400">Post daily missions & articles</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canManageUsers)}
                      onChange={() => handleTogglePermission('canManageUsers')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Manage Users</span>
                      <p className="text-[10px] text-zinc-400">View and edit registered accounts</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canManageRoles)}
                      onChange={() => handleTogglePermission('canManageRoles')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Manage Roles</span>
                      <p className="text-[10px] text-zinc-400">Promote to Admin or Staff</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canChangePasswords)}
                      onChange={() => handleTogglePermission('canChangePasswords')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Change Passwords</span>
                      <p className="text-[10px] text-zinc-400">Reset credentials for others</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canEditProfiles)}
                      onChange={() => handleTogglePermission('canEditProfiles')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Edit Profiles</span>
                      <p className="text-[10px] text-zinc-400">Change nicknames & avatars</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canDeleteContent)}
                      onChange={() => handleTogglePermission('canDeleteContent')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Delete Content</span>
                      <p className="text-[10px] text-zinc-400">Remove posts & user comments</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/40 cursor-pointer transition border border-zinc-800/50 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canAccessAdminPanel)}
                      onChange={() => handleTogglePermission('canAccessAdminPanel')}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-zinc-200">Can Access Admin Panel</span>
                      <p className="text-[10px] text-zinc-400">Open Admin Panel dialog with Discord Webhooks and Ranks settings</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 4. Change Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Change / Reset Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 pr-10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Minimum 6 characters. If provided, the user's password will be immediately updated.
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-950/40 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save User Details
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
