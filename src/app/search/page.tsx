"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizePlate } from "@/lib/fuel-service";
import { PLATE_REGIONS, isValidPlateRest } from "@/lib/plate-regions";

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
    if (!region) {
      setError("অঞ্চল সিলেক্ট করুন");
      return;
    }
    if (!isValidPlateRest(plateRest)) {
      setError("সঠিক ফরম্যাট: ল ৬১-৫০৪১ (বাংলা অক্ষর, স্পেস, ২ সংখ্যা-৪ সংখ্যা)");
      return;
    }
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
        setError("এই প্লেট নম্বরের কোনো রেকর্ড পাওয়া যায়নি।");
      } else {
        setData(current);
        setHistory(logs || []);
      }
    } catch {
      setError("সংযোগ ত্রুটি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <h1 className="font-bold text-lg">Fuel Monitor</h1>
          <p className="text-blue-200 text-sm">আপনার শিডিউল দেখুন</p>
        </div>
        <Link href="/login" className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-700">
          Staff Login
        </Link>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Step 1: Plate Number */}
        <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">প্লেট নম্বর</label>

          {/* Region dropdown */}
          <select
            aria-label="Select region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-bold text-sm text-slate-700 bg-white"
          >
            <option value="">অঞ্চল নির্বাচন করুন</option>
            {PLATE_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Plate rest input */}
          <input
            type="text"
            value={plateRest}
            onChange={(e) => setPlateRest(e.target.value)}
            placeholder="ল ৬১-৫০৪১"
            className="w-full px-3 py-3.5 rounded-xl border-2 border-slate-200 text-lg font-bold text-center focus:border-blue-500 focus:outline-none"
          />

          {/* Combined plate preview */}
          {fullPlate && (
            <p className="text-center text-xs text-slate-400 font-mono">{fullPlate}</p>
          )}
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
          type="button"
          onClick={handleSearch}
          disabled={loading || !fullPlate}
          className="w-full bg-blue-900 text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? "খুঁজছি..." : "শিডিউল দেখুন"}
        </button>

        {/* Results */}
        {data && (
          <div className="space-y-4">
            {/* Next Schedule Card */}
            <div className="status-card bg-green-500 text-white p-6 rounded-2xl text-center">
              <h2 className="text-3xl font-black mb-1">পরবর্তী শিডিউল</h2>
              <p className="text-green-100 text-lg font-medium mb-4">{data.plateNumber as string}</p>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-left border border-white/30">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">পরবর্তী রিফুয়েল তারিখ</p>
                <div className="flex items-end justify-between mt-1">
                  <div>
                    <p className="text-xl font-black">
                      {data.scheduledTime
                        ? new Date(data.scheduledTime as string).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })
                        : new Date((data.timestamp as number) + 72 * 60 * 60 * 1000).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })
                      }
                    </p>
                    {data.timeSlot && (
                      <p className="text-sm font-bold opacity-90">স্লট: {data.timeSlot as string}</p>
                    )}
                  </div>
                  <div className="bg-white text-green-600 px-2 py-1 rounded text-[10px] font-black uppercase">
                    ৩ দিন পর
                  </div>
                </div>
              </div>
            </div>

            {/* Last Fueled Info */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">সর্বশেষ রিফুয়েল</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">তারিখ</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    {new Date(data.timestamp as number).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(data.timestamp as number).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">পাম্প</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{data.pumpName as string}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{data.vehicleType as string}</p>
                </div>
              </div>
            </div>

            {/* Recent History */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-5">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">রিফুয়েল ইতিহাস</p>
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={item.id as string} className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{item.pumpName as string}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(item.timestamp as number).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold uppercase">
                        {item.vehicleType as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
