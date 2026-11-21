'use client';

import { create } from 'zustand';
import type { Module, UserModuleWithDetails } from '@/lib/types';

interface ModuleStore {
  modules: Module[];
  userModules: UserModuleWithDetails[];
  setModules: (modules: Module[]) => void;
  setUserModules: (modules: UserModuleWithDetails[]) => void;
  hasAccess: (moduleName: string) => boolean;
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  modules: [],
  userModules: [],
  setModules: (modules) => set({ modules }),
  setUserModules: (userModules) => set({ userModules }),
  hasAccess: (moduleName) => {
    const { userModules } = get();
    return userModules.some(
      (um) => um.module?.name === moduleName && um.can_view
    );
  },
}));
