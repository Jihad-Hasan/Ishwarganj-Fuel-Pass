"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Small inline install button — meant to be placed directly on a page
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

  // Already installed — hide button
  if (isInstalled) return null;

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={() => {
          if (isIOS) {
            setShowIOSTip((v) => !v);
          } else if (deferredPrompt) {
            handleInstall();
          }
        }}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="font-bold text-sm">Install App</span>
      </button>

      {/* iOS instructions tooltip */}
      {isIOS && showIOSTip && (
        <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-3">
          <p className="text-xs text-slate-600">
            Tap <span className="font-bold">Share</span> ↑ at the bottom, then tap <span className="font-bold">&quot;Add to Home Screen&quot;</span>
          </p>
        </div>
      )}
    </div>
  );
}
