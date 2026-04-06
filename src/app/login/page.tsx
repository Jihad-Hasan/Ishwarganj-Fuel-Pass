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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-5 pt-6 pb-8">
        {/* Install App */}
        <div className="w-full max-w-sm">
          <InstallButton />
        </div>

        {/* Logo & Branding */}
        <div className="text-center mt-6 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-800 to-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c1.5 0 3 .5 3 2v3h1a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2h1V5c0-1.5 1.5-2 3-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 5v3h4V5M12 14v3M12 14a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Ishwarganj Fuel Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">Pump Staff Login</p>
        </div>

        {/* Login Form Card */}
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Pump Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jamuna@pump.com"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none text-[15px] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none text-[15px] transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl text-[15px] font-bold bg-blue-900 text-white hover:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Bottom action cards */}
        <div className="w-full max-w-sm mt-4 space-y-3">
          {/* Vehicle Owner Link */}
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="w-full py-3.5 px-4 rounded-2xl border-2 border-blue-100 bg-white text-center hover:border-blue-300 active:scale-[0.98] transition-all shadow-sm"
          >
            <p className="text-sm font-bold text-blue-900">Vehicle Owner?</p>
            <p className="text-xs text-slate-500 mt-0.5">Check your next schedule & history</p>
          </button>

        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Ishwarganj Smart Fuel Monitoring System
        </p>
      </div>
    </div>
  );
}
