import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { isMockMode } from "@/config/runtime";
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isMockAuth: boolean;
  signOut: () => Promise<void>;
}

const mockUser: AuthUser = {
  id: "local-debug-user",
  email: "debug@skyshake.local",
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(isMockMode ? mockUser : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!isMockMode);

  useEffect(() => {
    if (isMockMode) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(
        currentSession?.user
          ? {
              id: currentSession.user.id,
              email: currentSession.user.email,
            }
          : null,
      );
      setLoading(false);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(
          currentSession?.user
            ? {
                id: currentSession.user.id,
                email: currentSession.user.email,
              }
            : null,
        );
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (isMockMode) {
      return;
    }

    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isMockAuth: isMockMode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
