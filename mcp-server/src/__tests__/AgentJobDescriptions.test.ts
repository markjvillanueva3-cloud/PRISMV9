/**
 * AgentJobDescriptions.test.ts — OBSIDIAN-INTELLIGENCE-MS3 / U-AGENT-JOB-DESCRIPTIONS (G1)
 *
 * Validates the AGENT_JOB_DESCRIPTIONS.md catalog + validator script:
 *  - parseAgentDocs correctly extracts agents + fields from markdown
 *  - validateAgents rejects entries missing any of the 5 required fields
 *  - the CURRENT state/shared/AGENT_JOB_DESCRIPTIONS.md doc validates clean
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/G1
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
// @ts-expect-error — sibling .mjs script.
import { parseAgentDocs, validateAgents } from "../../../scripts/validate-agent-job-descriptions.mjs";

const REAL_DOC_PATH = "H:/prism/state/shared/AGENT_JOB_DESCRIPTIONS.md";

describe("parseAgentDocs", () => {
  it("extracts a single well-formed agent with all 5 fields", () => {
    const md = [
      "# Doc",
      "### `myagent`",
      "- **role**: does one thing well.",
      "- **scope**:",
      "  - task a",
      "  - task b",
      "- **inputs**:",
      "  - path to file",
      "- **outputs**:",
      "  - PASS or FAIL",
      "- **refusal_cases**:",
      "  - file not in repo",
      "",
    ].join("\n");
    const agents = parseAgentDocs(md);
    expect(Object.keys(agents)).toEqual(["myagent"]);
    expect(agents.myagent.role).toBe("does one thing well.");
    expect(agents.myagent.scope).toEqual(["task a", "task b"]);
    expect(agents.myagent.inputs).toEqual(["path to file"]);
    expect(agents.myagent.outputs).toEqual(["PASS or FAIL"]);
    expect(agents.myagent.refusal_cases).toEqual(["file not in repo"]);
  });

  it("extracts multiple agents", () => {
    const md = [
      "### `agent-a`",
      "- **role**: a",
      "- **scope**:",
      "  - s1",
      "- **inputs**:",
      "  - i1",
      "- **outputs**:",
      "  - o1",
      "- **refusal_cases**:",
      "  - r1",
      "",
      "### `agent-b`",
      "- **role**: b",
      "- **scope**:",
      "  - s2",
      "- **inputs**:",
      "  - i2",
      "- **outputs**:",
      "  - o2",
      "- **refusal_cases**:",
      "  - r2",
      "",
    ].join("\n");
    const agents = parseAgentDocs(md);
    expect(Object.keys(agents).sort()).toEqual(["agent-a", "agent-b"]);
    expect(agents["agent-a"].role).toBe("a");
    expect(agents["agent-b"].role).toBe("b");
    expect(agents["agent-a"].scope).toEqual(["s1"]);
    expect(agents["agent-b"].scope).toEqual(["s2"]);
  });

  it("accepts the hyphen form refusal-cases as an alias for refusal_cases", () => {
    const md = [
      "### `legacy`",
      "- **role**: x",
      "- **scope**:",
      "  - s",
      "- **inputs**:",
      "  - i",
      "- **outputs**:",
      "  - o",
      "- **refusal-cases**:",
      "  - hyphen-form alias",
      "",
    ].join("\n");
    const agents = parseAgentDocs(md);
    expect(agents.legacy.refusal_cases).toEqual(["hyphen-form alias"]);
  });

  it("returns empty object on empty / non-string input", () => {
    expect(parseAgentDocs("")).toEqual({});
    expect(parseAgentDocs(null as unknown as string)).toEqual({});
    expect(parseAgentDocs(undefined as unknown as string)).toEqual({});
  });

  it("ignores content outside agent headings", () => {
    const md = [
      "## Intro",
      "Some prose.",
      "## Schema",
      "| Field | Type |",
      "|---|---|",
      "| role | string |",
      "## Agents",
      "### `included`",
      "- **role**: real",
      "- **scope**:",
      "  - s",
      "- **inputs**:",
      "  - i",
      "- **outputs**:",
      "  - o",
      "- **refusal_cases**:",
      "  - r",
      "",
    ].join("\n");
    const agents = parseAgentDocs(md);
    expect(Object.keys(agents)).toEqual(["included"]);
  });

  it("stops accumulating list items after a section break", () => {
    const md = [
      "### `agent`",
      "- **role**: r",
      "- **scope**:",
      "  - in-scope item",
      "",
      "---",
      "  - this-should-not-be-collected",
      "- **inputs**:",
      "  - i",
      "- **outputs**:",
      "  - o",
      "- **refusal_cases**:",
      "  - r",
      "",
    ].join("\n");
    const agents = parseAgentDocs(md);
    expect(agents.agent.scope).toEqual(["in-scope item"]);
  });
});

describe("validateAgents", () => {
  function fullAgent() {
    return { role: "x", scope: ["s"], inputs: ["i"], outputs: ["o"], refusal_cases: ["r"] };
  }

  it("PASS on a single fully-populated agent", () => {
    const result = validateAgents({ valid: fullAgent() });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.agents).toBe(1);
  });

  it("FAIL on empty agents map", () => {
    const result = validateAgents({});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/No agents found/);
  });

  it("FAIL when a required field is missing", () => {
    const broken = fullAgent();
    delete (broken as Record<string, unknown>).inputs;
    const result = validateAgents({ broken });
    expect(result.ok).toBe(false);
    const err = result.errors.find((e: { field?: string }) => e.field === "inputs");
    expect(err).not.toBe(undefined);
    expect(err.message).toMatch(/missing required field/);
  });

  it("FAIL when role is empty string", () => {
    const result = validateAgents({ x: { ...fullAgent(), role: "" } });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/non-empty string/);
  });

  it("FAIL when role exceeds 500 chars", () => {
    const longRole = "a".repeat(501);
    const result = validateAgents({ x: { ...fullAgent(), role: longRole } });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/suspiciously long/);
  });

  it("FAIL when a list field is empty", () => {
    const result = validateAgents({ x: { ...fullAgent(), refusal_cases: [] } });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/list is empty/);
  });

  it("FAIL when a list field is not actually a list", () => {
    const result = validateAgents({ x: { ...fullAgent(), scope: "not-a-list" as unknown as string[] } });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/must be a list/);
  });

  it("aggregates errors across multiple agents", () => {
    const result = validateAgents({
      good: fullAgent(),
      bad1: { ...fullAgent(), inputs: [] },
      bad2: { ...fullAgent(), role: "" },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(2);
    expect(result.agents).toBe(3);
  });
});

describe("CURRENT AGENT_JOB_DESCRIPTIONS.md validates clean", () => {
  it("exists on disk", () => {
    expect(fs.existsSync(REAL_DOC_PATH)).toBe(true);
  });

  it("parses with no errors and validates fully (≥10 agents)", () => {
    const md = fs.readFileSync(REAL_DOC_PATH, "utf8");
    const agents = parseAgentDocs(md);
    const result = validateAgents(agents);

    if (!result.ok) {
      const summary = result.errors
        .slice(0, 10)
        .map((e: { agent: string | null; field: string | null; message: string }) =>
          `${e.agent ?? "(file)"}/${e.field ?? "(file)"}: ${e.message}`,
        )
        .join("\n  ");
      throw new Error(`AGENT_JOB_DESCRIPTIONS.md validation failed:\n  ${summary}`);
    }

    expect(result.ok).toBe(true);
    expect(result.agents).toBeGreaterThanOrEqual(10);
  });

  it("every documented agent has at least one refusal case (refusal-case-required invariant)", () => {
    const md = fs.readFileSync(REAL_DOC_PATH, "utf8");
    const agents = parseAgentDocs(md);
    const names = Object.keys(agents);
    expect(names.length).toBeGreaterThanOrEqual(10);
    for (const name of names) {
      const entry = agents[name] as { refusal_cases?: string[] };
      expect(Array.isArray(entry.refusal_cases)).toBe(true);
      expect((entry.refusal_cases ?? []).length).toBeGreaterThan(0);
      for (const c of entry.refusal_cases ?? []) {
        expect(typeof c).toBe("string");
        expect(c.length).toBeGreaterThan(0);
        // Refusal case must name a condition, not be a placeholder
        expect(/^\s*(see above|tbd|todo|n\/?a)\s*\.?\s*$/i.test(c)).toBe(false);
      }
    }
  });

  it("scrutiny-relevant agents (reviewer, code-analyzer, *-review-agent) are present with substantive role text", () => {
    const md = fs.readFileSync(REAL_DOC_PATH, "utf8");
    const agents = parseAgentDocs(md);
    const required = ["reviewer", "code-analyzer", "wiring-review-agent", "test-review-agent", "physics-review-agent"];
    for (const name of required) {
      const entry = agents[name] as { role?: string } | undefined;
      // Use a real-value check: entry exists AND role is ≥20 chars (not a stub)
      expect(typeof entry).toBe("object");
      expect(entry).not.toBe(null);
      expect(entry).not.toBe(undefined);
      expect(typeof entry?.role).toBe("string");
      expect((entry?.role ?? "").length).toBeGreaterThan(20);
    }
  });

  it("loop-execution agents (forge-team, pipeline-team, test-runner, regression-hunter, build-doctor) are documented", () => {
    const md = fs.readFileSync(REAL_DOC_PATH, "utf8");
    const agents = parseAgentDocs(md);
    const required = ["forge-team", "pipeline-team", "test-runner", "regression-hunter", "build-doctor"];
    for (const name of required) {
      const entry = agents[name] as { role?: string; scope?: string[] } | undefined;
      expect(typeof entry?.role).toBe("string");
      expect((entry?.role ?? "").length).toBeGreaterThan(20);
      expect(Array.isArray(entry?.scope)).toBe(true);
      expect((entry?.scope ?? []).length).toBeGreaterThanOrEqual(1);
    }
  });
});
