import { supabaseClient } from '@/lib/db/supabase';
import type { User } from '@/lib/types';

export const authService = {
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    return user;
  },

  async getUserProfile(): Promise<User | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return data;
  },

  async signUp(email: string, password: string) {
    return await supabaseClient.auth.signUp({
      email,
      password,
    });
  },

  async signIn(email: string, password: string) {
    return await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
  },

  async signOut() {
    return await supabaseClient.auth.signOut();
  },

  async updatePassword(newPassword: string) {
    return await supabaseClient.auth.updateUser({
      password: newPassword,
    });
  },

  async updateProfile(updates: Partial<User>) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('No user logged in');

    return await supabaseClient
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
  },

  async getUserModules(userId: string) {
    const { data } = await supabaseClient
      .from('user_modules')
      .select(
        `
        *,
        module:modules (*)
      `
      )
      .eq('user_id', userId);

    return data;
  },

  async verifyToken(token: string) {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);
    return user;
  },
};
