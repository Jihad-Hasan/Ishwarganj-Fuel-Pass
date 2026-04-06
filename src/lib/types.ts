export interface FuelLog {
  plateNumber: string;
  pumpName: string;
  staffEmail: string;
  timestamp: number; // Unix ms
  photoUrl: string;
  vehicleType: "motorcycle" | "car" | "cng" | "other";
}

export interface EligibilityResult {
  eligible: boolean;
  remainingMs: number; // 0 if eligible
  lastPump: string | null;
  lastTimestamp: number | null;
}

export interface PumpStation {
  id: string;
  name: string;
  location: string;
}

// Firestore schema:
// Collection: fuel_logs
//   Document ID: plate_number (e.g., "dhaka-metro-ha-1234")
//   Fields: { plateNumber, pumpName, staffEmail, timestamp, photoUrl, vehicleType }
//
// Collection: pumps
//   Document ID: auto
//   Fields: { name, location }
