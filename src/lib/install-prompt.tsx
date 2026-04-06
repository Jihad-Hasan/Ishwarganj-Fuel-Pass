"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    if (("standalone" in navigator) && (navigator as unknown as { standalone: boolean }).standalone) {
      setIsInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isiOS);

    if (!isiOS) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isIOS) setShowIOSTip((v) => !v);
          else if (deferredPrompt) handleInstall();
        }}
        className="w-full py-3.5 px-4 rounded-2xl border-2 border-green-200 bg-white text-center hover:border-green-300 active:scale-[0.98] transition-all shadow-sm"
      >
        <p className="text-sm font-bold text-green-700 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Install App
        </p>
        <p className="text-xs text-slate-500 mt-0.5">Add to home screen for quick access</p>
      </button>
      {isIOS && showIOSTip && (
        <div className="mt-2 py-2.5 px-4 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-xs text-green-800">
            Tap <span className="font-bold">Share</span> then <span className="font-bold">&quot;Add to Home Screen&quot;</span>
          </p>
        </div>
      )}
    </>
  );
}
