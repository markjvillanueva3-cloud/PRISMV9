/** SoulSubagentRouterEngine tests — HSE02. */
import { describe, it, expect } from "vitest";
import { SoulSubagentRouterEngine } from "../engines/SoulSubagentRouterEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: [],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|kienzle|taylor",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

describe("SoulSubagentRouterEngine.route — happy", () => {
  it("preferred + domain match → returns subagent + matched_domain=true", () => {
    const r = SoulSubagentRouterEngine.route(SOUL(), { task_text: "compute kienzle force" });
    expect(r.subagent_type).toBe("physics-reviewer");
    expect(r.matched_domain).toBe(true);
    expect(r.reason).toBe("domain-match");
  });

  it("no preference → returns null with reason", () => {
    const r = SoulSubagentRouterEngine.route(SOUL({ preferred_subagent_type: undefined }), { task_text: "anything" });
    expect(r.subagent_type).toBeNull();
    expect(r.reason).toContain("no preference");
  });

  it("no domain_filter → preference applies universally", () => {
    const r = SoulSubagentRouterEngine.route(SOUL({ domain_filter: undefined }), { task_text: "anything" });
    expect(r.subagent_type).toBe("physics-reviewer");
    expect(r.reason).toBe("preference-only");
  });

  it("matches via task_domain field", () => {
    const r = SoulSubagentRouterEngine.route(SOUL(), { task_text: "unrelated", task_domain: "mill" });
    expect(r.matched_domain).toBe(true);
  });
});

describe("SoulSubagentRouterEngine.route — degraded + edge", () => {
  it("preferred + domain mismatch → null", () => {
    const r = SoulSubagentRouterEngine.route(SOUL(), { task_text: "compute lathe rpm" });
    expect(r.subagent_type).toBeNull();
    expect(r.reason).toBe("domain-mismatch");
  });

  it("bad regex in domain_filter → fail-soft to preference-only", () => {
    const r = SoulSubagentRouterEngine.route(SOUL({ domain_filter: "[unclosed" }), { task_text: "anything" });
    expect(r.subagent_type).toBe("physics-reviewer");
    expect(r.reason).toContain("invalid");
  });

  it("case-insensitive domain match", () => {
    const r = SoulSubagentRouterEngine.route(SOUL(), { task_text: "compute KIENZLE force" });
    expect(r.matched_domain).toBe(true);
  });

  it("missing soul throws", () => {
    expect(() => SoulSubagentRouterEngine.route(null as never, { task_text: "x" })).toThrow();
  });

  it("empty task_text → zod throws", () => {
    expect(() => SoulSubagentRouterEngine.route(SOUL(), { task_text: "" })).toThrow();
  });

  it("renderVerdict shows slot + subagent + match", () => {
    const md = SoulSubagentRouterEngine.renderVerdict(SoulSubagentRouterEngine.route(SOUL(), { task_text: "kienzle" }));
    expect(md.includes("[SOUL-ROUTE bravo]")).toBe(true);
    expect(md.includes("subagent=physics-reviewer")).toBe(true);
    expect(md.includes("match=true")).toBe(true);
  });

  it("renderVerdict shows — when no subagent", () => {
    const md = SoulSubagentRouterEngine.renderVerdict(
      SoulSubagentRouterEngine.route(SOUL({ preferred_subagent_type: undefined }), { task_text: "x" }),
    );
    expect(md.includes("subagent=—")).toBe(true);
  });
});
