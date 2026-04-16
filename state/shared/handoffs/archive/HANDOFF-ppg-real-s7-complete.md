/**
 * LATHE-PRO-MS3, U-LPS10
 * Integration tests: Op1/Op2 workflow for 5 part types
 * Each part type exercises a different workholding scenario.
 */

import { describe, it, expect } from "vitest";
import { latheMultiOpPlannerEngine } from "../engines/LatheMultiOpPlannerEngine.js";
import { latheWorkholdingEngine } from "../engines/LatheWorkholdingEngine.js";
import { lathePartClassifierEngine } from "../engines/LathePartClassifierEngine.js";
import { latheSequenceOptimizerEngine } from "../engines/LatheSequenceOptimizerEngine.js";
import type { MultiOpFeature } from "../engines/LatheMultiOpPlannerEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// HELPER — build features list
// ═══════════════════════════════════════════════════════════════════════

function makeFeature(partial: Partial<MultiOpFeature> & { id: string }): MultiOpFeature {
  return {
    type: "od_straight",
    position: "chuck_end",
    ...partial,
  };
}

// ══════════════════════════════════════════════════�