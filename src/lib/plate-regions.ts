export const PLATE_REGIONS = [
  // Metros (only Dhaka & Chattogram)
  "ঢাকা মেট্রো",
  "চট্টগ্রাম মেট্রো",
  // Divisions & Districts
  "ঢাকা",
  "চট্টগ্রাম",
  "রাজশাহী",
  "খুলনা",
  "সিলেট",
  "বরিশাল",
  "রংপুর",
  "ময়মনসিংহ",
  "কুমিল্লা",
  "গাজীপুর",
  "নারায়ণগঞ্জ",
  "টাঙ্গাইল",
  "ফরিদপুর",
  "মানিকগঞ্জ",
  "মুন্সীগঞ্জ",
  "গোপালগঞ্জ",
  "কিশোরগঞ্জ",
  "নরসিংদী",
  "শরীয়তপুর",
  "মাদারীপুর",
  "রাজবাড়ী",
  "নেত্রকোনা",
  "জামালপুর",
  "শেরপুর",
  "কক্সবাজার",
  "রাঙ্গামাটি",
  "বান্দরবান",
  "খাগড়াছড়ি",
  "ফেনী",
  "লক্ষ্মীপুর",
  "নোয়াখালী",
  "চাঁদপুর",
  "ব্রাহ্মণবাড়িয়া",
  "বগুড়া",
  "পাবনা",
  "নওগাঁ",
  "নাটোর",
  "সিরাজগঞ্জ",
  "চাঁপাইনবাবগঞ্জ",
  "জয়পুরহাট",
  "যশোর",
  "সাতক্ষীরা",
  "ঝিনাইদহ",
  "নড়াইল",
  "কুষ্টিয়া",
  "মেহেরপুর",
  "চুয়াডাঙ্গা",
  "মাগুরা",
  "বাগেরহাট",
  "হবিগঞ্জ",
  "মৌলভীবাজার",
  "সুনামগঞ্জ",
  "পটুয়াখালী",
  "পিরোজপুর",
  "ভোলা",
  "ঝালকাঠি",
  "বরগুনা",
  "দিনাজপুর",
  "ঠাকুরগাঁও",
  "পঞ্চগড়",
  "নীলফামারী",
  "কুড়িগ্রাম",
  "লালমনিরহাট",
  "গাইবান্ধা",
] as const;

// Validate plate rest format: {Bangla letter} {2 digits}-{4 digits}
// Accepts both Bangla (০-৯) and English (0-9) digits
// Example valid: ল ৬১-৫০৪১, গ 50-2033
export function isValidPlateRest(plateRest: string): boolean {
  const pattern = /^[\u0995-\u09B9\u0985-\u0994] [\d০-৯]{2}-[\d০-৯]{4}$/;
  return pattern.test(plateRest.trim());
}

// Extract region from a full OCR plate string
// e.g. "ময়মনসিংহ-ল ১২-৯৮৪৪" → { region: "ময়মনসিংহ", rest: "ল ১২-৯৮৪৪" }
// e.g. "ঢাকা মেট্রো-ল ৬১-৫০৪১" → { region: "ঢাকা মেট্রো", rest: "ল ৬১-৫০৪১" }
export function extractRegion(plate: string): { region: string; rest: string } {
  // Normalize: remove hyphens/dashes between region and rest, keep spaces
  // OCR may return "ময়মনসিংহ-ল ১২-৯৮৪৪" or "ময়মনসিংহ ল ১২-৯৮৪৪"
  const trimmed = plate.trim();

  // Try matching longest regions first (e.g. "ঢাকা মেট্রো" before "ঢাকা")
  const sorted = [...PLATE_REGIONS].sort((a, b) => b.length - a.length);

  for (const r of sorted) {
    // Check if plate starts with region name (with or without separator after)
    const regionPattern = new RegExp(`^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\-]*`);
    const match = trimmed.match(regionPattern);
    if (match) {
      const rest = trimmed.slice(match[0].length).trim();
      return { region: r, rest };
    }
  }

  // No region found — return everything as rest
  return { region: "", rest: trimmed };
}

// English → Bangla mapping for converting display plateNumber back to Bangla
// Longest first to avoid partial match (e.g. "Dhaka Metro" before "Dhaka")
export const ENGLISH_TO_BANGLA_REGION: [string, string][] = [
  ["Dhaka Metro", "ঢাকা মেট্রো"],
  ["Chattogram Metro", "চট্টগ্রাম মেট্রো"],
  ["Narayanganj", "নারায়ণগঞ্জ"],
  ["Chapainawabganj", "চাঁপাইনবাবগঞ্জ"],
  ["Brahmanbaria", "ব্রাহ্মণবাড়িয়া"],
  ["Moulvibazar", "মৌলভীবাজার"],
  ["Lalmonirhat", "লালমনিরহাট"],
  ["Khagrachhari", "খাগড়াছড়ি"],
  ["Kishoreganj", "কিশোরগঞ্জ"],
  ["Patuakhali", "পটুয়াখালী"],
  ["Chuadanga", "চুয়াডাঙ্গা"],
  ["Nilphamari", "নীলফামারী"],
  ["Mymensingh", "ময়মনসিংহ"],
  ["Shariatpur", "শরীয়তপুর"],
  ["Joypurhat", "জয়পুরহাট"],
  ["Sunamganj", "সুনামগঞ্জ"],
  ["Thakurgaon", "ঠাকুরগাঁও"],
  ["Sirajganj", "সিরাজগঞ্জ"],
  ["Chattogram", "চট্টগ্রাম"],
  ["Gopalganj", "গোপালগঞ্জ"],
  ["Noakhali", "নোয়াখালী"],
  ["Lakshmipur", "লক্ষ্মীপুর"],
  ["Cox's Bazar", "কক্সবাজার"],
  ["Manikganj", "মানিকগঞ্জ"],
  ["Munshiganj", "মুন্সীগঞ্জ"],
  ["Kurigram", "কুড়িগ্রাম"],
  ["Gaibandha", "গাইবান্ধা"],
  ["Rangamati", "রাঙ্গামাটি"],
  ["Pirojpur", "পিরোজপুর"],
  ["Madaripur", "মাদারীপুর"],
  ["Satkhira", "সাতক্ষীরা"],
  ["Jhalokati", "ঝালকাঠি"],
  ["Narsingdi", "নরসিংদী"],
  ["Faridpur", "ফরিদপুর"],
  ["Dinajpur", "দিনাজপুর"],
  ["Meherpur", "মেহেরপুর"],
  ["Bandarban", "বান্দরবান"],
  ["Habiganj", "হবিগঞ্জ"],
  ["Netrokona", "নেত্রকোনা"],
  ["Jamalpur", "জামালপুর"],
  ["Jhenaidah", "ঝিনাইদহ"],
  ["Bagerhat", "বাগেরহাট"],
  ["Panchagarh", "পঞ্চগড়"],
  ["Tangail", "টাঙ্গাইল"],
  ["Rajshahi", "রাজশাহী"],
  ["Rajbari", "রাজবাড়ী"],
  ["Kushtia", "কুষ্টিয়া"],
  ["Comilla", "কুমিল্লা"],
  ["Gazipur", "গাজীপুর"],
  ["Barishal", "বরিশাল"],
  ["Chandpur", "চাঁদপুর"],
  ["Barguna", "বরগুনা"],
  ["Sherpur", "শেরপুর"],
  ["Narail", "নড়াইল"],
  ["Magura", "মাগুরা"],
  ["Rangpur", "রংপুর"],
  ["Sylhet", "সিলেট"],
  ["Khulna", "খুলনা"],
  ["Bogura", "বগুড়া"],
  ["Pabna", "পাবনা"],
  ["Naogaon", "নওগাঁ"],
  ["Natore", "নাটোর"],
  ["Jessore", "যশোর"],
  ["Bhola", "ভোলা"],
  ["Feni", "ফেনী"],
  ["Dhaka", "ঢাকা"],
];

// Bangla → English mapping (longest first to avoid partial match)
// Used by normalizePlate so OCR Bangla and manual English produce the same ID
export const BANGLA_TO_ENGLISH_REGION: [string, string][] = [
  // Metros first (longer, must match before bare city names)
  ["ঢাকা মেট্রো", "dhaka metro"],
  ["চট্টগ্রাম মেট্রো", "chattogram metro"],
  // Districts / Divisions
  ["নারায়ণগঞ্জ", "narayanganj"],
  ["চাঁপাইনবাবগঞ্জ", "chapainawabganj"],
  ["ব্রাহ্মণবাড���িয়া", "brahmanbaria"],
  ["মৌলভীবাজার", "moulvibazar"],
  ["লালমনিরহাট", "lalmonirhat"],
  ["খাগড়াছড়ি", "khagrachhari"],
  ["কিশোরগঞ্জ", "kishoreganj"],
  ["পটুয়াখালী", "patuakhali"],
  ["চুয়াডাঙ্গা", "chuadanga"],
  ["নীলফামারী", "nilphamari"],
  ["ময়মনসিংহ", "mymensingh"],
  ["শরীয়তপুর", "shariatpur"],
  ["জয়পুরহাট", "joypurhat"],
  ["সুনামগঞ্জ", "sunamganj"],
  ["ঠাকুরগাঁও", "thakurgaon"],
  ["সিরাজগঞ্জ", "sirajganj"],
  ["চট্টগ্রাম", "chattogram"],
  ["গোপালগঞ্জ", "gopalganj"],
  ["নোয়াখালী", "noakhali"],
  ["লক���ষ্মীপ��র", "lakshmipur"],
  ["কক্সবাজার", "coxs bazar"],
  ["মানিকগঞ্জ", "manikganj"],
  ["মুন্সীগঞ্জ", "munshiganj"],
  ["কুড়িগ্রাম", "kurigram"],
  ["গাইবান্ধা", "gaibandha"],
  ["রাঙ্গামাটি", "rangamati"],
  ["পিরোজপুর", "pirojpur"],
  ["মাদারীপুর", "madaripur"],
  ["সাতক্ষীরা", "satkhira"],
  ["ঝালকাঠি", "jhalokati"],
  ["নরসিংদী", "narsingdi"],
  ["ফরিদপুর", "faridpur"],
  ["দিনাজপুর", "dinajpur"],
  ["মেহেরপুর", "meherpur"],
  ["বান্দরবান", "bandarban"],
  ["হবিগঞ্জ", "habiganj"],
  ["নেত্রকোনা", "netrokona"],
  ["জামালপুর", "jamalpur"],
  ["ঝিনাইদহ", "jhenaidah"],
  ["বাগেরহাট", "bagerhat"],
  ["পঞ্চগড়", "panchagarh"],
  ["টাঙ্গাইল", "tangail"],
  ["রাজশাহী", "rajshahi"],
  ["রাজবাড়���", "rajbari"],
  ["কুষ্টিয়া", "kushtia"],
  ["কুমিল্লা", "comilla"],
  ["গাজীপুর", "gazipur"],
  ["বরিশাল", "barishal"],
  ["চাঁদপুর", "chandpur"],
  ["বরগুনা", "barguna"],
  ["শেরপুর", "sherpur"],
  ["নড়াইল", "narail"],
  ["মাগুরা", "magura"],
  ["রংপুর", "rangpur"],
  ["সিলেট", "sylhet"],
  ["খুলনা", "khulna"],
  ["বগুড়া", "bogura"],
  ["পাবনা", "pabna"],
  ["নওগাঁ", "naogaon"],
  ["নাটোর", "natore"],
  ["যশোর", "jessore"],
  ["ভোলা", "bhola"],
  ["ফেনী", "feni"],
  ["ঢাকা", "dhaka"],
];
