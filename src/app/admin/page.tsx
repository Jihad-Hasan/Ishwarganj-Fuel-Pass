"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getRecentRefuels } from "@/lib/fuel-service";
import type { FuelLog } from "@/lib/types";

export default function AdminPage() {
  const { user, loading: authLoading, pumpName, signOut } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      getRecentRefuels(100)
        .then(setLogs)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const filteredLogs = logs.filter((log) =>
    log.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    log.pumpName.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      {/* Top Bar */}
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <h1 className="font-bold text-lg">{pumpName} Admin</h1>
          <p className="text-blue-200 text-sm">Refuel Records</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/check")}
            className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={signOut}
            className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <p className="text-3xl font-black text-blue-900">{logs.length}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Records</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <p className="text-3xl font-black text-blue-900">
              {new Set(logs.map((l) => l.pumpName)).size}
            </p>
            <p className="text-xs text-slate-500 font-semibold uppercase">Active Pumps</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="প্লেট নম্বর বা পাম্প খুঁজুন..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Logs */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 mt-3">Loading records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <p className="text-slate-400 text-lg">
              {search ? "No matching records" : "No refueling records yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={`${log.plateNumber}-${log.timestamp}`}
                className="bg-white rounded-xl shadow-md p-4"
              >
                {/* Top row: plate + pump */}
                <div className="flex items-start gap-3">
                  {/* Photo thumbnail */}
                  {log.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={log.photoUrl}
                      alt="Vehicle"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 tracking-wide">
                      {log.plateNumber}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-semibold text-blue-800">{log.pumpName}</span>
                      {" · "}
                      <span className="capitalize">{log.vehicleType}</span>
                    </p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  {/* Last fueled */}
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Last Fueled</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      {new Date(log.timestamp).toLocaleDateString("en-BD", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString("en-BD", {
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>

                  {/* Next schedule */}
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-blue-400 font-semibold uppercase">Next Schedule</p>
                    {log.scheduledTime ? (
                      <>
                        <p className="text-xs font-bold text-blue-800 mt-0.5">
                          {new Date(log.scheduledTime).toLocaleDateString("en-BD", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </p>
                        {log.timeSlot && (
                          <p className="text-[10px] text-blue-600">{log.timeSlot}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs font-bold text-blue-800 mt-0.5">
                        {new Date(log.timestamp + 72 * 60 * 60 * 1000).toLocaleDateString("en-BD", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
