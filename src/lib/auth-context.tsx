"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { getAppAuth } from "./firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  pumpName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  pumpName: "",
  signIn: async () => {},
  signOut: async () => {},
});

// Pump name is derived from the email prefix: jamuna@pump.com -> "Jamuna"
function derivePumpName(email: string | null): string {
  if (!email) return "Unknown Pump";
  const prefix = email.split("@")[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAppAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAppAuth(), email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(getAppAuth());
  };

  const pumpName = derivePumpName(user?.email ?? null);

  return (
    <AuthContext.Provider value={{ user, loading, pumpName, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
