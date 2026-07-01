/** PluginUpgradePathEngine tests — HMPI11. */
import { describe, it, expect } from "vitest";
import { PluginUpgradePathEngine } from "../engines/PluginUpgradePathEngine.js";

describe("PluginUpgradePathEngine.classify — same/patch/minor/major", () => {
  it("same version → class=same, safety=safe", () => {
    const v = PluginUpgradePathEngine.classify("1.2.3", "1.2.3");
    expect(v.class).toBe("same");
    expect(v.safety).toBe("safe");
  });

  it("patch bump → class=patch, safety=safe", () => {
    const v = PluginUpgradePathEngine.classify("1.2.3", "1.2.4");
    expect(v.class).toBe("patch");
    expect(v.safety).toBe("safe");
  });

  it("minor bump → class=minor, safety=needs-review", () => {
    const v = PluginUpgradePathEngine.classify("1.2.3", "1.3.0");
    expect(v.class).toBe("minor");
    expect(v.safety).toBe("needs-review");
  });

  it("major bump → class=major, safety=breaking", () => {
    const v = PluginUpgradePathEngine.classify("1.2.3", "2.0.0");
    expect(v.class).toBe("major");
    expect(v.safety).toBe("breaking");
  });
});

describe("PluginUpgradePathEngine.classify — downgrades + prerelease", () => {
  it("major downgrade → class=downgrade, safety=rejected", () => {
    const v = PluginUpgradePathEngine.classify("2.0.0", "1.9.9");
    expect(v.class).toBe("downgrade");
    expect(v.safety).toBe("rejected");
    expect(v.reason).toContain("major");
  });

  it("minor downgrade → class=downgrade", () => {
    const v = PluginUpgradePathEngine.classify("1.5.0", "1.4.0");
    expect(v.class).toBe("downgrade");
    expect(v.reason).toContain("minor");
  });

  it("patch downgrade → class=downgrade", () => {
    const v = PluginUpgradePathEngine.classify("1.0.5", "1.0.4");
    expect(v.class).toBe("downgrade");
    expect(v.reason).toContain("patch");
  });

  it("prerelease → stable promotion → class=prerelease-promotion, needs-review", () => {
    const v = PluginUpgradePathEngine.classify("1.0.0-rc.1", "1.0.0");
    expect(v.class).toBe("prerelease-promotion");
    expect(v.safety).toBe("needs-review");
  });
});

describe("PluginUpgradePathEngine.classify — invalid inputs", () => {
  it("invalid from version → class=invalid, safety=rejected", () => {
    const v = PluginUpgradePathEngine.classify("not-semver", "1.0.0");
    expect(v.class).toBe("invalid");
    expect(v.safety).toBe("rejected");
  });

  it("invalid to version → class=invalid", () => {
    const v = PluginUpgradePathEngine.classify("1.0.0", "garbage");
    expect(v.class).toBe("invalid");
  });

  it("non-string from throws TypeError", () => {
    expect(() => PluginUpgradePathEngine.classify(null as never, "1.0.0")).toThrow();
  });

  it("non-string to throws TypeError", () => {
    expect(() => PluginUpgradePathEngine.classify("1.0.0", undefined as never)).toThrow();
  });

  it("renderVerdict shows safety tag + from→to + class", () => {
    const md = PluginUpgradePathEngine.renderVerdict(
      PluginUpgradePathEngine.classify("1.2.3", "1.2.4"),
    );
    expect(md.includes("[UPGRADE SAFE]")).toBe(true);
    expect(md.includes("1.2.3")).toBe(true);
    expect(md.includes("1.2.4")).toBe(true);
    expect(md.includes("patch")).toBe(true);
  });

  it("renderVerdict on major bump shows BREAKING tag", () => {
    const md = PluginUpgradePathEngine.renderVerdict(
      PluginUpgradePathEngine.classify("1.0.0", "2.0.0"),
    );
    expect(md.includes("[UPGRADE BREAKING]")).toBe(true);
  });
});
