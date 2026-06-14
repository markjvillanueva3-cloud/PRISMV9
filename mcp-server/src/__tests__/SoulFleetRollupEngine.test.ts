/** SoulFleetRollupEngine tests — HSE05. */
import { describe, it, expect } from "vitest";
import { SoulFleetRollupEngine } from "../engines/SoulFleetRollupEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: ["inline-physics-constants"],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

describe("SoulFleetRollupEngine.rollup — counts + coverage", () => {
  it("slot_count = input length", () => {
    const r = SoulFleetRollupEngine.rollup([SOUL({ slot: "a" }), SOUL({ slot: "b" })]);
    expect(r.slot_count).toBe(2);
  });

  it("refusal coverage aggregates across slots holding the same refusal", () => {
    const r = SoulFleetRollupEngine.rollup([
      SOUL({ slot: "a", refuse_list: ["x"] }),
      SOUL({ slot: "b", refuse_list: ["x"] }),
      SOUL({ slot: "c", refuse_list: ["y"] }),
    ]);
    const xRow = r.refusal_coverage.find((row) => row.refusal === "x");
    expect(xRow?.slots).toEqual(["a", "b"]);
  });

  it("refusal_coverage sorted by slot-count desc", () => {
    const r = SoulFleetRollupEngine.rollup([
      SOUL({ slot: "a", refuse_list: ["singleton"] }),
      SOUL({ slot: "b", refuse_list: ["majority"] }),
      SOUL({ slot: "c", refuse_list: ["majority"] }),
      SOUL({ slot: "d", refuse_list: ["majority"] }),
    ]);
    expect(r.refusal_coverage[0].refusal).toBe("majority");
  });

  it("subagent_preferences groups slots by preferred_subagent_type", () => {
    const r = SoulFleetRollupEngine.rollup([
      SOUL({ slot: "a", preferred_subagent_type: "physics-reviewer" }),
      SOUL({ slot: "b", preferred_subagent_type: "physics-reviewer" }),
      SOUL({ slot: "c", preferred_subagent_type: "test-runner" }),
    ]);
    const phys = r.subagent_preferences.find((p) => p.subagent_type === "physics-reviewer");
    expect(phys?.slots.length).toBe(2);
  });

  it("role_distribution lists slots by hermes_role", () => {
    const r = SoulFleetRollupEngine.rollup([
      SOUL({ slot: "a", hermes_role: "specialist-mill" }),
      SOUL({ slot: "b", hermes_role: "specialist-lathe" }),
    ]);
    expect(r.role_distribution.length).toBe(2);
  });
});

describe("SoulFleetRollupEngine.rollup — gap detection", () => {
  it("slots_without_filter populated when domain_filter missing", () => {
    const r = SoulFleetRollupEngine.rollup([
      SOUL({ slot: "a" }),
      SOUL({ slot: "b", domain_filter: undefined }),
    ]);
    expect(r.slots_without_filter).toEqual(["b"]);
  });

  it("slots_without_refuses populated when refuse_list is empty", () => {
    const r = SoulFleetRollupEngine.rollup([
      SOUL({ slot: "a" }),
      SOUL({ slot: "b", refuse_list: [] }),
    ]);
    expect(r.slots_without_refuses).toEqual(["b"]);
  });

  it("empty array throws", () => {
    expect(() => SoulFleetRollupEngine.rollup([])).toThrow();
  });

  it("non-array throws", () => {
    expect(() => SoulFleetRollupEngine.rollup(null as never)).toThrow();
  });
});

describe("SoulFleetRollupEngine — renderHtml + renderSummary", () => {
  it("renderHtml emits valid HTML5 doctype", () => {
    const html = SoulFleetRollupEngine.renderHtml(SoulFleetRollupEngine.rollup([SOUL()]));
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("renderHtml includes table for each section", () => {
    const html = SoulFleetRollupEngine.renderHtml(SoulFleetRollupEngine.rollup([SOUL()]));
    expect((html.match(/<table/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("renderHtml escapes XSS in refusal text", () => {
    const html = SoulFleetRollupEngine.renderHtml(
      SoulFleetRollupEngine.rollup([SOUL({ refuse_list: ['<script>alert("x")</script>'] })]),
    );
    expect(html.includes("<script>alert")).toBe(false);
  });

  it("renderSummary shows fleet stats", () => {
    const md = SoulFleetRollupEngine.renderSummary(SoulFleetRollupEngine.rollup([SOUL()]));
    expect(md.includes("[FLEET-SOULS]")).toBe(true);
    expect(md.includes("n=1")).toBe(true);
  });
});
