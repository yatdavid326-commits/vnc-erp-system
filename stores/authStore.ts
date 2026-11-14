'use client';

import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
}

interface AuthStore {
  session: User | null;
  setSession: (session: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('auth_user') || 'null') : null,
  
  setSession: (session: User | null) => {
    if (session) {
      localStorage.setItem('auth_user', JSON.stringify(session));
    } else {
      localStorage.removeItem('auth_user');
    }
    set({ session });
  },

  logout: () => {
    localStorage.removeItem('auth_user');
    set({ session: null });
  },
}));
