// ========================================
// KAS INFORMATIKA - Auth Context
// ========================================

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: { full_name: string; nim?: string }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isBendahara: boolean;
  isMahasiswa: boolean;
  isStaff: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from the profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        setProfile(null);
        return;
      }

      setProfile(data as Profile);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Re-fetch profile on token refresh to keep data fresh
          await fetchProfile(newSession.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: new Error(error.message) };
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Terjadi kesalahan saat masuk') };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata: { full_name: string; nim?: string }
    ): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
          },
        });
        if (error) return { error: new Error(error.message) };
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Terjadi kesalahan saat mendaftar') };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return { error: new Error(error.message) };
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Terjadi kesalahan saat reset password'),
        };
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
      try {
        if (!user?.id) throw new Error('Pengguna tidak terautentikasi');

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (error) return { error: new Error(error.message) };

        setProfile((prev) => (prev ? { ...prev, ...updates } : null));
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Gagal memperbarui profil'),
        };
      }
    },
    [user?.id]
  );

  // Role checks derived from profile, not metadata
  const isAdmin = profile?.role === 'ADMIN';
  const isBendahara = profile?.role === 'BENDAHARA';
  const isMahasiswa = profile?.role === 'MAHASISWA';
  const isStaff = isAdmin || isBendahara;

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      isAdmin,
      isBendahara,
      isMahasiswa,
      isStaff,
    }),
    [session, user, profile, loading, signIn, signUp, signOut, resetPassword, updateProfile, isAdmin, isBendahara, isMahasiswa, isStaff]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
