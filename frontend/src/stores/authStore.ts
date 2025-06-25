import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../config/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'supervisor' | 'admin';
  profile: {
    avatar?: string;
    phone?: string;
    department?: string;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    aiSettings: {
      sensitivity: 'low' | 'medium' | 'high';
      autoRecommendations: boolean;
      realTimeCoaching: boolean;
    };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data;
          
          localStorage.setItem('authToken', token);
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('authToken');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },

      updateProfile: async (updates: Partial<User>) => {
        try {
          const response = await api.put('/auth/profile', updates);
          const updatedUser = response.data;
          
          set({ user: updatedUser });
        } catch (error) {
          throw error;
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          const user = response.data;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true 
          });
        } catch (error) {
          localStorage.removeItem('authToken');
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false 
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);