#!/usr/bin/env node
/**
 * audit-jm-lathe-post-enhancements.mjs
 * =====================================
 *
 * MIKE /goal session (2026-05-23) — JM Die LATHE post-processor capability audit.
 * Pure read-only static analysis. No shell calls, no child_process.
 *
 * Follows the india HurcoV11MillMasterPost verification pattern + the echo
 * LATHE-P2P-CONSENSUS-MS4 ensemble pattern. Builds a per-lathe upgrade punch
 * list that bravo (lathe-domain owner) actions in a follow-up.
 *
 * Usage:
 *   node scripts/audit-jm-lathe-post-enhancements.mjs            # pretty print
 *   node scripts/audit-jm-lathe-post-enhancements.mjs --json     # JSON-only
 *   node scripts/audit-jm-lathe-post-enhancements.mjs --out FILE # write file
 *
 * @unit U-MIKE-LATHE-POST-AUDIT
 * @slot mike
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const PRISM_ROOT = resolve(import.meta.dirname, "..");
const JM_DIE_PROFILE = join(PRISM_ROOT, "mcp-server", "src", "data", "jm-die-profile.ts");
const FUSION_LIB_DIR = "H:/PRISM/JM DIE/JM DIE COMPANY/My Libraries";

const ENHANCEMENT_MARKERS = [
  { regex: /Ai-Enhanced/i,    capability: "ai_adaptive_feedrate" },
  { regex: /iMachining/i,     capability: "imachining_chip_thinning" },
  { regex: /-Fixed/i,         capability: "operator_validated_fix" },
  { regex: /-Optimized/i,     capability: "cycle_optimized" },
];

/** Parse jm-die-profile.ts as text, extract LTH-* machine entries. */
export function parseLatheMachines(source) {
  const lathes = [];
  const re = /\{\s*machine_id:\s*"(LTH-\d+)"\s*,\s*machine_name:\s*"([^"]+)"\s*,\s*controller_family:\s*"([^"]+)"\s*,\s*controller_model:\s*"([^"]+)"\s*,\s*post_processor:\s*"([^"]+)"\s*\}/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const [, machine_id, machine_name, controller_family, controller_model, post_processor] = m;
    lathes.push({ machine_id, machine_name, controller_family, controller_model, post_processor });
  }
  return lathes;
}

/** Classify a post-processor filename. */
export function classifyPost(postProcessor) {
  const present = [];
  for (const { regex, capability } of ENHANCEMENT_MARKERS) {
    if (regex.test(postProcessor)) present.push(capability);
  }
  const allCaps = ENHANCEMENT_MARKERS.map(m => m.capability);
  const missing = allCaps.filter(c => !present.includes(c));
  const tier = present.length === 0
    ? "plain"
    : present.length >= 2
      ? "fully_enhanced"
      : "partially_enhanced";
  return { tier, present_capabilities: present, missing_capabilities: missing };
}

/** Enumerate Fusion 360 tooling libraries. Read-only, best-effort. */
export function listFusionToolLibs(dir = FUSION_LIB_DIR) {
  if (!existsSync(dir)) return { available: false, libraries: [] };
  const entries = readdirSync(dir);
  const libraries = entries
    .filter(f => f.endsWith(".hsmlib"))
    .map(f => {
      const fullPath = join(dir, f);
      const st = statSync(fullPath);
      return { name: f, path: fullPath, size_kb: Math.round(st.size / 1024), mtime: st.mtime.toISOString() };
    });
  return { available: true, libraries };
}

/** Build the full audit report. Pure function. */
export function buildAudit({ source, fusionLibs, generatedAt = new Date().toISOString() }) {
  const lathes = parseLatheMachines(source);
  const perLathe = lathes.map(lathe => ({
    ...lathe,
    classification: classifyPost(lathe.post_processor),
  }));

  const tierCounts = perLathe.reduce((acc, l) => {
    acc[l.classification.tier] = (acc[l.classification.tier] || 0) + 1;
    return acc;
  }, {});

  const upgrade_punch_list = perLathe
    .filter(l => l.classification.tier !== "fully_enhanced")
    .map(l => ({
      machine_id: l.machine_id,
      machine_name: l.machine_name,
      post_processor: l.post_processor,
      current_tier: l.classification.tier,
      missing_capabilities: l.classification.missing_capabilities,
      suggested_action: l.classification.tier === "plain"
        ? `Rebuild ${l.machine_id} post with Ai-Enhanced + iMachining suffix patterns (per LTH-05/06/07 templates)`
        : `Add ${l.classification.missing_capabilities.join(" + ")} to ${l.post_processor}`,
    }));

  const lathe_tool_lib_gap = !fusionLibs.libraries.some(lib =>
    /lathe|turn|okuma|genos|multus|crown|lnc|lb3000/i.test(lib.name)
  );

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    advisoryOnly: true,
    must_human_verify: true,
    domain_handoff_to: "bravo (lathe-domain owner per JULIETT-12CHAT)",
    summary: {
      total_lathes: lathes.length,
      by_tier: tierCounts,
      fully_enhanced_count: tierCounts.fully_enhanced || 0,
      upgrade_candidates: upgrade_punch_list.length,
      fusion_lathe_tool_lib_gap: lathe_tool_lib_gap,
    },
    machines: perLathe,
    upgrade_punch_list,
    fusion_tooling_libraries: fusionLibs,
    notes: [
      "ENHANCEMENT_MARKERS = ['Ai-Enhanced','iMachining','-Fixed','-Optimized']. 'fully_enhanced' = ≥2 markers; 'partially_enhanced' = 1; 'plain' = 0.",
      "Tooling-catalog backbone: Fusion 360 .hsmlib files are XML-encoded. A follow-up extraction unit can mine speed/feed parameters from them — pair with material + insert-type metadata for downstream prism_calc consumption.",
      "Mike provides the punch list; bravo actions the .cps post edits (lathe domain per slot soul).",
    ],
  };
}

// CLI entry — pretty-print to stdout, optionally write JSON file
function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  const source = readFileSync(JM_DIE_PROFILE, "utf8");
  const fusionLibs = listFusionToolLibs();
  const report = buildAudit({ source, fusionLibs });
  const json = JSON.stringify(report, null, 2);

  if (outPath) {
    writeFileSync(outPath, json);
    if (!jsonOnly) console.error(`Wrote ${outPath}`);
    return;
  }
  if (jsonOnly) {
    process.stdout.write(json);
    return;
  }

  console.log(`JM Die Lathe Post-Processor Enhancement Audit — ${report.generatedAt}`);
  console.log(`Total lathes: ${report.summary.total_lathes} · by tier: ${JSON.stringify(report.summary.by_tier)}`);
  console.log(`Fusion lathe tool-lib gap: ${report.summary.fusion_lathe_tool_lib_gap}`);
  console.log(`Upgrade candidates: ${report.summary.upgrade_candidates}`);
  console.log("\nPunch list (lathes needing post upgrades):");
  for (const item of report.upgrade_punch_list) {
    console.log(`  • ${item.machine_id} (${item.machine_name})`);
    console.log(`    tier: ${item.current_tier}, missing: ${item.missing_capabilities.join(", ") || "—"}`);
    console.log(`    -> ${item.suggested_action}`);
  }
  console.log("\nFusion 360 tooling libraries available:");
  for (const lib of fusionLibs.libraries) console.log(`  • ${lib.name} (${lib.size_kb} kB)`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("audit-jm-lathe-post-enhancements.mjs")) {
  main();
}
