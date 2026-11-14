import { supabaseClient } from '@/lib/db/supabase';
import type { Module, UserModule } from '@/lib/types';

export const modulesService = {
  async getAllModules(): Promise<Module[]> {
    try {
      // Use server-side API to bypass RLS
      const response = await fetch('/api/modules/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return [];
      const modules = await response.json();
      
      // Filter to active modules only
      return modules.filter((m: Module) => m.active) || [];
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

  async getUserModulesWithDetails(userId: string) {
    try {
      // Get the session to get the access token
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session?.access_token) return [];

      // Use server-side API to bypass RLS
      const response = await fetch('/api/modules/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) return [];
      return await response.json();
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
