// Debug probe — invoke speedFeedOrchestratorEngine.compute() on one rich
// input and dump the actual fields returned. Used to diagnose the Stage 2
// worker producing all-null outputs. Throwaway; not part of the pipeline.
import { speedFeedOrchestratorEngine } from "../mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts";

const richInput = {
  machine_name: "Haas VF-2",
  machine_type: "vertical_mill",
  machine_power_kw: 22,
  machine_max_rpm: 8100,
  material: "1045",
  iso_group: "P",
  hardness_hb: 180,
  operation: "milling",
  cut_type: "roughing",
  strategy: "adaptive",
  tool_diameter_mm: 12,
  flutes: 4,
  tool_material: "carbide",
  tool_coating: "TiAlN",
  helix_angle_deg: 38,
  tool_stickout_mm: 36,
  holder_type: "shrink_fit",
  axial_depth_mm: 6,
  radial_depth_mm: 4,
  coolant_type: "flood",
  optimize_for: "balanced",
};

const out = speedFeedOrchestratorEngine.compute(richInput);
console.log("---SUMMARY---");
console.log("RPM:", out.spindle_rpm,
            "Vc:", out.cutting_speed_mpm,
            "fz:", out.feed_per_tooth_mm,
            "vf:", out.feed_rate_mmmin);
console.log("P_kW:", out.power_kw,
            "Ra_um:", out.surface_finish_Ra_um,
            "life_min:", out.tool_life_min);
console.log("conf:", out.overall_confidence,
            "engines:", out.engines_called?.length,
            "limits:", out.limiting_factors?.length,
            "zone:", out.stability_assessment?.zone);
console.log("---ALL TOP-LEVEL KEYS---");
console.log(Object.keys(out).join(", "));
