"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizePlate } from "@/lib/fuel-service";
import { PLATE_REGIONS } from "@/lib/plate-regions";

export default function PublicSearch() {
  const [region, setRegion] = useState("");
  const [plateRest, setPlateRest] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");

  const fullPlate = region ? `${region} ${plateRest}`.trim() : plateRest.trim();

  const handleSearch = async () => {
    if (!fullPlate) return;
    setLoading(true);
    setError("");
    setData(null);
    setHistory([]);

    try {
      const docId = normalizePlate(fullPlate);

      const { data: current, error: curError } = await supabase
        .from("fuel_logs")
        .select("*")
        .eq("id", docId)
        .maybeSingle();

      if (curError) throw curError;

      const { data: logs, error: histError } = await supabase
        .from("fuel_history")
        .select("*")
        .like("id", `${docId}_%`)
        .order("timestamp", { ascending: false })
        .limit(5);

      if (histError) throw histError;

      if (!current && !logs?.length) {
        setError("No records found for this plate number.");
      } else {
        setData(current);
        setHistory(logs || []);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tighter">Fuel Pass</h1>
          <p className="text-slate-500 font-medium">Check Your Next Schedule &amp; History</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex gap-2">
            {/* Region Dropdown */}
            <select
              aria-label="Select region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-[45%] bg-slate-50 px-2 py-4 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-sm text-slate-700"
            >
              <option value="">Select Region</option>
              {PLATE_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {/* Plate Rest Input */}
            <input
              type="text"
              placeholder="গ ৫০-০২০৩"
              value={plateRest}
              onChange={(e) => setPlateRest(e.target.value)}
              className="flex-1 bg-slate-50 px-3 py-4 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none text-center font-bold text-lg placeholder:text-slate-300"
            />
          </div>

          {/* Combined plate preview */}
          {fullPlate && (
            <p className="text-center mt-3 text-xs text-slate-400 font-mono">
              {fullPlate}
            </p>
          )}

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || !fullPlate}
            className="w-full mt-4 bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? "SEARCHING..." : "CHECK MY STATUS"}
          </button>
        </div>

        {error && <div className="text-center p-4 bg-red-50 text-red-600 rounded-2xl font-bold mb-6">{error}</div>}

        {data && (
          <div className="space-y-6">
            {/* Next Schedule Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2">Next Scheduled Refuel</p>
              <h2 className="text-4xl font-black mb-1">
                {new Date(data.scheduledTime as string).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold border border-white/10">
                   {data.timeSlot as string}
                </span>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Recent History List */}
            {history.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Recent History</h3>
                {history.map((item) => (
                  <div key={item.id as string} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{item.pumpName as string}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.timestamp as number).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-black uppercase">
                        {item.vehicleType as string}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Back to Login */}
        <div className="text-center mt-8">
          <Link href="/login" className="text-sm text-slate-400 hover:text-blue-600 font-medium transition-colors">
            Pump Staff? Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
