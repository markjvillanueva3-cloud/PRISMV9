/**
 * devDispatcher U-WIRE-SELF-WORLD-ABSTRACTION round-trip tests — 3 cognitive
 * engines (SelfModel, WorldModel, AbstractionHierarchy) wired into prism_dev.
 *
 * Slot:papa /goal /loop iter3 (wire-unwired campaign — closes 3 more of 150
 * NEEDS_WIRING engines).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @units U-WIRE-SELF-MODEL, U-WIRE-WORLD-MODEL, U-WIRE-ABSTRACTION
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SelfModelEngine } from "../engines/SelfModelEngine.js";
import { worldModelEngine } from "../engines/WorldModelEngine.js";
import { abstractionHierarchyEngine } from "../engines/AbstractionHierarchyEngine.js";

const DISPATCHER_SRC = path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts");

describe("U-WIRE-SELF-MODEL", () => {
  it("declareCapability records exact name + confidence value 0.8 + useCount=0 + lastUsed=null", () => {
    const e = new SelfModelEngine("test-session-1");
    const cap = e.declareCapability("wire-engine", 0.8);
    expect(cap.name).toBe("wire-engine");
    expect(cap.confidence).toBe(0.8);
    expect(cap.useCount).toBe(0);
    expect(cap.lastUsed).toBeNull();
  });

  it("getCapability returns null when name was never declared", () => {
    const e = new SelfModelEngine("test-session-2");
    const result = e.getCapability("never-declared");
    expect(result).toBeNull();
  });

  it("recordAction chronological: getRecentActions returns oldest-first via slice(-limit)", () => {
    const e = new SelfModelEngine("test-session-3");
    e.recordAction("commit", "success", { note: "test commit" });
    e.recordAction("test-run", "failure");
    const recent = e.getRecentActions(5);
    expect(recent.length).toBe(2);
    expect(recent[0].action).toBe("commit");
    expect(recent[0].outcome).toBe("success");
    expect(recent[0].note).toBe("test commit");
    expect(recent[1].action).toBe("test-run");
    expect(recent[1].outcome).toBe("failure");
  });

  it("snapshot returns the declared capability with exact name + confidence + useCount + lastUsed", () => {
    const e = new SelfModelEngine("test-session-4");
    e.declareCapability("Wiring", 0.7);
    const s = e.snapshot();
    expect(s.sessionId).toBe("test-session-4");
    expect(s.capabilities.length).toBe(1);
    expect(s.capabilities[0].name).toBe("Wiring");
    expect(s.capabilities[0].confidence).toBe(0.7);
    expect(s.capabilities[0].useCount).toBe(0);
    expect(s.capabilities[0].lastUsed).toBeNull();
  });

  it("overallConfidence equals the single declared capability's initial confidence (0.65)", () => {
    const e = new SelfModelEngine("test-confidence");
    e.declareCapability("solo", 0.65);
    const s = e.snapshot();
    expect(s.overallConfidence).toBe(0.65);
  });
});

describe("U-WIRE-WORLD-MODEL", () => {
  it("setCount + getCount: 'engine' category records exactly 42", () => {
    worldModelEngine.setCount("engine", 42);
    expect(worldModelEngine.getCount("engine")).toBe(42);
  });

  it("setCount + getCount: 'action' category records exactly 137", () => {
    worldModelEngine.setCount("action", 137);
    expect(worldModelEngine.getCount("action")).toBe(137);
  });

  it("recordQuery 'SVIImpactProjector' hits=7 is findable in recent queries", () => {
    const term = `papa-impact-${Date.now()}`;
    worldModelEngine.recordQuery("engine", term, 7);
    const recent = worldModelEngine.recentQueries(50);
    const found = recent.find(q => q.term === term);
    expect(found).not.toBeUndefined();
    expect(found!.hits).toBe(7);
    expect(found!.category).toBe("engine");
  });

  it("snapshot.counts['hook'] equals the just-set value 55", () => {
    worldModelEngine.setCount("hook", 55);
    const s = worldModelEngine.snapshot();
    const hookEntry = s.counts.find(c => c.category === "hook");
    expect(hookEntry).not.toBeUndefined();
    expect(hookEntry!.count).toBe(55);
  });
});

describe("U-WIRE-ABSTRACTION", () => {
  it("addTip creates a root with text='X', level=0, parentId=null, empty childIds", () => {
    const text = `papa-tip-${Date.now()}`;
    const n = abstractionHierarchyEngine.addTip(text);
    expect(n.text).toBe(text);
    expect(n.level).toBe(0);
    expect(n.parentId).toBeNull();
    expect(n.childIds.length).toBe(0);
  });

  it("hierarchy of an unattached leaf returns single-element chain containing that leaf", () => {
    const n = abstractionHierarchyEngine.addTip("Lockfiles prevent peer races");
    const chain = abstractionHierarchyEngine.hierarchy(n.id);
    expect(chain.length).toBe(1);
    expect(chain[0].id).toBe(n.id);
    expect(chain[0].text).toBe("Lockfiles prevent peer races");
  });

  it("atLevel(0) includes the just-added tip", () => {
    const text = `papa-atlevel-${Date.now()}`;
    const n = abstractionHierarchyEngine.addTip(text, ["tag1"]);
    const tips = abstractionHierarchyEngine.atLevel(0);
    const found = tips.find(t => t.id === n.id);
    expect(found).not.toBeUndefined();
    expect(found!.level).toBe(0);
  });

  it("get returns null for unknown id and returns the node for known id", () => {
    expect(abstractionHierarchyEngine.get("nonexistent-id-9999")).toBeNull();
    const n = abstractionHierarchyEngine.addTip("Tip for get-test");
    const got = abstractionHierarchyEngine.get(n.id);
    expect(got).not.toBeNull();
    expect(got!.id).toBe(n.id);
    expect(got!.text).toBe("Tip for get-test");
  });
});

describe("U-WIRE-SELF-WORLD-ABSTRACTION — dispatcher source contract", () => {
  const src = fs.readFileSync(DISPATCHER_SRC, "utf8");

  it("action enum lists self_model_declare_capability + case-block exists", () => {
    expect(src.indexOf(`"self_model_declare_capability"`)).toBeGreaterThan(0);
    expect(src.indexOf(`case "self_model_declare_capability":`)).toBeGreaterThan(0);
  });

  it("action enum lists world_model_set_count + case-block exists", () => {
    expect(src.indexOf(`"world_model_set_count"`)).toBeGreaterThan(0);
    expect(src.indexOf(`case "world_model_set_count":`)).toBeGreaterThan(0);
  });

  it("action enum lists abstraction_add_tip + case-block exists", () => {
    expect(src.indexOf(`"abstraction_add_tip"`)).toBeGreaterThan(0);
    expect(src.indexOf(`case "abstraction_add_tip":`)).toBeGreaterThan(0);
  });

  it("engine imports for all three engines are present", () => {
    expect(src.indexOf(`SelfModelEngine`)).toBeGreaterThan(0);
    expect(src.indexOf(`worldModelEngine`)).toBeGreaterThan(0);
    expect(src.indexOf(`abstractionHierarchyEngine`)).toBeGreaterThan(0);
  });
});
