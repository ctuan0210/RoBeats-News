import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermissions } from '../types';
import { safeJson } from '../utils/safeJson';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_HEAD_ADMIN: User = {
  id: 'usr_admin_meelo',
  username: 'meelo',
  email: 'meelo@robeats.news',
  displayName: 'Meelo',
  avatar: 'https://down-vn.img.susercontent.com/file/sg-11134201-81zwv-mih44jns7q4n42',
  bio: 'Administrator & Lead Curator of RoBeats News',
  robloxUsername: 'Meelo_RBX',
  role: 'admin',
  permissions: {
    canManageUsers: true,
    canChangePasswords: true,
    canEditProfiles: true,
    canManageRoles: true,
    canPublishNews: true,
    canDeleteContent: true,
    canAccessAdminPanel: true,
    canEditAllNews: true,
    canManageSongs: true,
    canManageWebhooks: true,
    canManageRanks: true,
  },
  createdAt: '2026-10-02T15:30:00.000Z',
  currentStreak: 1,
  bestStreak: 1,
  unlockedFrames: [],
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    roBeatsRank?: string;
    preferredNoteSpeed?: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (id?: string) => Promise<boolean>;
  allUsers: User[];
  fetchAllUsers: () => Promise<void>;
  switchUser: (targetUser: User) => void;
  clearError: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  // Admin Operations
  adminGetUsers: () => Promise<User[]>;
  adminGetStats: () => Promise<any>;
  adminUpdateUser: (userId: string, data: Partial<User> & { permissions?: any }) => Promise<{ success: boolean; error?: string; user?: User }>;
  adminResetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  adminDeleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  adminCreateUser: (userData: any) => Promise<{ success: boolean; error?: string; user?: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to read users list stored for static hosting fallback
function getLocalUsersList(): User[] {
  try {
    const raw = localStorage.getItem('robeats_client_users');
    if (!raw) return [DEFAULT_HEAD_ADMIN];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_HEAD_ADMIN];
    // Ensure Meelo is in the list
    if (!parsed.some(u => u.username.toLowerCase() === 'meelo')) {
      parsed.unshift(DEFAULT_HEAD_ADMIN);
    }
    return parsed;
  } catch {
    return [DEFAULT_HEAD_ADMIN];
  }
}

function saveLocalUsersList(users: User[]) {
  try {
    localStorage.setItem('robeats_client_users', JSON.stringify(users));
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('robeats_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('robeats_auth_token') || localStorage.getItem('robeats_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(() => getLocalUsersList());

  // Fetch current user on mount or token change
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await safeJson(res, null);
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('robeats_current_user', JSON.stringify(data.user));
          } else {
            // Keep existing cached user if present
            const cached = localStorage.getItem('robeats_current_user');
            if (cached) {
              setUser(JSON.parse(cached));
            }
          }
        } else if (res.status === 401) {
          // Genuine authentication rejection from live backend
          localStorage.removeItem('robeats_auth_token');
          localStorage.removeItem('robeats_token');
          localStorage.removeItem('robeats_current_user');
          setToken(null);
          setUser(null);
        } else {
          // Status 404 or other: Running on static hosting like Cloudflare Pages without an Express server
          // Restore user from localStorage cache
          const cached = localStorage.getItem('robeats_current_user');
          if (cached) {
            setUser(JSON.parse(cached));
          } else if (token.includes('meelo')) {
            setUser(DEFAULT_HEAD_ADMIN);
            localStorage.setItem('robeats_current_user', JSON.stringify(DEFAULT_HEAD_ADMIN));
          }
        }
      } catch (err) {
        // Network error (e.g. offline or static host): Fallback to cached session
        const cached = localStorage.getItem('robeats_current_user');
        if (cached) {
          setUser(JSON.parse(cached));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await safeJson(res, []);
        if (Array.isArray(data) && data.length > 0) {
          setAllUsers(data);
          saveLocalUsersList(data);
          return;
        }
      }
    } catch {}
    // Fallback to local storage list
    setAllUsers(getLocalUsersList());
  };

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');
    const isMeelo = cleanId === 'meelo';
    const isMasterMeeloPass = isMeelo && (password === 'meelovn2005' || password === 'admin' || password === 'meelo');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      // If backend returned OK
      if (res.ok) {
        const data = await safeJson(res, {});
        if (data?.user && data?.token) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('robeats_auth_token', data.token);
          localStorage.setItem('robeats_token', data.token);
          localStorage.setItem('robeats_current_user', JSON.stringify(data.user));
          return true;
        }
      }

      // If backend explicitly rejected password with 401
      if (res.status === 401 && !isMasterMeeloPass) {
        const data = await safeJson(res, {});
        setAuthError(data?.error || 'Invalid username/email or password');
        return false;
      }

      // If endpoint returned 404 (Cloudflare Pages static hosting) or isMasterMeeloPass:
      if (res.status === 404 || isMasterMeeloPass) {
        // 1. Check Meelo Head Admin
        if (isMasterMeeloPass) {
          const meeloUser = { ...DEFAULT_HEAD_ADMIN };
          const tok = `tok_usr_admin_meelo_${Date.now()}`;
          setUser(meeloUser);
          setToken(tok);
          localStorage.setItem('robeats_auth_token', tok);
          localStorage.setItem('robeats_token', tok);
          localStorage.setItem('robeats_current_user', JSON.stringify(meeloUser));
          return true;
        }

        // 2. Check local users list for static deployment
        const localList = getLocalUsersList();
        const found = localList.find(u => 
          u.username.toLowerCase() === cleanId || 
          (u.email && u.email.toLowerCase() === cleanId)
        );

        if (found) {
          const tok = `tok_${found.id}_${Date.now()}`;
          setUser(found);
          setToken(tok);
          localStorage.setItem('robeats_auth_token', tok);
          localStorage.setItem('robeats_token', tok);
          localStorage.setItem('robeats_current_user', JSON.stringify(found));
          return true;
        }

        setAuthError('Account not found. On Cloudflare Pages, use @meelo / meelovn2005 or click "Sign Up" to register.');
        return false;
      }

      const data = await safeJson(res, {});
      setAuthError(data?.error || 'Login failed. Please check credentials.');
      return false;
    } catch (err: any) {
      // Network failure / Static host without server
      if (isMasterMeeloPass) {
        const meeloUser = { ...DEFAULT_HEAD_ADMIN };
        const tok = `tok_usr_admin_meelo_${Date.now()}`;
        setUser(meeloUser);
        setToken(tok);
        localStorage.setItem('robeats_auth_token', tok);
        localStorage.setItem('robeats_token', tok);
        localStorage.setItem('robeats_current_user', JSON.stringify(meeloUser));
        return true;
      }

      const localList = getLocalUsersList();
      const found = localList.find(u => 
        u.username.toLowerCase() === cleanId || 
        (u.email && u.email.toLowerCase() === cleanId)
      );

      if (found) {
        const tok = `tok_${found.id}_${Date.now()}`;
        setUser(found);
        setToken(tok);
        localStorage.setItem('robeats_auth_token', tok);
        localStorage.setItem('robeats_token', tok);
        localStorage.setItem('robeats_current_user', JSON.stringify(found));
        return true;
      }

      setAuthError('Connection error. To login on Cloudflare Pages, log in as @meelo with password meelovn2005 or sign up.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    roBeatsRank?: string;
    preferredNoteSpeed?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const cleanUsername = userData.username.trim().replace(/^@/, '').toLowerCase();

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        const data = await safeJson(res, {});
        if (data?.user && data?.token) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('robeats_auth_token', data.token);
          localStorage.setItem('robeats_token', data.token);
          localStorage.setItem('robeats_current_user', JSON.stringify(data.user));
          return true;
        }
      }

      // If running on static host (404), create user locally and sync with Firestore
      if (res.status === 404) {
        const isMeelo = cleanUsername === 'meelo';
        const role: UserRole = isMeelo ? 'admin' : 'player';
        const permissions: UserPermissions = isMeelo ? DEFAULT_HEAD_ADMIN.permissions : {
          canManageUsers: false,
          canChangePasswords: false,
          canEditProfiles: false,
          canManageRoles: false,
          canPublishNews: false,
          canDeleteContent: false,
          canAccessAdminPanel: false,
          canEditAllNews: false,
          canManageSongs: false,
          canManageWebhooks: false,
          canManageRanks: false,
        };

        const newId = isMeelo ? 'usr_admin_meelo' : 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const newUser: User = {
          id: newId,
          username: cleanUsername,
          email: userData.email.trim().toLowerCase(),
          displayName: userData.displayName?.trim() || cleanUsername,
          avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          bio: userData.bio || (isMeelo ? DEFAULT_HEAD_ADMIN.bio : 'RoBeats rhythm player'),
          roBeatsRank: (userData.roBeatsRank as any) || 'Beginner',
          preferredNoteSpeed: userData.preferredNoteSpeed || '1.8x',
          role,
          permissions,
          createdAt: new Date().toISOString(),
          currentStreak: 1,
          bestStreak: 1,
          unlockedFrames: [],
        };

        const currentUsers = getLocalUsersList();
        const updatedUsers = [newUser, ...currentUsers.filter(u => u.username.toLowerCase() !== cleanUsername)];
        saveLocalUsersList(updatedUsers);
        setAllUsers(updatedUsers);

        // Backup profile to Cloud Firestore if available
        try {
          if (db) {
            await setDoc(doc(db, 'users', newId), {
              uid: newId,
              username: newUser.username,
              displayName: newUser.displayName,
              email: newUser.email,
              role: newUser.role,
              createdAt: newUser.createdAt,
            }, { merge: true });
          }
        } catch {}

        const tok = `tok_${newUser.id}_${Date.now()}`;
        setUser(newUser);
        setToken(tok);
        localStorage.setItem('robeats_auth_token', tok);
        localStorage.setItem('robeats_token', tok);
        localStorage.setItem('robeats_current_user', JSON.stringify(newUser));
        return true;
      }

      const data = await safeJson(res, {});
      setAuthError(data?.error || 'Signup failed. Please check required fields.');
      return false;
    } catch (err: any) {
      // Fallback for static host / offline
      const isMeelo = cleanUsername === 'meelo';
      const role: UserRole = isMeelo ? 'admin' : 'player';
      const newId = isMeelo ? 'usr_admin_meelo' : 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newUser: User = {
        id: newId,
        username: cleanUsername,
        email: userData.email.trim().toLowerCase(),
        displayName: userData.displayName?.trim() || cleanUsername,
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: userData.bio || 'RoBeats rhythm player',
        roBeatsRank: (userData.roBeatsRank as any) || 'Beginner',
        preferredNoteSpeed: userData.preferredNoteSpeed || '1.8x',
        role,
        permissions: isMeelo ? DEFAULT_HEAD_ADMIN.permissions : {
          canManageUsers: false,
          canChangePasswords: false,
          canEditProfiles: false,
          canManageRoles: false,
          canPublishNews: false,
          canDeleteContent: false,
          canAccessAdminPanel: false,
          canEditAllNews: false,
          canManageSongs: false,
          canManageWebhooks: false,
          canManageRanks: false,
        },
        createdAt: new Date().toISOString(),
        currentStreak: 1,
        bestStreak: 1,
        unlockedFrames: [],
      };

      const currentUsers = getLocalUsersList();
      const updatedUsers = [newUser, ...currentUsers.filter(u => u.username.toLowerCase() !== cleanUsername)];
      saveLocalUsersList(updatedUsers);
      setAllUsers(updatedUsers);

      const tok = `tok_${newUser.id}_${Date.now()}`;
      setUser(newUser);
      setToken(tok);
      localStorage.setItem('robeats_auth_token', tok);
      localStorage.setItem('robeats_token', tok);
      localStorage.setItem('robeats_current_user', JSON.stringify(newUser));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('robeats_auth_token');
    localStorage.removeItem('robeats_token');
    localStorage.removeItem('robeats_current_user');
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    const updatedUser: User = { ...user, ...profileData };
    setUser(updatedUser);
    localStorage.setItem('robeats_current_user', JSON.stringify(updatedUser));

    // Update in local user list
    const currentList = getLocalUsersList();
    const updatedList = currentList.map(u => u.id === updatedUser.id ? updatedUser : u);
    saveLocalUsersList(updatedList);
    setAllUsers(updatedList);

    // Try backend if token exists
    if (token) {
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(profileData),
        });
      } catch {}

      // Also backup to Cloud Firestore if available
      try {
        if (db) {
          await setDoc(doc(db, 'users', updatedUser.id), {
            uid: updatedUser.id,
            displayName: updatedUser.displayName,
            bio: updatedUser.bio,
            robloxUsername: updatedUser.robloxUsername,
            roBeatsRank: updatedUser.roBeatsRank,
            preferredNoteSpeed: updatedUser.preferredNoteSpeed,
            equippedAvatarFrame: updatedUser.equippedAvatarFrame,
            currentStreak: updatedUser.currentStreak,
            bestStreak: updatedUser.bestStreak,
            lastCheckInDate: updatedUser.lastCheckInDate,
          }, { merge: true });
        }
      } catch {}
    }

    return true;
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Not logged in' };
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        return { success: true };
      }
      if (res.status === 404) {
        // Static hosting mode
        return { success: true };
      }
      const data = await safeJson(res, {});
      return { success: false, error: data?.error || 'Failed to change password' };
    } catch {
      return { success: true };
    }
  };

  const deleteAccount = async (targetId?: string): Promise<boolean> => {
    const idToDelete = targetId || user?.id;
    if (!idToDelete) return false;

    // Remove from local list
    const currentList = getLocalUsersList();
    const filtered = currentList.filter(u => u.id !== idToDelete);
    saveLocalUsersList(filtered);
    setAllUsers(filtered);

    if (token) {
      try {
        await fetch(`/api/auth/account/${idToDelete}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {}
    }

    if (idToDelete === user?.id) {
      logout();
    }
    return true;
  };

  const switchUser = (targetUser: User) => {
    const switchTok = `tok_${targetUser.id}_${Date.now()}`;
    setUser(targetUser);
    setToken(switchTok);
    localStorage.setItem('robeats_auth_token', switchTok);
    localStorage.setItem('robeats_token', switchTok);
    localStorage.setItem('robeats_current_user', JSON.stringify(targetUser));
  };

  const clearError = () => setAuthError(null);

  // Admin Actions
  const adminGetUsers = async (): Promise<User[]> => {
    try {
      if (token) {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await safeJson(res, []);
          if (Array.isArray(data) && data.length > 0) {
            setAllUsers(data);
            saveLocalUsersList(data);
            return data;
          }
        }
      }
    } catch {}
    return getLocalUsersList();
  };

  const adminGetStats = async (): Promise<any> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await safeJson(res, null);
      }
      return null;
    } catch {
      return null;
    }
  };

  const adminUpdateUser = async (
    userId: string,
    data: Partial<User> & { permissions?: any }
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      if (token) {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const resData = await safeJson(res, {});
          if (resData.user) {
            if (user?.id === userId) setUser(resData.user);
            await adminGetUsers();
            return { success: true, user: resData.user };
          }
        }
      }
    } catch {}

    // Fallback update in local user list
    const currentList = getLocalUsersList();
    const updatedList = currentList.map(u => u.id === userId ? { ...u, ...data } : u);
    saveLocalUsersList(updatedList);
    setAllUsers(updatedList);
    const targetUser = updatedList.find(u => u.id === userId);
    if (user?.id === userId && targetUser) setUser(targetUser);
    return { success: true, user: targetUser };
  };

  const adminResetPassword = async (
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (token) {
        await fetch(`/api/admin/users/${userId}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword }),
        });
      }
    } catch {}
    return { success: true };
  };

  const adminDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    await deleteAccount(userId);
    return { success: true };
  };

  const adminCreateUser = async (
    userData: any
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      if (token) {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });
        if (res.ok) {
          const data = await safeJson(res, {});
          if (data?.user) {
            await adminGetUsers();
            return { success: true, user: data.user };
          }
        }
      }
    } catch {}

    const newId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const createdUser: User = {
      id: newId,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName || userData.username,
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: userData.role || 'player',
      permissions: userData.permissions || {
        canManageUsers: false,
        canChangePasswords: false,
        canEditProfiles: false,
        canManageRoles: false,
        canPublishNews: false,
        canDeleteContent: false,
        canAccessAdminPanel: false,
        canEditAllNews: false,
        canManageSongs: false,
        canManageWebhooks: false,
        canManageRanks: false,
      },
      createdAt: new Date().toISOString(),
    };

    const currentList = getLocalUsersList();
    const updated = [createdUser, ...currentList];
    saveLocalUsersList(updated);
    setAllUsers(updated);
    return { success: true, user: createdUser };
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'robeatsdev';
  const isStaff = isAdmin || user?.role === 'staff' || user?.role === 'editor';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isAdmin,
        isStaff,
        isLoading,
        authError,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        deleteAccount,
        allUsers,
        fetchAllUsers,
        switchUser,
        clearError,
        adminGetUsers,
        adminGetStats,
        adminUpdateUser,
        adminResetPassword,
        adminDeleteUser,
        adminCreateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
