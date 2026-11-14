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

    try {
      // Get the session to get the access token
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session?.access_token) return null;

      // Use server-side API instead of direct query to bypass RLS
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
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
    let email = emailOrUsername;
    
    // Check if input is a username (not an email)
    if (!emailOrUsername.includes('@')) {
      // Use server-side API to find the email by username
      try {
        const response = await fetch('/api/auth/login-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: emailOrUsername }),
        });
        
        if (!response.ok) {
          return { error: { message: 'Usuario no encontrado' } };
        }
        
        const { email: foundEmail } = await response.json();
        email = foundEmail;
      } catch (error) {
        return { error: { message: 'Error al buscar usuario' } };
      }
    }
    
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
