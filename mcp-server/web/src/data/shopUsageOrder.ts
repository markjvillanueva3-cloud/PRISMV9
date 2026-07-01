// shopUsageOrder.ts -- order the JM machine fleet by REAL shop usage.
//
// The backend bridge (scripts/jm-shop-knowledge-to-vault.mjs) distills the
// 38,251-file JM document corpus into /jm-shop-profile.json (served from
// public/). This module maps each MachineEntry to a usage weight from that
// profile so the UI can present machine workflows in the order the shop actually
// runs them (lathe/Okuma-dominant), instead of a fixed hand-ordered list.
//
// Pure + fail-soft: if the profile is missing/empty, ordering is a stable no-op
// (original order preserved, weight 0) so the UI never breaks on a fetch failure.
import type { MachineEntry } from "./machines";

export interface ShopProfileMachine {
  id: string;
  files: number;
  pct: number;
}

export interface ShopProfile {
  schemaVersion: string;
  generatedAt: string;
  totalFiles: number;
  machines: ShopProfileMachine[];
  kinds?: Array<{ id: string; files: number; pct: number }>;
  note?: string;
}

export interface RankedMachine {
  machine: MachineEntry;
  usageWeight: number;
  rank: number;
}

// Map a profile machine-category id -> predicate over a MachineEntry. A machine's
// usage weight is the sum of `files` across every category it matches, so an Okuma
// lathe accrues both the "lathe" and "okuma" volume (correctly the busiest).
const CATEGORY_MATCH: Record<string, (m: MachineEntry) => boolean> = {
  lathe: (m) => m.type === "Lathe" || m.type === "Mill-Turn",
  okuma: (m) => m.manufacturer.toLowerCase().includes("okuma"),
  okuma_multus: (m) => /multus/i.test(m.name),
  mill_haas: (m) => m.manufacturer.toLowerCase().includes("haas"),
  roku_roku: (m) => m.manufacturer.toLowerCase().includes("roku"),
  mill_mixed: (m) => m.type === "VMC" || m.type === "5-Axis",
};

/** Sum the profile file-volume of every category this machine belongs to. */
export function machineUsageWeight(machine: MachineEntry, profile: ShopProfile | null): number {
  if (!profile?.machines?.length) return 0;
  let weight = 0;
  for (const pm of profile.machines) {
    const match = CATEGORY_MATCH[pm.id];
    if (match && match(machine)) weight += pm.files;
  }
  return weight;
}

/**
 * Return the machines ordered by descending real shop usage. Stable for ties
 * (preserves input order). Empty/absent profile -> original order, weight 0.
 */
export function orderMachinesByShopUsage(machines: MachineEntry[], profile: ShopProfile | null): RankedMachine[] {
  const scored = machines.map((machine, i) => ({ machine, usageWeight: machineUsageWeight(machine, profile), i }));
  scored.sort((a, b) => (b.usageWeight - a.usageWeight) || (a.i - b.i));
  return scored.map(({ machine, usageWeight }, rank) => ({ machine, usageWeight, rank }));
}

/** Fetch the served shop profile. Fail-soft: any error -> null (UI falls back to fixed order). */
export async function fetchShopProfile(): Promise<ShopProfile | null> {
  try {
    const res = await fetch("/jm-shop-profile.json", { cache: "no-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as ShopProfile;
    return Array.isArray(data?.machines) ? data : null;
  } catch {
    return null;
  }
}
