"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  checkEligibility,
  confirmRefuel,
  compressPhoto,
  formatRemainingTime,
} from "@/lib/fuel-service";
import { PLATE_REGIONS, isValidPlateRest, extractRegion } from "@/lib/plate-regions";
import type { EligibilityResult, FuelLog } from "@/lib/types";

type Step = "input" | "checking" | "result" | "confirming";

export default function CheckPage() {
  const { user, loading: authLoading, pumpName, signOut } = useAuth();
  const router = useRouter();
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [region, setRegion] = useState("");
  const [plateRest, setPlateRest] = useState("");
  const [vehicleType, setVehicleType] = useState<FuelLog["vehicleType"]>("motorcycle");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState("");
  const [ocrStatus, setOcrStatus] = useState<"idle" | "scanning" | "done" | "failed">("idle");

  const plateNumber = region ? `${region} ${plateRest}`.trim() : plateRest.trim();

  // Auth Redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const runPlateScan = async (file: File) => {
    setOcrStatus("scanning");
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession();
      const res = await fetch("/api/scan-plate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();
      if (data.plate) {
        // OCR returns full plate — extract region and set separately
        const { region: detectedRegion, rest } = extractRegion(data.plate);
        setRegion(detectedRegion);
        setPlateRest(rest);
        setOcrStatus("done");
      } else {
        setOcrStatus("failed");
      }
    } catch {
      setOcrStatus("failed");
    }
  };

  const handleEvidenceCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePlateScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      runPlateScan(file);
    }
  };

  const handleCheck = async () => {
    if (!plateNumber) {
      setError("Enter a plate number");
      return;
    }
    if (!region) {
      setError("অঞ্চল সিলেক্ট করুন");
      return;
    }
    if (!isValidPlateRest(plateRest)) {
      setError("সঠিক ফরম্যাট: ল ৬১-৫০৪১ (বাংলা অক্ষর, স্পেস, ২ সংখ্যা-৪ সংখ্যা)");
      return;
    }
    setError("");
    setStep("checking");

    try {
      const res = await checkEligibility(plateNumber);
      setResult(res);
      setStep("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Error: ${msg}`);
      setStep("input");
    }
  };

  const handleConfirm = async () => {
    if (!user || !result?.eligible) return;
    setStep("confirming");

    try {
      let photoData = "";
      if (photo) {
        photoData = await compressPhoto(photo);
      }

      await confirmRefuel(
        plateNumber,
        pumpName,
        user.email || "",
        photoData,
        vehicleType
      );

      handleReset();
    } catch {
      setError("Failed to save. Try again.");
      setStep("result");
    }
  };

  const handleReset = () => {
    setRegion("");
    setPlateRest("");
    setPhoto(null);
    setPhotoPreview(null);
    setResult(null);
    setError("");
    setOcrStatus("idle");
    setStep("input");
  };

  const getDisplaySlot = () => {
    const hour = new Date().getHours();
    if (hour >= 10 && hour < 13) return "10:00 AM - 01:00 PM";
    if (hour >= 14 && hour < 18) return "02:00 PM - 06:00 PM";
    if (hour >= 18 && hour < 22) return "06:00 PM - 10:00 PM";
    return "General Slot";
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <h1 className="font-bold text-lg">Fuel Monitor</h1>
          <p className="text-blue-200 text-sm">{pumpName} Pump</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/admin")} className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg">Admin</button>
          <button onClick={signOut} className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg">Logout</button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {(step === "input" || step === "checking") && (
          <>
            {/* Step 1: Scan Plate */}
            <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Step 1: Plate Number</label>

              {/* Scan Plate Button - Primary action */}
              <button onClick={() => scanInputRef.current?.click()} disabled={ocrStatus === "scanning"} className="w-full py-4 rounded-xl text-sm font-bold bg-blue-900 text-white active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {ocrStatus === "scanning" ? "Scanning..." : "Scan Plate (Close-up Photo)"}
              </button>
              <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handlePlateScan} className="hidden" />

              {ocrStatus === "done" && (
                <p className="text-center text-xs text-green-600 font-medium">Plate scanned successfully</p>
              )}
              {ocrStatus === "failed" && (
                <p className="text-center text-xs text-red-500 font-medium">Could not read plate — enter manually below</p>
              )}

              {/* Manual entry - or divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 uppercase tracking-widest">or enter manually</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

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
              {plateNumber && (
                <p className="text-center text-xs text-slate-400 font-mono">{plateNumber}</p>
              )}

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setVehicleType("motorcycle")} className={`py-2 rounded-xl text-sm font-bold ${vehicleType === "motorcycle" ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600"}`}>Motorcycle</button>
                  <button type="button" disabled className="py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-400 cursor-not-allowed relative">
                    Car
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Soon</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Vehicle Photo (Optional) */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">Step 2: Vehicle Photo</label>
              <p className="text-xs text-slate-400 mb-3">Optional — for evidence</p>
              {photoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Vehicle" className="w-full h-40 object-cover rounded-xl" />
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">X</button>
                </div>
              ) : (
                <button onClick={() => evidenceInputRef.current?.click()} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 active:scale-[0.98] transition-all">
                  <svg className="w-6 h-6 mx-auto mb-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs font-medium block">Add Vehicle Photo</span>
                </button>
              )}
              <input ref={evidenceInputRef} type="file" accept="image/*" capture="environment" onChange={handleEvidenceCapture} className="hidden" />
            </div>

            {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">{error}</div>}

            <button onClick={handleCheck} disabled={step === "checking"} className="w-full bg-blue-900 text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">{step === "checking" ? "Checking..." : "Check Vehicle"}</button>
          </>
        )}

        {step === "result" && result && (
          <>
            {result.eligible ? (
              <div className="status-card bg-green-500 text-white p-6 rounded-2xl text-center">
                <h2 className="text-3xl font-black mb-1">ELIGIBLE</h2>
                <p className="text-green-100 text-lg font-medium mb-4">{plateNumber}</p>

                <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-4 text-left border border-white/30">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">Next Auto-Schedule</p>
                  <div className="flex items-end justify-between mt-1">
                    <div>
                      <p className="text-xl font-black">
                        {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-BD', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm font-bold opacity-90">
                        Slot: {getDisplaySlot()}
                      </p>
                    </div>
                    <div className="bg-white text-green-600 px-2 py-1 rounded text-[10px] font-black uppercase">
                      3 Days Later
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="status-card bg-red-600 text-white p-6 rounded-2xl text-center">
                <h2 className="text-3xl font-black mb-1">BLOCKED</h2>
                <p className="text-red-100 text-lg font-medium">{plateNumber}</p>
                <div className="mt-4 bg-red-700/50 rounded-xl p-4 text-left">
                  <p className="text-sm">Time Remaining: <span className="font-bold">{formatRemainingTime(result.remainingMs)}</span></p>
                </div>
              </div>
            )}

            <div className="space-y-3 mt-4">
              {result.eligible && (
                <button onClick={handleConfirm} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md">Confirm Refuel</button>
              )}
              <button onClick={handleReset} className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-bold">Check Another Vehicle</button>
            </div>
          </>
        )}

        {step === "confirming" && (
          <div className="bg-blue-900 text-white p-6 rounded-2xl text-center animate-pulse">
            <h2 className="text-xl font-bold">Saving Refuel Record...</h2>
          </div>
        )}
      </main>
    </div>
  );
}
