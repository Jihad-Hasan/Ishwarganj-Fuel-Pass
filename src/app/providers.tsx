"use client";

import { AuthProvider } from "@/lib/auth-context";
import { InstallPrompt } from "@/lib/install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <InstallPrompt />
    </AuthProvider>
  );
}
