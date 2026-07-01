#!/usr/bin/env node
/**
 * build-machine-shop-network.mjs — feeds the EXISTING ShopNetworkEngine (VENDOR-NETWORK-MS0, slot:charlie).
 *
 * R8 — DO NOT DUPLICATE. The machine-shop outsourcing network ENGINE already exists and is wired:
 *   `ShopNetworkEngine` (E1134, CAMX-MS21/U02) · singleton `shopNetworkEngine` ·
 *   camDispatcher actions: shop_network_register / shop_network_search / shop_network_broadcast /
 *   shop_network_stats. It owns the ShopProfile schema, capability scoring, distance search, and the
 *   NDA privacy model. Registration + search + broadcast are the ENGINE's job — this script does NOT
 *   reimplement them.
 *
 * THE GAP this fills (what the engine lacks): the engine is in-memory (registered shops vanish on
 * restart — no persistent seed) and has no external-capacity layer. This script provides the two
 * honest data layers the engine needs to become useful for the operator's "network of machine shops":
 *   1. MARKETPLACE ACCESS POINTS — Xometry/Protolabs/Fictiv/Hubs/MFG/Thomasnet: how PRISM reaches
 *      EXTERNAL shop capacity (as a buyer). These are real, verifiable platforms — not shops.
 *   2. ONBOARDING VALIDATOR — toShopProfile(partial) maps a shop's submitted data to the engine's
 *      ShopProfile contract and reports MISSING required fields, so onboarding gathers real data
 *      before shopNetworkEngine.registerShop() is called.
 *
 * R12 — no fabricated members: Xometry/Protolabs supplier networks are PROPRIETARY (not enumerable),
 * and a shop's machine travels / capacity-hours / certifications are real facts that must come from
 * onboarding, not be guessed. This script ships the access points + the validator + the documented
 * population strategy — it never invents a shop record.
 *
 * Usage: node scripts/build-machine-shop-network.mjs [--out-dir <dir>]
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const OUT_DIR = join(PRISM_ROOT, "state/shared/quoting");

/** ShopProfile REQUIRED fields, mirrored from ShopNetworkEngine.ts (KEEP-IN-SYNC — the onboarding
 *  validator gates on these so registerShop() never gets an incomplete profile). */
export const SHOP_PROFILE_REQUIRED = ["name", "location", "machines", "certifications", "capacity_hours_per_week"];
/** Certifications the engine recognizes (mirror of ShopNetworkEngine Certification union; extra strings allowed). */
export const KNOWN_CERTS = ["ISO_9001", "AS9100", "ITAR", "NADCAP", "ISO_13485", "IATF_16949"];
/** PRISM process name → ShopNetworkEngine ShopMachine.type (the engine keys capability scoring on type). */
export const PROCESS_TO_MACHINE_TYPE = {
  "mill-3axis": "milling", "mill-5axis": "milling", turn: "turning", "turn-mill": "turning",
  swiss: "turning", "wire-edm": "EDM", "sinker-edm": "EDM", "surface-grind": "grinding",
  "jig-grind": "grinding", "od-id-grind": "grinding", laser: "laser", waterjet: "waterjet",
  "sheet-metal": "fabrication", fabrication: "fabrication",
};

/**
 * MARKETPLACE ACCESS POINTS — real outsourcing platforms PRISM reaches external capacity through.
 * access: "api" (programmatic instant quote/route) | "rfq" (post-and-bid) | "directory" (lookup only).
 */
export const MARKETPLACES = [
  { name: "Xometry", website: "https://www.xometry.com", access: "api", routes: ["milling", "turning", "fabrication", "additive", "injection-mold"], note: "Instant Quoting Engine API; largest US on-demand network." },
  { name: "Protolabs", website: "https://www.protolabs.com", access: "api", routes: ["milling", "turning", "fabrication", "additive", "injection-mold"], note: "Digital quoting; fast-turn CNC/IM/3DP." },
  { name: "Fictiv", website: "https://www.fictiv.com", access: "api", routes: ["milling", "turning", "fabrication", "injection-mold"], note: "Managed manufacturing network." },
  { name: "Hubs (Protolabs Network)", website: "https://www.hubs.com", access: "api", routes: ["milling", "turning", "fabrication", "additive"], note: "Distributed manufacturing network." },
  { name: "MFG.com", website: "https://www.mfg.com", access: "rfq", routes: ["milling", "turning", "EDM", "fabrication"], note: "RFQ marketplace — post a job, shops bid." },
  { name: "Thomasnet", website: "https://www.thomasnet.com", access: "directory", routes: ["*"], note: "~500k US manufacturer directory — candidate-shop discovery source." },
];

/** Normalize a shop name → stable id. Pure. */
export function normalizeShopId(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|llc|ltd|co|corp|company|incorporated|mfg|manufacturing|machine|machining|shop|industries|industrial|precision|tool|die)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Map a partial shop submission → the engine's ShopProfile contract, reporting MISSING required fields.
 * Pure. Returns {ok:true, profile} when complete, else {ok:false, missing:[...], profile} (partial).
 * NEVER fabricates a missing required value — onboarding must supply it before registerShop().
 * Accepts PRISM process names (mill-3axis, wire-edm, ...) and maps them to ShopMachine.type.
 */
export function toShopProfile(partial) {
  const p = partial && typeof partial === "object" ? partial : {};
  const machines = Array.isArray(p.machines) ? p.machines.map((m) => {
    if (m && typeof m === "object" && m.type) return m; // already a ShopMachine
    const proc = typeof m === "string" ? m : (m && m.process);
    return { name: (m && m.name) || proc || "machine", type: PROCESS_TO_MACHINE_TYPE[proc] || "milling",
      axes: (m && m.axes) || (proc === "mill-5axis" ? 5 : proc === "turn" ? 2 : 3),
      travel_x_mm: (m && m.travel_x_mm) ?? null, travel_y_mm: (m && m.travel_y_mm) ?? null, travel_z_mm: (m && m.travel_z_mm) ?? null };
  }) : [];
  const certifications = Array.isArray(p.certifications) ? p.certifications : [];
  const profile = {
    name: p.name || null,
    location: p.location && typeof p.location === "object" ? { city: p.location.city || null, state: p.location.state, country: p.location.country || null, lat: p.location.lat, lon: p.location.lon } : null,
    machines,
    certifications,
    capacity_hours_per_week: Number.isFinite(p.capacity_hours_per_week) ? p.capacity_hours_per_week : null,
    shift_schedule: p.shift_schedule,
    specialties_materials: p.specialties_materials,
    specialties_part_sizes: p.specialties_part_sizes,
    specialties_industries: p.specialties_industries,
  };
  const missing = [];
  if (!profile.name) missing.push("name");
  if (!profile.location || !profile.location.city || !profile.location.country) missing.push("location.city+country");
  if (!profile.machines.length) missing.push("machines");
  if (profile.capacity_hours_per_week == null) missing.push("capacity_hours_per_week");
  // certifications may legitimately be [] (an uncertified shop) — present-but-empty is allowed, absent is not
  if (!Array.isArray(p.certifications)) missing.push("certifications");
  // machine travels are required by the engine's ShopMachine — flag any machine missing them
  if (machines.some((m) => m.travel_x_mm == null || m.travel_y_mm == null || m.travel_z_mm == null)) missing.push("machine travels (x/y/z mm)");
  return { ok: missing.length === 0, missing, profile, shop_id: normalizeShopId(profile.name || "") };
}

/** Assemble the marketplace manifest + onboarding contract. Pure. */
export function buildShopNetworkManifest({ marketplaces = MARKETPLACES } = {}) {
  return {
    schemaVersion: "1.0.0",
    engine: { name: "ShopNetworkEngine", id: "E1134", singleton: "shopNetworkEngine", dispatcher: "camDispatcher",
      actions: ["shop_network_register", "shop_network_search", "shop_network_broadcast", "shop_network_stats"] },
    marketplaces: Array.isArray(marketplaces) ? marketplaces : [],
    onboarding: { requiredFields: SHOP_PROFILE_REQUIRED, knownCerts: KNOWN_CERTS, processMap: PROCESS_TO_MACHINE_TYPE },
    populationStrategy: [
      "onboard: validate a shop submission via toShopProfile() → shopNetworkEngine.registerShop()",
      "external: reach capacity via a marketplace API (Xometry/Protolabs/Fictiv/Hubs) as a buyer",
      "discover: harvest candidate shops from Thomasnet by process+region, then verify + onboard",
    ],
    stats: { marketplaceCount: (marketplaces || []).length, apiMarketplaces: (marketplaces || []).filter((m) => m.access === "api").length },
  };
}

/** Render the manifest digest. Pure. */
export function renderManifestMd(man, generatedAtIso) {
  const L = [];
  L.push("# MACHINE-SHOP-NETWORK — outsourcing shop network (quoting galaxy)");
  L.push("");
  L.push(`> Generated ${generatedAtIso} · owner: slot:charlie (quoting) · VENDOR-NETWORK-MS0/U-VDN-SHOP-NETWORK. The SUPPLY side of outsourcing — shops PRISM routes work TO.`);
  L.push("");
  L.push(`> **Engine (R8 — do NOT duplicate):** \`ShopNetworkEngine\` (E1134), singleton \`shopNetworkEngine\`, wired in camDispatcher: \`${man.engine.actions.join("`, `")}\`. It owns ShopProfile + capability scoring + distance search + the NDA privacy model. This manifest is the DATA layer (marketplace access points + onboarding validator) the engine lacks.`);
  L.push("");
  L.push(`**${man.stats.marketplaceCount} marketplace access-point(s) · ${man.stats.apiMarketplaces} API-capable**`);
  L.push("");
  L.push("## Marketplace access points (external capacity — PRISM as buyer)");
  L.push("| marketplace | access | routes | note |");
  L.push("|-------------|--------|--------|------|");
  for (const m of man.marketplaces) L.push(`| [${m.name}](${m.website}) | ${m.access} | ${(m.routes || []).join(", ")} | ${m.note || ""} |`);
  L.push("");
  L.push("## How the network gets populated (R12 — no fabricated members)");
  L.push("Marketplace supplier networks are proprietary + a shop's machines/capacity/certs are real facts. Members enter three honest ways:");
  for (const s of man.populationStrategy) L.push(`- ${s}`);
  L.push("");
  L.push("## Onboarding contract (ShopProfile required fields)");
  L.push(`A shop must supply: **${man.onboarding.requiredFields.join(", ")}**. \`toShopProfile(partial)\` validates a submission + reports missing fields before \`registerShop()\`. Known certs: ${man.onboarding.knownCerts.join(", ")}.`);
  L.push("");
  L.push("## Next (VENDOR-NETWORK-MS0)");
  L.push("- U-VDN-SHOP-PERSIST: give ShopNetworkEngine a persistent seed loader (it's in-memory — registered shops vanish on restart). Coordinate with the CAMX engine owner.");
  L.push("- U-VDN-SHOP-ONBOARD: onboarding form/flow → toShopProfile() → shop_network_register.");
  L.push("- U-VDN-MARKETPLACE-API: wire Xometry/Protolabs/Fictiv APIs (as buyer) for instant external quotes.");
  L.push("- U-VDN-THOMASNET-SEED: harvest candidate shops from Thomasnet by process+region, verify, onboard.");
  return L.join("\n");
}

function main(argv) {
  let outDir = OUT_DIR;
  for (let i = 0; i < argv.length; i++) if (argv[i] === "--out-dir") outDir = argv[++i];
  const man = buildShopNetworkManifest({});
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const iso = new Date().toISOString().slice(0, 10);
  writeFileSync(join(outDir, "machine-shop-network-manifest.json"), JSON.stringify({ ...man, generatedAt: iso }, null, 2));
  writeFileSync(join(outDir, "MACHINE-SHOP-NETWORK.md"), renderManifestMd(man, iso));
  console.log(`[build-machine-shop-network] engine=ShopNetworkEngine(E1134) · ${man.stats.marketplaceCount} marketplaces (${man.stats.apiMarketplaces} API) · onboarding-validator ready`);
  console.log(`  → ${join(outDir, "machine-shop-network-manifest.json")}`);
  console.log(`  → ${join(outDir, "MACHINE-SHOP-NETWORK.md")}`);
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();
if (invokedDirectly) { process.exit(main(process.argv.slice(2))); }
