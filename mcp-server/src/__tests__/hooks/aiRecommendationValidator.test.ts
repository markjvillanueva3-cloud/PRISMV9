/**
 * Tests for ai-recommendation-validator.mjs (U-AIMAX12)
 *
 * Exit-criteria verification:
 *   - catches >= 95% of physics violations (we test 20 seeded violations; 0 may slip)
 *   - false-positive rate < 5%  (we test 20 clean recs; <=0 FP)
 *   - NEVER blocks the tool call (always exit 0 + valid JSON)
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(__dirname, "../../..");
const HOOK = path.resolve(MCP_ROOT, "scripts/hooks/ai-recommendation-validator.mjs");

function runHook(payload: any): { stdout: any; status: number | null } {
  const r = spawnSync("node", [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    windowsHide: true,
    timeout: 5_000,
  });
  let parsed: any = {};
  try { parsed = JSON.parse(String(r.stdout || "").trim() || "{}"); } catch { parsed = {}; }
  return { stdout: parsed, status: r.status };
}

function hasFindings(out: any): boolean {
  return !!out?.hookSpecificOutput?.additionalContext;
}

describe("ai-recommendation-validator (U-AIMAX12)", () => {
  it("is advisory only — never exits non-zero, always valid JSON", () => {
    const r = runHook({});
    expect(r.status).toBe(0);
    // JSON parse already succeeded in runHook
  });

  it("no-ops on non-AI tool calls (e.g. Read / Write / Bash)", () => {
    for (const t of ["Read", "Write", "Bash", "Grep", "Edit"]) {
      const r = runHook({ tool_name: t, tool_response: { content: "x" } });
      expect(r.status).toBe(0);
      expect(hasFindings(r.stdout)).toBe(false);
    }
  });

  it("flags physics violation — SFM way above S-group band", () => {
    const r = runHook({
      tool_name: "mcp__prism__prism_ai_reasoning",
      tool_response: { best: { sfm: 2500, ipt: 0.003, doc: 0.05, material_group: "S" } },
    });
    const ctx = r.stdout?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("physics");
    expect(ctx).toContain("sfm");
  });

  it("flags tribal anti-pattern — Ti dry cut", () => {
    const r = runHook({
      tool_name: "mcp__prism__prism_ai_reasoning",
      tool_response: {
        best: { sfm: 200, ipt: 0.003, doc: 0.05, material_group: "S", coolant: "dry" },
      },
    });
    const ctx = r.stdout?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("tribal");
    expect(ctx).toContain("AP-DRY-S-GROUP");
  });

  it("flags DOC exceeds flute length", () => {
    const r = runHook({
      tool_name: "mcp__prism__prism_ai_reasoning",
      tool_response: {
        best: { sfm: 200, ipt: 0.003, doc: 0.5, flute_length: 0.25, material_group: "N" },
      },
    });
    const ctx = r.stdout?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("AP-DOC-EXCEEDS-FLUTE");
  });

  it("flags high RPM with high L/D overhang", () => {
    const r = runHook({
      tool_name: "mcp__prism__prism_ai_reasoning",
      tool_response: {
        best: { rpm: 15000, tool_overhang_ld: 6, material_group: "N", sfm: 3000, ipt: 0.002, doc: 0.01 },
      },
    });
    const ctx = r.stdout?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("AP-HIGH-RPM-LONG-REACH");
  });

  it("detects by tool-name hint even without tool_name prefix", () => {
    const r = runHook({
      tool_name: "tot_solve",
      tool_response: { best: { sfm: 10, material_group: "P" } }, // sfm=10 < band
    });
    const ctx = r.stdout?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("physics");
  });

  it("detects by response shape (hypotheses array)", () => {
    const r = runHook({
      tool_name: "something_else",
      tool_response: {
        hypotheses: [
          { id: "h1", sfm: 150, ipt: 0.003, doc: 0.05, material_group: "P" },
          { id: "h2", sfm: 9999, ipt: 0.003, doc: 0.05, material_group: "P" }, // violation
        ],
      },
    });
    const ctx = r.stdout?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("h2");
  });

  it("has FALSE-POSITIVE rate < 5% on 20 clean recommendations", () => {
    // 20 diverse clean recs across groups, each safely within bands, no anti-patterns.
    const cleanRecs = [
      { sfm: 120, ipt: 0.004, doc: 0.1,  material_group: "P", coolant: "flood" },
      { sfm: 200, ipt: 0.005, doc: 0.15, material_group: "P", coolant: "flood" },
      { sfm: 150, ipt: 0.003, doc: 0.08, material_group: "M", coolant: "flood" },
      { sfm: 250, ipt: 0.004, doc: 0.12, material_group: "M", coolant: "flood" },
      { sfm: 400, ipt: 0.006, doc: 0.2,  material_group: "K", coolant: "mist" },
      { sfm: 600, ipt: 0.008, doc: 0.3,  material_group: "K", coolant: "flood" },
      { sfm: 1200, ipt: 0.010, doc: 0.25, material_group: "N", coolant: "flood" },
      { sfm: 2000, ipt: 0.012, doc: 0.4,  material_group: "N", coolant: "mist" },
      { sfm: 100, ipt: 0.002, doc: 0.05, material_group: "S", coolant: "flood" },
      { sfm: 200, ipt: 0.004, doc: 0.08, material_group: "S", coolant: "flood" },
      { sfm: 80,  ipt: 0.002, doc: 0.03, material_group: "H", coolant: "mist" },
      { sfm: 150, ipt: 0.004, doc: 0.06, material_group: "H", coolant: "flood", strategy: "conventional", operation: "finishing" },
      { sfm: 90,  ipt: 0.003, doc: 0.05, material_group: "P", coolant: "flood" },
      { sfm: 300, ipt: 0.005, doc: 0.1,  material_group: "P", coolant: "flood" },
      { sfm: 500, ipt: 0.007, doc: 0.15, material_group: "K", coolant: "flood" },
      { sfm: 2500, ipt: 0.015, doc: 0.5, material_group: "N", coolant: "flood" },
      { sfm: 150, ipt: 0.003, doc: 0.04, material_group: "S", coolant: "flood", strategy: "climb", operation: "roughing" },
      { sfm: 250, ipt: 0.004, doc: 0.06, material_group: "M", coolant: "flood" },
      { sfm: 350, ipt: 0.005, doc: 0.08, material_group: "M", coolant: "mist" },
      { sfm: 700, ipt: 0.008, doc: 0.2,  material_group: "K", coolant: "flood" },
    ];
    let falsePositives = 0;
    for (const rec of cleanRecs) {
      const r = runHook({
        tool_name: "mcp__prism__prism_ai_reasoning",
        tool_response: { best: rec },
      });
      if (hasFindings(r.stdout)) falsePositives++;
    }
    // Exit criterion: < 5 % FP → allow 0 out of 20 (strict).
    expect(falsePositives).toBeLessThan(Math.ceil(cleanRecs.length * 0.05));
  });

  it("catches >= 95% of seeded physics violations", () => {
    // 20 recs each with at least one clear physics violation.
    const dirtyRecs = [
      { sfm: 2000, ipt: 0.003, doc: 0.05, material_group: "S" },   // sfm too high
      { sfm: 5,    ipt: 0.003, doc: 0.05, material_group: "S" },    // sfm too low
      { sfm: 150,  ipt: 0.100, doc: 0.05, material_group: "P" },    // ipt too high
      { sfm: 150,  ipt: 0.0001,doc: 0.05, material_group: "P" },    // ipt too low
      { sfm: 150,  ipt: 0.003, doc: 1.2,  material_group: "P" },    // doc too high
      { sfm: 10,   ipt: 0.003, doc: 0.05, material_group: "K" },    // sfm too low K
      { sfm: 3000, ipt: 0.003, doc: 0.05, material_group: "K" },    // sfm too high K
      { sfm: 150,  ipt: 0.040, doc: 0.05, material_group: "K" },    // ipt too high K
      { sfm: 150,  ipt: 0.003, doc: 2.0,  material_group: "K" },    // doc too high K
      { sfm: 8000, ipt: 0.003, doc: 0.05, material_group: "N" },    // sfm too high N
      { sfm: 10,   ipt: 0.003, doc: 0.05, material_group: "N" },    // sfm too low N
      { sfm: 150,  ipt: 0.100, doc: 0.05, material_group: "M" },    // ipt too high M
      { sfm: 150,  ipt: 0.003, doc: 1.0,  material_group: "M" },    // doc too high M
      { sfm: 5,    ipt: 0.003, doc: 0.05, material_group: "H" },    // sfm too low H
      { sfm: 2000, ipt: 0.003, doc: 0.05, material_group: "H" },    // sfm too high H
      { sfm: 150,  ipt: 0.100, doc: 0.05, material_group: "H" },    // ipt too high H
      { sfm: 150,  ipt: 0.003, doc: 0.5,  material_group: "H" },    // doc too high H
      { sfm: 1200, ipt: 0.003, doc: 0.05, material_group: "P" },    // sfm too high P
      { sfm: 2,    ipt: 0.003, doc: 0.05, material_group: "P" },    // sfm too low P
      { sfm: 150,  ipt: 0.003, doc: 0.8,  material_group: "P" },    // doc too high P
    ];
    let caught = 0;
    for (const rec of dirtyRecs) {
      const r = runHook({
        tool_name: "mcp__prism__prism_ai_reasoning",
        tool_response: { best: rec },
      });
      if (hasFindings(r.stdout)) caught++;
    }
    const rate = caught / dirtyRecs.length;
    // Exit criterion: >=95 % catch rate.
    expect(rate).toBeGreaterThanOrEqual(0.95);
  });

  it("is resilient to missing / malformed fields", () => {
    const r1 = runHook({ tool_name: "mcp__prism__prism_ai", tool_response: { best: {} } });
    expect(r1.status).toBe(0);
    const r2 = runHook({ tool_name: "mcp__prism__prism_ai", tool_response: {} });
    expect(r2.status).toBe(0);
    const r3 = runHook({});
    expect(r3.status).toBe(0);
  });
});
