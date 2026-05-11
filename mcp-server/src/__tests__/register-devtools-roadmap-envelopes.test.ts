/**
 * Tests for scripts/register-devtools-roadmap-envelopes.mjs — the BACKEND-DEVTOOLS-RGS6
 * "combine" registrar/parser. Guards the parser against the inline-`# comment` corruption
 * (the MAJOR the Opus scrutiny reviewer caught on commit af5cf41bc) and the `A..B` packed-header
 * expansion. Pure-function tests + one fixture-driven parseAtomized() round trip.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseList,
  parseTier,
  num,
  expandUnitIds,
  trackOf,
  parseAtomized,
  buildEnvelope,
} from "../../../scripts/register-devtools-roadmap-envelopes.mjs";

describe("parseList — list-shaped scalar fields", () => {
  it("parses a plain bracketed list", () => {
    expect(parseList("[U-A, U-B, U-C]")).toEqual(["U-A", "U-B", "U-C"]);
  });
  it("returns [] for the empty list and for none/-", () => {
    expect(parseList("[]")).toEqual([]);
    expect(parseList("none")).toEqual([]);
    expect(parseList("-")).toEqual([]);
    expect(parseList("")).toEqual([]);
  });
  it("strips surrounding backticks", () => {
    expect(parseList("`[U-A]`")).toEqual(["U-A"]);
  });
  it("treats a bare token as a singleton list", () => {
    expect(parseList("U-H1")).toEqual(["U-H1"]);
  });
  // THE REGRESSION GUARD: inline `# comment` after the list (or after `[]`) must not leak.
  it("drops a trailing `# was [...]` comment after a populated list", () => {
    expect(
      parseList("[U-TOOLINV-01, U-TOOLINV-07]  # was [...U-TOOLINV-08] — dropped per audit-v2: not a hard prereq."),
    ).toEqual(["U-TOOLINV-01", "U-TOOLINV-07"]);
  });
  it("drops a trailing comment after an empty list (the U-SKU07 case)", () => {
    expect(parseList("[]  # AUTO-LEARNING-LOOP-MS0 source-monitor pattern (soft reuse)")).toEqual([]);
  });
  it("drops a trailing comment after a bare value", () => {
    expect(parseList("U-SKU06  # + LOOP-MIGRATE-MS0 cron infra (soft)")).toEqual(["U-SKU06"]);
  });
});

describe("parseTier / num", () => {
  it("parses Txx and bare-number tiers", () => {
    expect(parseTier("T0")).toBe(0);
    expect(parseTier("T2")).toBe(2);
    expect(parseTier("1")).toBe(1);
  });
  it("returns null for unparseable tier", () => {
    expect(parseTier("")).toBeNull();
    expect(parseTier("none")).toBeNull();
    expect(parseTier(undefined)).toBeNull();
  });
  it("num parses finite numbers, null otherwise", () => {
    expect(num("78")).toBe(78);
    expect(num("0")).toBe(0);
    expect(num("")).toBeNull();
    expect(num("abc")).toBeNull();
    expect(num(undefined)).toBeNull();
  });
});

describe("expandUnitIds — `A..B` packed headers", () => {
  it("returns a plain id unchanged", () => {
    expect(expandUnitIds("U-ALL05")).toEqual(["U-ALL05"]);
  });
  it("expands a same-prefix numeric range, preserving zero-padding (the U-ALL07..U-ALL08 case)", () => {
    expect(expandUnitIds("U-ALL07..U-ALL08")).toEqual(["U-ALL07", "U-ALL08"]);
    expect(expandUnitIds("U-ALL07..U-ALL09")).toEqual(["U-ALL07", "U-ALL08", "U-ALL09"]);
  });
  it("falls back to one id per `..`-part when prefixes differ", () => {
    expect(expandUnitIds("K2-K4..K12")).toEqual(["K2-K4", "K12"]);
  });
});

describe("trackOf", () => {
  it("strips the -MS<n> suffix", () => {
    expect(trackOf("TOOL-INVENTORY-MS0")).toBe("TOOL-INVENTORY");
    expect(trackOf("OBSIDIAN-COMPOUND-MS1")).toBe("OBSIDIAN-COMPOUND");
    expect(trackOf("GRAPH-AS-LLM-CONTEXT-MS0")).toBe("GRAPH-AS-LLM-CONTEXT");
  });
});

describe("parseAtomized — fixture round trip", () => {
  it("parses frontmatter, units, comment-stripped deps, and expands a packed header", () => {
    const dir = mkdtempSync(join(tmpdir(), "rgs6-atomized-"));
    const fp = join(dir, "BACKEND-DEVTOOLS-RGS6-FIXTURE-MS0-ATOMIZED-2026-05-10.md");
    const fixture = [
      "---",
      "milestone: FIXTURE-MS0 (extended)",
      "parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md",
      "assigned_lane: lane-Z-fixture",
      'commit_prefix: "[lane-Z-fixture][FIXTURE-MS0]"',
      "total_units: 4",
      "critical_path_role: none",
      "date: 2026-05-10",
      "---",
      "",
      "# FIXTURE-MS0 — a fixture for the parser test",
      "",
      "> Tiny fixture milestone. Two plain units + a 2-id packed-range header = 4 units.",
      "",
      "---",
      "",
      "## U-FIX1 — first unit",
      "",
      "- pillar: test",
      "- tier: T0",
      "- ai_priority_score: 80",
      "- leverage_score: 12",
      "- why: it is the first",
      "- depends_on: []",
      "- blocks: [U-FIX2]  # was [U-FIX2, U-FIX3] — narrowed per audit",
      "- viz_node_id: `core.script.fix1` (TBD-create)",
      "",
      "verifies_via:",
      "  channel: test",
      "  tool: `node x --self-test`",
      "",
      "## U-FIX2 — second unit",
      "",
      "- pillar: test",
      "- tier: T1",
      "- ai_priority_score: 40",
      "- leverage_score: 8",
      "- depends_on: [U-FIX1]  # soft",
      "- blocks: []",
      "",
      "## U-FIXR07..U-FIXR08 — packed range unit",
      "",
      "- pillar: test",
      "- tier: T1",
      "- depends_on: [U-FIX1, U-FIX2]",
      "- blocks: []  # nothing downstream",
      "",
    ].join("\n");
    writeFileSync(fp, fixture);

    try {
      const parsed = parseAtomized(fp);
      expect(parsed.msId).toBe("FIXTURE-MS0");
      expect(parsed.title).toBe("FIXTURE-MS0");
      expect(parsed.brief).toContain("Tiny fixture milestone");
      expect(parsed.frontmatter.declared_total_units).toBe(4);
      expect(parsed.frontmatter.assigned_lane).toBe("lane-Z-fixture");

      // 2 plain units + the 2-id packed header expanded = 4
      expect(parsed.units.map((u) => u.id)).toEqual(["U-FIX1", "U-FIX2", "U-FIXR07", "U-FIXR08"]);

      const u1 = parsed.units[0];
      expect(u1.title).toBe("first unit");
      expect(u1.tier).toBe(0);
      expect(u1.ai_priority_score).toBe(80);
      expect(u1.leverage_score).toBe(12);
      expect(u1.why).toBe("it is the first");
      expect(u1.depends_on).toEqual([]);
      // THE REGRESSION GUARD: the `# was [...]` comment must NOT leak into blocks
      expect(u1.blocks).toEqual(["U-FIX2"]);
      expect(u1.viz_node_id).toBe("core.script.fix1");
      expect(u1.viz_node_status).toBe("needs_creation");
      expect(u1.status).toBe("not_started");

      const u2 = parsed.units[1];
      expect(u2.tier).toBe(1);
      expect(u2.depends_on).toEqual(["U-FIX1"]); // `# soft` stripped
      expect(u2.blocks).toEqual([]);

      // packed-range units share title + body, carry from_packed_header, blocks comment-stripped
      const r7 = parsed.units[2];
      const r8 = parsed.units[3];
      expect(r7.title).toBe("packed range unit");
      expect(r7.from_packed_header).toBe("U-FIXR07..U-FIXR08");
      expect(r8.from_packed_header).toBe("U-FIXR07..U-FIXR08");
      expect(r7.depends_on).toEqual(["U-FIX1", "U-FIX2"]);
      expect(r7.blocks).toEqual([]);

      // buildEnvelope: milestone tier = 0 (a T0 unit present), total_units = 4 = declared
      const env = buildEnvelope(parsed, "2026-05-10T00:00:00.000Z");
      expect(env.id).toBe("FIXTURE-MS0");
      expect(env.track).toBe("FIXTURE");
      expect(env.roadmap_priority).toBe(0);
      expect(env.tier).toBe(0);
      expect(env.priority).toBe("P0");
      expect(env.total_units).toBe(4);
      expect(env.declared_total_units).toBe(4);
      expect(env.completed_units).toBe(0);
      expect(env.phases).toHaveLength(1);
      expect(env.phases[0].units).toHaveLength(4);
      expect(env.viz_node_id).toBe("ghost.ms.fixture-ms0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
