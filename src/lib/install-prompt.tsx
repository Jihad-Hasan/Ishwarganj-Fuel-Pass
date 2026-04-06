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
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before (respect for 24 hours)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Detect iOS Safari
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      // iOS doesn't fire beforeinstallprompt — show manual instructions
      const isInStandalone = ("standalone" in navigator) && (navigator as unknown as { standalone: boolean }).standalone;
      if (!isInStandalone) {
        setShowBanner(true);
      }
      return;
    }

    // Android / Chrome: capture the install prompt event
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up">
        {/* App Icon */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1e3a5f] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white font-black text-sm">FUEL</span>
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-800">Install Fuel Monitor</h3>
            <p className="text-slate-500 text-sm">Works offline like a real app</p>
          </div>
        </div>

        {isIOS ? (
          /* iOS Safari instructions */
          <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-bold text-blue-900">To install on iPhone:</p>
            <div className="flex items-center gap-3 text-sm text-blue-800">
              <span className="bg-blue-100 rounded-lg w-7 h-7 flex items-center justify-center font-black text-xs">1</span>
              <p>Tap the <span className="font-bold">Share</span> button <span className="text-lg">&#x2191;&#xFE0E;</span> at the bottom</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-blue-800">
              <span className="bg-blue-100 rounded-lg w-7 h-7 flex items-center justify-center font-black text-xs">2</span>
              <p>Scroll down and tap <span className="font-bold">&quot;Add to Home Screen&quot;</span></p>
            </div>
            <div className="flex items-center gap-3 text-sm text-blue-800">
              <span className="bg-blue-100 rounded-lg w-7 h-7 flex items-center justify-center font-black text-xs">3</span>
              <p>Tap <span className="font-bold">&quot;Add&quot;</span></p>
            </div>
          </div>
        ) : (
          /* Android / Chrome install button */
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No app store needed</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Fast &amp; lightweight</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-2xl font-bold text-slate-500 bg-slate-100 active:scale-95 transition-transform"
          >
            Later
          </button>
          {!isIOS && (
            <button
              type="button"
              onClick={handleInstall}
              className="flex-[2] py-3 rounded-2xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
            >
              Install App
            </button>
          )}
          {isIOS && (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-[2] py-3 rounded-2xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
