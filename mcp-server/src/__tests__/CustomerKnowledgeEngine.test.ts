/**
 * CustomerKnowledgeEngine.test.ts — hotel slot (iter14 / U-CUSTOMER-KNOWLEDGE-WIRE).
 * Tests shop profile management + learned modifier application + tip boosting.
 */

import { describe, it, expect } from "vitest";
import { customerKnowledgeEngine } from "../engines/CustomerKnowledgeEngine.js";

function uniqueShop(): string {
  return `SHOP-${Math.random().toString(36).slice(2, 10)}`;
}

describe("CustomerKnowledgeEngine — createProfile + getProfile + updateProfile", () => {
  it("createProfile stores shop_id retrievable by getProfile", () => {
    const id = uniqueShop();
    const p = customerKnowledgeEngine.createProfile(id, { name: "JM Die" });
    expect(p.shop_id).toBe(id);
    expect(p.name).toBe("JM Die");
    expect(customerKnowledgeEngine.getProfile(id)?.name).toBe("JM Die");
  });

  it("createProfile defaults arrays to empty when omitted", () => {
    const p = customerKnowledgeEngine.createProfile(uniqueShop(), { name: "X" });
    expect(p.expertise_areas).toEqual([]);
    expect(p.primary_machines).toEqual([]);
    expect(p.specializations).toEqual([]);
    expect(p.customer_base).toEqual([]);
  });

  it("createProfile preserves provided arrays", () => {
    const p = customerKnowledgeEngine.createProfile(uniqueShop(), {
      name: "Specialty",
      industry: "die-mold",
      expertise_areas: ["d2", "h13"],
      primary_machines: ["Mazak-1"],
    });
    expect(p.industry).toBe("die-mold");
    expect(p.expertise_areas).toEqual(["d2", "h13"]);
  });

  it("getProfile returns null for unknown shop_id", () => {
    expect(customerKnowledgeEngine.getProfile("SHOP-NEVER") === null).toBe(true);
  });

  it("updateProfile merges fields + sets updated_at", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "Orig" });
    customerKnowledgeEngine.updateProfile(id, { name: "Renamed", industry: "stamping" });
    const p = customerKnowledgeEngine.getProfile(id)!;
    expect(p.name).toBe("Renamed");
    expect(p.industry).toBe("stamping");
    expect(p.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("updateProfile on unknown shop is silent no-op (no throw)", () => {
    expect(() => customerKnowledgeEngine.updateProfile("SHOP-NEVER", { name: "X" })).not.toThrow();
  });
});

describe("CustomerKnowledgeEngine — learnShopModifier + getShopModifiers", () => {
  it("learnShopModifier creates a speed_factor modifier when outcome.speed_factor provided", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "Mod-Shop" });
    const m = customerKnowledgeEngine.learnShopModifier(id,
      { material: "d2", operation: "milling" },
      { success: true, speed_factor: 1.15 });
    expect(m.modifier_type).toBe("speed_factor");
    expect(m.value).toBe(1.15);
    expect(m.observation_count).toBe(1);
  });

  it("learnShopModifier creates confidence_boost when only outcome.success=true", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "CB-Shop" });
    const m = customerKnowledgeEngine.learnShopModifier(id,
      { material: "m2", operation: "milling" },
      { success: true });
    expect(m.modifier_type).toBe("confidence_boost");
  });

  it("learnShopModifier on second observation of same context increments observation_count", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "RPT-Shop" });
    customerKnowledgeEngine.learnShopModifier(id,
      { material: "d2", operation: "milling" }, { success: true, speed_factor: 1.1 });
    const m2 = customerKnowledgeEngine.learnShopModifier(id,
      { material: "d2", operation: "milling" }, { success: true, speed_factor: 1.2 });
    expect(m2.observation_count).toBe(2);
  });

  it("learnShopModifier throws on unknown profile", () => {
    expect(() => customerKnowledgeEngine.learnShopModifier("SHOP-NEVER",
      { material: "d2", operation: "milling" }, { success: true }))
      .toThrow(/not found/);
  });

  it("getShopModifiers filtered by material returns only that material's mods", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "Filt-Shop" });
    customerKnowledgeEngine.learnShopModifier(id,
      { material: "d2", operation: "milling" }, { success: true, speed_factor: 1.1 });
    customerKnowledgeEngine.learnShopModifier(id,
      { material: "h13", operation: "milling" }, { success: true, speed_factor: 1.05 });
    const d2only = customerKnowledgeEngine.getShopModifiers(id, { material: "d2" });
    expect(d2only.length).toBe(1);
    expect(d2only[0].context.material).toBe("d2");
  });

  it("getShopModifiers on unknown shop returns []", () => {
    expect(customerKnowledgeEngine.getShopModifiers("SHOP-NEVER").length).toBe(0);
  });
});

describe("CustomerKnowledgeEngine — applyShopModifiers (tip boosting)", () => {
  it("expertise-matching tip gets boosted confidence > original", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "Boost-Shop", expertise_areas: ["d2"] });
    const tips = [{ id: "t1", title: "D2 tip", confidence: 0.5, tags: ["d2", "tool-steel"] }];
    const result = customerKnowledgeEngine.applyShopModifiers(tips, id);
    expect(result[0].boosted_confidence).toBeGreaterThan(0.5);
    expect(result[0].applied_modifiers.includes("expertise_match")).toBe(true);
  });

  it("non-matching tip keeps original confidence", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "NM-Shop", expertise_areas: ["d2"] });
    const tips = [{ id: "t2", title: "Aluminum tip", confidence: 0.6, tags: ["aluminum"] }];
    const result = customerKnowledgeEngine.applyShopModifiers(tips, id);
    expect(result[0].boosted_confidence).toBe(0.6);
    expect(result[0].applied_modifiers.includes("expertise_match")).toBe(false);
  });

  it("applyShopModifiers without a profile still returns tips with shop_modified=true (no boosts)", () => {
    const tips = [{ id: "t3", title: "Generic", confidence: 0.5, tags: ["foo"] }];
    const result = customerKnowledgeEngine.applyShopModifiers(tips, "SHOP-NEVER-EXISTED");
    expect(result.length).toBe(1);
    expect(result[0].boosted_confidence).toBe(0.5);
  });

  it("applyShopModifiers caps boosted_confidence at 1.0", () => {
    const id = uniqueShop();
    customerKnowledgeEngine.createProfile(id, { name: "Cap-Shop", expertise_areas: ["d2"] });
    const tips = [{ id: "t4", title: "High base", confidence: 0.95, tags: ["d2"] }];
    const result = customerKnowledgeEngine.applyShopModifiers(tips, id);
    expect(result[0].boosted_confidence).toBeLessThanOrEqual(1.0);
  });
});
