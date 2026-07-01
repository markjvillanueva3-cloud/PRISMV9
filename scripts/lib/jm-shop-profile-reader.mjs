#!/usr/bin/env node
/**
 * jm-shop-profile-reader.mjs -- shared, fail-soft reader for the JM shop-function
 * profile (state/shared/jm-shop-profile.json), produced by
 * scripts/jm-shop-knowledge-to-vault.mjs.
 *
 * WHY (R15 wire-to-all-consumers): the profile distills how JM Die actually runs
 * (machine utilization, work-kind mix, business/order-flow). The FRONTEND consumes
 * it via src/data/shopUsageOrder.ts; this lib is the BACKEND equivalent so any
 * engine / script / dispatcher can ask "what does the shop run most / what's the
 * order mix" without re-parsing the 38K-file corpus. One distillation, many readers.
 *
 * Pure + fail-soft: a missing/corrupt profile returns null (callers fall back to
 * neutral behavior); it NEVER throws.
 *
 * API:
 *   loadShopProfile()            -> profile object | null
 *   rankedMachineCategories()    -> [{id, files, pct}] descending, or []
 *   topMachineCategory()         -> "lathe" | null
 *   workKindMix()                -> [{id, files, pct}] or []
 *   businessOrderMix()           -> [{id, count, pct}] or []  (document roles)
 *   machineUsageWeight(predicate)-> number  (sum of category files where predicate(id))
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_PROFILE = path.join(ROOT, "state", "shared", "jm-shop-profile.json");

/** Load + validate the profile. Fail-soft -> null. */
export function loadShopProfile(profilePath = DEFAULT_PROFILE) {
  try {
    if (!fs.existsSync(profilePath)) return null;
    const p = JSON.parse(fs.readFileSync(profilePath, "utf8"));
    if (!p || p.ok !== true || !Array.isArray(p.machines)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Machine categories ranked by real shop file-volume (descending). [] if absent. */
export function rankedMachineCategories(profile = loadShopProfile()) {
  if (!profile?.machines?.length) return [];
  return [...profile.machines].sort((a, b) => (b.files || 0) - (a.files || 0));
}

/** The single busiest machine category id (e.g. "lathe"), or null. */
export function topMachineCategory(profile = loadShopProfile()) {
  const ranked = rankedMachineCategories(profile);
  return ranked.length ? ranked[0].id : null;
}

/** Work-kind mix (g_code / cam_project / pure_cad ...), descending. [] if absent. */
export function workKindMix(profile = loadShopProfile()) {
  if (!profile?.kinds?.length) return [];
  return [...profile.kinds].sort((a, b) => (b.files || 0) - (a.files || 0));
}

/** Business/order-flow document-role mix (SALES_ORDER / PRINT / QUOTE ...). [] if absent. */
export function businessOrderMix(profile = loadShopProfile()) {
  const roles = profile?.business?.documentRoles;
  if (!Array.isArray(roles)) return [];
  return [...roles].sort((a, b) => (b.count || 0) - (a.count || 0));
}

/**
 * Sum the file-volume of every machine category whose id satisfies `predicate`.
 * Lets a backend caller weight a concrete machine the same way the frontend does
 * (e.g. an Okuma lathe = lathe + okuma volume). 0 if no profile / no match.
 */
export function machineUsageWeight(predicate, profile = loadShopProfile()) {
  if (typeof predicate !== "function" || !profile?.machines?.length) return 0;
  let w = 0;
  for (const m of profile.machines) if (predicate(m.id)) w += m.files || 0;
  return w;
}

if (process.argv[1]?.endsWith("jm-shop-profile-reader.mjs")) {
  const p = loadShopProfile();
  if (!p) { console.error("[jm-shop-profile-reader] no profile -- run jm-shop-knowledge-to-vault.mjs first"); process.exit(1); }
  console.log(`JM shop profile (schema ${p.schemaVersion}, ${p.totalFiles?.toLocaleString()} files):`);
  console.log(`  top machine: ${topMachineCategory(p)}`);
  console.log(`  machines:    ${rankedMachineCategories(p).slice(0, 5).map((m) => `${m.id}(${m.pct}%)`).join(" ")}`);
  console.log(`  work kinds:  ${workKindMix(p).slice(0, 4).map((k) => `${k.id}(${k.pct}%)`).join(" ")}`);
  const biz = businessOrderMix(p);
  if (biz.length) console.log(`  order mix:   ${biz.slice(0, 5).map((b) => `${b.id}(${b.pct}%)`).join(" ")}`);
}
