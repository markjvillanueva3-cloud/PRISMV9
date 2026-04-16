import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import { dirname } from 'path'; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);
import {
  init_ToolCatalogEngine,
  toolCatalogEngine
} from "./chunk-ELPDZPWJ.js";

// src/engines/MastercamToolExportEngine.ts
init_ToolCatalogEngine();
var VC_BASE = {
  P: 150,
  // Steel
  M: 100,
  // Stainless
  K: 200,
  // Cast Iron
  N: 400,
  // Non-ferrous (aluminum)
  S: 50,
  // Superalloy
  H: 120
  // Hardened
};
var FZ_BASE = {
  P: 0.1,
  M: 0.08,
  K: 0.12,
  N: 0.15,
  S: 0.06,
  H: 0.05
};
var AP_FACTOR = {
  P: 0.5,
  M: 0.4,
  K: 0.6,
  N: 1,
  S: 0.3,
  H: 0.25
};
var AE_FACTOR = {
  P: 0.4,
  M: 0.35,
  K: 0.5,
  N: 0.5,
  S: 0.25,
  H: 0.2
};
var COATING_MULT = {
  uncoated: 1,
  TiN: 1.1,
  TiCN: 1.15,
  TiAlN: 1.25,
  AlTiN: 1.3,
  AlCrN: 1.25,
  DLC: 1.35,
  diamond: 1.5
};
var ISO_LABELS = {
  P: "Steel",
  M: "Stainless Steel",
  K: "Cast Iron",
  N: "Non-Ferrous (Aluminum)",
  S: "Superalloy/Titanium",
  H: "Hardened Steel"
};
var ALL_ISO_GROUPS = ["P", "M", "K", "N", "S", "H"];
function mapToolType(prismType) {
  const t = (prismType || "").toLowerCase();
  if (t.includes("ball")) return "ball";
  if (t.includes("bull") || t.includes("corner_radius") || t.includes("torus")) return "bull";
  if (t.includes("face") || t.includes("shell")) return "face";
  if (t.includes("drill") && !t.includes("spot")) return "drill";
  if (t.includes("spot")) return "spot_drill";
  if (t.includes("tap")) return "tap";
  if (t.includes("ream")) return "reamer";
  if (t.includes("bore") || t.includes("boring")) return "boring_bar";
  if (t.includes("chamfer") || t.includes("countersink")) return "chamfer";
  if (t.includes("thread")) return "thread_mill";
  if (t.includes("form")) return "form";
  return "endmill";
}
function mapToolMaterial(prismMaterial) {
  const m = (prismMaterial || "").toLowerCase();
  if (m.includes("cbn") || m.includes("boron")) return "cbn";
  if (m.includes("pcd") || m.includes("diamond") && !m.includes("dl")) return "pcd";
  if (m.includes("ceramic") || m.includes("oxide")) return "ceramic";
  if (m.includes("cermet")) return "cermet";
  if (m.includes("hss") || m.includes("high speed")) return "hss";
  return "carbide";
}
function computeCuttingData(d, flutes, coating, toolMat, groups) {
  const coatKey = Object.keys(COATING_MULT).find(
    (k) => coating.toLowerCase().includes(k.toLowerCase())
  ) ?? "uncoated";
  const coatMult = COATING_MULT[coatKey] ?? 1;
  const matMult = {
    carbide: 1,
    cermet: 1.1,
    ceramic: 2.2,
    cbn: 2.5,
    pcd: 3,
    hss: 0.4
  };
  const mm = matMult[toolMat] ?? 1;
  return groups.map((iso) => {
    const vcBase = VC_BASE[iso] ?? 150;
    const fzBase = FZ_BASE[iso] ?? 0.1;
    const apFactor = AP_FACTOR[iso] ?? 0.5;
    const aeFactor = AE_FACTOR[iso] ?? 0.4;
    const vcMult = iso === "N" && (toolMat === "ceramic" || toolMat === "cbn") ? 0 : mm * coatMult;
    const vc = Math.round(vcBase * vcMult * 10) / 10;
    const fz = Math.round(fzBase * (d >= 10 ? 1 : 0.85) * 100) / 1e3;
    const ap = Math.round(d * apFactor * 100) / 100;
    const ae = Math.round(d * aeFactor * 100) / 100;
    const rpm = d > 0 ? Math.round(1e3 * vc / (Math.PI * d)) : 0;
    const feed_mmpm = Math.round(fz * flutes * rpm);
    return {
      iso_group: iso,
      material_label: ISO_LABELS[iso],
      vc_mpm: vc,
      fz_mm: fz,
      ap_mm: ap,
      ae_mm: ae,
      rpm,
      feed_mmpm
    };
  });
}
function convertTool(prismTool, toolNumber, isoGroups) {
  const phys = prismTool.physical ?? {};
  const d = phys.cutting_diameter_mm ?? prismTool.cutting_diameter_mm ?? prismTool.diameter_mm ?? 10;
  const shankD = phys.shank_diameter_mm ?? prismTool.shank_diameter_mm ?? d;
  const loc = phys.flute_length_mm ?? prismTool.flute_length_mm ?? d * 3;
  const oal = phys.overall_length_mm ?? prismTool.overall_length_mm ?? d * 6;
  const cr = phys.corner_radius_mm ?? prismTool.corner_radius_mm ?? 0;
  const flutes = phys.flute_count ?? prismTool.flute_count ?? prismTool.flutes ?? 4;
  const helix = phys.helix_angle_deg ?? prismTool.helix_angle_deg ?? 35;
  const coating = prismTool.coating ?? phys.coating ?? "uncoated";
  const mfr = prismTool.manufacturer ?? prismTool.brand ?? "Generic";
  const pn = prismTool.part_number ?? prismTool.designation ?? prismTool.model ?? "";
  const rawType = prismTool.type ?? prismTool.tool_type ?? "endmill";
  const toolType = mapToolType(rawType);
  const rawMat = prismTool.material ?? prismTool.substrate ?? "carbide";
  const toolMat = mapToolMaterial(rawMat);
  