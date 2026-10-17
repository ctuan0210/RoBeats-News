import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthSession } from '../types';

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
  // Admin Operations
  adminGetUsers: () => Promise<User[]>;
  adminGetStats: () => Promise<any>;
  adminUpdateUser: (userId: string, data: Partial<User> & { permissions?: any }) => Promise<{ success: boolean; error?: string; user?: User }>;
  adminResetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  adminDeleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  adminCreateUser: (userData: any) => Promise<{ success: boolean; error?: string; user?: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('robeats_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Fetch current user on mount or token change
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('robeats_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify session', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/auth/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch accounts list', e);
    }
  };

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Login failed. Please check credentials.');
        return false;
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('robeats_auth_token', data.token);
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'Network error during login.');
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
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Signup failed. Please check required fields.');
        return false;
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('robeats_auth_token', data.token);
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'Network error during signup.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('robeats_auth_token');
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Failed to update profile');
        return false;
      }

      setUser(data.user);
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'Error updating profile');
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Not logged in' };
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to change password' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const deleteAccount = async (targetId?: string): Promise<boolean> => {
    if (!token) return false;
    const idToDelete = targetId || user?.id;
    if (!idToDelete) return false;

    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)auth/account/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setAuthError(data.error || 'Failed to delete account');
        return false;
      }

      // If user deleted their own account, log out
      if (idToDelete === user?.id) {
        logout();
      } else {
        await fetchAllUsers();
      }
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'Network error deleting account');
      return false;
    }
  };

  const switchUser = (targetUser: User) => {
    // Generates a mock switch token for local session switching in management
    const switchTok = `tok_${targetUser.id}_${Date.now()}`;
    setUser(targetUser);
    setToken(switchTok);
    localStorage.setItem('robeats_auth_token', switchTok);
  };

  const clearError = () => setAuthError(null);

  // Admin Actions
  const adminGetUsers = async (): Promise<User[]> => {
    if (!token) return [];
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
        return data;
      }
      return [];
    } catch {
      return [];
    }
  };

  const adminGetStats = async (): Promise<any> => {
    if (!token) return null;
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
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
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to update user' };
      }
      if (user?.id === userId) {
        setUser(resData.user);
      }
      await adminGetUsers();
      return { success: true, user: resData.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const adminResetPassword = async (
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset password' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const adminDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete user' };
      }
      await adminGetUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const adminCreateUser = async (
    userData: any
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create user' };
      }
      await adminGetUsers();
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
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
