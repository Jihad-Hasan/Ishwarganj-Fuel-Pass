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
          if (isIOS) {
            setShowIOSTip((v) => !v);
          } else if (deferredPrompt) {
            handleInstall();
          }
        }}
        className="w-full py-2 bg-[#1e3a5f] text-white flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="font-semibold text-xs">Install App</span>
      </button>

      {isIOS && showIOSTip && (
        <div className="bg-blue-50 px-4 py-2 text-center">
          <p className="text-xs text-blue-800">
            Tap <span className="font-bold">Share</span> ↑ then <span className="font-bold">&quot;Add to Home Screen&quot;</span>
          </p>
        </div>
      )}
    </>
  );
}
