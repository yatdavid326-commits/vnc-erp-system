import { supabase } from '@/lib/db/supabase';
import type { Module, UserModule } from '@/lib/types';

export const modulesService = {
  async getAllModules(): Promise<Module[]> {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    return data || [];
  },

  async getUserModules(userId: string): Promise<UserModule[]> {
    const { data } = await supabase
      .from('user_modules')
      .select('*')
      .eq('user_id', userId);

    return data || [];
  },

  async getUserModulesWithDetails(userId: string) {
    const { data } = await supabase
      .from('user_modules')
      .select(
        `
        *,
        module:modules (*)
      `
      )
      .eq('user_id', userId);

    return data || [];
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
    return await supabase
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
    return await supabase
      .from('user_modules')
      .delete()
      .eq('user_id', userId)
      .eq('module_id', moduleId);
  },

  async hasModuleAccess(userId: string, moduleName: string): Promise<boolean> {
    const { data } = await supabase
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
