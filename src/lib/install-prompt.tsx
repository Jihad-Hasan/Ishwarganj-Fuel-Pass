"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      const isInStandalone = ("standalone" in navigator) && (navigator as unknown as { standalone: boolean }).standalone;
      if (!isInStandalone) {
        setShowBanner(true);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.15)] p-4">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-[#1e3a5f] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-[10px] tracking-tight">FUEL</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-800">Install Fuel Monitor</p>
            <p className="text-xs text-slate-400">Fast, offline, no app store</p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-300 hover:text-slate-500 p-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isIOS ? (
          <div className="bg-slate-50 rounded-xl p-3 mb-3">
            <p className="text-xs text-slate-600">
              Tap <span className="font-bold">Share</span> ↑ then <span className="font-bold">&quot;Add to Home Screen&quot;</span>
            </p>
          </div>
        ) : null}

        {/* Action button */}
        <button
          type="button"
          onClick={isIOS ? handleDismiss : handleInstall}
          className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 active:scale-[0.98] transition-transform"
        >
          {isIOS ? "Got it" : "Install"}
        </button>
      </div>
    </div>
  );
}
