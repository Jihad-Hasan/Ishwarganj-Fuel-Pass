import {
  doc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocsFromServer,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { FuelLog, EligibilityResult } from "./types";

const COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours

// Bangla digit → English digit mapping
const BANGLA_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

// Convert Bangla digits to English for consistent DB keys
function banglaToEnglishDigits(str: string): string {
  return str.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] || d);
}

// Normalize plate for Firestore doc ID (consistent key for both Bangla & English input)
function normalizePlate(plate: string): string {
  return banglaToEnglishDigits(plate)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0980-\u09FF\-]/g, ""); // keep Bangla chars, English, digits, hyphens
}

export async function checkEligibility(
  plateNumber: string
): Promise<EligibilityResult> {
  const docId = normalizePlate(plateNumber);
  const docRef = doc(getDb(), "fuel_logs", docId);
  const snap = await getDocFromServer(docRef);

  if (!snap.exists()) {
    return { eligible: true, remainingMs: 0, lastPump: null, lastTimestamp: null };
  }

  const data = snap.data() as FuelLog;
  const elapsed = Date.now() - data.timestamp;

  if (elapsed < COOLDOWN_MS) {
    return {
      eligible: false,
      remainingMs: COOLDOWN_MS - elapsed,
      lastPump: data.pumpName,
      lastTimestamp: data.timestamp,
    };
  }

  return { eligible: true, remainingMs: 0, lastPump: null, lastTimestamp: null };
}

// Convert photo to compressed base64 data URL (stored directly in Firestore)
export async function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function confirmRefuel(
  plateNumber: string,
  pumpName: string,
  staffEmail: string,
  photoData: string,
  vehicleType: FuelLog["vehicleType"]
): Promise<void> {
  const docId = normalizePlate(plateNumber);

  const log: FuelLog = {
    plateNumber: plateNumber.trim(), // Keep original Bangla display form
    pumpName,
    staffEmail,
    timestamp: Date.now(),
    photoUrl: photoData,
    vehicleType,
  };

  await setDoc(doc(getDb(), "fuel_logs", docId), log);
  await setDoc(doc(collection(getDb(), "fuel_history"), `${docId}_${Date.now()}`), log);
}

export async function getRecentRefuels(count: number = 50): Promise<FuelLog[]> {
  const q = query(
    collection(getDb(), "fuel_history"),
    orderBy("timestamp", "desc"),
    limit(count)
  );
  const snap = await getDocsFromServer(q);
  return snap.docs.map((d) => d.data() as FuelLog);
}

export function formatRemainingTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
