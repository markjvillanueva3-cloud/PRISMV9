/**
 * phase-018-hooks-wiring.test.ts — PP-0.18 HOOKS WIRING
 *
 * Verifies that the six Phase 0.18 AGI Proximity hooks are:
 *   1. Present on disk at H:/.claude/hooks (or /h/prism/.claude/hooks mount)
 *   2. Parse as valid ES modules (shebang + main entry + exit path)
 *   3. Registered in .claude/settings.json under the correct event matcher
 *
 * Specs come from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md lines
 * 735–740:
 *   hook_session_goal_synthesis    SessionStart            session-start-goal-inject.mjs
 *   hook_pre_tool_causal_trace     PreTool Write|Edit      pretool-causal-trace.mjs
 *   hook_pre_tool_simulate         PreTool Write           pretool-world-simulator.mjs (pre-existing)
 *   hook_idle_curiosity_v2         PostTool every N=50     posttool-curiosity-tick.mjs
 *   hook_post_session_peer_share   SessionEnd/Stop         session-end-peer-share.mjs
 *   hook_emergence_scan            PostTool every N=100    posttool-emergence-scan.mjs
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

interface HookSpec {
  filename: string;
  event: "PreToolUse" | "PostToolUse" | "SessionStart" | "Stop";
  matcher?: string;
  planMilestone: string;
}

const SPECS: HookSpec[] = [
  { filename: "session-start-goal-inject.mjs", event: "SessionStart", planMilestone: "PP-0.18 U-AGI1" },
  { filename: "pretool-causal-trace.mjs", event: "PreToolUse", matcher: "^(Write|Edit)$", planMilestone: "PP-0.18 U-AGI2" },
  { filename: "pretool-world-simulator.mjs", event: "PreToolUse", matcher: "^(Write|Edit|Bash)$", planMilestone: "PP-0.18 U-AGI9" },
  { filename: "posttool-curiosity-tick.mjs", event: "PostToolUse", planMilestone: "PP-0.18 U-AGI5" },
  { filename: "session-end-peer-share.mjs", event: "Stop", planMilestone: "PP-0.18 U-AGI14" },
  { filename: "posttool-emergence-scan.mjs", event: "PostToolUse", planMilestone: "PP-0.18 U-AGI11" },
];

const HOOK_DIR_CANDIDATES = [
  path.join("H:", "prism", ".claude", "hooks"),
  path.join("h:", "prism", ".claude", "hooks"),
  "/h/prism/.claude/hooks",
];
const SETTINGS_CANDIDATES = [
  path.join("H:", ".claude", "settings.json"),
  path.join("H:", "prism", ".claude", "settings.json"),
  "/h/prism/.claude/settings.json",
  path.join("h:", "prism", ".claude", "settings.json"),
];

const hookDir = HOOK_DIR_CANDIDATES.find((d) => fs.existsSync(d));
// Phase 0.18 hooks live in the project-level settings.json under .claude/
// at the PRISM repo root. Pick the first candidate that has a `hooks` key
// populated with the Phase 0.18 events we care about.
const settingsPath = SETTINGS_CANDIDATES.find((p) => {
  if (!fs.existsSync(p)) return false;
  try {
    const doc = JSON.parse(fs.readFileSync(p, "utf-8"));
    return doc?.hooks?.SessionStart || doc?.hooks?.Stop || doc?.hooks?.PostToolUse;
  } catch { return false; }
});

describe("Phase 0.18 hooks wiring (6 hooks)", () => {
  describe("hook files are present and well-formed", () => {
    it("hook directory resolvable", () => {
      expect(hookDir).toBeDefined();
    });

    for (const spec of SPECS) {
      it(`${spec.filename} exists`, () => {
        if (!hookDir) return;
        expect(fs.existsSync(path.join(hookDir, spec.filename))).toBe(true);
      });

      it(`${spec.filename} has shebang + main + exit path`, () => {
        if (!hookDir) return;
        const body = fs.readFileSync(path.join(hookDir, spec.filename), "utf-8");
        expect(body.startsWith("#!/usr/bin/env node")).toBe(true);
        expect(body).toMatch(/async function main\s*\(/);
        expect(body).toMatch(/process\.exit\(0\)/);
      });

      it(`${spec.filename} declares its plan milestone`, () => {
        if (!hookDir) return;
        const body = fs.readFileSync(path.join(hookDir, spec.filename), "utf-8");
        expect(body).toContain(spec.planMilestone);
      });
    }
  });

  describe(".claude/settings.json registers every hook under its event", () => {
    it("settings.json resolvable", () => {
      expect(settingsPath).toBeDefined();
    });

    const settings: any = settingsPath ? JSON.parse(fs.readFileSync(settingsPath, "utf-8")) : null;

    for (const spec of SPECS) {
      it(`${spec.filename} is wired under ${spec.event}${spec.matcher ? ` matcher=${spec.matcher}` : ""}`, () => {
        if (!settings) return;
        const entries = settings.hooks?.[spec.event];
        expect(Array.isArray(entries)).toBe(true);
        const hasHook = entries.some((entry: any) => {
          const matcherMatches = spec.matcher ? entry.matcher === spec.matcher : true;
          if (!matcherMatches) return false;
          return (entry.hooks || []).some((h: any) =>
            typeof h.command === "string" && h.command.includes(spec.filename),
          );
        });
        expect(hasHook).toBe(true);
      });
    }
  });

  describe("Phase 0.18 hook semantics (plan anti-patterns)", () => {
    it("hook_idle_curiosity_v2 rate-limits at 1-per-50 (plan line 758)", () => {
      if (!hookDir) return;
      const body = fs.readFileSync(path.join(hookDir, "posttool-curiosity-tick.mjs"), "utf-8");
      expect(body).toMatch(/TICK_EVERY\s*=\s*50/);
    });

    it("hook_emergence_scan scans at 1-per-100 (plan line 740)", () => {
      if (!hookDir) return;
      const body = fs.readFileSync(path.join(hookDir, "posttool-emergence-scan.mjs"), "utf-8");
      expect(body).toMatch(/SCAN_EVERY\s*=\s*100/);
    });

    it("hook_pre_tool_causal_trace bounds at 3 hops (plan line 759)", () => {
      if (!hookDir) return;
      const body = fs.readFileSync(path.join(hookDir, "pretool-causal-trace.mjs"), "utf-8");
      expect(body).toMatch(/MAX_HOPS\s*=\s*3/);
    });

    it("hook_post_session_peer_share filters sensitive data (plan line 760)", () => {
      if (!hookDir) return;
      const body = fs.readFileSync(path.join(hookDir, "session-end-peer-share.mjs"), "utf-8");
      expect(body).toMatch(/SENSITIVE_TOKENS/);
      expect(body).toMatch(/password|api[-_]?key|secret/i);
    });

    it("hook_session_goal_synthesis gates on awareness ≥0.80 (plan line 735)", () => {
      if (!hookDir) return;
      const body = fs.readFileSync(path.join(hookDir, "session-start-goal-inject.mjs"), "utf-8");
      expect(body).toMatch(/AWARENESS_GATE\s*=\s*0\.80/);
    });
  });
});
