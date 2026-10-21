import React, { useState } from 'react';
import { X, UserPlus, Shield, Lock, Mail, User as UserIcon, Image, Check, AlertCircle } from 'lucide-react';
import { UserRole, UserPermissions } from '../types';

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    avatar?: string;
    role?: UserRole;
    permissions?: UserPermissions;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const AdminCreateUserModal: React.FC<AdminCreateUserModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      // Admin: Fully permissions
      // Staff: Can post posts
      const permissions: UserPermissions = role === 'admin' ? {
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
      } : role === 'staff' ? {
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
      } : {
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
      };

      const res = await onCreate({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim() || username.trim(),
        avatar: avatar.trim() || undefined,
        role,
        permissions,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create user');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Create New Account</h2>
              <p className="text-xs text-zinc-400">Add an administrator, staff member, or player</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Username *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. staff_member"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@robeats.news"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Nickname / Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional nickname"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Avatar Image URL</label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Assign Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  role === 'admin'
                    ? 'bg-orange-950/50 border-orange-500 text-orange-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="text-xs font-bold uppercase">Admin</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Fully permissions</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  role === 'staff'
                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="text-xs font-bold uppercase">Staff</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Can post posts</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('player')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  role === 'player'
                    ? 'bg-zinc-800 border-zinc-500 text-zinc-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="text-xs font-bold uppercase">Player</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Standard access</div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
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
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
