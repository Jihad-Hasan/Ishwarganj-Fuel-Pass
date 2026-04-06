export interface FuelLog {
  plateNumber: string;
  pumpName: string;
  staffEmail: string;
  timestamp: number; // Unix ms
  photoUrl: string;
  vehicleType: "motorcycle" | "car";
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

// Supabase tables:
// Table: fuel_logs — latest refuel per vehicle (upserted by normalized plate id)
//   Columns: id, plateNumber, pumpName, staffEmail, timestamp, photoUrl, vehicleType, scheduledTime, timeSlot
// Table: fuel_history — all refuel records (inserted each time)
//   Columns: id (docId_timestamp), plateNumber, pumpName, staffEmail, timestamp, photoUrl, vehicleType, scheduledTime, timeSlot
