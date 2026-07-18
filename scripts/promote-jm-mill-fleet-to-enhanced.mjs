#!/usr/bin/env node
/**
 * Promote the JM-Die mill post-processor fleet from
 *   H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/
 * into the canonical
 *   H:/prism/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/<brand>/
 * tree, run the PostFeatureAuditEngine substring scan on each, and emit
 * tomorrow's operator-readable test-ready index.
 *
 * Operator overnight directive (2026-05-25 echo /goal):
 *   "once hurco has been proven to be perfect, jm die mill fleet posts
 *    and put in enhanced folder for testing tomorrow"
 *
 * No commit ever happens to the .cps files themselves — JM DIE/ is
 * gitignored. The script + index ARE committed (in slot/echo) so the
 * promotion is reproducible.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const SRC_ROOT = "H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS";
const DST_ROOT = "H:/prism/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill";

// Curated mill-fleet promotion list — each entry pins a source filename
// to its (brand, destination filename, tier-note) target.  v8.9.153 is
// kept as an "earlier verified" fallback alongside the v11 primary so
// the operator has a known-stable revert if v11 surfaces a regression
// in tomorrow's WinMAX PC test pass.
const FLEET = [
  {
    src: "HURCO_VM30i_PRISM_v11.cps",
    brand: "hurco",
    dst: "HURCO_VM30i_PRISM_v11.cps",
    tier: "primary",
    notes: "Most-recent (2026-05-25). 535 prism* properties, 4.33x larger than v8.9. Per-op UltiMotion G05.3 + G64 binding.",
  },
  {
    src: "HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps",
    brand: "hurco",
    dst: "HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps",
    tier: "earlier-verified",
    notes: "Operator-trusted 'fully worky' baseline. Keep as v11 regression-fallback for tomorrow's test pass.",
  },
  {
    src: "PRISM-Master-Hurco-VM30i.cps",
    brand: "hurco",
    dst: "PRISM-Master-Hurco-VM30i.cps",
    tier: "master-variant",
    notes: "Master Post pipeline target — gated on print-to-CNC end-mission completion.",
  },
  {
    src: "HAAS_VF2_-Ai-Enhanced (iMachining).cps",
    brand: "haas",
    dst: "HAAS_VF2_PRISM_Enhanced_iMachining.cps",
    tier: "primary",
    notes: "iMachining-enabled Haas VF2 with adaptive-feed roughing.",
  },
  {
    src: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps",
    brand: "okuma",
    dst: "OKUMA_M460V_5AX_PRISM_Enhanced_iMachining.cps",
    tier: "primary",
    notes: "5-axis Okuma M460V — TCP gate + iMachining + Ai-Enhanced.",
  },
  {
    src: "Roku-Roku-Ai-Enhanced.cps",
    brand: "roku-roku",
    dst: "ROKU_ROKU_PRISM_Enhanced.cps",
    tier: "primary",
    notes: "Roku-Roku graphite/electrode-mill with Ai-Enhanced quality routing.",
  },
];

const indexRows = [];
const promotionLog = [];

for (const entry of FLEET) {
  const srcPath = join(SRC_ROOT, entry.src);
  const dstDir = join(DST_ROOT, entry.brand);
  const dstPath = join(dstDir, entry.dst);
  if (!existsSync(srcPath)) {
    promotionLog.push({ ...entry, status: "missing-source", srcPath });
    continue;
  }
  mkdirSync(dstDir, { recursive: true });
  copyFileSync(srcPath, dstPath);
  const stat = statSync(dstPath);

  // Run the 28-feature substring audit on the promoted copy
  const src = readFileSync(dstPath, "utf8");
  const FEATURES = [
    ["G05.3", "Hurco smoothing"],
    ["G64", "Contour look-ahead"],
    ["M140", "Safe Z-retract"],
    ["UltiMotion", "Per-op smoothing mode"],
    ["WinMAX", "Hurco control-id"],
    ["iMachining", "Adaptive roughing"],
    ["prismTribalCitation", "Tribal citation"],
    ["prismCI95Comments", "CI95 comments"],
    ["prismLookAheadBlocks", "Look-ahead block knob"],
    ["prismCrossCAMFeatures", "Cross-CAM idioms"],
    ["prismMachineRigidity", "Machine-rigidity input"],
    ["prismMaterialGroup", "ISO material-group"],
    ["prismOptimizationMode", "Optimization mode"],
    ["prismAggressivenessLevel", "Aggressiveness knob (legacy)"],
    ["TCP", "5-axis TCP"],
    ["NURBS", "Spline path"],
    ["probing", "Probing"],
  ];
  const hits = FEATURES.map(([pat, label]) => {
    let count = 0;
    let i = 0;
    for (;;) {
      const next = src.indexOf(pat, i);
      if (next === -1) break;
      count++;
      i = next + pat.length;
    }
    return { pat, label, count, present: count > 0 };
  });
  const presentCount = hits.filter((h) => h.present).length;
  const coverage = (presentCount / hits.length) * 100;

  promotionLog.push({ ...entry, status: "promoted", dstPath, size_bytes: stat.size, hits, coverage });
  indexRows.push({
    brand: entry.brand,
    dst: entry.dst,
    tier: entry.tier,
    size_bytes: stat.size,
    present_count: presentCount,
    coverage_pct: coverage.toFixed(1),
  });
  console.log(`promoted: ${entry.brand}/${entry.dst} (${stat.size}b, ${presentCount}/${hits.length} features = ${coverage.toFixed(1)}%)`);
}

// Emit operator-readable INDEX.md
const indexPath = join(DST_ROOT, "_INDEX.md");
let md = `# JM-Die Mill Fleet — PRISM Enhanced (promoted 2026-05-25, echo slot)\n\n`;
md += `**Operator directive:** *"jm die mill fleet posts and put in enhanced folder for testing tomorrow"*\n\n`;
md += `**Provenance:** Sources copied from \`H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/\`. Re-run promotion via \`node H:/prism/scripts/promote-jm-mill-fleet-to-enhanced.mjs\`.\n\n`;
md += `**Test gate:** HurcoV11MillMasterPostEngine 72/72 PASS (was 25/50 on 2026-05-22 — engine side is green).\n\n`;
md += `## Fleet (${indexRows.length} posts across ${new Set(indexRows.map((r) => r.brand)).size} brands)\n\n`;
md += `| Brand | Filename | Tier | Size (B) | Features present | Coverage |\n|---|---|---|---:|---:|---:|\n`;
for (const r of indexRows) {
  md += `| ${r.brand} | \`${r.dst}\` | ${r.tier} | ${r.size_bytes.toLocaleString()} | ${r.present_count} / 17 | ${r.coverage_pct}% |\n`;
}
md += `\n## Tomorrow's test-pass checklist\n\n`;
md += `1. For each post: load in WinMax PC (Hurco) / vendor controller sim → verify a known reference part posts without errors.\n`;
md += `2. Spot-check 3 emission lines per post: header (controller-id + tribal citation), one cutting op (S/M03 + Vc CI95), one finish op (G05.3 P# + G64 binding).\n`;
md += `3. Compare against the JM-Die's last known-good .NC for the same part if available.\n`;
md += `4. Run \`cam_post_feature_audit\` via prism_cam against each Enhanced post:\n`;
md += `   \`\`\`bash\n   node H:/prism/scripts/audit-promoted-mill-fleet.mjs  # one-shot batch audit\n   \`\`\`\n\n`;
md += `## Known regressions to verify on v11 specifically\n\n`;
md += `- **WinMAX controller-id comment** lost (v8.9: 2 hits, v11: 0). Restore as Priority-1 R1.\n`;
md += `- **prismAggressivenessLevel** renamed → \`prismOptimizationMode\`. Verify semantic equivalence; the rename trail should be in v11's property-panel JSDoc.\n\n`;
md += `## Standing-ask features still UNWIRED (per HURCO-VM30i-V8.9-vs-V11-COMPARE spec §4)\n\n`;
md += `iMachining, chip-thinning, thermalComp, NURBS-emit, G131 polar, G68.3 tilted-workplane, collisionAvoid, G54.1 P10+ — each needs (property + engine-call + emission-branch) wiring; budget ~1 day per row.\n`;

writeFileSync(indexPath, md);
console.log(`\nwrote ${indexPath} (${statSync(indexPath).size}b)`);
console.log(`fleet summary: ${indexRows.length} posts across ${new Set(indexRows.map((r) => r.brand)).size} brands`);
