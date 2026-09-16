import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({ session: null, loading: true, signOut: async () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let active = true;
    const loadVerifiedSession = async () => {
      const { data: { session: storedSession } } = await client.auth.getSession();
      if (!storedSession) {
        if (active) { setSession(null); setLoading(false); }
        return;
      }
      const { data: { user }, error } = await client.auth.getUser();
      if (!active) return;
      if (error || !user) {
        await client.auth.signOut({ scope: 'local' });
        if (active) setSession(null);
      } else {
        setSession(storedSession);
      }
      if (active) setLoading(false);
    };
    void loadVerifiedSession();
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session,
    loading,
    signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
