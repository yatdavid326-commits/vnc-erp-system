import { supabaseClient } from '@/lib/db/supabase';
import { serverSignIn } from '@/lib/services/auth/serverSignIn';
import type { User } from '@/lib/types';

export const authService = {
  async getCurrentUser() {
    const response = await fetch('/api/auth/restore', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user ?? null;
  },

  async getUserProfile(): Promise<User | null> {
    try {
      const response = await fetch('/api/user/profile', {
        cache: 'no-store',
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  async signUp(email: string, password: string) {
    return await supabaseClient.auth.signUp({
      email,
      password,
    });
  },

  async signIn(emailOrUsername: string, password: string) {
    return await serverSignIn(emailOrUsername, password);
  },

  async signOut() {
    const response = await fetch('/api/auth/signout', { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Server signout failed: HTTP ${response.status}`);
    }
    return { error: null };
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
