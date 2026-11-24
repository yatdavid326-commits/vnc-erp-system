import { supabaseClient } from '@/lib/db/supabase';
import type { Module, UserModule, UserModuleWithDetails } from '@/lib/types';
import { getCachedValue, setCachedValue, clearCachedValue } from '@/lib/utils/clientCache';

export const modulesService = {
  async getAllModules(): Promise<Module[]> {
    try {
      const cached = getCachedValue<Module[]>('modules:all');
      if (cached) return cached;
      // Use server-side API to bypass RLS
      const response = await fetch('/api/modules/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching modules: HTTP ${response.status}`);
      }
      const modules = await response.json();
      
      // Filter to active modules only
      const active = modules.filter((m: Module) => m.is_active);
      setCachedValue('modules:all', active, 60_000);
      return active;
    } catch (error) {
      console.error('Error fetching modules:', error);
      return [];
    }
  },

  async getUserModules(userId: string): Promise<UserModule[]> {
    const { data } = await supabaseClient
      .from('user_modules')
      .select('*')
      .eq('user_id', userId);

    return data || [];
  },

  async getUserModulesWithDetails(): Promise<UserModuleWithDetails[]> {
    try {
      const cached = getCachedValue<UserModuleWithDetails[]>('modules:user');
      if (cached) return cached;
      const response = await fetch('/api/modules/user', {
        cache: 'no-store',
      });

      if (!response.ok) return [];
      const userModules: UserModuleWithDetails[] = await response.json();
      setCachedValue('modules:user', userModules, 60_000);
      return userModules;
    } catch (error) {
      console.error('Error fetching user modules:', error);
      return [];
    }
  },

  async grantModuleAccess(
    userId: string,
    moduleId: string,
    permissions: {
      can_view?: boolean;
      can_create?: boolean;
      can_edit?: boolean;
      can_delete?: boolean;
    }
  ) {
    return await supabaseClient
      .from('user_modules')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        ...permissions,
      })
      .select()
      .single();
  },

  async revokeModuleAccess(userId: string, moduleId: string) {
    return await supabaseClient
      .from('user_modules')
      .delete()
      .eq('user_id', userId)
      .eq('module_id', moduleId);
  },

  async hasModuleAccess(userId: string, moduleName: string): Promise<boolean> {
    const { data } = await supabaseClient
      .from('user_modules')
      .select(
        `
        can_view,
        module:modules (name)
      `
      )
      .eq('user_id', userId)
      .eq('module.name', moduleName)
      .eq('can_view', true)
      .single();

    return !!data;
  },
};
