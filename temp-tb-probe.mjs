import { clampVcToThermalBand, normalizeToolMaterialForThermalBand } from "H:/prism-lathe-prod-ready/mcp-server/dist/shared/thermalBandClamp.js";
const tests = [
  { vc: 360, iso: "P", tm: "coated_carbide" },
  { vc: 180, iso: "P", tm: "hss" },
  { vc: 500, iso: "P", tm: "coated_carbide" },
  { vc: 800, iso: "N", tm: "pcd" },
  { vc: 400, iso: "P", tm: "coated_carbide" },
];
for (const t of tests) {
  const r = clampVcToThermalBand({ v_c_m_per_min: t.vc, iso_group: t.iso, tool_material: normalizeToolMaterialForThermalBand(t.tm), rake_angle_deg: 0 });
  console.log(`vc=${t.vc} ${t.iso}+${t.tm}: ts_max=${r.ts_recommended_max_vc_m_per_min} clamped=${r.clamped_vc_m_per_min} dir=${r.clamp_direction} was_clamped=${r.was_clamped}`);
}
