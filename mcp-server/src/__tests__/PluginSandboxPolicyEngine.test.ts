/** PluginSandboxPolicyEngine tests — HMPI14. */
import { describe, it, expect } from "vitest";
import {
  PluginSandboxPolicyEngine,
  type SandboxRequest,
} from "../engines/PluginSandboxPolicyEngine.js";

const mk = (over: Partial<SandboxRequest> = {}): SandboxRequest => ({
  plugin_id: "p1",
  tier: "dev",
  requested: ["filesystem-read", "tool-call"],
  ...over,
});

describe("PluginSandboxPolicyEngine — happy", () => {
  it("dev tier with read+tool-call → allowed", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk());
    expect(v.verdict).toBe("allowed");
    expect(v.granted.length).toBe(2);
    expect(v.denied).toEqual([]);
  });

  it("shop_floor with read-only set → allowed", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ tier: "shop_floor", requested: ["filesystem-read", "memory-read", "tool-call"] }));
    expect(v.verdict).toBe("allowed");
  });

  it("sandbox tier with full set → allowed", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({
      tier: "sandbox",
      requested: ["filesystem-read", "filesystem-write", "network", "process-spawn", "env-write"],
    }));
    expect(v.verdict).toBe("allowed");
    expect(v.granted.length).toBe(5);
  });

  it("dedupes repeated capability requests", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ requested: ["tool-call", "tool-call", "filesystem-read"] }));
    expect(v.granted.length).toBe(2);
  });
});

describe("PluginSandboxPolicyEngine — denials + partial", () => {
  it("shop_floor + network → blocked", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ tier: "shop_floor", requested: ["network"] }));
    expect(v.verdict).toBe("blocked");
    expect(v.denied[0].capability).toBe("network");
  });

  it("shop_floor + process-spawn → blocked (safety-critical)", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ tier: "shop_floor", requested: ["process-spawn"] }));
    expect(v.verdict).toBe("blocked");
  });

  it("dev tier + process-spawn → blocked (dev forbids spawn)", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ tier: "dev", requested: ["process-spawn"] }));
    expect(v.verdict).toBe("blocked");
  });

  it("dev tier mixed read + spawn → partial", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ tier: "dev", requested: ["filesystem-read", "process-spawn"] }));
    expect(v.verdict).toBe("partial");
    expect(v.granted).toContain("filesystem-read");
    expect(v.denied.map((d) => d.capability)).toContain("process-spawn");
  });

  it("shop_floor + env-write → blocked with reason", () => {
    const v = PluginSandboxPolicyEngine.evaluate(mk({ tier: "shop_floor", requested: ["env-write"] }));
    expect(v.verdict).toBe("blocked");
    expect(v.denied[0].reason).toContain("shop_floor");
  });
});

describe("PluginSandboxPolicyEngine — schema rejection + render", () => {
  it("rejects empty requested array", () => {
    expect(() => PluginSandboxPolicyEngine.evaluate(mk({ requested: [] }))).toThrow();
  });

  it("rejects unknown capability", () => {
    expect(() => PluginSandboxPolicyEngine.evaluate(mk({ requested: ["delete-everything" as never] }))).toThrow();
  });

  it("rejects unknown tier", () => {
    expect(() => PluginSandboxPolicyEngine.evaluate(mk({ tier: "rooted" as never }))).toThrow();
  });

  it("renderVerdict shows verdict tag + tier + counts", () => {
    const md = PluginSandboxPolicyEngine.renderVerdict(PluginSandboxPolicyEngine.evaluate(mk()));
    expect(md.includes("[SANDBOX ALLOWED]")).toBe(true);
    expect(md.includes("p1")).toBe(true);
    expect(md.includes("tier=dev")).toBe(true);
    expect(md.includes("granted=2")).toBe(true);
  });
});
