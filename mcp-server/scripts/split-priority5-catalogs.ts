/**
 * Fan out consolidated Phase-0 catalogs for Mastercam, Fusion 360, and
 * Inventor-HSM into per-unit Phase-1 deliverables using splitByKeys.
 */
import { camCatalogSplitterEngine } from "../src/engines/CAMCatalogSplitterEngine.js";

function report(label: string, r: ReturnType<typeof camCatalogSplitterEngine.splitByKeys>) {
  console.log(`[${label}] found=${r.modules_found.length} missing=${r.modules_missing.length} ops=${r.total_operations}`);
  for (const f of r.files_written) console.log(`  ${f}`);
  if (r.modules_missing.length > 0) console.log(`  MISSING: ${r.modules_missing.join(", ")}`);
}

// ─── Mastercam ──────────────────────────────────────────────────────
// MASTERCAM_X8_ADVANCED_MODULES_AUDIT.json has:
//   multiAxisToolpaths   → U-CAM16 (multiaxis-toolpaths.json)
//   latheToolpaths       → U-CAM17 (lathe-toolpaths.json)
//   wireEDMToolpaths     → U-CAM18 (wire-edm.json)
//   machinePresets       → U-CAM19 (machine-definition-simulation.json)
const mc = camCatalogSplitterEngine.splitByKeys({
  consolidated_path: "H:/PRISM/mcp-server/data/cam-functions/mastercam/MASTERCAM_X8_ADVANCED_MODULES_AUDIT.json",
  out_dir: "H:/PRISM/mcp-server/data/cam-functions/mastercam",
  rules: [
    { key: "multiAxisToolpaths", out_basename: "multiaxis-toolpaths.json" },
    { key: "latheToolpaths",     out_basename: "lathe-toolpaths.json" },
    { key: "wireEDMToolpaths",   out_basename: "wire-edm.json" },
    { key: "machinePresets",     out_basename: "machine-definition-simulation.json" },
  ],
  system_id: "mastercam",
});
report("mastercam/advanced", mc);

// MASTERCAM_X8_2D_3D_HS_CATALOG.json has modules.2d_high_speed + 3d_high_speed
const mc2 = camCatalogSplitterEngine.split({
  consolidated_path: "H:/PRISM/mcp-server/data/cam-functions/mastercam/MASTERCAM_X8_2D_3D_HS_CATALOG.json",
  out_dir: "H:/PRISM/mcp-server/data/cam-functions/mastercam",
  rules: [
    { module_id: "2d_high_speed", out_basename: "2d-toolpaths.json" },
    { module_id: "3d_high_speed", out_basename: "3d-hst-toolpaths.json" },
  ],
  system_id: "mastercam",
});
report("mastercam/2d-3d", mc2);

// ─── Fusion 360 ─────────────────────────────────────────────────────
// FUSION360_CAM_COMPLETE_CATALOG.json has:
//   3d_toolpaths         → U-CAM22 (3d-operations.json)
//   multiaxis_toolpaths  → U-CAM23 (multiaxis-operations.json)
//   turning_toolpaths    → U-CAM24 (turning-operations.json)
//   (U-CAM21 2D already covered by Fusion360-2D-Toolpath-Parameters.json)
const fs = camCatalogSplitterEngine.splitByKeys({
  consolidated_path: "H:/PRISM/mcp-server/data/cam-functions/fusion360/FUSION360_CAM_COMPLETE_CATALOG.json",
  out_dir: "H:/PRISM/mcp-server/data/cam-functions/fusion360",
  rules: [
    { key: "3d_toolpaths",        out_basename: "3d-operations.json" },
    { key: "multiaxis_toolpaths", out_basename: "multiaxis-operations.json" },
    { key: "turning_toolpaths",   out_basename: "turning-operations.json" },
  ],
  system_id: "fusion360",
});
report("fusion360", fs);

// ─── Inventor HSM ───────────────────────────────────────────────────
// INVENTOR_HSM_COMPLETE_PARAMETER_CATALOG.json has:
//   operations            → U-CAM26 (2.5d-milling.json) / or all-ops.json
//   imachining_technology → U-CAM31 (imachining.json)
const hsm = camCatalogSplitterEngine.splitByKeys({
  consolidated_path: "H:/PRISM/mcp-server/data/cam-functions/inventor-hsm/INVENTOR_HSM_COMPLETE_PARAMETER_CATALOG.json",
  out_dir: "H:/PRISM/mcp-server/data/cam-functions/inventor-hsm",
  rules: [
    { key: "operations",            out_basename: "all-operations.json" },
    { key: "imachining_technology", out_basename: "imachining.json" },
  ],
  system_id: "inventor-hsm",
});
report("inventor-hsm", hsm);
