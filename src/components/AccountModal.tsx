import React, { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Lock, 
  Mail, 
  Sparkles, 
  Check, 
  AlertCircle, 
  LogOut, 
  Edit3, 
  Key, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  RefreshCw,
  Image as ImageIcon,
  Shield,
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup' | 'profile';
  onOpenAdminPanel?: () => void;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onOpenAdminPanel,
}) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    clearError,
  } = useAuth();

  // Active view inside modal
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'profile' | 'edit' | 'security'>('login');
  
  // Show / Hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Success messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [formValidationNotice, setFormValidationNotice] = useState<string | null>(null);

  // Edit profile form state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editRobloxUsername, setEditRobloxUsername] = useState('');

  // Change password form state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // Sync tab on open or user state change
  useEffect(() => {
    if (!isOpen) {
      setSuccessMessage(null);
      clearError();
      setFormValidationNotice(null);
      return;
    }

    if (isAuthenticated) {
      setActiveTab('profile');
      if (user) {
        setEditDisplayName(user.displayName || user.username);
        setEditBio(user.bio || '');
        setEditAvatar(user.avatar || DEFAULT_AVATAR);
        setEditRobloxUsername(user.robloxUsername || '');
      }
    } else {
      setActiveTab(initialTab === 'signup' ? 'signup' : 'login');
    }
  }, [isOpen, isAuthenticated, user, initialTab]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationNotice(null);

    const cleanId = loginIdentifier.trim().replace(/^@/, '');

    if (!cleanId) {
      setFormValidationNotice('Please provide your username.');
      return;
    }

    if (!loginPassword) {
      setFormValidationNotice('Please provide your password.');
      return;
    }

    const ok = await login(cleanId, loginPassword);
    if (ok) {
      setSuccessMessage('Successfully signed in!');
      setLoginPassword('');
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('profile');
      }, 700);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidationNotice(null);

    // Form validation requirements
    if (!signupUsername.trim()) {
      setFormValidationNotice('Username is required.');
      return;
    }
    if (signupUsername.trim().length < 3) {
      setFormValidationNotice('Username must be at least 3 characters.');
      return;
    }
    if (!signupEmail.trim()) {
      setFormValidationNotice('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail.trim())) {
      setFormValidationNotice('Please provide a valid email address.');
      return;
    }
    if (!signupPassword) {
      setFormValidationNotice('Password is required.');
      return;
    }
    if (signupPassword.length < 6) {
      setFormValidationNotice('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setFormValidationNotice('Passwords do not match.');
      return;
    }

    const ok = await signup({
      username: signupUsername.trim(),
      email: signupEmail.trim(),
      password: signupPassword,
      displayName: signupDisplayName.trim() || signupUsername.trim(),
      avatar: DEFAULT_AVATAR,
      bio: '',
    });

    if (ok) {
      setSuccessMessage('Account created successfully! Welcome to RoBeats News.');
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('profile');
      }, 900);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);

    const ok = await updateProfile({
      displayName: editDisplayName.trim(),
      bio: editBio.trim(),
      avatar: editAvatar.trim() || DEFAULT_AVATAR,
      robloxUsername: editRobloxUsername.trim(),
    });

    if (ok) {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('profile');
      }, 1200);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);

    if (!currentPass || !newPass) {
      setFormValidationNotice('All password fields are required.');
      return;
    }
    if (newPass.length < 6) {
      setFormValidationNotice('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmNewPass) {
      setFormValidationNotice('New passwords do not match.');
      return;
    }

    const res = await changePassword(currentPass, newPass);
    if (res.success) {
      setSuccessMessage('Password changed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormValidationNotice(res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#10141E] border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#131926]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {isAuthenticated ? 'Account Management' : activeTab === 'signup' ? 'Create Account' : 'Log In'}
                {isAuthenticated && user?.role === 'admin' && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Admin
                  </span>
                )}
              </h2>
              {isAuthenticated && (
                <p className="text-xs text-zinc-400">
                  Signed in as @{user?.username}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-zinc-800/80 bg-[#0E121C] px-6 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => { setActiveTab('profile'); setSuccessMessage(null); }}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Profile
              </button>
              <button
                onClick={() => { setActiveTab('edit'); setSuccessMessage(null); }}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              <button
                onClick={() => { setActiveTab('security'); setSuccessMessage(null); }}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Security
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setActiveTab('login'); clearError(); setFormValidationNotice(null); }}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Log In
              </button>
              <button
                onClick={() => { setActiveTab('signup'); clearError(); setFormValidationNotice(null); }}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'signup'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Sign Up
              </button>
            </>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {(authError || formValidationNotice) && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError || formValidationNotice}</span>
            </div>
          )}

          {/* ----------------- TAB: LOG IN ----------------- */}
          {!isAuthenticated && activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Username</span>
                  {(loginIdentifier.trim().toLowerCase() === 'meelo' || loginIdentifier.trim().toLowerCase() === '@meelo') && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                      <Shield className="w-3 h-3" />
                      Admin Account
                    </span>
                  )}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    placeholder="Enter username (e.g. @meelo)"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password guidance */}
              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">ℹ</span>
                <span>If you forgot password, please contact <strong className="text-cyan-300">@meelo</strong> via Discord to change password</span>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="text-cyan-400 hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Sign up now
                </button>
              </div>
            </form>
          )}

          {/* ----------------- TAB: SIGN UP (REQ TO SIGN UP) ----------------- */}
          {!isAuthenticated && activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              {/* Username (Required) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Username <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={e => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="i_love_ygivo"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Lowercase letters, numbers, and underscores only</p>
              </div>

              {/* Email (Required) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Address <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="player@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Passwords (Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Password <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Confirm Password <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={signupConfirmPassword}
                      onChange={e => setSignupConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={signupDisplayName}
                  onChange={e => setSignupDisplayName(e.target.value)}
                  placeholder="ygivo"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Registering Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-zinc-500 pt-2">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-cyan-400 hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* ----------------- TAB: PROFILE OVERVIEW (LOGGED IN) ----------------- */}
          {isAuthenticated && user && activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Profile Card - Showing ONLY username, display name, bio, and avatar */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-[#121824] border border-zinc-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <UserAvatar
                  src={user.avatar || DEFAULT_AVATAR}
                  alt={user.displayName}
                  frameId={user.equippedAvatarFrame}
                  size="lg"
                />

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {user.displayName || user.username}
                      </h3>
                      <p className="text-xs text-cyan-400 font-mono">@{user.username}</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-center sm:self-start">
                      {user.currentStreak && user.currentStreak > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span>{user.currentStreak}d Streak</span>
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase">
                        {user.role === 'robeatsdev' ? 'RoBeatsDev' : user.role}
                      </span>
                    </div>
                  </div>

                  {user.robloxUsername && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-0.5">
                      <span className="text-zinc-500 font-medium">Roblox:</span>
                      <span className="font-mono text-cyan-300 font-semibold">@{user.robloxUsername}</span>
                    </div>
                  )}

                  <p className="text-xs text-zinc-300 pt-1 leading-relaxed">
                    {user.bio || 'No bio set yet.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {user.role === 'admin' && onOpenAdminPanel && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAdminPanel();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Open Admin Panel (User Management)
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                    Security Settings
                  </button>
                </div>
              </div>

              {/* Log out bar */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="text-[11px] text-zinc-500">
                  Account Active
                </div>
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="py-1.5 px-3 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* ----------------- TAB: EDIT PROFILE ----------------- */}
          {isAuthenticated && user && activeTab === 'edit' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/70 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Roblox Username
                </label>
                <input
                  type="text"
                  value={editRobloxUsername}
                  onChange={e => setEditRobloxUsername(e.target.value)}
                  placeholder="e.g. Meelo_RBX"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/70 transition-all font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Displayed publicly on your profile</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Bio / Player Motto
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Share a bio, favorite songs, or motto..."
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/70 transition-all resize-none"
                />
              </div>

              {/* Custom Image URL ONLY (No avatar presets) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Custom Image URL
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {editAvatar ? (
                      <img 
                        src={editAvatar} 
                        alt="Avatar preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={e => setEditAvatar(e.target.value)}
                    placeholder="https://example.com/your-image.jpg"
                    className="flex-1 px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/70"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Paste a direct image URL (PNG, JPG, WebP) to use as your avatar.</p>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="py-2.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ----------------- TAB: SECURITY (CHANGE PASSWORD) ----------------- */}
          {isAuthenticated && activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/70 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 pr-10 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/70 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPass}
                  onChange={e => setConfirmNewPass(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/70 transition-all"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
