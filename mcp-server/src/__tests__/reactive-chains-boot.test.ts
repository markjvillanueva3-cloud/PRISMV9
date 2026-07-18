/**
 * reactive-chains-boot.test.ts -- BACKEND-COMPLETION/U-REACTIVE-CHAINS-BOOT (slot:zulu).
 *
 * Verifies the gated boot site for the EventBus reactive-chain subsystem:
 *   - default-OFF is a strict no-op (importer NEVER called -- the safety invariant,
 *     since the registration modules auto-fire consequential chains like job_to_invoice),
 *   - enabled imports every registration module,
 *   - a throwing import is fail-soft (recorded, does not abort the others or throw).
 * R9: each test fails if the gate / fail-soft logic regresses. The importer is injected
 * so the heavy real registration modules never load during the unit test.
 */
import { describe, it, expect, vi } from "vitest";
import {
  reactiveChainsEnabled,
  bootReactiveChains,
  REACTIVE_CHAINS_ENV,
  REGISTRATION_MODULES,
} from "../engines/reactive-chains-boot.js";

describe("reactiveChainsEnabled", () => {
  it("is true ONLY for the exact string '1'", () => {
    expect(reactiveChainsEnabled({ [REACTIVE_CHAINS_ENV]: "1" })).toBe(true);
  });
  it("is false for '0', 'true', empty, and unset", () => {
    expect(reactiveChainsEnabled({ [REACTIVE_CHAINS_ENV]: "0" })).toBe(false);
    expect(reactiveChainsEnabled({ [REACTIVE_CHAINS_ENV]: "true" })).toBe(false);
    expect(reactiveChainsEnabled({ [REACTIVE_CHAINS_ENV]: "" })).toBe(false);
    expect(reactiveChainsEnabled({})).toBe(false);
  });
});

describe("REGISTRATION_MODULES", () => {
  it("registers exactly the two known side-effect modules (regression-lock the set)", () => {
    expect([...REGISTRATION_MODULES]).toEqual([
      "./reactiveChainBootstrap.js",
      "./cycleSchedulingBridge.js",
    ]);
  });
});

describe("bootReactiveChains", () => {
  it("default-OFF -> no-op AND never calls the importer (the consequential-action safety invariant)", async () => {
    const importer = vi.fn().mockResolvedValue(undefined);
    const r = await bootReactiveChains({ env: {}, importer });
    expect(r.enabled).toBe(false);
    expect(r.loaded).toEqual([]);
    expect(r.failed).toEqual([]);
    expect(importer).not.toHaveBeenCalled(); // MUST NOT import (would register auto-firing chains)
    expect(r.reason).toMatch(/default-off/);
  });

  it("enabled -> imports EVERY registration module, in order", async () => {
    const importer = vi.fn().mockResolvedValue(undefined);
    const r = await bootReactiveChains({ env: { [REACTIVE_CHAINS_ENV]: "1" }, importer });
    expect(r.enabled).toBe(true);
    expect(r.loaded).toEqual([...REGISTRATION_MODULES]);
    expect(r.failed).toEqual([]);
    expect(importer).toHaveBeenCalledTimes(REGISTRATION_MODULES.length);
    expect(importer.mock.calls.map((c) => c[0])).toEqual([...REGISTRATION_MODULES]);
  });

  it("enabled + one module throws on import -> fail-soft (other still loads, no throw)", async () => {
    const importer = vi.fn(async (m: string) => {
      if (m === "./cycleSchedulingBridge.js") throw new Error("boom");
      return undefined;
    });
    const r = await bootReactiveChains({ env: { [REACTIVE_CHAINS_ENV]: "1" }, importer });
    expect(r.enabled).toBe(true);
    expect(r.loaded).toEqual(["./reactiveChainBootstrap.js"]);
    expect(r.failed).toHaveLength(1);
    expect(r.failed[0].module).toBe("./cycleSchedulingBridge.js");
    expect(r.failed[0].error).toMatch(/boom/);
  });

  it("enabled + ALL modules throw -> all recorded as failed, still resolves (never rejects)", async () => {
    const importer = vi.fn().mockRejectedValue(new Error("down"));
    const r = await bootReactiveChains({ env: { [REACTIVE_CHAINS_ENV]: "1" }, importer });
    expect(r.enabled).toBe(true);
    expect(r.loaded).toEqual([]);
    expect(r.failed).toHaveLength(REGISTRATION_MODULES.length);
    expect(r.failed.every((f) => /down/.test(f.error))).toBe(true);
  });
});
