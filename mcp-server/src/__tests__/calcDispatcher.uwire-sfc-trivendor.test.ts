/**
 * calcDispatcher — OSCAR-SFC-9AXIS-MS0 / U-OSC-WIRE-TRIVENDOR round-trip suite
 * ===========================================================================
 *
 * Verifies the 3 previously-orphaned SFC engines now reach the dispatcher
 * surface (the "wire unwired things / synergize the back end" directive):
 *   - speedFeedTriComparatorEngine        → speed_feed_tri_compare
 *   - speedFeedExhaustiveCombinationEngine → speed_feed_exhaustive_sweep
 *   - speedFeedDownstreamSubscriberEngine  → speed_feed_downstream_packs
 *
 * Coverage (per comprehensive-build floor):
 *   - 3 happy-path round-trips (one per engine) THROUGH the dispatcher
 *   - variability spans (mill / lathe sweep domains; post/mill/lathe packs)
 *   - failure modes (missing-required, bad domain, empty material)
 *   - adversarial inputs (NaN diameter, negative diameter)
 *   - regression guard: all 3 actions reachable (not "unknown action")
 *
 * The tri-comparator is driven with external systems disabled so it is
 * deterministic and disk-independent (no live G-Wizard / HSMAdvisor file
 * required in CI).
 *
 * @milestone OSCAR-SFC-9AXIS-MS0
 * @unit U-OSC-WIRE-TRIVENDOR
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

function inner(data: Record<string, unknown>): Record<string, unknown> {
  return ((data as { result?: Record<string, unknown> }).result ?? data) as Record<string, unknown>;
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerCalcDispatcher(server as any);
});

// ── speed_feed_tri_compare ────────────────────────────────────────────────────

describe("U-OSC-WIRE-TRIVENDOR — speed_feed_tri_compare", () => {
  it("returns PRISM + baseline opinions for P-group steel milling (disk-independent)", async () => {
    const r = await call(server, "speed_feed_tri_compare", {
      material: { iso_group: "P", name: "4140 steel", hardness_hb: 200 },
      tooling: { tool_diameter_mm: 10, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
      // Skip external disk reads — keep the test deterministic in CI.
      include_hsmadvisor: false,
      include_gwizard: false,
    });
    expect(r.ok).toBe(true);
    const out = inner(r.data);
    // The tri-comparator must always produce the PRISM opinion + a systems array.
    expect(Array.isArray(out.systems)).toBe(true);
    const systems = out.systems as Array<{ system: string }>;
    expect(systems.some((s) => s.system === "prism")).toBe(true);
  });

  it("includes the PRISM opinion with real physics Vc for N-group aluminum", async () => {
    const r = await call(server, "speed_feed_tri_compare", {
      material: { iso_group: "N", name: "6061 aluminum" },
      tooling: { tool_diameter_mm: 6, flutes: 3, tool_material: "carbide" },
      toolpath: { operation: "milling" },
      include_hsmadvisor: false,
      include_gwizard: false,
    });
    expect(r.ok).toBe(true);
    const systems = inner(r.data).systems as Array<{
      system: string;
      available: boolean;
      axes: { vc_mpm: number } | null;
    }>;
    // PRISM must self-identify and carry a physical Vc on its axes
    // (SystemOpinion.axes.vc_mpm — verified in source). 6061 aluminum
    // (N-group) runs at high SFM, so a real physics pass yields Vc well above
    // a conservative 50 m/min floor — a stub returning 0/null axes would fail.
    const prism = systems.find((s) => s.system === "prism");
    expect(prism?.system).toBe("prism");
    expect(prism!.available).toBe(true);
    expect(prism!.axes).not.toBeNull();
    expect(typeof prism!.axes!.vc_mpm).toBe("number");
    // 6061-T6 on carbide runs ~150–600 SFM ≈ 45–180 m/min (Machinery's
    // Handbook / Sandvik N-group). A real physics pass clears 100 m/min
    // comfortably; a degraded/stub value (0, ~50) would fail this floor.
    expect(prism!.axes!.vc_mpm).toBeGreaterThan(100);
  });

  it("FAILURE: rejects material with neither iso_group nor name (schema refine)", async () => {
    const r = await call(server, "speed_feed_tri_compare", {
      material: {},
      tooling: { tool_diameter_mm: 10 },
    });
    expect(r.ok).toBe(false);
    expect(String((r.data as { error?: unknown }).error)).toMatch(/material|iso_group|name/i);
  });

  it("ADVERSARIAL: rejects a non-positive tool diameter", async () => {
    const r = await call(server, "speed_feed_tri_compare", {
      material: { iso_group: "P" },
      tooling: { tool_diameter_mm: -5 },
    });
    expect(r.ok).toBe(false);
  });

  it("ADVERSARIAL: rejects a NaN tool diameter", async () => {
    const r = await call(server, "speed_feed_tri_compare", {
      material: { iso_group: "P" },
      tooling: { tool_diameter_mm: Number.NaN },
    });
    expect(r.ok).toBe(false);
  });
});

// ── speed_feed_exhaustive_sweep ──────────────────────────────────────────────

describe("U-OSC-WIRE-TRIVENDOR — speed_feed_exhaustive_sweep", () => {
  it("runs a demo-mode mill sweep and returns cells + invariant ledger", async () => {
    const r = await call(server, "speed_feed_exhaustive_sweep", {
      domain: "mill",
      sample_mode: "demo",
    });
    expect(r.ok).toBe(true);
    const out = inner(r.data);
    expect(out.sample_mode).toBe("demo");
    expect(Array.isArray(out.results)).toBe(true);
    expect((out.results as unknown[]).length).toBeGreaterThan(0);
  });

  it("VARIABILITY: lathe domain produces a self-consistent lathe cell set", async () => {
    const r = await call(server, "speed_feed_exhaustive_sweep", {
      domain: "lathe",
      sample_mode: "demo",
    });
    expect(r.ok).toBe(true);
    const out = inner(r.data);
    expect(Array.isArray(out.results)).toBe(true);
    // Every cell that self-describes a domain must report "lathe".
    const cells = out.results as Array<{ domain?: string }>;
    expect(cells.every((c) => c.domain === undefined || c.domain === "lathe")).toBe(true);
  });

  it("respects an iso_groups filter (only P cells enumerated)", async () => {
    const r = await call(server, "speed_feed_exhaustive_sweep", {
      domain: "mill",
      sample_mode: "demo",
      iso_groups: ["P"],
    });
    expect(r.ok).toBe(true);
    const cells = inner(r.data).results as Array<{ input_summary?: { iso_group?: string } }>;
    for (const c of cells) {
      if (c.input_summary?.iso_group) {
        expect(c.input_summary.iso_group).toBe("P");
      }
    }
  });

  it("VARIABILITY: wedm is the documented out-of-scope domain (zero chip-removal cells)", async () => {
    // Wire EDM is not chip-removal SFC — the engine intentionally enumerates
    // ZERO cells for wedm (SpeedFeedExhaustiveCombinationEngine.ts:218-222,
    // "operators should use prism_wedm dispatcher"). So a wedm sweep yields a
    // zero-cell report — never the rich cell set mill/lathe produce. We assert
    // that contract: if it succeeds, results is empty; either way it does NOT
    // misroute (no "unknown action").
    const r = await call(server, "speed_feed_exhaustive_sweep", {
      domain: "wedm",
      sample_mode: "demo",
    });
    if (r.ok) {
      const out = inner(r.data);
      expect((out.results as unknown[]) ?? []).toHaveLength(0);
    } else {
      const errText = String((r.data as { error?: unknown }).error ?? "");
      expect(errText.toLowerCase()).not.toContain("unknown action");
    }
  });

  it("FAILURE: rejects an unknown domain", async () => {
    const r = await call(server, "speed_feed_exhaustive_sweep", {
      domain: "plasma",
      sample_mode: "demo",
    });
    expect(r.ok).toBe(false);
  });
});

// ── speed_feed_downstream_packs ──────────────────────────────────────────────

describe("U-OSC-WIRE-TRIVENDOR — speed_feed_downstream_packs", () => {
  it("reports lifecycle status (registered flag + version count) by default", async () => {
    const r = await call(server, "speed_feed_downstream_packs", {});
    expect(r.ok).toBe(true);
    const out = inner(r.data);
    expect(out.op).toBe("status");
    expect(typeof out.registered).toBe("boolean");
    expect(typeof out.total_versions).toBe("number");
  });

  it("register → subscribes the exact 5 propagation domains", async () => {
    // The engine singleton persists across tests; unregister first so this
    // register call performs a real (not already-active no-op) subscription.
    await call(server, "speed_feed_downstream_packs", { op: "unregister" });
    const r = await call(server, "speed_feed_downstream_packs", { op: "register" });
    expect(r.ok).toBe(true);
    const out = inner(r.data);
    expect(out.op).toBe("register");
    // Assert the CONCRETE fan-out targets (verified against PropagationDomain
    // in SpeedFeedPropagationBridgeEngine.ts) — not just Array.isArray.
    expect(out.registered).toEqual([
      "post_processor",
      "mill_wizard",
      "lathe_wizard",
      "wedm_wizard",
      "print_to_program",
    ]);
    // And isRegistered() must now be true on a subsequent status call.
    const after = inner((await call(server, "speed_feed_downstream_packs", {})).data);
    expect(after.registered).toBe(true);
  });

  it("snapshot → returns the keyed cache snapshot + version count", async () => {
    const r = await call(server, "speed_feed_downstream_packs", { op: "snapshot" });
    expect(r.ok).toBe(true);
    const out = inner(r.data);
    expect(out.op).toBe("snapshot");
    expect(typeof out.total_versions).toBe("number");
    expect("cache" in out).toBe(true);
  });

  it("unregister → flips the registered flag back to false", async () => {
    await call(server, "speed_feed_downstream_packs", { op: "register" });
    const r = await call(server, "speed_feed_downstream_packs", { op: "unregister" });
    expect(r.ok).toBe(true);
    expect(inner(r.data).registered).toBe(false);
  });

  it("falls back to status for an unrecognized op", async () => {
    const r = await call(server, "speed_feed_downstream_packs", { op: "nonsense" });
    expect(r.ok).toBe(true);
    expect(inner(r.data).op).toBe("status");
  });
});

// ── regression: all three actions are reachable (not "unknown action") ───────

describe("U-OSC-WIRE-TRIVENDOR — wiring reachability guard", () => {
  it("none of the new actions report an unknown-action error", async () => {
    for (const action of [
      "speed_feed_tri_compare",
      "speed_feed_exhaustive_sweep",
      "speed_feed_downstream_packs",
      "speed_feed_calibration_persist",
      "speed_feed_gpu_judge",
    ]) {
      // Call with minimal params; a WIRED action either succeeds or returns a
      // VALIDATION error — never an "unknown action" routing miss.
      // speed_feed_gpu_judge: limit:0 so it probes GPU residency but makes ZERO
      // model calls — keeps this guard fast + deterministic (no live Ollama in CI).
      const params = action === "speed_feed_gpu_judge" ? { limit: 0 } : {};
      const r = await call(server, action, params);
      const errText = String((r.data as { error?: unknown }).error ?? "");
      expect(errText.toLowerCase()).not.toContain("unknown action");
      expect(errText.toLowerCase()).not.toContain("not supported");
    }
  });
});

// ── speed_feed_calibration_persist (U-OSC-CALIB-PERSIST) ─────────────────────

describe("U-OSC-CALIB-PERSIST — speed_feed_calibration_persist round-trip", () => {
  it("derives + persists a calibration model from a ledger through the dispatcher", async () => {
    // Write a tiny sweep-ledger fixture, then drive the action against it.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-calib-rt-"));
    const ledger = path.join(tmpDir, "ledger.jsonl");
    const out = path.join(tmpDir, "model.json");
    fs.writeFileSync(
      ledger,
      [
        JSON.stringify({ cell_id: "c1", domain: "mill", iso: "P", material: "steel", tool_diameter_mm: 10, mode: "prism_optimized", prism_vc_mpm: 150, baseline_vc_mpm: 200, gwizard_vc_mpm: null, gwizard_aligned: null, hsmadvisor_vc_mpm: null, hsmadvisor_aligned: null, consensus_vc_mpm: 200 }),
        JSON.stringify({ cell_id: "c2", domain: "mill", iso: "N", material: "6061", tool_diameter_mm: 6, mode: "prism_optimized", prism_vc_mpm: 300, baseline_vc_mpm: 600, gwizard_vc_mpm: null, gwizard_aligned: null, hsmadvisor_vc_mpm: null, hsmadvisor_aligned: null, consensus_vc_mpm: 600 }),
      ].join("\n") + "\n",
    );
    try {
      const r = await call(server, "speed_feed_calibration_persist", { ledger_path: ledger, out_path: out });
      expect(r.ok).toBe(true);
      const model = inner(r.data);
      expect(model.schemaVersion).toBe("1.0.0");
      expect(model.ledger_rows_consumed).toBe(2);
      expect(model.apply_policy).toBe("advisory-only");
      expect(Array.isArray(model.entries)).toBe(true);
      // The persisted file exists and round-trips.
      expect(fs.existsSync(out)).toBe(true);
      const reloaded = JSON.parse(fs.readFileSync(out, "utf8"));
      expect(reloaded.entries.length).toBe(2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("FAILURE: missing ledger reports a fail-loud error (not a silent success)", async () => {
    const r = await call(server, "speed_feed_calibration_persist", {
      ledger_path: "definitely-not-a-real-ledger.jsonl",
    });
    expect(r.ok).toBe(false);
    expect(String((r.data as { error?: unknown }).error)).toMatch(/ledger not found/i);
  });
});
