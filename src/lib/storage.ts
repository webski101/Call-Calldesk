import type { BusinessProfile } from "@/lib/business";

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

export function loadBusinesses(): BusinessProfile[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BusinessProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

export function deleteBusiness(id: string) {
  const list = loadBusinesses().filter((b) => b.id !== id);
  saveBusinesses(list);
  if (getActiveBusinessId() === id) {
    setActiveBusinessId(list[0]?.id ?? null);
  }
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
