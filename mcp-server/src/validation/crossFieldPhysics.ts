/**
 * PRISM MCP Server - Cross-Field Physics Validation
 * Post-schema imperative checks for physically impossible calc results.
 * 
 * JSON Schema validates fields independently. It CANNOT validate physical relationships.
 * A result of { Vc: 300, fz: 0.8, Fc: 500 } for Inconel 718 passes every field bound
 * but Fc should be ~8000-12000N at those parameters. This module catches those violations.
 * 
 * THIS IS THE SINGLE MOST IMPORTANT SAFETY ADDITION IN v13.5.
 * Schema validation guarantees structure. Cross-field validation guarantees physics.
 * 
 * @module validation/crossFieldPhysics
 * @safety CRITICAL — Violations throw SafetyBlockError with S(x)=0.0.
 */

import { SafetyBlockError } from '../errors/PrismError.js';
import type { SafetyCalcResult } from '../schemas/safetyCalcSchema.js';

/** Material hardness classification for force plausibility checks */
type MaterialClass = 'soft' | 'medium' | 'hard' | 'superalloy' | 'unknown';

/** Classify material by name into hardness class for physics checks */
function classifyMaterial(material: string): MaterialClass {
  const m = material.toLowerCase();
  // Soft materials — aluminum, copper, brass
  if (/alum|6061|7075|2024|copper|brass|bronze|cu-/.test(m)) return 'soft';
  // Superalloys — Inconel, Waspaloy, Hastelloy, titanium
  if (/inconel|waspaloy|hastelloy|monel|ti-|titanium|nimonic/.test(m)) return 'superalloy';
  // Hard materials — tool steel, hardened steel (>45 HRC)
  if (/d2|m2|h13|a2|s7|hss|tool.?steel|hard/.test(m)) return 'hard';
  // Medium — alloy steels, stainless, cast iron
  if (/4140|4340|1045|316|304|a36|fc300|cast.?iron|steel|stainless/.test(m)) return 'medium';
  return 'unknown';
}

/**
 * Validate cross-field physical relationships in a safety calc result.
 * Run AFTER structured output schema validation passes.
 * 
 * Checks:
 * 1. RPM consistency: n_rpm ≈ (Vc × 1000) / (π × D) — if both present
 * 2. Force plausibility: Fc must scale with material hardness
 * 3. Tool life vs speed inverse: higher Vc → lower tool_life (Taylor's law)
 * 4. Feed rate vs material class: fz limits vary by hardness
 * 
 * @throws {SafetyBlockError} with S(x)=0.0 for physically impossible results
 */
export function validateCrossFieldPhysics(result: SafetyCalcResult): void {
  const materialClass = classifyMaterial(result.material);
  const violations: string[] = [];

  // CHECK 1: Force plausibility — Fc must scale with material hardness
  if (result.Fc !== undefined && result.Fc > 0) {
    if (materialClass === 'superalloy' && result.Vc > 80 && result.Fc < 2000) {
      violations.push(
        `Force implausibly low for superalloy: Fc=${result.Fc}N at Vc=${result.Vc}m/min. ` +
        `Expected Fc > 2000N for ${result.material} at this speed.`
      );
    }
    if (materialClass === 'soft' && result.Vc > 200 && result.Fc > 3000) {
      violations.push(
        `Force implausibly high for soft material: Fc=${result.Fc}N at Vc=${result.Vc}m/min. ` +
        `Expected Fc < 3000N for ${result.material} at this speed.`
      );
    }
  }

  // CHECK 2: Feed rate vs material class limits
  if (materialClass === 'superalloy' && result.fz > 0.5) {
    violations.push(
      `Feed rate dangerously high for superalloy: fz=${result.fz}mm/tooth. ` +
      `Maximum safe fz for ${result.material} is typically ≤0.5mm/tooth.`
    );
  }

  // CHECK 3: Tool life vs speed inverse (Taylor's law)
  // Only check if tool_life is provided — it's optional in the schema
  if (result.tool_life_min !== undefined && result.tool_life_min > 0) {
    // Superalloys at high speed should not have long tool life
    if (materialClass === 'superalloy' && result.Vc > 60 && result.tool_life_min > 60) {
      violations.push(
        `Tool life implausibly long for superalloy at high speed: ` +
        `${result.tool_life_min}min at Vc=${result.Vc}m/min for ${result.material}. ` +
        `Expected < 60min by Taylor's law.`
      );
    }
    // Soft materials at low speed should not have very short tool life
    if (materialClass === 'soft' && result.Vc < 200 && result.tool_life_min < 5) {
      violations.push(
        `Tool life implausibly short for soft material at low speed: ` +
        `${result.tool_life_min}min at Vc=${result.Vc}m/min for ${result.material}. ` +
        `Expected > 5min for aluminum-class materials.`
      );
    }
  }

  // CHECK 4: RPM and Vc consistency (if n_rpm provided)
  // n_rpm = (Vc × 1000) / (π × D). Without D, we can at least check order-of-magnitude.
  if (result.n_rpm !== undefined && result.n_rpm > 0) {
    // If Vc is very low but RPM is very high (or vice versa), diameter implied is unrealistic
    // Vc=1000 m/min at n_rpm=100 implies D=3183mm (impossible)
    // Vc=10 m/min at n_rpm=50000 implies D=0.06mm (impossible for most operations)
    const impliedD_mm = (result.Vc * 1000) / (Math.PI * result.n_rpm);
    if (impliedD_mm > 1000) {
      violations.push(
        `RPM/Vc inconsistency: implied tool diameter ${impliedD_mm.toFixed(0)}mm exceeds ` +
        `any standard tool (Vc=${result.Vc}, n_rpm=${result.n_rpm}).`
      );
    }
    if (impliedD_mm < 0.1) {
      violations.push(
        `RPM/Vc inconsistency: implied tool diameter ${impliedD_mm.toFixed(3)}mm is below ` +
        `any practical tool (Vc=${result.Vc}, n_rpm=${result.n_rpm}).`
      );
    }
  }

  // If ANY violation → physically impossible result → S(x)=0.0
  if (violations.length > 0) {
    throw new SafetyBlockError(
      `Cross-field physics validation failed:\n${violations.join('\n')}`,
      0.0, // Physically impossible results are never safe
    );
  }
}
