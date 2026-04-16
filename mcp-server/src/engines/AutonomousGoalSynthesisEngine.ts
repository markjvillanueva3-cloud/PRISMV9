/**
 * AutonomousGoalSynthesisEngine — Generate goals instead of waiting for them
 *
 * Phase 0.18 U-AGI1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Scans declared
 * "gaps" — orphan surfaces, Ψ deficits, failing tests, extraction candidates,
 * user-model desires — and synthesises the top-N goals ranked by
 * Ψ_impact × urgency × feasibility. Output is suggestions, not commands; the
 * session still decides.
 *
 * No I/O. Callers feed a gap descriptor list; the engine ranks them.
 *
 * @module engines/AutonomousGoalSynthesisEngine
 * @milestone PP-0.18-U-AGI1
 */

export type GapKind =
  | "orphan-surface"
  | "psi-deficit"
  | "failing-test"
  | "extraction-candidate"
  | "user-desire"
  | "peer-insight"
  | "other";

export interface GapDescriptor {
  id: string;
  kind: GapKind;
  title: string;
  psiImpact: number; // 0..10 (percentage-point potential)
  urgency: number; // 0..1
  feasibility: number; // 0..1
  tags?: string[];
  origin?: string;
}

export interface SynthesizedGoal {
  id: string;
  kind: GapKind;
  title: string;
  score: number;
  rationale: string;
  source: GapDescriptor;
}

export class AutonomousGoalSynthesisEngine {
  propose(gaps: readonly GapDescriptor[], limit = 3): SynthesizedGoal[] {
    this.assertUnique(gaps);
    const scored: SynthesizedGoal[] = gaps.map((g) => {
      this.assertValid(g);
      const score = this.round4(g.psiImpact * g.urgency * g.feasibility);
      return {
        id: g.id,
        kind: g.kind,
        title: g.title,
        score,
        rationale: `Ψ=${g.psiImpact} × urgency=${g.urgency} × feasibility=${g.feasibility} = ${score}`,
        source: g,
      };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    return limit > 0 ? scored.slice(0, limit) : scored;
  }

  private assertUnique(gaps: readonly GapDescriptor[]): void {
    const seen = new Set<string>();
    for (const g of gaps) {
      if (seen.has(g.id)) throw new Error(`duplicate gap id: ${g.id}`);
      seen.add(g.id);
    }
  }

  private assertValid(g: GapDescriptor): void {
    if (!g.id || g.id.trim() === "") throw new Error("id required");
    if (!g.title || g.title.trim() === "") throw new Error("title required");
    if (!Number.isFinite(g.psiImpact) || g.psiImpact < 0 || g.psiImpact > 10) throw new Error("psiImpact must be in [0,10]");
    if (!(g.urgency >= 0 && g.urgency <= 1)) throw new Error("urgency must be in [0,1]");
    if (!(g.feasibility >= 0 && g.feasibility <= 1)) throw new Error("feasibility must be in [0,1]");
  }

  private round4(n: number): number {
    return Math.round(n * 10000) / 10000;
  }
}

export const autonomousGoalSynthesisEngine = new AutonomousGoalSynthesisEngine();
