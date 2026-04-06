"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { InstallButton } from "@/lib/install-prompt";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.replace("/check");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Invalid login")) {
        setError("Invalid email or password.");
      } else {
        setError(`Login failed: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="text-[10px] text-slate-400 font-medium">Ishwarganj Fuel Monitor</p>
        <InstallButton />
      </div>

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8">
        {/* Logo */}
        <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Pump Staff Login</h1>
        <p className="text-slate-400 text-xs mt-1 mb-6">Sign in to start fuel checking</p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:outline-none text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 focus:outline-none text-sm"
          />

          {error && (
            <p className="text-red-500 text-xs font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-900 text-white text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] text-slate-300 font-medium uppercase">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Vehicle Owner Link */}
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="w-full max-w-sm py-3 rounded-xl bg-white border border-slate-200 text-center active:scale-[0.98] transition-transform"
        >
          <p className="text-sm font-semibold text-slate-700">Check My Fuel Schedule</p>
          <p className="text-[10px] text-slate-400">For vehicle owners</p>
        </button>
      </div>
    </div>
  );
}
