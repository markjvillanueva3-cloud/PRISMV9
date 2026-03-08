/**
 * ToolAssemblyDeflectionEngine — Combined tool assembly deflection analysis.
 *
 * Models the complete tool assembly: spindle → holder → collet/chuck → tool shank → cutting edge.
 * Each segment has its own diameter, length, material (E modulus), and contributes to total deflection.
 *
 * Uses cascaded cantilever beam model with multi-section moment of inertia.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface AssemblySection {
  name: string;
  length_mm: number;
  diameter_mm: number;
  material: "carbide" | "hss" | "steel" | "ceramic" | "cermet";
  is_cutting: boolean;
}

export interface AssemblyInput {
  sections: AssemblySection[];
  cutting_force_n: number;
  force_position?: "tip" | "center" | "distributed";
  spindle_rigidity_n_um?: number; // N/μm at spindle nose
  radial_force_n?: number;  // Fr component
  taper: "BT30" | "BT40" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-F63";
}

export interface SectionDeflection {
  name: string;
  length_mm: number;
  diameter_mm: number;
  moment_of_inertia_mm4: number;
  e_modulus_mpa: number;
  deflection_at_tip_mm: number;
  angular_contribution_rad: number;
  pct_of_total: number;
}

export interface AssemblyDeflectionResult {
  total_deflection_mm: number;
  total_deflection_um: number;
  sections: SectionDeflection[];
  spindle_deflection_um: number;
  holder_deflection_um: number;
  tool_deflection_um: number;
  dominant_contributor: string;
  stiffness_n_mm: number;
  natural_frequency_hz: number;
  max_tolerance_achievable_mm: number;
  recommendations: string[];
}

const E_MODULUS: Record<string, number> = {
  carbide: 600000,  // MPa
  hss: 210000,
  steel: 210000,
  ceramic: 350000,
  cermet: 450000,
};

const TAPER_RIGIDITY: Record<string, number> = {
  BT30: 15,   // N/μm
  BT40: 25,
  CAT40: 25,
  CAT50: 40,
  "HSK-A63": 45,
  "HSK-A100": 80,
  "HSK-F63": 40,
};

export class ToolAssemblyDeflectionEngine {
  compute(input: AssemblyInput): AtomicValue<AssemblyDeflectionResult> {
    const { sections, cutting_force_n, taper } = input;
    const F = cutting_force_n;
    const forcePos = input.force_position || "tip";

    // Spindle nose rigidity
    const spindleRigidity = input.spindle_rigidity_n_um || TAPER_RIGIDITY[taper] || 25;
    const spindleDeflection_um = F / spindleRigidity;

    // Calculate cumulative deflection using cascaded beam model
    // Each section is a cantilever beam, and downstream sections amplify upstream angles
    const sectionResults: SectionDeflection[] = [];
    let totalLength = sections.reduce((s, sec) => s + sec.length_mm, 0);

    // Distance from spindle nose to force application point
    let forceDistance = totalLength;
    if (forcePos === "center") {
      const cuttingSections = sections.filter(s => s.is_cutting);
      if (cuttingSections.length > 0) {
        const lastCutting = cuttingSections[cuttingSections.length - 1];
        forceDistance = totalLength - lastCutting.length_mm / 2;
      }
    }

    // Cascaded beam: deflection at tip = sum of each section's contribution
    // For section i at distance L_i from fixed end:
    // δ_i = F * L_i² * (3*L_total - L_i) / (6 * E_i * I_i)  (for force at tip)
    // Plus angular amplification from upstream sections

    let cumulativeLength = 0;
    let totalDeflection_mm = 0;
    let totalAngle_rad = 0;

    for (const sec of sections) {
      const E = E_MODULUS[sec.material] || 210000;
      const I = (Math.PI / 64) * Math.pow(sec.diameter_mm, 4);
      const L = sec.length_mm;

      // Deflection of this section under force at its end
      const remainingLength = totalLength - cumulativeLength;
      const sectionDeflection = (F * Math.pow(L, 3)) / (3 * E * I);

      // Angle at end of this section
      const sectionAngle = (F * Math.pow(L, 2)) / (2 * E * I);

      // Contribution to tip deflection: own deflection + angle * remaining length
      const tipContribution = sectionDeflection + totalAngle_rad * L;

      totalDeflection_mm += tipContribution;
      totalAngle_rad += sectionAngle;
      cumulativeLength += L;

      sectionResults.push({
        name: sec.name,
        length_mm: L,
        diameter_mm: sec.diameter_mm,
        moment_of_inertia_mm4: Math.round(I * 100) / 100,
        e_modulus_mpa: E,
        deflection_at_tip_mm: Math.round(tipContribution * 10000) / 10000,
        angular_contribution_rad: Math.round(sectionAngle * 100000) / 100000,
        pct_of_total: 0, // filled after total is known
      });
    }

    // Add spindle deflection
    const spindleDeflection_mm = spindleDeflection_um / 1000;
    totalDeflection_mm += spindleDeflection_mm;
    // Spindle angle also amplifies all downstream deflections
    const spindleAngle = spindleDeflection_mm / 50; // approximate
    totalDeflection_mm += spindleAngle * totalLength;

    // Fill percentages
    for (const sr of sectionResults) {
      sr.pct_of_total = totalDeflection_mm > 0
        ? Math.round((sr.deflection_at_tip_mm / totalDeflection_mm) * 1000) / 10
        : 0;
    }

    // Categorize contributions
    let holderDeflection = 0, toolDeflection = 0;
    for (const sr of sectionResults) {
      const sec = sections.find(s => s.name === sr.name);
      if (sec?.is_cutting) toolDeflection += sr.deflection_at_tip_mm;
      else holderDeflection += sr.deflection_at_tip_mm;
    }

    // Find dominant contributor
    const dominant = sectionResults.reduce((a, b) =>
      a.deflection_at_tip_mm > b.deflection_at_tip_mm ? a : b
    );

    // Assembly stiffness
    const stiffness = totalDeflection_mm > 0 ? F / totalDeflection_mm : Infinity;

    // Natural frequency estimate (simplified single mass-spring)
    const toolMass_kg = sections.reduce((sum, s) => {
      const vol = Math.PI * Math.pow(s.diameter_mm / 2000, 2) * (s.length_mm / 1000);
      const density = s.material === "carbide" ? 14500 : 7850;
      return sum + vol * density;
    }, 0);
    const natFreq = toolMass_kg > 0
      ? (1 / (2 * Math.PI)) * Math.sqrt((stiffness * 1000) / toolMass_kg)
      : 0;

    // Max achievable tolerance (deflection ≈ tolerance / 2 for safety)
    const maxTolerance = totalDeflection_mm * 2;

    // Recommendations
    const recs: string[] = [];
    if (dominant.name.toLowerCase().includes("shank") || dominant.pct_of_total > 50) {
      recs.push(`${dominant.name} contributes ${dominant.pct_of_total}% of deflection — consider shorter overhang or larger diameter`);
    }
    if (spindleDeflection_um > 5) {
      recs.push(`Spindle deflection ${spindleDeflection_um.toFixed(1)}μm is significant — consider HSK taper for better rigidity`);
    }
    if (totalDeflection_mm > 0.05) {
      recs.push(`Total deflection ${(totalDeflection_mm * 1000).toFixed(1)}μm exceeds 50μm — reduce overhang or increase tool diameter`);
    }
    if (sections.some(s => s.length_mm / s.diameter_mm > 5)) {
      recs.push("L/D ratio > 5 detected — use vibration damping holder or reduce depth of cut");
    }

    const result: AssemblyDeflectionResult = {
      total_deflection_mm: Math.round(totalDeflection_mm * 10000) / 10000,
      total_deflection_um: Math.round(totalDeflection_mm * 10000) / 10,
      sections: sectionResults,
      spindle_deflection_um: Math.round(spindleDeflection_um * 10) / 10,
      holder_deflection_um: Math.round(holderDeflection * 10000) / 10,
      tool_deflection_um: Math.round(toolDeflection * 10000) / 10,
      dominant_contributor: dominant.name,
      stiffness_n_mm: Math.round(stiffness * 10) / 10,
      natural_frequency_hz: Math.round(natFreq),
      max_tolerance_achievable_mm: Math.round(maxTolerance * 10000) / 10000,
      recommendations: recs,
    };

    return {
      value: result,
      unit: "mm",
      formula: "cascaded_cantilever_beam_F*L³/(3EI)",
      confidence: 0.8,
    };
  }
}

export const toolAssemblyDeflectionEngine = new ToolAssemblyDeflectionEngine();
