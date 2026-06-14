/** ZebraFleetGovernorEngine tests — HZD-02 (HZP-DASH-MS0). */
import { describe, it, expect } from "vitest";
import { ZebraFleetGovernorEngine } from "../engines/ZebraFleetGovernorEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: ["inline-physics-constants", "stub-engine-creation"],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|milling|kienzle|taylor",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

describe("ZebraFleetGovernorEngine.checkAuthority — refuse + domain rules", () => {
  it("refuse-list hit on task_text → REJECT with matched_refuse populated", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "create a stub-engine-creation for kienzle", operation: "assign" },
      SOUL(),
    );
    expect(v.authorized).toBe(false);
    expect(v.matched_refuse).toBe("stub-engine-creation");
    expect(v.reason).toContain("refuse-rule-veto:stub-engine-creation");
  });

  it("refuse-rule check is substring-case-insensitive", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "INLINE-PHYSICS-CONSTANTS in code", operation: "assign" },
      SOUL(),
    );
    expect(v.authorized).toBe(false);
    expect(v.matched_refuse).toBe("inline-physics-constants");
  });

  it("domain-match on task_text → AUTHORIZED", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "compute kienzle force on titanium", operation: "assign" },
      SOUL(),
    );
    expect(v.authorized).toBe(true);
    expect(v.matched_domain).toBe(true);
    expect(v.reason).toContain("domain-match:");
  });

  it("domain-mismatch on task_text → REJECT", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "lathe turning operation on 304SS", operation: "assign" },
      SOUL(),
    );
    expect(v.authorized).toBe(false);
    expect(v.reason).toContain("domain-mismatch");
    expect(v.matched_domain).toBe(false);
  });
});

describe("ZebraFleetGovernorEngine.checkAuthority — informational + orchestrator + null soul", () => {
  it("bus-send + adopt-doctrine + escalate are informational (cleared if no refuse hit)", () => {
    const ops: Array<"bus-send" | "adopt-doctrine" | "escalate"> = ["bus-send", "adopt-doctrine", "escalate"];
    for (const operation of ops) {
      const v = ZebraFleetGovernorEngine.checkAuthority(
        { slot: "bravo", task_text: "lathe turning operation", operation },
        SOUL(),
      );
      expect(v.authorized).toBe(true);
      expect(v.reason).toContain("informational-op-cleared");
    }
  });

  it("informational op STILL veto'd by refuse-list hit", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "draft inline-physics-constants doctrine update", operation: "adopt-doctrine" },
      SOUL(),
    );
    expect(v.authorized).toBe(false);
    expect(v.matched_refuse).toBe("inline-physics-constants");
  });

  it("orchestrator hermes_role passes through with no domain match", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "zebra", task_text: "any-task-here", operation: "assign" },
      SOUL({ slot: "zebra", hermes_role: "zebra-orchestrator", domain_filter: "" }),
    );
    expect(v.authorized).toBe(true);
    expect(v.reason).toContain("orchestrator-role:zebra-orchestrator");
  });

  it("null soul on informational op → AUTHORIZED (no soul required)", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "ghost", task_text: "hello", operation: "bus-send" }, null,
    );
    expect(v.authorized).toBe(true);
    expect(v.reason).toContain("informational-op-no-soul-required");
  });

  it("null soul on state-changing op → REJECT", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "ghost", task_text: "task", operation: "assign" }, null,
    );
    expect(v.authorized).toBe(false);
    expect(v.reason).toContain("no-soul-resolved-for-slot:ghost");
  });
});

describe("ZebraFleetGovernorEngine — fail-soft + validation + render", () => {
  it("bad regex in domain_filter → REJECT fail-closed (specialist role)", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "compute kienzle force", operation: "assign" },
      SOUL({ domain_filter: "[unclosed" }),
    );
    expect(v.authorized).toBe(false);
    expect(v.reason).toContain("domain-filter-malformed");
    expect(v.matched_domain).toBe(false);
  });

  it("bad regex in domain_filter + orchestrator role → REJECT (closes privilege-escalation gap)", () => {
    // P1 fix 2026-05-25 — previously orchestrator role bypassed domain_filter malformed-regex
    // → silent privilege escalation. Now we fail-closed BEFORE the orchestrator rule.
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "zebra", task_text: "compute kienzle force", operation: "assign" },
      SOUL({ slot: "zebra", hermes_role: "zebra-orchestrator", domain_filter: "[unclosed" }),
    );
    expect(v.authorized).toBe(false);
    expect(v.reason).toContain("domain-filter-malformed:[unclosed");
  });

  it("invalid request shape → throws via zod", () => {
    expect(() =>
      ZebraFleetGovernorEngine.checkAuthority({ slot: "", task_text: "x", operation: "assign" }, SOUL()),
    ).toThrow();
  });

  it("renderVerdict shows tag + reason + role", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "kienzle force", operation: "assign" }, SOUL(),
    );
    const md = ZebraFleetGovernorEngine.renderVerdict(v);
    expect(md.includes("[AUTH OK]")).toBe(true);
    expect(md.includes("specialist-mill")).toBe(true);
  });

  it("renderVerdict shows DENY tag on rejection", () => {
    const v = ZebraFleetGovernorEngine.checkAuthority(
      { slot: "bravo", task_text: "lathe turning", operation: "assign" }, SOUL(),
    );
    const md = ZebraFleetGovernorEngine.renderVerdict(v);
    expect(md.includes("[AUTH DENY]")).toBe(true);
  });
});
