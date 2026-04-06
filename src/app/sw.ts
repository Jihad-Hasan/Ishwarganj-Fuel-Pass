import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, NetworkOnly } from "serwist"; // <-- Imported NetworkOnly here

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// 1. Define custom caching rules to fix Firebase "offline" error
const customCaching: RuntimeCaching[] = [
  {
    // Force Firebase, Firestore, and Next.js APIs to bypass the cache
    matcher: ({ url }) => {
      return (
        url.hostname.includes("googleapis.com") ||
        url.hostname.includes("firebase") ||
        url.hostname.includes("firestore") ||
        url.pathname.startsWith("/api/") 
      );
    },
    handler: new NetworkOnly(), // <-- Fixed: Now using the Serwist class instance
  },
  // 2. Spread the default cache for images, CSS, JS, etc.
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customCaching,
});

serwist.addEventListeners();