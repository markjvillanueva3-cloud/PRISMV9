#!/usr/bin/env node
/**
 * generate-svi-component-features.mjs — system-viz roost generator
 *
 * SVI-ENHANCE-MS0 U-SVI-E03 (charlie /goal-12 iter4, 2026-05-24).
 *
 * Reads state/shared/PSI-ENHANCED.json (produced by svi-enhanced-refresh.mjs)
 * and emits a system-viz augmentation file with:
 *   - 1 roost node `ghost.svi_components` (the parent)
 *   - 9 child nodes (one per Ψ component, colored red/amber/green)
 *   - 5 child nodes (one per MOAT axis)
 *
 * Register in regen-viz.mjs FAST[] + merge-augmentations.mjs splice — both
 * already follow the `generate-*-features.mjs` convention so the splice is
 * automatic on next viz regen.
 *
 * Pure Node ESM. No deps.
 */
import * as fs from "fs";
import * as path from "path";

const REPO = "H:/prism";
const PSI_PATH = path.join(REPO, "state/shared/PSI-ENHANCED.json");
// VIZ_DIR root (NOT staging/) so merge-augmentations loadOptional finds it — wired into the
// merged graph U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30). Orphaned before; no other consumer of the old staging path.
const OUT_DIR = path.join(REPO, "state/shared/system-viz");
const OUT_FILE = path.join(OUT_DIR, "svi-component-features.json");

function colorFor(value) {
  if (value < 0.5) return "#e74c3c";   // red
  if (value < 0.85) return "#f39c12";  // amber
  return "#27ae60";                    // green
}

function main() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(PSI_PATH, "utf8"));
  } catch (e) {
    process.stderr.write(`[generate-svi-component-features] missing ${PSI_PATH} — run svi-enhanced-refresh.mjs first\n`);
    process.exit(0); // fail-soft per CLAUDE.md §HOOK
  }

  const nodes = [];
  const edges = [];

  // Roost parent
  nodes.push({
    id: "ghost.svi_components",
    type: "roost",
    label: `SVI components (Ψ=${data.psi_new?.toFixed(3) ?? "—"} · MOAT=${data.svi_moat?.toFixed(3) ?? "—"})`,
    layer: "L10",
    metadata: {
      psi_new: data.psi_new,
      svi_moat: data.svi_moat,
      delta_to_perfect: data.delta_to_perfect,
      generated_at: data.generated_at,
    },
  });

  // 9 Ψ components
  for (const [name, value] of Object.entries(data.components ?? {})) {
    const id = `svi.component.${name}`;
    const weight = data.weights?.[name] ?? 0;
    nodes.push({
      id,
      type: "component",
      label: `${name} = ${value.toFixed(3)} (w=${weight.toFixed(2)})`,
      layer: "L10",
      color: colorFor(value),
      metadata: { value, weight, contribution: value * weight },
    });
    edges.push({ source: "ghost.svi_components", target: id, type: "contains" });
  }

  // 5 MOAT axes
  for (const [name, value] of Object.entries(data.moat_axes ?? {})) {
    const id = `svi.moat.${name}`;
    const weight = data.moat_weights?.[name] ?? 0;
    nodes.push({
      id,
      type: "moat_axis",
      label: `${name} = ${value.toFixed(3)} (w=${weight.toFixed(2)})`,
      layer: "L10",
      color: colorFor(value),
      metadata: { value, weight, axis_kind: "moat" },
    });
    edges.push({ source: "ghost.svi_components", target: id, type: "moat_contains" });
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    schemaVersion: "1.0.0",
    generator: "generate-svi-component-features.mjs",
    generated_at: new Date().toISOString(),
    augmentation_kind: "svi_components",
    nodes,
    edges,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  process.stdout.write(`[generate-svi-component-features] wrote ${nodes.length} nodes + ${edges.length} edges → ${OUT_FILE}\n`);
}

main();
