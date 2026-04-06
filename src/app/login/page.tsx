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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-100 to-slate-200">
      {/* Install App Header */}
      <InstallButton />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Ishwarganj Fuel Monitor</h1>
          <p className="text-slate-500 mt-1">Pump Staff Login</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Pump Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jamuna@pump.com"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary bg-blue-900 text-white hover:bg-blue-800"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Public Search Link for Vehicle Owners */}
        <div className="mt-6 w-full max-w-sm">
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="w-full py-3 px-4 bg-white rounded-2xl shadow-md border-2 border-blue-100 text-center hover:border-blue-300 transition-colors"
          >
            <p className="text-sm font-bold text-blue-900">Vehicle Owner?</p>
            <p className="text-xs text-slate-500">Check your next schedule &amp; history</p>
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Ishwarganj Smart Fuel Monitoring System
        </p>
      </div>
    </div>
  );
}
