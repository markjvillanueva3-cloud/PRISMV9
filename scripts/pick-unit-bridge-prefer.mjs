#!/usr/bin/env node
// scripts/pick-unit-bridge-prefer.mjs
// -----------------------------------
// TOKEN-SAVINGS-PIVOT/U-PSN-BRIDGE-PREFER (iter15-#3, 2026-05-23, slot:alpha)
//
// Gap-fill #3 of the 5-fill PSN goal: surface DEEP_INTEGRATION_BRIDGES ahead
// of within-domain units. The /pick-unit kernel partitions work by slot
// domain (mill/lathe/wedm/etc.), which under-picks multi-domain bridge
// units (CAD→CAM, CAM→post, master-post) because they don't fit one slot.
//
// This advisory script reads the consolidated roadmap and ranks bridge units
// by leverage (number of domains they connect × wiring-status). Output is a
// punch list that /pick-dev or /pick-unit operators can manually prefer.
//
// Read-only; never modifies roadmap data. Surfaces via stdout.

import { readFileSync } from "node:fs";

const ROADMAP_PATH = "H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.json";

// Curated 16 deep-integration bridges per CLAUDE.md §ROADMAP CONSOLIDATION.
// These are the highest-leverage starting set because each connects 2+
// already-built domains into a multi-leg workflow.
export const DEEP_INTEGRATION_BRIDGES = [
  { id: "BRIDGE-SFC-MILL", domains: ["sfc", "mill"], notes: "SFC orchestrator → mill" },
  { id: "BRIDGE-SFC-LATHE", domains: ["sfc", "lathe"], notes: "SFC orchestrator → lathe" },
  { id: "BRIDGE-SFC-WEDM", domains: ["sfc", "wedm"], notes: "SFC orchestrator → wedm" },
  { id: "BRIDGE-SFC-FUSION360", domains: ["sfc", "cam"], notes: "SFC → Fusion 360 live push" },
  { id: "BRIDGE-SFC-MASTERCAM", domains: ["sfc", "cam"], notes: "SFC → Mastercam live push" },
  { id: "BRIDGE-SFC-ESPRIT", domains: ["sfc", "cam"], notes: "SFC → Esprit live push" },
  { id: "BRIDGE-MASTERPOST-CAM", domains: ["post", "cam"], notes: "Master post → CAM output" },
  { id: "BRIDGE-CAD-CAM-AI", domains: ["cad", "cam"], notes: "CAD↔CAM AI orchestration" },
  { id: "BRIDGE-AI-HIERARCHY", domains: ["ai", "all"], notes: "3-tier AI hierarchy (haiku→sonnet→opus)" },
  { id: "BRIDGE-CLOSED-LOOP-LEARN", domains: ["cam", "ml"], notes: "Closed-loop CAM learning" },
  { id: "BRIDGE-ERP", domains: ["business", "shop"], notes: "ERP↔shop floor" },
  { id: "BRIDGE-OPERATOR-GATES", domains: ["safety", "shop"], notes: "Operator safety gates" },
  { id: "BRIDGE-WEDM-PRINT-TO-PROG", domains: ["wedm", "blueprint"], notes: "Wire-EDM print-to-program" },
  { id: "BRIDGE-LATHE-PRINT-TO-PROG", domains: ["lathe", "blueprint"], notes: "Lathe print-to-program" },
  { id: "BRIDGE-MILL-PRINT-TO-PROG", domains: ["mill", "blueprint"], notes: "Mill print-to-program" },
  { id: "BRIDGE-QUALITY-SPC", domains: ["quality", "ml"], notes: "Quality control + SPC learning" },
];

/**
 * Pure: rank bridges by leverage. Inputs:
 *   - bridges: array (default = DEEP_INTEGRATION_BRIDGES)
 *   - shippedUnits: Set of unit ids already shipped (excluded)
 *   - inFlightSlots: Set of domains with active work (deprioritized to avoid stomping)
 */
export function rankBridges(bridges = DEEP_INTEGRATION_BRIDGES, shippedUnits = new Set(), inFlightSlots = new Set()) {
  if (!Array.isArray(bridges)) return [];
  return bridges
    .filter((b) => b && b.id && !shippedUnits.has(b.id))
    .map((b) => {
      const overlap = (b.domains || []).filter((d) => inFlightSlots.has(d)).length;
      // Score: connects-N-domains, demote by in-flight overlap (avoid stomping peers).
      const score = (b.domains || []).length * 10 - overlap * 3;
      return { ...b, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Pure: format the ranked-bridge punch list as markdown.
 */
export function formatRankedBridges(ranked, topN = 10) {
  if (!Array.isArray(ranked) || ranked.length === 0) return "_No bridge units available — all shipped or in-flight._";
  const shown = ranked.slice(0, topN);
  const lines = [
    `## 🌉 Deep-Integration Bridge Picks (top ${shown.length} of ${ranked.length})`,
    "",
    "_Bridge units connect 2+ already-built domains — highest-leverage starting set when no urgent within-slot work. Prefer over within-slot units when both qualify._",
    "",
    "| Score | Bridge | Domains | Notes |",
    "|---|---|---|---|",
  ];
  for (const b of shown) {
    lines.push(`| ${b.score} | ${b.id} | ${(b.domains || []).join(" + ")} | ${b.notes || ""} |`);
  }
  lines.push("");
  lines.push("_Pick via `/pick-unit` or `/pick-dev` and override --priority to surface a specific bridge. Disable: `PRISM_BRIDGE_PREFER_DISABLE=1`._");
  return lines.join("\n");
}

function loadShippedFromRoadmap() {
  try {
    const raw = readFileSync(ROADMAP_PATH, "utf8");
    const j = JSON.parse(raw);
    const out = new Set();
    if (j && Array.isArray(j.shipped_units)) {
      for (const u of j.shipped_units) {
        if (u && u.id) out.add(u.id);
      }
    }
    return out;
  } catch { return new Set(); }
}

// --- CLI ---
function main() {
  if (process.env.PRISM_BRIDGE_PREFER_DISABLE === "1") return 0;
  const shipped = loadShippedFromRoadmap();
  const inFlight = new Set(); // could be derived from slot-task-claims; left empty for now
  const ranked = rankBridges(DEEP_INTEGRATION_BRIDGES, shipped, inFlight);
  console.log(formatRankedBridges(ranked));
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("pick-unit-bridge-prefer.mjs")) {
  process.exit(main());
}
