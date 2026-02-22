/**
 * R3-P2 DecisionTreeEngine Integration Tests
 * Tests all 6 decision trees + dispatcher + edge cases
 */
import {
  selectToolType,
  selectInsertGrade,
  selectCoolantStrategy,
  selectWorkholding,
  selectStrategy,
  selectApproachRetract,
  selectMaterial,
  decide,
  listDecisionTrees,
  normalizeISOGroup,
  DECISION_TREES,
} from "../../src/engines/DecisionTreeEngine.js";

interface TestCase {
  name: string;
  run: () => string[];
}

const tests: TestCase[] = [
  // === Tree 1: selectToolType ===
  {
    name: "Tool type: steel turning roughing",
    run: () => {
      const errs: string[] = [];
      const r = selectToolType({ material: "P", operation: "turning", roughing_finishing: "roughing" });
      if (!r.tool_type) errs.push("Missing tool_type");
      if (r.confidence < 0.5) errs.push(`Low confidence: ${r.confidence}`);
      if (!r.coating) errs.push("Missing coating");
      if (r.reasoning.length === 0) errs.push("No reasoning");
      return errs;
    },
  },
  {
    name: "Tool type: aluminum milling pocket",
    run: () => {
      const errs: string[] = [];
      const r = selectToolType({ material: "aluminum", operation: "milling", feature: "pocket" });
      if (!r.tool_type.includes("endmill")) errs.push(`Expected endmill, got ${r.tool_type}`);
      // Aluminum should get 2-3 flutes
      if (r.geometry.flutes && r.geometry.flutes > 3) errs.push(`Expected ≤3 flutes for aluminum, got ${r.geometry.flutes}`);
      return errs;
    },
  },
  {
    name: "Tool type: hardened steel milling",
    run: () => {
      const errs: string[] = [];
      const r = selectToolType({ material: "H", operation: "milling", feature: "profile" });
      if (r.confidence < 0.5) errs.push(`Low confidence: ${r.confidence}`);
      // Hardened steel should mention CBN or ceramic or hard tool
      const combined = [...r.reasoning, r.coating, r.tool_type].join(" ").toLowerCase();
      if (!combined.includes("cbn") && !combined.includes("ceramic") && !combined.includes("hard")) {
        errs.push("Hardened steel should suggest CBN/ceramic tooling");
      }
      return errs;
    },
  },

  // === Tree 2: selectInsertGrade ===
  {
    name: "Insert grade: steel stable cutting",
    run: () => {
      const errs: string[] = [];
      const r = selectInsertGrade({ material: "steel", operation: "turning", condition: "stable" });
      if (!r.grade.startsWith("P")) errs.push(`Expected P-grade for steel, got ${r.grade}`);
      if (!r.coating) errs.push("Missing coating recommendation");
      if (!r.speed_range_m_min || r.speed_range_m_min.length !== 2) errs.push("Missing speed range");
      return errs;
    },
  },
  {
    name: "Insert grade: superalloy interrupted",
    run: () => {
      const errs: string[] = [];
      const r = selectInsertGrade({ material: "S", operation: "turning", condition: "interrupted" });
      if (!r.grade.startsWith("S")) errs.push(`Expected S-grade for superalloy, got ${r.grade}`);
      // Speed should be low for superalloys
      if (r.speed_range_m_min[1] > 200) errs.push(`Max speed too high for superalloy: ${r.speed_range_m_min[1]}`);
      return errs;
    },
  },

  // === Tree 3: selectCoolantStrategy ===
  {
    name: "Coolant: titanium low speed",
    run: () => {
      const errs: string[] = [];
      const r = selectCoolantStrategy({
        material: "S", cutting_speed_m_min: 60, operation: "milling",
        tool_has_coolant_through: true, machine_has_tsc: true,
      });
      // Should recommend TSC or high pressure for superalloys
      if (!["through_spindle", "high_pressure", "through_spindle_coolant"].includes(r.strategy)) {
        errs.push(`Expected TSC/high_pressure for superalloy, got ${r.strategy}`);
      }
      if (r.pressure_bar < 40) errs.push(`Low pressure for superalloy: ${r.pressure_bar}`);
      return errs;
    },
  },
  {
    name: "Coolant: cast iron dry",
    run: () => {
      const errs: string[] = [];
      const r = selectCoolantStrategy({ material: "K", cutting_speed_m_min: 200, operation: "milling" });
      if (r.strategy !== "dry") errs.push(`Expected dry for cast iron, got ${r.strategy}`);
      return errs;
    },
  },
  {
    name: "Coolant: high speed aluminum",
    run: () => {
      const errs: string[] = [];
      const r = selectCoolantStrategy({ material: "N", cutting_speed_m_min: 400, operation: "milling" });
      // High speed aluminum → MQL or dry
      if (!["mql", "dry"].includes(r.strategy)) errs.push(`Expected MQL/dry for high-speed aluminum, got ${r.strategy}`);
      return errs;
    },
  },

  // === Tree 4: selectWorkholding ===
  {
    name: "Workholding: prismatic part",
    run: () => {
      const errs: string[] = [];
      const r = selectWorkholding({ part_geometry: "prismatic" });
      if (!r.fixture_type.toLowerCase().includes("vise") && !r.fixture_type.toLowerCase().includes("vis")) {
        errs.push(`Expected vise for prismatic, got ${r.fixture_type}`);
      }
      if (r.confidence < 0.5) errs.push(`Low confidence: ${r.confidence}`);
      return errs;
    },
  },
  {
    name: "Workholding: cylindrical part",
    run: () => {
      const errs: string[] = [];
      const r = selectWorkholding({ part_geometry: "cylindrical" });
      const fixt = r.fixture_type.toLowerCase();
      if (!fixt.includes("chuck") && !fixt.includes("collet")) {
        errs.push(`Expected chuck/collet for cylindrical, got ${r.fixture_type}`);
      }
      return errs;
    },
  },
  {
    name: "Workholding: high force warning",
    run: () => {
      const errs: string[] = [];
      const r = selectWorkholding({ part_geometry: "prismatic", cutting_force_n: 10000 });
      // Should have a warning or mention of clamp force adequacy
      const allText = [...r.reasoning, ...r.warnings].join(" ").toLowerCase();
      if (!allText.includes("force") && !allText.includes("clamp")) {
        errs.push("High cutting force should trigger force/clamp reasoning");
      }
      return errs;
    },
  },

  // === Tree 5: selectStrategy ===
  {
    name: "Strategy: deep pocket in superalloy",
    run: () => {
      const errs: string[] = [];
      const r = selectStrategy({ feature: "pocket", material: "S", depth_mm: 50, width_mm: 20 });
      const strat = r.strategy.toLowerCase();
      if (!strat.includes("trochoidal") && !strat.includes("adaptive")) {
        errs.push(`Expected trochoidal/adaptive for deep pocket in superalloy, got ${r.strategy}`);
      }
      return errs;
    },
  },
  {
    name: "Strategy: shallow hole",
    run: () => {
      const errs: string[] = [];
      const r = selectStrategy({ feature: "hole", material: "P", depth_mm: 10, width_mm: 10 });
      const strat = r.strategy.toLowerCase();
      if (!strat.includes("drill") && !strat.includes("standard")) {
        errs.push(`Expected standard drilling for shallow hole, got ${r.strategy}`);
      }
      return errs;
    },
  },
  {
    name: "Strategy: thread feature",
    run: () => {
      const errs: string[] = [];
      const r = selectStrategy({ feature: "thread", material: "P", width_mm: 12 });
      const strat = r.strategy.toLowerCase();
      if (!strat.includes("thread") && !strat.includes("tap")) {
        errs.push(`Expected thread milling/tapping, got ${r.strategy}`);
      }
      return errs;
    },
  },

  // === Tree 6: selectApproachRetract ===
  {
    name: "Approach: milling with cutter comp",
    run: () => {
      const errs: string[] = [];
      const r = selectApproachRetract({
        operation: "milling_profile", material: "P", cutter_comp: true,
      });
      const approach = r.approach.method.toLowerCase();
      if (!approach.includes("arc") && !approach.includes("tangent") && !approach.includes("lead")) {
        errs.push(`Expected arc/tangent lead-in for cutter comp, got ${r.approach.method}`);
      }
      return errs;
    },
  },
  {
    name: "Approach: drilling",
    run: () => {
      const errs: string[] = [];
      const r = selectApproachRetract({ operation: "drilling", material: "P" });
      if (!r.approach.method.toLowerCase().includes("rapid") && !r.approach.method.toLowerCase().includes("r_plane")) {
        errs.push(`Expected rapid to R-plane for drilling, got ${r.approach.method}`);
      }
      return errs;
    },
  },

  // === Dispatcher & Meta ===
  {
    name: "Dispatcher: decide() routes correctly",
    run: () => {
      const errs: string[] = [];
      const r = decide("selectToolType", { material: "P", operation: "drilling" });
      if (r.confidence < 0.5) errs.push(`Low confidence: ${r.confidence}`);
      if (r.reasoning.length === 0) errs.push("No reasoning from dispatcher");
      return errs;
    },
  },
  {
    name: "Dispatcher: unknown tree throws",
    run: () => {
      const errs: string[] = [];
      try {
        decide("nonexistentTree", {});
        errs.push("Should have thrown for unknown tree");
      } catch (e: any) {
        if (!e.message.includes("DecisionTreeEngine")) errs.push(`Wrong error: ${e.message}`);
      }
      return errs;
    },
  },
  {
    name: "listDecisionTrees returns 7 trees",
    run: () => {
      const errs: string[] = [];
      const trees = listDecisionTrees();
      if (trees.length !== 7) errs.push(`Expected 7 trees, got ${trees.length}`);
      if (DECISION_TREES.length !== 7) errs.push(`DECISION_TREES constant has ${DECISION_TREES.length}, expected 7`);
      return errs;
    },
  },
  {
    name: "normalizeISOGroup handles common names",
    run: () => {
      const errs: string[] = [];
      const cases: [string, string][] = [
        ["steel", "P"], ["Steel", "P"], ["P", "P"],
        ["stainless", "M"], ["cast iron", "K"], ["cast_iron", "K"],
        ["aluminum", "N"], ["aluminium", "N"],
        ["titanium", "S"], ["inconel", "S"],
        ["hardened", "H"],
      ];
      for (const [input, expected] of cases) {
        const got = normalizeISOGroup(input);
        if (got !== expected) errs.push(`normalizeISOGroup("${input}") = "${got}", expected "${expected}"`);
      }
      return errs;
    },
  },

  // === Tree 7: selectMaterial (JSON-driven) ===
  {
    name: "Material: aerospace application recommends Ti or Al",
    run: () => {
      const errs: string[] = [];
      const r = selectMaterial({ application: "aerospace", weight_priority: "high" });
      if (!r.material_family) errs.push("Missing material_family");
      if (!r.iso_group) errs.push("Missing iso_group");
      if (!r.recommended_alloys || r.recommended_alloys.length === 0) errs.push("Missing alloys");
      // Aerospace + lightweight should recommend Ti or Al family
      const fam = r.material_family.toLowerCase();
      if (!fam.includes("titanium") && !fam.includes("aluminum") && !fam.includes("ti-") && !fam.includes("7xxx") && !fam.includes("2xxx")) {
        errs.push(`Expected Ti or Al family for aerospace+lightweight, got: ${r.material_family}`);
      }
      if (r.confidence < 0.5) errs.push(`Confidence too low: ${r.confidence}`);
      return errs;
    },
  },
  {
    name: "Material: corrosion-resistant chemical processing",
    run: () => {
      const errs: string[] = [];
      const r = selectMaterial({ application: "chemical_processing", corrosion_resistance: "very_high" });
      const corr = r.properties.corrosion_resistance;
      if (corr !== "very_high" && corr !== "high") errs.push(`Expected high/very_high corrosion, got: ${corr}`);
      if (r.alternatives.length < 1) errs.push("Should have alternatives");
      return errs;
    },
  },
  {
    name: "Material: low-cost structural part",
    run: () => {
      const errs: string[] = [];
      const r = selectMaterial({ application: "structural", max_cost_tier: 2, machinability_priority: "high" });
      if (r.properties.cost_tier > 3) errs.push(`Cost tier too high: ${r.properties.cost_tier}`);
      if (r.iso_group !== "P" && r.iso_group !== "N" && r.iso_group !== "K") {
        errs.push(`Expected P/N/K for low-cost structural, got: ${r.iso_group}`);
      }
      return errs;
    },
  },
  {
    name: "Material: high-temperature turbine application",
    run: () => {
      const errs: string[] = [];
      const r = selectMaterial({ application: "turbine_discs", temperature_c: 650 });
      if (r.properties.max_service_temp_c < 650) {
        errs.push(`Max temp ${r.properties.max_service_temp_c}°C < required 650°C`);
      }
      if (r.iso_group !== "S") errs.push(`Expected ISO S for superalloy, got: ${r.iso_group}`);
      return errs;
    },
  },
  {
    name: "Material: dispatcher routes selectMaterial",
    run: () => {
      const errs: string[] = [];
      const r = decide("selectMaterial", { application: "bearings" });
      if (!r.reasoning || r.reasoning.length === 0) errs.push("Missing reasoning");
      if (r.confidence <= 0) errs.push("Confidence should be > 0");
      return errs;
    },
  },
  {
    name: "Material: listDecisionTrees includes selectMaterial",
    run: () => {
      const errs: string[] = [];
      const trees = listDecisionTrees();
      if (!trees.find(t => t.name === "selectMaterial")) errs.push("selectMaterial not in listDecisionTrees");
      if (!DECISION_TREES.includes("selectMaterial")) errs.push("selectMaterial not in DECISION_TREES");
      return errs;
    },
  },

  // === Validation ===
  {
    name: "Validation: missing required param throws",
    run: () => {
      const errs: string[] = [];
      try {
        selectToolType({ material: "", operation: "turning" } as any);
        errs.push("Should have thrown for empty material");
      } catch (e: any) {
        if (!e.message.includes("DecisionTreeEngine")) errs.push(`Wrong error prefix: ${e.message}`);
      }
      try {
        selectCoolantStrategy({ material: "P", cutting_speed_m_min: 100, operation: "" } as any);
        errs.push("Should have thrown for empty operation");
      } catch (e: any) {
        if (!e.message.includes("DecisionTreeEngine")) errs.push(`Wrong error prefix: ${e.message}`);
      }
      return errs;
    },
  },
];

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const t of tests) {
    try {
      const errs = t.run();
      if (errs.length === 0) {
        console.log(`  ✓ ${t.name}`);
        pass++;
      } else {
        console.log(`  ✗ ${t.name}`);
        errs.forEach((e) => console.log(`      ${e}`));
        fail++;
        failures.push(t.name);
      }
    } catch (e: any) {
      console.log(`  ✗ ${t.name} — EXCEPTION: ${e.message}`);
      fail++;
      failures.push(t.name);
    }
  }

  console.log(`\nDecisionTreeEngine: ${pass}/${pass + fail} passed`);
  if (failures.length > 0) {
    console.log("Failures:", failures.join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
