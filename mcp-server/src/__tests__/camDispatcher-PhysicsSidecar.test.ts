/**
 * camDispatcher: PhysicsSidecarBuilder dispatcher wiring (MS0/U-PPGM02).
 *
 * Verifies the 3 new actions (post_sidecar_build / post_sidecar_verify /
 * post_sidecar_canonicalize) are registered + the lazy-import path the
 * dispatcher uses resolves to the engine + the engine method names the
 * dispatcher calls actually exist on the engine.
 *
 * The dispatcher itself is registered as an MCP tool requiring full server
 * setup to invoke — these tests cover the dispatcher's wiring boundary
 * (action enum, import path, method surface) without spinning up MCP.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { PhysicsSidecarBuilderEngine, physicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";

describe("camDispatcher MS0/U-PPGM02 — action registration", () => {
  it("post_sidecar_build is in ACTIONS enum", () => {
    expect(ACTIONS.includes("post_sidecar_build" as typeof ACTIONS[number])).toBe(true);
  });

  it("post_sidecar_verify is in ACTIONS enum", () => {
    expect(ACTIONS.includes("post_sidecar_verify" as typeof ACTIONS[number])).toBe(true);
  });

  it("post_sidecar_canonicalize is in ACTIONS enum", () => {
    expect(ACTIONS.includes("post_sidecar_canonicalize" as typeof ACTIONS[number])).toBe(true);
  });
});

describe("camDispatcher MS0/U-PPGM02 — lazy-import path resolves", () => {
  it("dynamic import path '../../engines/PhysicsSidecarBuilderEngine.js' resolves to the engine module (same path the dispatcher uses)", async () => {
    const mod = await import("../engines/PhysicsSidecarBuilderEngine.js");
    expect(typeof mod.PhysicsSidecarBuilderEngine).toBe("function");
    expect(mod.physicsSidecarBuilderEngine).toBe(mod.PhysicsSidecarBuilderEngine);
  });

  it("singleton export 'physicsSidecarBuilderEngine' is the class itself (static-method engine)", () => {
    expect(physicsSidecarBuilderEngine).toBe(PhysicsSidecarBuilderEngine);
  });
});

describe("camDispatcher MS0/U-PPGM02 — method surface matches dispatcher case-blocks", () => {
  it("engine has buildAndSeal method (called by post_sidecar_build case)", () => {
    expect(typeof PhysicsSidecarBuilderEngine.buildAndSeal).toBe("function");
  });

  it("engine has verify method (called by post_sidecar_verify case)", () => {
    expect(typeof PhysicsSidecarBuilderEngine.verify).toBe("function");
  });

  it("engine has canonicalize and computeSha256 methods (both called by post_sidecar_canonicalize case)", () => {
    expect(typeof PhysicsSidecarBuilderEngine.canonicalize).toBe("function");
    expect(typeof PhysicsSidecarBuilderEngine.computeSha256).toBe("function");
  });
});

describe("camDispatcher MS0/U-PPGM02 — end-to-end behavior simulating dispatcher invocation", () => {
  /**
   * The dispatcher case for post_sidecar_build is exactly:
   *   const eng = await getEngine("physicsSidecarBuilder");
   *   result = eng.buildAndSeal(params);
   * We mirror that here to assert the dispatcher's contract end-to-end.
   */
  it("simulating post_sidecar_build returns a sealed sidecar with valid SHA-256", () => {
    const params = {
      source_engine_versions: { "src/physics/constants.ts": "test-sha-1" },
      generated_at: "2026-04-29T00:00:00.000Z",
    };
    const result = PhysicsSidecarBuilderEngine.buildAndSeal(params);
    expect(result.meta.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.meta.source_engine_versions["src/physics/constants.ts"]).toBe("test-sha-1");
  });

  /**
   * The dispatcher case for post_sidecar_verify is:
   *   result = eng.verify(params?.sidecar ?? params);
   * Mirror with both calling conventions.
   */
  it("simulating post_sidecar_verify with sidecar wrapped in {sidecar: ...} returns ok=true on freshly built", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: { Engine: "1.0.0" },
      generated_at: "2026-04-29T00:00:00.000Z",
    });
    // Mirror dispatcher: params?.sidecar ?? params
    const wrapped = { sidecar: sealed };
    const v = PhysicsSidecarBuilderEngine.verify(wrapped.sidecar ?? wrapped);
    expect(v.ok).toBe(true);
    expect(v.reason).toBe("ok");
  });

  it("simulating post_sidecar_verify with bare sidecar (no {sidecar:} wrapper) returns ok=true", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: { Engine: "1.0.0" },
      generated_at: "2026-04-29T00:00:00.000Z",
    });
    // Mirror dispatcher fallback: params?.sidecar ?? params (no sidecar key → use params)
    const params = sealed as Record<string, unknown>;
    const v = PhysicsSidecarBuilderEngine.verify((params as { sidecar?: unknown }).sidecar ?? params);
    expect(v.ok).toBe(true);
    expect(v.reason).toBe("ok");
  });

  /**
   * The dispatcher case for post_sidecar_canonicalize is:
   *   const canonical = eng.canonicalize(params?.payload ?? params);
   *   result = { canonical, sha256: eng.computeSha256(canonical), length: canonical.length };
   */
  it("simulating post_sidecar_canonicalize returns canonical text + SHA + length", () => {
    const params = { payload: { z: 1, a: { z: 1, a: 0 } } };
    const target = (params as { payload?: unknown }).payload ?? params;
    const canonical = PhysicsSidecarBuilderEngine.canonicalize(target);
    const sha256 = PhysicsSidecarBuilderEngine.computeSha256(canonical);
    const result = { canonical, sha256, length: canonical.length };
    expect(result.canonical).toBe('{"a":{"a":0,"z":1},"z":1}');
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.length).toBe(result.canonical.length);
  });

  it("simulating post_sidecar_verify with garbage input returns schema_invalid (no throw)", () => {
    const garbage = { nonsense: 42 };
    const v = PhysicsSidecarBuilderEngine.verify(garbage);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("schema_invalid");
  });
});
