// tier: T4
// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT — detect THIS host's GPU class
// for hardware-aware local-model routing.
//
// Bridges golf's hostname-keyed `fleet-reaper-host-presets.json`
// (label: "blackwell" | "home" | "work") to the ModelRoutingEngine
// HardwareProfile vocabulary ("home_blackwell" | "home_4080" | "work_3080" |
// "cloud_only") so any offload hook can pick a model tier sized to the actual
// GPU instead of a hardcoded 4080-era default. Reuses golf's preset reader
// (loadPresetFile / getPresetForHost) — no parallel parser.
//
// Resolution order (first hit wins):
//   1. PRISM_HARDWARE_PROFILE env — explicit operator override.
//   2. golf host-preset label for this hostname.
//   3. null — unknown; callers fall back to their conservative default.
//
// PURE-shell: all IO is injectable via opts (env / host / readFile / fileExists)
// so the resolver is unit-testable without touching disk or the real hostname.
// Never throws — golf's loadPresetFile already degrades corrupt/missing files
// to an empty preset set with an advisoryReason.

import { hostname } from "node:os";
import { loadPresetFile, getPresetForHost } from "../../helpers/fleet-reaper-host-presets.mjs";

/** The HardwareProfile vocabulary mirrored from ModelRoutingEngine.ts:43. */
export const VALID_PROFILES = Object.freeze([
  "home_blackwell",
  "home_4080",
  "work_3080",
  "cloud_only",
]);

/** golf preset `label` → ModelRoutingEngine HardwareProfile. */
export const LABEL_TO_PROFILE = Object.freeze({
  blackwell: "home_blackwell",
  home: "home_4080",
  work: "work_3080",
});

/**
 * Resolve this host's HardwareProfile.
 *
 * @param {{ env?: Record<string,string|undefined>, host?: string,
 *           path?: string, readFile?: (p:string)=>string,
 *           fileExists?: (p:string)=>boolean }} [opts]
 * @returns {"home_blackwell"|"home_4080"|"work_3080"|"cloud_only"|null}
 *   The resolved profile, or null when the host class cannot be determined
 *   (no env override and no matching preset) — callers should treat null as
 *   "use the conservative default", never as an error.
 */
export function detectHostClass(opts = {}) {
  const env = opts.env || process.env;

  // 1. Explicit operator override always wins.
  const override = env.PRISM_HARDWARE_PROFILE;
  if (typeof override === "string" && VALID_PROFILES.includes(override)) {
    return override;
  }

  // 2. golf's hostname-keyed preset label.
  const host = opts.host || hostname();
  const file = loadPresetFile(opts); // opts.{path,readFile,fileExists} injected through
  const preset = getPresetForHost(host, file.presets);
  const label = preset && typeof preset.label === "string" ? preset.label : null;
  if (label && Object.hasOwn(LABEL_TO_PROFILE, label)) {
    return LABEL_TO_PROFILE[label];
  }

  // 3. Unknown — let the caller fall back conservatively.
  return null;
}
