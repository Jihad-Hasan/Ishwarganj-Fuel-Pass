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
import { PLATE_REGIONS } from "@/lib/plate-regions";
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
        // OCR returns full plate — put it all in plateRest, clear region
        setRegion("");
        setPlateRest(data.plate);
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
          <h1 className="font-bold text-lg">Fuel Check</h1>
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
            {/* Step 1: Evidence */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Step 1: Vehicle Photo (Evidence)</label>
              {photoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Vehicle" className="w-full h-48 object-cover rounded-xl" />
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">X</button>
                </div>
              ) : (
                <button onClick={() => evidenceInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400">
                  <span className="text-sm font-bold block">Take Full Vehicle Photo</span>
                </button>
              )}
              <input ref={evidenceInputRef} type="file" accept="image/*" capture="environment" onChange={handleEvidenceCapture} className="hidden" />
            </div>

            {/* Step 2: Plate Number */}
            <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Step 2: Plate Number</label>

              {/* Region dropdown + plate rest input */}
              <div className="flex gap-2">
                <select
                  aria-label="Select region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-[45%] px-2 py-4 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-bold text-sm text-slate-700 bg-white"
                >
                  <option value="">Select Region</option>
                  {PLATE_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={plateRest}
                  onChange={(e) => setPlateRest(e.target.value)}
                  placeholder="গ ৫০-০২০৩"
                  className="flex-1 px-3 py-4 rounded-xl border-2 border-slate-300 text-lg font-bold text-center focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Combined plate preview */}
              {plateNumber && (
                <p className="text-center text-xs text-slate-400 font-mono">{plateNumber}</p>
              )}

              <button onClick={() => scanInputRef.current?.click()} disabled={ocrStatus === "scanning"} className="w-full py-3 rounded-xl text-sm font-bold border-2 border-blue-200 text-blue-700">
                {ocrStatus === "scanning" ? "Scanning..." : "Scan Plate (Close-up)"}
              </button>
              <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handlePlateScan} className="hidden" />

              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["motorcycle", "car"] as const).map((type) => (
                    <button key={type} onClick={() => setVehicleType(type)} className={`py-2 rounded-xl text-sm font-bold capitalize ${vehicleType === type ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600"}`}>{type}</button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">{error}</div>}

            <button onClick={handleCheck} disabled={step === "checking"} className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold mt-4 shadow-lg">{step === "checking" ? "Checking..." : "Check Vehicle"}</button>
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
