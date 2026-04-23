/**
 * propose-goal-wiring.test.ts — PP-0.18-SKILL-PROPOSE-GOAL
 *
 * Verifies that the two engines the `/propose-goal` skill depends on are
 * reachable through aiReasoningDispatcher and that their contracts match
 * what the skill invokes.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { autonomousGoalSynthesisEngine } from "../engines/AutonomousGoalSynthesisEngine.js";
import { transferLearningBridgeEngine } from "../engines/TransferLearningBridgeEngine.js";

const DISPATCHER_PATH = path.join(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");

describe("/propose-goal skill wiring (PP-0.18)", () => {
  const dispatcherSrc = fs.readFileSync(DISPATCHER_PATH, "utf8");

  describe("dispatcher z.enum declares required actions", () => {
    it("declares autonomous_goal_propose", () => {
      expect(dispatcherSrc).toContain('"autonomous_goal_propose"');
    });
    it("declares transfer_bridge_find_analogies", () => {
      expect(dispatcherSrc).toContain('"transfer_bridge_find_analogies"');
    });
  });

  describe("dispatcher switch handles the cases", () => {
    it("has case 'autonomous_goal_propose'", () => {
      expect(dispatcherSrc).toContain('case "autonomous_goal_propose"');
    });
    it("has case 'transfer_bridge_find_analogies'", () => {
      expect(dispatcherSrc).toContain('case "transfer_bridge_find_analogies"');
    });
  });

  describe("engine singleton contracts", () => {
    it("autonomousGoalSynthesisEngine.propose exists and accepts (gaps, limit)", () => {
      expect(typeof autonomousGoalSynthesisEngine.propose).toBe("function");
      const out = autonomousGoalSynthesisEngine.propose(
        [
          { id: "a", kind: "psi-deficit", title: "close mill calc gap", psiImpact: 9, urgency: 0.8, feasibility: 1 },
          { id: "b", kind: "orphan-surface", title: "wire post stub", psiImpact: 5, urgency: 0.5, feasibility: 0.7 },
        ],
        2,
      );
      expect(Array.isArray(out)).toBe(true);
      expect(out.length).toBe(2);
      expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
      expect(out[0].id).toBe("a"); // higher Ψ×urgency×feasibility
    });

    it("transferLearningBridgeEngine.findAnalogies accepts {description, domain, tags}", () => {
      transferLearningBridgeEngine.clear();
      transferLearningBridgeEngine.register({
        id: "t1",
        domain: "turning",
        title: "Adaptive spindle RPM",
        description: "adaptive spindle rpm control",
        tags: ["adaptive", "spindle"],
        solution: "variation ±7%",
      });
      const matches = transferLearningBridgeEngine.findAnalogies({
        description: "adaptive spindle control",
        domain: "milling",
        tags: ["adaptive", "spindle"],
      });
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].crossDomain).toBe(true);
      transferLearningBridgeEngine.clear();
    });
  });

  describe("skill file is present and well-formed", () => {
    // Resolve the H:/.claude/commands/propose-goal.md path robustly.
    const candidates = [
      path.join("H:", ".claude", "commands", "propose-goal.md"),
      path.join("h:", ".claude", "commands", "propose-goal.md"),
      "/h/.claude/commands/propose-goal.md",
    ];
    const skillPath = candidates.find((p) => fs.existsSync(p));

    it("skill file exists on H: drive", () => {
      expect(skillPath).toBeDefined();
    });

    it("skill frontmatter declares both engines and both actions", () => {
      if (!skillPath) return;
      const body = fs.readFileSync(skillPath, "utf8");
      expect(body).toContain("AutonomousGoalSynthesisEngine");
      expect(body).toContain("TransferLearningBridgeEngine");
      expect(body).toContain("autonomous_goal_propose");
      expect(body).toContain("transfer_bridge_find_analogies");
      expect(body).toContain("name: propose-goal");
    });
  });
});
