/** SoulFrontmatterReaderEngine tests — HSE01. */
import { describe, it, expect } from "vitest";
import { SoulFrontmatterReaderEngine } from "../engines/SoulFrontmatterReaderEngine.js";

const SOURCE = `---
slot: bravo
role: mill-specialist
voice: physics-first
tone: rigorous
escalation_path: validate-kc-taylor-constants-before-edit; defer-safety-to-physics-reviewer
refuse_list:
  - inline-physics-constants
  - stub-engine-creation
preferred_subagent_type: physics-reviewer
domain_filter: mill|kienzle|taylor
hermes_role: specialist-mill
---

# Bravo

Body content here.`;

describe("SoulFrontmatterReaderEngine.parse — happy", () => {
  it("parses a full slot soul + returns ok=true", () => {
    const r = SoulFrontmatterReaderEngine.parse(SOURCE, "bravo");
    expect(r.ok).toBe(true);
    expect(r.soul?.slot).toBe("bravo");
    expect(r.soul?.role).toBe("mill-specialist");
  });

  it("extracts refuse_list as an array of strings", () => {
    const r = SoulFrontmatterReaderEngine.parse(SOURCE, "bravo");
    expect(r.soul?.refuse_list).toEqual(["inline-physics-constants", "stub-engine-creation"]);
  });

  it("extracts preferred_subagent_type + domain_filter", () => {
    const r = SoulFrontmatterReaderEngine.parse(SOURCE, "bravo");
    expect(r.soul?.preferred_subagent_type).toBe("physics-reviewer");
    expect(r.soul?.domain_filter).toBe("mill|kienzle|taylor");
  });

  it("body content preserved after frontmatter", () => {
    const r = SoulFrontmatterReaderEngine.parse(SOURCE, "bravo");
    expect(r.soul?.body).toContain("Body content here");
  });

  it("renderSummary shows slot + refuse count + subagent", () => {
    const r = SoulFrontmatterReaderEngine.parse(SOURCE, "bravo");
    const md = SoulFrontmatterReaderEngine.renderSummary(r.soul!);
    expect(md.includes("[SOUL bravo]")).toBe(true);
    expect(md.includes("refuses=2")).toBe(true);
  });
});

describe("SoulFrontmatterReaderEngine.parse — failure modes", () => {
  it("no frontmatter → ok=false with reason", () => {
    const r = SoulFrontmatterReaderEngine.parse("# No frontmatter", "bravo");
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain("frontmatter");
  });

  it("non-string source → ok=false", () => {
    const r = SoulFrontmatterReaderEngine.parse(null as never, "bravo");
    expect(r.ok).toBe(false);
  });

  it("empty slotFromPath → ok=false", () => {
    const r = SoulFrontmatterReaderEngine.parse(SOURCE, "");
    expect(r.ok).toBe(false);
  });

  it("missing required hermes_role → schema fail", () => {
    const trimmed = SOURCE.replace(/hermes_role:.*/, "");
    const r = SoulFrontmatterReaderEngine.parse(trimmed, "bravo");
    expect(r.ok).toBe(false);
  });

  it("soul without refuse_list → empty array fallback", () => {
    const noRefuses = SOURCE.replace(/refuse_list:[\s\S]*?preferred_subagent_type/, "preferred_subagent_type");
    const r = SoulFrontmatterReaderEngine.parse(noRefuses, "bravo");
    expect(r.ok).toBe(true);
    expect(r.soul?.refuse_list).toEqual([]);
  });

  it("quoted scalar values stripped of quotes", () => {
    const quoted = SOURCE.replace("mill-specialist", '"mill-specialist"');
    const r = SoulFrontmatterReaderEngine.parse(quoted, "bravo");
    expect(r.soul?.role).toBe("mill-specialist");
  });
});
