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
import type { EligibilityResult, FuelLog } from "@/lib/types";

type Step = "input" | "checking" | "result" | "confirming";

export default function CheckPage() {
  const { user, loading: authLoading, pumpName, signOut } = useAuth();
  const router = useRouter();
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<FuelLog["vehicleType"]>("motorcycle");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState("");
  const [ocrStatus, setOcrStatus] = useState<"idle" | "scanning" | "done" | "failed">("idle");

  // Auth Redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // KILL SWITCH: Force Unregister old Service Workers
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister().then(() => {
            console.log("Old Service Worker Unregistered Successfully");
          });
        }
      });
    }
  }, []);

  // AI plate scan: sends close-up photo to Gemini API
  const runPlateScan = async (file: File) => {
    setOcrStatus("scanning");
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/scan-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();

      if (data.plate) {
        setPlateNumber(data.plate);
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
    if (!plateNumber.trim()) {
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
    setPlateNumber("");
    setPhoto(null);
    setPhotoPreview(null);
    setResult(null);
    setError("");
    setOcrStatus("idle");
    setStep("input");
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
          <button
            onClick={() => router.push("/admin")}
            className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Admin
          </button>
          <button
            onClick={signOut}
            className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {(step === "input" || step === "checking") && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                Step 1: Vehicle Photo (Evidence)
              </label>

              {photoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Vehicle" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg"
                  >
                    X
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => evidenceInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-bold">Take Full Vehicle Photo</span>
                  <span className="block text-xs mt-1 text-slate-300">For evidence / proof</span>
                </button>
              )}

              <input
                ref={evidenceInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleEvidenceCapture}
                className="hidden"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Step 2: Plate Number
                </label>
                {ocrStatus === "done" && plateNumber && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                    Auto-filled
                  </span>
                )}
              </div>

              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="ঢাকা মেট্রো-গ ৫০-০২০৩"
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xl font-bold text-center"
              />

              <button
                onClick={() => scanInputRef.current?.click()}
                disabled={ocrStatus === "scanning"}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  ocrStatus === "scanning"
                    ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                    : "bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100"
                }`}
              >
                {ocrStatus === "scanning" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                    Reading plate number...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h4M4 4v4M20 4h-4M20 4v4M4 20h4M4 20v-4M20 20h-4M20 20v-4" />
                    </svg>
                    Scan Plate (Close-up Photo)
                  </>
                )}
              </button>

              {ocrStatus === "failed" && (
                <p className="text-xs text-red-500 text-center font-medium">Could not read plate. Please type it manually.</p>
              )}
              {ocrStatus === "done" && (
                <p className="text-xs text-green-600 text-center font-medium">Plate detected! Verify and edit if needed.</p>
              )}

              <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePlateScan}
                className="hidden"
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Vehicle Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["motorcycle", "car", "cng", "other"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setVehicleType(type)}
                      className={`py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                        vehicleType === type
                          ? "bg-blue-900 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type === "cng" ? "CNG" : type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleCheck}
              disabled={step === "checking"}
              className="btn-primary bg-blue-900 text-white hover:bg-blue-800 shadow-lg w-full py-3 rounded-xl font-bold mt-4"
            >
              {step === "checking" ? "Checking..." : "Check Vehicle"}
            </button>
          </>
        )}

        {step === "result" && result && (
          <>
            {result.eligible ? (
              <div className="status-card bg-green-500 text-white p-6 rounded-2xl text-center">
                <h2 className="text-3xl font-black mb-1">ELIGIBLE</h2>
                <p className="text-green-100 text-lg font-medium">{plateNumber}</p>
              </div>
            ) : (
              <div className="status-card bg-red-600 text-white p-6 rounded-2xl text-center">
                <h2 className="text-3xl font-black mb-1">BLOCKED</h2>
                <p className="text-red-100 text-lg font-medium">{plateNumber}</p>
                <div className="mt-4 bg-red-700/50 rounded-xl p-4 text-left space-y-2">
                  <p className="text-sm">Time Remaining: <span className="font-bold">{formatRemainingTime(result.remainingMs)}</span></p>
                </div>
              </div>
            )}
            
            {error && <div className="text-red-500 text-center text-sm">{error}</div>}

            <div className="space-y-3 mt-4">
              {result.eligible && (
                <button onClick={handleConfirm} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">
                  Confirm Refuel
                </button>
              )}
              <button onClick={handleReset} className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-bold">
                Check Another Vehicle
              </button>
            </div>
          </>
        )}

        {step === "confirming" && (
          <div className="bg-blue-900 text-white p-6 rounded-2xl text-center">
            <h2 className="text-xl font-bold">Saving Refuel Record...</h2>
          </div>
        )}
      </main>
    </div>
  );
}