/**
 * memory-provider-registry.mjs -- discovery + aggregate surface over the MemoryProvider ABC.
 *
 * AGENTIC-SUBSTRATE-BRIDGE/U-MEM-PROVIDER-REGISTRY-WIRE (slot:bravo 2026-06-14).
 *
 * U-MWO05 (2026-05-26) shipped the MemoryProvider ABC + 3 first-party concrete providers
 * (obsidian-feed, obsidian-receipt, prism-kg) as the Hermes-Memory-Guidebook plug-in surface --
 * but they were standalone classes with NO discovery layer and NO live consumer (verified orphan
 * 2026-06-14: grep for importers returned only transcripts). This registry is the missing entry
 * point: it registers conformant providers, exposes get/list, and aggregates stats across them.
 * It gives the dormant-but-real framework a live consumer (R15) and a single seam any future
 * Hermes plug-in (Reflexion/MemGPT/MemoryBank/...) plugs into.
 *
 * CONFORMANCE: a provider is registered ONLY if it implements the full ABC contract
 * (validateContract); non-conformant providers are SKIPPED and RECORDED (never silently dropped).
 *
 * Pure / DI-friendly (pass `providers` for hermetic tests). No top-level side effects.
 *
 * @module scripts/memory-providers/memory-provider-registry
 */

import { ObsidianFeedProvider } from "./obsidian-feed-provider.mjs";
import { ObsidianReceiptProvider } from "./obsidian-receipt-provider.mjs";
import { PrismKGProvider } from "./prism-kg-provider.mjs";
import { MemoryProvider, validateContract } from "./memory-provider-abc.mjs";

/** Instantiate the default first-party provider set (production defaults). */
export function defaultProviders() {
  return [new ObsidianFeedProvider(), new ObsidianReceiptProvider(), new PrismKGProvider()];
}

/**
 * Build a registry from a provider list. Registers only ABC-conformant providers;
 * non-conformant ones are recorded in `skipped` (R12 -- never silently dropped).
 * @param {object[]} [providers]
 * @returns {{registry: Map<string,object>, skipped: {name:string, missing:string[]}[]}}
 */
export function buildRegistry(providers = defaultProviders()) {
  const registry = new Map();
  const skipped = [];
  for (const p of providers ?? []) {
    const { ok, missing } = validateContract(p, MemoryProvider.requiredMethods);
    let name;
    try { name = p.providerName(); } catch { name = "(unnamed)"; }
    if (ok) registry.set(name, p);
    else skipped.push({ name, missing });
  }
  return { registry, skipped };
}

/** Registered provider names. */
export function listProviders(registry) {
  return registry ? [...registry.keys()] : [];
}

/** Get a registered provider by name, or null. */
export function getProvider(registry, name) {
  return (registry && registry.get(name)) || null;
}

/**
 * Aggregate stats() across every registered provider. Fail-soft per provider: a provider whose
 * stats() throws contributes an {name, error} row and does NOT break the others.
 * NOTE on `combined*`: it is a NAIVE SUM across providers. Providers that share a read source
 * (obsidian-feed and obsidian-receipt both read the auto-memory dir) WILL double-count -- the
 * per-provider `providers[]` rows are the honest view; `combined*` is a rough upper bound.
 * @param {Map<string,object>} registry
 * @returns {Promise<{providers:object[], combinedCount:number, combinedBytes:number, providerCount:number}>}
 */
export async function aggregateStats(registry) {
  const providers = [];
  let combinedCount = 0;
  let combinedBytes = 0;
  for (const [name, p] of (registry ? registry.entries() : [])) {
    try {
      const s = await p.stats();
      const count = Number.isFinite(s?.count) ? s.count : 0;
      const totalBytes = Number.isFinite(s?.totalBytes) ? s.totalBytes : 0;
      providers.push({ name, count, totalBytes, lastSync: s?.lastSync ?? null });
      combinedCount += count;
      combinedBytes += totalBytes;
    } catch (e) {
      providers.push({ name, error: String((e && e.message) || e) });
    }
  }
  providers.sort((a, b) => (b.count || 0) - (a.count || 0));
  // combinedNote travels WITH the data (R12) so a JSON consumer reading only combinedCount/Bytes
  // -- without the text-report caveat -- still sees that the sum is naive (shared-source double-count).
  return {
    providers,
    combinedCount,
    combinedBytes,
    providerCount: providers.length,
    combinedNote: "naive sum across providers; providers sharing a read source (e.g. obsidian-feed/receipt) double-count -- per-provider rows are authoritative",
  };
}
