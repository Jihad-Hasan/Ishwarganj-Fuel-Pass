import { supabase } from "./supabase";
import { BANGLA_TO_ENGLISH_REGION, ENGLISH_TO_BANGLA_REGION } from "./plate-regions";
import type { FuelLog, EligibilityResult } from "./types";

const COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours

const BANGLA_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

// Bangla consonants/vowels used as vehicle class letters on plates
const BANGLA_LETTERS: Record<string, string> = {
  "ক": "ka", "খ": "kha", "গ": "ga", "ঘ": "gha",
  "চ": "cha", "ছ": "chha", "জ": "ja", "ঝ": "jha",
  "ট": "ta", "ঠ": "tha", "ড": "da", "ঢ": "dha",
  "ণ": "na", "ত": "to", "থ": "tho", "দ": "do", "ধ": "dho", "ন": "no",
  "প": "pa", "ফ": "fa", "ব": "ba", "ভ": "bha", "ম": "ma",
  "য": "ya", "র": "ra", "ল": "la", "শ": "sha", "ষ": "sho", "স": "sa", "হ": "ha",
  "এ": "e", "ই": "i", "উ": "u", "অ": "a",
};

function banglaToEnglish(str: string): string {
  // 1. Digits
  let result = str.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] || d);
  // 2. Region names (longest first)
  for (const [bangla, english] of BANGLA_TO_ENGLISH_REGION) {
    result = result.replace(bangla, english);
  }
  // 3. Remaining Bangla letters (class letters like ল, গ, etc.)
  result = result.replace(/[\u0980-\u09FF]/g, (ch) => BANGLA_LETTERS[ch] || "");
  return result;
}

export function normalizePlate(plate: string): string {
  return banglaToEnglish(plate)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Convert English region names back to Bangla for display/storage
// "Dhaka Metro la 61-5041" → "ঢাকা মেট্রো la 61-5041"
export function toBanglaDisplay(plate: string): string {
  let result = plate;
  for (const [english, bangla] of ENGLISH_TO_BANGLA_REGION) {
    const regex = new RegExp(english, "i");
    result = result.replace(regex, bangla);
  }
  return result.trim();
}

export async function checkEligibility(
  plateNumber: string
): Promise<EligibilityResult> {
  const docId = normalizePlate(plateNumber);
  
  // Select single row from Supabase
  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*")
    .eq("id", docId)
    .single();

  // PGRST116 is Supabase's error code for "no rows returned", which is fine for new vehicles
  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    return { eligible: true, remainingMs: 0, lastPump: null, lastTimestamp: null };
  }

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

export async function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read photo file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.5));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function getRecentRefuels(page: number = 0, perPage: number = 20): Promise<{ logs: FuelLog[]; hasMore: boolean }> {
  const from = page * perPage;
  const to = from + perPage;

  const { data, error } = await supabase
    .from("fuel_history")
    .select("id, plateNumber, pumpName, staffEmail, timestamp, vehicleType, scheduledTime, timeSlot")
    .order("timestamp", { ascending: false })
    .range(from, to);

  if (error) throw error;
  const logs = (data || []).map((d) => ({ ...d, photoUrl: "" })) as FuelLog[];
  return { logs: logs.slice(0, perPage), hasMore: logs.length > perPage };
}

export function formatRemainingTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

// ৩ দিন পর অটো শিডিউল এবং স্লট ক্যালকুলেট করার ফাংশন
function getNextSchedule() {
  const now = new Date();
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + 3); // ঠিক ৩ দিন পর

  const hour = now.getHours();
  let slot = "";

  // মালিকদের নির্ধারিত সময় অনুযায়ী স্লট বিভাজন
  if (hour >= 10 && hour < 13) slot = "10:00 AM - 01:00 PM";
  else if (hour >= 14 && hour < 18) slot = "02:00 PM - 06:00 PM";
  else if (hour >= 18 && hour < 22) slot = "06:00 PM - 10:00 PM";
  else slot = "General Slot (Next Available)";

  return { nextDate, slot };
}

export async function confirmRefuel(
  plateNumber: string,
  pumpName: string,
  staffEmail: string,
  photoData: string,
  vehicleType: FuelLog["vehicleType"]
): Promise<void> {
  const docId = normalizePlate(plateNumber);
  const { nextDate, slot } = getNextSchedule(); // নতুন শিডিউল তৈরি

  const log = {
    id: docId,
    plateNumber: toBanglaDisplay(plateNumber),
    pumpName,
    staffEmail,
    timestamp: Date.now(),
    photoUrl: photoData,
    vehicleType,
    scheduledTime: nextDate.toISOString(), // ডাটাবেসে সেভ হবে
    timeSlot: slot
  };

  const { error: logsError } = await supabase.from("fuel_logs").upsert(log);
  if (logsError) throw logsError;

  const historyLog = { ...log, id: `${docId}_${Date.now()}` };
  const { error: historyError } = await supabase.from("fuel_history").insert(historyLog);
  if (historyError) throw historyError;
}