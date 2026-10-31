import { PRESETS, type BusinessProfile } from "@/lib/business";

const BUSINESS_KEY = "calldesk.businesses.v1";
const ACTIVE_KEY = "calldesk.activeBusinessId.v1";
const LOG_KEY = "calldesk.callLog.v1";

export type CallLogEntry = {
  id: string;
  businessId: string;
  businessName: string;
  at: number;
  turns: { role: "caller" | "desk"; text: string }[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Two starter examples so the home screen isn’t empty on first visit. */
export function exampleBusinesses(): BusinessProfile[] {
  const cafe = PRESETS.find((p) => p.id === "preset-cafe")!;
  const clinic = PRESETS.find((p) => p.id === "preset-clinic")!;
  return [
    { ...structuredClone(cafe), id: "example-harbor-roast" },
    { ...structuredClone(clinic), id: "example-northside-clinic" },
  ];
}

export function loadBusinesses(): BusinessProfile[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    // First visit — seed two example businesses.
    if (raw === null) {
      const examples = exampleBusinesses();
      localStorage.setItem(BUSINESS_KEY, JSON.stringify(examples));
      localStorage.setItem(ACTIVE_KEY, examples[0].id);
      return examples;
    }

    const parsed = raw ? (JSON.parse(raw) as BusinessProfile[]) : [];
    const list = Array.isArray(parsed) ? parsed : [];

    // Keep both examples present even if one was removed earlier.
    const examples = exampleBusinesses();
    let changed = false;
    for (const example of examples) {
      if (!list.some((b) => b.id === example.id)) {
        list.push(example);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(BUSINESS_KEY, JSON.stringify(list));
      if (!localStorage.getItem(ACTIVE_KEY)) {
        localStorage.setItem(ACTIVE_KEY, examples[0].id);
      }
    }
    return list;
  } catch {
    return exampleBusinesses();
  }
}

export function saveBusinesses(list: BusinessProfile[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(BUSINESS_KEY, JSON.stringify(list));
}

export function upsertBusiness(business: BusinessProfile) {
  const list = loadBusinesses();
  const idx = list.findIndex((b) => b.id === business.id);
  if (idx >= 0) list[idx] = business;
  else list.unshift(business);
  saveBusinesses(list);
  setActiveBusinessId(business.id);
  return business;
}

export function getActiveBusinessId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveBusinessId(id: string | null) {
  if (!canUseStorage()) return;
  if (!id) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveBusiness(): BusinessProfile | null {
  const id = getActiveBusinessId();
  if (!id) return null;
  return loadBusinesses().find((b) => b.id === id) ?? null;
}

export function loadCallLog(): CallLogEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CallLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addCallLog(entry: CallLogEntry) {
  if (!canUseStorage()) return;
  const list = [entry, ...loadCallLog()].slice(0, 40);
  localStorage.setItem(LOG_KEY, JSON.stringify(list));
}
