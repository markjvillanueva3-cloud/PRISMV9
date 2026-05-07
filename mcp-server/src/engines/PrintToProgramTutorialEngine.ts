/**
 * PrintToProgramTutorialEngine — P2P-FULLSTACK-MS0/U-P2PFS62
 *
 * Curated tutorial walkthroughs for the print-to-program pipeline. Tests
 * prove "it runs" and signatures prove "it looks right" — tutorials prove
 * *a human can learn from it*. Each walkthrough ties a fixture to:
 *
 *   - learning objectives the student should leave with
 *   - prerequisites they need walking in
 *   - an ordered sequence of reasoning steps
 *   - the common mistakes at each step
 *   - the expected outcome (what the program should look like when done)
 *
 * Purpose: give new operators (and new engineers landing in this repo)
 * a paved-road ramp from reading a print to shipping a program. The
 * walkthrough is the documentation layer the regression harness is NOT.
 *
 * This engine does NOT execute the pipeline — it owns the curriculum +
 * ordering logic. Execution is separate so curricula stay stable even
 * when the pipeline evolves.
 */

// ============================================================================
// TYPES
// ============================================================================

export type TutorialDifficulty = "beginner" | "intermediate" | "advanced" | "expert";

const DIFFICULTY_ORDER: Record<TutorialDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
};

export interface TutorialStep {
  /** 1-based ordinal. */
  step_number: number;
  title: string;
  /** What the student is asked to decide or do at this step. */
  decision: string;
  /** Why this decision matters — the principle behind it. */
  reasoning: string;
  /** Mistakes students commonly make at this step. */
  common_mistakes: string[];
  /** What the correct outcome of this step looks like. */
  expected_outcome: string;
}

export interface TutorialWalkthrough {
  /** Matches a fixture_id in the TestResourceRegistry (loose coupling — registry not required). */
  fixture_id: string;
  title: string;
  difficulty: TutorialDifficulty;
  /** Concepts the student needs BEFORE starting this walkthrough. */
  prerequisites: string[];
  /** What the student should know / be able to do after completing. */
  learning_objectives: string[];
  steps: TutorialStep[];
  estimated_minutes: number;
}

// ============================================================================
// SEED WALKTHROUGHS
// ============================================================================

const SEED: TutorialWalkthrough[] = [
  {
    fixture_id: "wedm-alcoa-10-32-punch",
    title: "Wire EDM: 10-32 internal punch relief",
    difficulty: "beginner",
    prerequisites: [
      "Reads fastener thread callouts (10-32 UNF)",
      "Knows the difference between a punch and a die",
    ],
    learning_objectives: [
      "Set up the wire path for an internal profile",
      "Choose wire diameter for the corner radius",
      "Understand why the lead-in matters on a blind cut",
    ],
    steps: [
      {
        step_number: 1,
        title: "Identify the thread minor diameter",
        decision: "Compute the minor diameter of 10-32 UNF (0.1389 in)",
        reasoning:
          "The relief must clear the thread's minor — undersize scraps the part, oversize wastes cycle time.",
        common_mistakes: ["Using major instead of minor diameter", "Forgetting unit conversion"],
        expected_outcome: "Minor diameter computed to 3 decimal places.",
      },
      {
        step_number: 2,
        title: "Select wire + corner radius",
        decision: "Pick 0.010 in brass wire and confirm 0.006 in min corner radius fits the print",
        reasoning:
          "Wire radius = wire_dia/2 + spark_gap. 0.006 in inside corner needs ≤0.010 in wire.",
        common_mistakes: ["Ignoring spark gap in the radius math", "Picking 0.012 in 'because it cuts faster'"],
        expected_outcome: "Wire + path-radius pair that satisfies the print's corner callout.",
      },
      {
        step_number: 3,
        title: "Plan the lead-in",
        decision: "Enter the cut at a tangent point on the clearance bore, not a sharp corner",
        reasoning:
          "Lead-in witness marks survive into the finished part. Tangent entries hide them where the thread will be cut away.",
        common_mistakes: ["Entering at a corner and leaving a witness in the land"],
        expected_outcome: "Entry point chosen tangent to the bore wall in a scrap region.",
      },
    ],
    estimated_minutes: 20,
  },
  {
    fixture_id: "sinker-alcoa-1-4-20-cavity",
    title: "Sinker EDM: 1/4-20 UNC cavity with finish stage",
    difficulty: "intermediate",
    prerequisites: [
      "Has completed the WEDM 10-32 punch tutorial",
      "Knows electrode material vs wear-ratio tradeoff",
    ],
    learning_objectives: [
      "Stage the burn as rough → semi → finish",
      "Size the Z-oversize for end-wear compensation",
      "Pick flushing mode for the aspect ratio",
    ],
    steps: [
      {
        step_number: 1,
        title: "Stage the cavity",
        decision: "Decide on 3 stages (rough 0.15 mm gap → semi 0.08 → finish 0.03)",
        reasoning:
          "Rough removes bulk, semi refines, finish achieves Ra ≤ 0.8. Skipping semi means finish electrode does rough work and burns up.",
        common_mistakes: ["Two-stage plan that overworks the finish electrode"],
        expected_outcome: "3-stage plan with correct gap progression.",
      },
      {
        step_number: 2,
        title: "Size the end-wear comp",
        decision: "ΔZ = wear_ratio/100 × depth × 1.3 (safety factor)",
        reasoning:
          "Electrode shortens as it burns. Without Z-oversize the finished cavity is shallow. 1.3 SF covers measurement + material variability.",
        common_mistakes: ["Using SF=1.0 and getting a shallow cavity", "Forgetting wear_ratio is %"],
        expected_outcome: "Per-stage Z-oversize values with units.",
      },
      {
        step_number: 3,
        title: "Choose flushing",
        decision: "AR (depth/min-dim) = 10/4 = 2.5 — pressure flush through the electrode",
        reasoning:
          "AR > 3 + flush hole → pressure. AR > 5 without flush hole → pressure with warning. AR ≤ 3 + open top → jet is fine.",
        common_mistakes: ["Using jet on a deep blind cavity and arcing"],
        expected_outcome: "Flush mode + pressure recommendation.",
      },
    ],
    estimated_minutes: 35,
  },
  {
    fixture_id: "wedm-itw-m5-x-10-die",
    title: "Wire EDM: M5×10 die with multi-pass finish",
    difficulty: "advanced",
    prerequisites: [
      "Has completed intermediate tutorials",
      "Understands multi-pass wire EDM (rough + skim passes)",
    ],
    learning_objectives: [
      "Plan a 4-pass rough+skim strategy",
      "Compute offset per pass from the kerf + spark gap",
      "Interpret the print's ±0.005 mm callout into machine tolerance",
    ],
    steps: [
      {
        step_number: 1,
        title: "Budget the passes",
        decision: "1 rough @ full offset, 3 skim passes at decreasing offset",
        reasoning:
          "Single-pass WEDM leaves recast layer and can't hit ±5 µm. Skims peel the recast and chase tolerance.",
        common_mistakes: ["Budgeting 1 skim and scrapping on size"],
        expected_outcome: "Pass count + per-pass offset schedule.",
      },
      {
        step_number: 2,
        title: "Offset per pass",
        decision: "Rough offset = wire_rad + spark_gap + 3×skim_removal",
        reasoning:
          "Each skim removes ~2-5 µm. Rough must leave enough stock for skims to converge without recutting undersize.",
        common_mistakes: ["Using the same offset across passes and finishing undersize"],
        expected_outcome: "4 offset values in descending order.",
      },
    ],
    estimated_minutes: 50,
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class PrintToProgramTutorialEngine {
  private readonly _walkthroughs = new Map<string, TutorialWalkthrough>();

  constructor(seed: TutorialWalkthrough[] = SEED) {
    for (const w of seed) {
      if (this._walkthroughs.has(w.fixture_id)) {
        throw new Error(`Duplicate tutorial fixture_id in seed: ${w.fixture_id}`);
      }
      this._walkthroughs.set(w.fixture_id, this._clone(w));
    }
  }

  /** Deep-cloned snapshot of all walkthroughs. */
  walkthroughs(): TutorialWalkthrough[] {
    return Array.from(this._walkthroughs.values()).map((w) => this._clone(w));
  }

  /** Get a single walkthrough by fixture_id. */
  getWalkthrough(fixture_id: string): TutorialWalkthrough | undefined {
    const w = this._walkthroughs.get(fixture_id);
    return w ? this._clone(w) : undefined;
  }

  /** Register a new walkthrough — throws on duplicate or empty id. */
  registerWalkthrough(w: TutorialWalkthrough): TutorialWalkthrough {
    if (!w.fixture_id) throw new Error("Walkthrough fixture_id is required");
    if (this._walkthroughs.has(w.fixture_id)) {
      throw new Error(`Tutorial already registered for fixture: ${w.fixture_id}`);
    }
    if (w.steps.length === 0) {
      throw new Error("Walkthrough must have at least one step");
    }
    // Validate step ordinals are 1..N
    for (let i = 0; i < w.steps.length; i++) {
      if (w.steps[i].step_number !== i + 1) {
        throw new Error(
          `Walkthrough steps must be 1-based sequential; got ${w.steps[i].step_number} at index ${i}`,
        );
      }
    }
    this._walkthroughs.set(w.fixture_id, this._clone(w));
    return this.getWalkthrough(w.fixture_id)!;
  }

  /** Remove a walkthrough. Returns true if it existed. */
  unregisterWalkthrough(fixture_id: string): boolean {
    return this._walkthroughs.delete(fixture_id);
  }

  /** All walkthroughs at a given difficulty tier. */
  byDifficulty(level: TutorialDifficulty): TutorialWalkthrough[] {
    return this.walkthroughs().filter((w) => w.difficulty === level);
  }

  /**
   * Progression ladder — walkthroughs sorted by difficulty then by
   * estimated_minutes (shorter first within a tier). This is the
   * recommended order for a new operator to work through.
   */
  progressionLadder(): TutorialWalkthrough[] {
    return this.walkthroughs().sort((a, b) => {
      const d = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
      if (d !== 0) return d;
      return a.estimated_minutes - b.estimated_minutes;
    });
  }

  /**
   * The walkthrough that should come AFTER the one at fixture_id.
   * Undefined if fixture_id is the last in the ladder or not registered.
   */
  nextAfter(fixture_id: string): TutorialWalkthrough | undefined {
    const ladder = this.progressionLadder();
    const idx = ladder.findIndex((w) => w.fixture_id === fixture_id);
    if (idx === -1) return undefined;
    return ladder[idx + 1];
  }

  /** Total time the full curriculum takes. */
  totalEstimatedMinutes(): number {
    return this.walkthroughs().reduce((s, w) => s + w.estimated_minutes, 0);
  }

  // ── internals ──

  private _clone(w: TutorialWalkthrough): TutorialWalkthrough {
    return {
      fixture_id: w.fixture_id,
      title: w.title,
      difficulty: w.difficulty,
      prerequisites: [...w.prerequisites],
      learning_objectives: [...w.learning_objectives],
      steps: w.steps.map((s) => ({
        step_number: s.step_number,
        title: s.title,
        decision: s.decision,
        reasoning: s.reasoning,
        common_mistakes: [...s.common_mistakes],
        expected_outcome: s.expected_outcome,
      })),
      estimated_minutes: w.estimated_minutes,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const printToProgramTutorialEngine = new PrintToProgramTutorialEngine();
