import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, User, Sparkles } from 'lucide-react';

export const AuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { login, signup, authError } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const ok = isLoginMode
        ? await login(username, password)
        : await signup({ username, email: username.includes('@') ? username : `${username}@robeats.community`, password });

      if (!ok) {
        setError(authError || 'Authentication failed');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0E131F] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-zinc-100">
            {isLoginMode ? 'Sign In to RoBeats News' : 'Create Player Account'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isLoginMode
              ? 'Access staff desk, comments, and rank profile'
              : 'Join rhythm discussions and view daily missions'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs rounded-xl font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-zinc-300 font-medium">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Meelo"
                className="w-full pl-9 pr-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-300 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-black/60 border border-zinc-700/80 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-cyan-500/10 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : isLoginMode ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError(null);
            }}
            className="text-xs text-cyan-400 hover:underline"
          >
            {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
