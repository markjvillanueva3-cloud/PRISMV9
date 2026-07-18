// foxtrot-mill-awareness-inject.test.mjs — real-behavior tests (R9: verify intent).
import { describe, it, expect } from "vitest";
import { activeSlotIsFoxtrot, buildContext, shouldInject } from "./foxtrot-mill-awareness-inject.mjs";

describe("shouldInject", () => {
  it("fires on mill vocabulary", () => {
    expect(shouldInject("optimize the pocket milling feed", "")).toBe(true);
    expect(shouldInject("check 5-axis rtcp singularity", "")).toBe(true);
    expect(shouldInject("hyperMILL post for the Hurco", "")).toBe(true);
    expect(shouldInject("ball nose end mill chip-thinning", "")).toBe(true);
    expect(shouldInject("stability lobe at spindle speed 12000", "")).toBe(true);
    expect(shouldInject("trochoidal milling with kienzle force", "")).toBe(true);
  });
  it("does NOT fire on unrelated prompts with no slot match", () => {
    expect(shouldInject("write a haiku about the ocean", "")).toBe(false);
    expect(shouldInject("", "")).toBe(false);
    // scrutiny arm C P1 regression guard: over-broad tokens must NOT fire (fleet-wide noise)
    for (const p of ["tap the button to continue", "bore me with the details", "drill down into the data", "the tcp connection dropped", "pocket the change", "hsm theory of money supply", "deflection of the beam in the UI", "i went to the mill last weekend", "the crowd was milling about", "the kids chatter in the back seat", "a spindle of thread on the shelf", "okuma river in japan is scenic", "the vmc cluster crashed", "the rtcp protocol stack", "ball nose pliers from the store", "five axis of an evil empire", "my Roku TV", "haas the courage to ask"]) {
      expect(shouldInject(p, "")).toBe(false);
    }
  });
  it("fires when the active slot is foxtrot regardless of keyword", () => {
    const sid = "deadbeef-1234-5678-9abc-def012345678";
    const slots = JSON.stringify({ slots: { foxtrot: { state: { chatId: "claude-deadbeef" } } } });
    expect(shouldInject("no domain word here", sid, slots)).toBe(true);
  });
});

describe("activeSlotIsFoxtrot", () => {
  it("matches the foxtrot chatId across shape variants", () => {
    const sid = "deadbeef-aaaa";
    expect(activeSlotIsFoxtrot(sid, JSON.stringify({ slots: { foxtrot: { state: { chatId: "claude-deadbeef" } } } }))).toBe(true);
    expect(activeSlotIsFoxtrot(sid, JSON.stringify({ foxtrot: { chatId: "claude-deadbeef" } }))).toBe(true);
    expect(activeSlotIsFoxtrot(sid, JSON.stringify([{ name: "foxtrot", chatId: "claude-deadbeef" }]))).toBe(true);
  });
  it("returns false when a different chat holds foxtrot", () => {
    expect(activeSlotIsFoxtrot("deadbeef-1", JSON.stringify({ slots: { foxtrot: { state: { chatId: "claude-99999999" } } } }))).toBe(false);
  });
  it("fail-soft: bad json / empty sid / missing slot → false (never throws)", () => {
    expect(activeSlotIsFoxtrot("", "{}")).toBe(false);
    expect(activeSlotIsFoxtrot("abc", "not json{")).toBe(false);
    expect(activeSlotIsFoxtrot("abc", JSON.stringify({ slots: {} }))).toBe(false);
  });
});

describe("buildContext", () => {
  const ctx = buildContext();
  it("surfaces the 6 physics gates + galaxy + maximize entrypoints", () => {
    expect(ctx).toContain("6 PHYSICS GATES");
    expect(ctx).toContain("chip-thinning");
    expect(ctx).toContain("singularity");
    expect(ctx).toContain("mill-wiring-audit.mjs");
    expect(ctx).toContain("AWARENESS.md");
  });
  it("references constants.ts and NEVER inlines a kc1.1/Taylor value (the #1 safety rule)", () => {
    expect(ctx).toContain("src/physics/constants.ts");
    for (const kc of ["1800", "2100", "1100", "700", "2800", "3200"]) {
      expect(ctx).not.toContain(kc);
    }
  });
});
