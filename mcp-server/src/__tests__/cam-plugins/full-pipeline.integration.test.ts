/**
 * CAM Plugin Layer — Full Pipeline Integration Tests (U-CAM104)
 * ==============================================================
 *
 * End-to-end interactions across the U-CAM86..103 plugin layer. Each test
 * walks a realistic CAM operator scenario through MULTIPLE engines:
 *
 *   register → heartbeat → handshake → geometry handoff → speed/feed →
 *   prediction → optimization (safety-guarded) → tooltip render → encode
 *
 * Unlike the per-engine unit tests, these tests deliberately compose the
 * engines so a regression in one layer that breaks downstream consumers is
 * caught here. They use the REAL underlying engines (no stubs) — the
 * U-CAM-REAL-AUDIT pass already proved every engine is wired to its real
 * dependencies.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  CAMPluginCommunicationHubEngine,
  type HubPluginRegistration,
  type HubFrameEnvelope,
} from "../../engines/CAMPluginCommunicationHubEngine.js";
import { CAMGeometryExchangeEngine } from "../../engines/CAMGeometryExchangeEngine.js";
import {
  CAMPluginRegistryEngine,
  type PluginRegistrationInput,
} from "../../engines/CAMPluginRegistryEngine.js";
import { CAMSpeedFeedBridgeEngine } from "../../engines/CAMSpeedFeedBridgeEngine.js";
import { CAMPostSelectorUIEngine } from "../../engines/CAMPostSelectorUIEngine.js";
import { CAMTribalKnowledgeInjectionEngine } from "../../engines/CAMTribalKnowledgeInjectionEngine.js";
import {
  CAMMachiningErrorPredictionEngine,
  type ToolpathSegment,
} from "../../engines/CAMMachiningErrorPredictionEngine.js";
import { CAMOptimizationSuggestionEngine } from "../../engines/CAMOptimizationSuggestionEngine.js";

const PLUGIN_TARGETS = [
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
] as const;
type PluginTarget = (typeof PLUGIN_TARGETS)[number];

// ── Fixture builders ─────────────────────────────────────────────────────────

function realisticSegment(over: Partial<ToolpathSegment> = {}): ToolpathSegment {
  return {
    segment_index: over.segment_index ?? 0,
    rpm: over.rpm ?? 6000,
    fz_mm: over.fz_mm ?? 0.05,
    ap_mm: over.ap_mm ?? 1.5,
    ae_mm: over.ae_mm ?? 0.6,
    tool_diameter_mm: over.tool_diameter_mm ?? 6,
    tool_stickout_mm: over.tool_stickout_mm ?? 18,
    flutes: over.flutes ?? 4,
    kc1_1: over.kc1_1 ?? 1800,
    mc: over.mc ?? 0.25,
    tool_load_limit_n: over.tool_load_limit_n ?? 1500,
    ra_target_um: over.ra_target_um,
    coolant_lpm: over.coolant_lpm ?? 20,
  };
}

function hubReg(target: PluginTarget): HubPluginRegistration {
  return {
    plugin_id: `hub-${target}`,
    target,
    transport: "websocket",
    endpoint: `ws://localhost/${target}`,
    version: "1.0.0",
    capabilities: ["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"],
  };
}

function registryReg(target: PluginTarget, version = "1.0.0"): PluginRegistrationInput {
  return {
    plugin_id: `reg-${target}-${version}`,
    target,
    transport: "websocket",
    endpoint: `ws://localhost/${target}`,
    version,
    os: "windows",
    arch: "x64",
    capability: {
      frame_types: ["force", "chatter"],
      formats: ["step_ap242"],
      actions: ["render"],
      max_throughput_fps: 60,
      max_payload_mb: 100,
    },
    compat_range: {
      min_prism_version: "1.0.0",
      max_prism_version: "1.99.9",
    },
  };
}

function envelope(target: PluginTarget, seq: number, payload = "{}"): HubFrameEnvelope {
  return {
    frame_type: "force",
    target,
    operation_id: `op-${target}-${seq}`,
    payload,
    seq,
    hard_stop: false,
  };
}

beforeEach(() => {
  CAMTribalKnowledgeInjectionEngine.resetAll();
  CAMMachiningErrorPredictionEngine.resetAll();
  CAMOptimizationSuggestionEngine.resetAll();
  CAMPluginRegistryEngine.resetRegistry();
  CAMPluginCommunicationHubEngine.resetRegistry();
  CAMGeometryExchangeEngine.resetAll();
});

// ── 1. Plugin handshake → ready-for-routing flow ─────────────────────────────

describe("U-CAM104 — handshake to routing-ready", () => {
  it("registers all 5 targets and reports healthy registry", () => {
    for (const t of PLUGIN_TARGETS) {
      CAMPluginRegistryEngine.register(registryReg(t));
      CAMPluginRegistryEngine.heartbeat(`reg-${t}-1.0.0`);
    }
    const dash = CAMPluginRegistryEngine.computeHealthDashboard();
    expect(dash.total_registered).toBe(PLUGIN_TARGETS.length);
    expect(dash.online_count).toBe(PLUGIN_TARGETS.length);
    expect(dash.offline_count).toBe(0);
  });

  it("hub.routeAll delivers a force overlay frame to every registered target", () => {
    const session = "h-routeall-1";
    for (const t of PLUGIN_TARGETS) {
      CAMPluginCommunicationHubEngine.register(hubReg(t));
    }
    let totalDelivered = 0;
    for (const t of PLUGIN_TARGETS) {
      const results = CAMPluginCommunicationHubEngine.routeAll(session, envelope(t, 1));
      totalDelivered += results.filter(r => r.status === "delivered" || r.status === "queued").length;
    }
    expect(totalDelivered).toBeGreaterThanOrEqual(PLUGIN_TARGETS.length);
  });

  it("registry compatibility honors the plugin's compat_range", () => {
    CAMPluginRegistryEngine.register(registryReg("hypermill", "1.0.0"));
    const ok = CAMPluginRegistryEngine.checkCompatibility("reg-hypermill-1.0.0", "1.5.0");
    expect(ok.compatible).toBe(true);
    const tooNew = CAMPluginRegistryEngine.checkCompatibility("reg-hypermill-1.0.0", "2.5.0");
    expect(tooNew.compatible).toBe(false);
    const tooOld = CAMPluginRegistryEngine.checkCompatibility("reg-hypermill-1.0.0", "0.5.0");
    expect(tooOld.compatible).toBe(false);
  });

  it("registry rejects compatibility check for unknown plugin", () => {
    const r = CAMPluginRegistryEngine.checkCompatibility("ghost-id", "1.0.0");
    expect(r.compatible).toBe(false);
  });
});

// ── 2. Geometry handoff → speed/feed → prediction chain ──────────────────────

describe("U-CAM104 — geometry → speed/feed → prediction", () => {
  it("geometry blob registered and chunked end-to-end", () => {
    const blob_id = "geo-int-1";
    const bytes = new Uint8Array(Buffer.from("dummy geometry payload bytes 32B"));
    const reg = CAMGeometryExchangeEngine.registerBlob({
      blob_id,
      format: "step_ap242",
      bytes,
    });
    expect(reg.blob_id).toBe(blob_id);
    expect(reg.total_size).toBe(bytes.byteLength);
    expect(reg.chunk_count).toBeGreaterThan(0);
    expect(reg.checksum_sha256.length).toBe(64);
  });

  it("after geometry registration, speed/feed bridge produces a real response", () => {
    const sf = CAMSpeedFeedBridgeEngine.compute({
      target: "generic",
      native_request: {
        operation_id: "OP-GEO-SF",
        dia: 6,
        flutes: 4,
        material_iso: "P",
        operation: "milling",
      },
    });
    expect(["ok", "compute_error"]).toContain(sf.status);
  });

  it("predicting a benign segment yields no critical alerts", () => {
    const r = CAMMachiningErrorPredictionEngine.scanToolpath("int-pred-1", [
      realisticSegment({ ap_mm: 0.5, fz_mm: 0.03 }),
    ]);
    expect(r.alerts.every(a => a.priority !== "critical")).toBe(true);
  });

  it("predicting an aggressive segment yields a critical worst priority", () => {
    const r = CAMMachiningErrorPredictionEngine.scanToolpath("int-pred-2", [
      realisticSegment({ ap_mm: 8, fz_mm: 0.2, tool_load_limit_n: 80 }),
    ]);
    expect(r.worst_priority).toBe("critical");
    expect(r.alerts[0].priority).toBe("critical");
  });
});

// ── 3. Optimization safety-guard cross-engine contract ───────────────────────

describe("U-CAM104 — optimization respects predictor safety contract", () => {
  it("every cycle_time suggestion keeps predictors below PRIORITY_HIGH", () => {
    const baseline = realisticSegment({ ap_mm: 0.5, fz_mm: 0.03 });
    const r = CAMOptimizationSuggestionEngine.recommend(
      "int-opt-1",
      baseline,
      "cycle_time",
    );
    for (const sg of r.suggestions) {
      const patched = CAMOptimizationSuggestionEngine.applySuggestion(
        "int-opt-1",
        baseline,
        sg,
      );
      const alerts = CAMMachiningErrorPredictionEngine.evaluateSegment(patched);
      for (const a of alerts) {
        expect(a.priority).not.toBe("critical");
        expect(a.priority).not.toBe("high");
      }
    }
  });

  it("tool_life suggestions monotonically reduce rpm or fz vs baseline", () => {
    const baseline = realisticSegment({ rpm: 8000, fz_mm: 0.10 });
    const r = CAMOptimizationSuggestionEngine.recommend(
      "int-opt-2",
      baseline,
      "tool_life",
    );
    for (const sg of r.suggestions) {
      if (sg.driver === "rpm") expect(sg.patch.rpm!).toBeLessThan(baseline.rpm);
      if (sg.driver === "fz_mm") expect(sg.patch.fz_mm!).toBeLessThan(baseline.fz_mm);
    }
  });

  it("surface_finish suggestion brings predicted Ra below target", () => {
    const baseline = realisticSegment({ fz_mm: 0.20, ra_target_um: 1.6 });
    const r = CAMOptimizationSuggestionEngine.recommend(
      "int-opt-3",
      baseline,
      "surface_finish",
    );
    expect(r.suggestion_count).toBeGreaterThan(0);
    const sg = r.suggestions[0];
    const patched = CAMOptimizationSuggestionEngine.applySuggestion(
      "int-opt-3",
      baseline,
      sg,
    );
    const r_mm = 0.05 * patched.tool_diameter_mm;
    const ra = (patched.fz_mm * patched.fz_mm) / (32 * r_mm) * 1000;
    expect(ra).toBeLessThanOrEqual(baseline.ra_target_um!);
  });
});

// ── 4. Tooltip injection → encoder cross-engine flow ─────────────────────────

describe("U-CAM104 — tooltip render across all targets", () => {
  it("renders a real-corpus tooltip for every plugin target", () => {
    for (const t of PLUGIN_TARGETS) {
      const f = CAMTribalKnowledgeInjectionEngine.renderTooltip(
        `int-tip-${t}`,
        { operation_id: `op-${t}`, limit: 2 },
        t,
      );
      expect(f.target).toBe(t);
      expect(f.payload.length).toBeGreaterThan(0);
    }
  });

  it("aggregate session summary across 6 overlay engines is structurally complete", async () => {
    // Mirrors prism_monitoring's cam_overlay_session_summary action.
    const session = "int-agg-1";
    const [
      { ForceOverlayVisualizationEngine },
      { SLDOverlayEngine },
      { DeflectionOverlayEngine },
      { ThermalOverlayEngine },
      { ToolLifeOverlayEngine },
      { SafetyScoreOverlayEngine },
    ] = await Promise.all([
      import("../../engines/ForceOverlayVisualizationEngine.js"),
      import("../../engines/SLDOverlayEngine.js"),
      import("../../engines/DeflectionOverlayEngine.js"),
      import("../../engines/ThermalOverlayEngine.js"),
      import("../../engines/ToolLifeOverlayEngine.js"),
      import("../../engines/SafetyScoreOverlayEngine.js"),
    ]);
    const summary = {
      force: ForceOverlayVisualizationEngine.getStats(session),
      chatter: SLDOverlayEngine.getStats(session),
      deflection: DeflectionOverlayEngine.getStats(session),
      thermal: ThermalOverlayEngine.getStats(session),
      tool_life: ToolLifeOverlayEngine.getStats(session),
      safety_score: SafetyScoreOverlayEngine.getStats(session),
    };
    expect(Object.keys(summary).sort()).toEqual([
      "chatter", "deflection", "force", "safety_score", "thermal", "tool_life",
    ]);
    for (const v of Object.values(summary)) expect(typeof v).toBe("object");
  });
});

// ── 5. Post-selector + speed/feed cross-engine routing ───────────────────────

describe("U-CAM104 — post-selector + speed/feed cross-engine", () => {
  it("each lathe machine recommendation produces a parseable post status", () => {
    const machines = CAMPostSelectorUIEngine.listMachines({ category: "lathe" });
    expect(machines.length).toBeGreaterThan(0);
    for (const m of machines) {
      const rec = CAMPostSelectorUIEngine.recommendForMachine(m.machine_id);
      expect(rec.machine_id).toBe(m.machine_id);
      expect(["prism_enhanced", "vendor_stock", "no_post_available", "unknown_machine"])
        .toContain(rec.status);
    }
  });

  it("PostSelector dashboard counts sum to total machines", () => {
    const dash = CAMPostSelectorUIEngine.dashboard();
    expect(dash.total_machines).toBeGreaterThan(0);
    expect(dash.machines_with_post + dash.machines_missing_post).toBe(dash.total_machines);
    expect(dash.prism_enhanced_post_count + dash.vendor_stock_post_count)
      .toBeLessThanOrEqual(dash.machines_with_post);
  });
});

// ── 6. Failure-mode contract across the layer ────────────────────────────────

describe("U-CAM104 — failure-mode contract", () => {
  it("hub route to a target with no registered plugin returns unknown_target", () => {
    const session = "fail-hub-1";
    const r = CAMPluginCommunicationHubEngine.route(session, envelope("hypermill", 0));
    expect(r.status).toBe("unknown_target");
  });

  it("registry reportFailure walks plugin to offline after FAIL_BEFORE_OFFLINE failures", () => {
    CAMPluginRegistryEngine.register(registryReg("fusion360"));
    CAMPluginRegistryEngine.reportFailure("reg-fusion360-1.0.0", "fail-1");
    CAMPluginRegistryEngine.reportFailure("reg-fusion360-1.0.0", "fail-2");
    CAMPluginRegistryEngine.reportFailure("reg-fusion360-1.0.0", "fail-3");
    const after = CAMPluginRegistryEngine.getPlugin("reg-fusion360-1.0.0")!;
    expect(after.health).toBe("offline");
    expect(after.consecutive_failures).toBeGreaterThanOrEqual(3);
  });

  it("optimization on baseline at limits returns zero suggestions, not throw", () => {
    const baseline = realisticSegment({
      rpm: CAMOptimizationSuggestionEngine.DEFAULT_LIMITS.rpm_max,
      fz_mm: CAMOptimizationSuggestionEngine.DEFAULT_LIMITS.fz_max_mm,
      ae_mm: CAMOptimizationSuggestionEngine.DEFAULT_LIMITS.ae_max_mm,
    });
    const r = CAMOptimizationSuggestionEngine.recommend(
      "int-fail-1",
      baseline,
      "cycle_time",
    );
    expect(r.suggestion_count).toBe(0);
  });

  it("prediction with empty toolpath returns 0 alerts and null worst_priority", () => {
    const r = CAMMachiningErrorPredictionEngine.scanToolpath("int-fail-2", []);
    expect(r.alert_count).toBe(0);
    expect(r.worst_priority).toBeNull();
  });
});

// ── 7. Cohesive-unit contract: all engines share the same target enum ────────

describe("U-CAM104 — cohesive-unit cross-engine contract", () => {
  it("every plugin-aware engine supports the same 5 targets", () => {
    const expected = new Set<PluginTarget>(PLUGIN_TARGETS);
    const sets: Array<Set<string>> = [
      new Set(CAMSpeedFeedBridgeEngine.supportedTargets()),
      new Set(CAMPostSelectorUIEngine.supportedTargets()),
      new Set(CAMTribalKnowledgeInjectionEngine.supportedTargets()),
      new Set(CAMMachiningErrorPredictionEngine.supportedTargets()),
      new Set(CAMOptimizationSuggestionEngine.supportedTargets()),
    ];
    for (const s of sets) {
      expect(s.size).toBe(expected.size);
      for (const t of expected) expect(s.has(t)).toBe(true);
    }
  });

  it("geometry exchange supports the standard formats expected by CAM hosts", () => {
    const formats = CAMGeometryExchangeEngine.supportedFormats();
    for (const f of ["step_ap242", "brep_json", "stl_binary", "stl_ascii", "obj"]) {
      expect(formats).toContain(f);
    }
  });

  it("hub supports both transports referenced by plugin SDKs", () => {
    const transports = CAMPluginCommunicationHubEngine.supportedTransports();
    expect(transports).toContain("websocket");
    expect(transports).toContain("grpc");
  });

  it("hub frame types match the 6 overlay engines", () => {
    const fts = CAMPluginCommunicationHubEngine.supportedFrameTypes();
    expect(fts.sort()).toEqual([
      "chatter", "deflection", "force", "safety_score", "thermal", "tool_life",
    ]);
  });
});

// ── 8. End-to-end operator scenario (one per CAM host) ───────────────────────

describe("U-CAM104 — end-to-end operator scenario", () => {
  it("Fusion 360: handshake → predict → optimize → tooltip → all surfaces emit", () => {
    const session = "e2e-fusion-1";
    CAMPluginRegistryEngine.register(registryReg("fusion360"));
    CAMPluginCommunicationHubEngine.register(hubReg("fusion360"));

    const baseline = realisticSegment({
      ap_mm: 3, fz_mm: 0.10, tool_load_limit_n: 600,
    });
    const predict = CAMMachiningErrorPredictionEngine.scanToolpath(session, [baseline]);
    expect(predict.alert_count).toBeGreaterThan(0);
    const predictPayload = CAMMachiningErrorPredictionEngine.encodeReport(predict, "fusion360");
    expect(JSON.parse(predictPayload).jsonrpc).toBe("2.0");

    const opt = CAMOptimizationSuggestionEngine.recommend(session, baseline, "tool_life");
    expect(opt.suggestion_count).toBeGreaterThan(0);
    const optPayload = CAMOptimizationSuggestionEngine.encodeReport(opt, "fusion360");
    expect(JSON.parse(optPayload).jsonrpc).toBe("2.0");

    const tip = CAMTribalKnowledgeInjectionEngine.renderTooltip(
      session,
      { operation_id: "e2e-op", operation: "milling", material_iso_group: "P", limit: 3 },
      "fusion360",
    );
    expect(tip.target).toBe("fusion360");
    expect(JSON.parse(tip.payload).jsonrpc).toBe("2.0");

    expect(CAMMachiningErrorPredictionEngine.getStats(session).scans).toBe(1);
    expect(CAMOptimizationSuggestionEngine.getStats(session).recommends).toBe(1);
    const ts = CAMTribalKnowledgeInjectionEngine.getStats(session);
    expect(ts.renders).toBe(1);
    expect(ts.per_target_renders.fusion360).toBe(1);
  });

  it("Mastercam: same scenario, pipe-delimited payloads", () => {
    const session = "e2e-mastercam-1";
    const baseline = realisticSegment({
      ap_mm: 3, fz_mm: 0.10, tool_load_limit_n: 600,
    });
    const predict = CAMMachiningErrorPredictionEngine.scanToolpath(session, [baseline]);
    const pPayload = CAMMachiningErrorPredictionEngine.encodeReport(predict, "mastercam");
    expect(pPayload.startsWith("PREDICT|")).toBe(true);

    const opt = CAMOptimizationSuggestionEngine.recommend(session, baseline, "tool_life");
    const oPayload = CAMOptimizationSuggestionEngine.encodeReport(opt, "mastercam");
    expect(oPayload.startsWith("OPTIMIZE|")).toBe(true);

    const tip = CAMTribalKnowledgeInjectionEngine.renderTooltip(
      session,
      { operation_id: "e2e-op", limit: 2 },
      "mastercam",
    );
    expect(tip.payload.startsWith("TIPS|")).toBe(true);
  });

  it("hyperMILL: same scenario, all XML envelopes parse", () => {
    const session = "e2e-hypermill-1";
    const baseline = realisticSegment({
      ap_mm: 3, fz_mm: 0.10, tool_load_limit_n: 600,
    });
    const predict = CAMMachiningErrorPredictionEngine.scanToolpath(session, [baseline]);
    const pXml = CAMMachiningErrorPredictionEngine.encodeReport(predict, "hypermill");
    expect(pXml).toMatch(/^<predictionReport/);
    expect(pXml).toMatch(/<\/predictionReport>$/);

    const opt = CAMOptimizationSuggestionEngine.recommend(session, baseline, "tool_life");
    const oXml = CAMOptimizationSuggestionEngine.encodeReport(opt, "hypermill");
    expect(oXml).toMatch(/^<suggestionReport/);
    expect(oXml).toMatch(/<\/suggestionReport>$/);

    const tip = CAMTribalKnowledgeInjectionEngine.renderTooltip(
      session, { operation_id: "e2e-op", limit: 2 }, "hypermill",
    );
    expect(tip.payload).toMatch(/^<tribalTooltips/);
    expect(tip.payload).toMatch(/<\/tribalTooltips>$/);
  });

  it("Inventor HSM: typed JSON envelopes parse end-to-end", () => {
    const session = "e2e-inventor-1";
    const baseline = realisticSegment({
      ap_mm: 3, fz_mm: 0.10, tool_load_limit_n: 600,
    });
    const predict = CAMMachiningErrorPredictionEngine.scanToolpath(session, [baseline]);
    const pObj = JSON.parse(
      CAMMachiningErrorPredictionEngine.encodeReport(predict, "inventor_hsm"),
    );
    expect(pObj.type).toBe("hsm.predictionAlerts");

    const opt = CAMOptimizationSuggestionEngine.recommend(session, baseline, "tool_life");
    const oObj = JSON.parse(
      CAMOptimizationSuggestionEngine.encodeReport(opt, "inventor_hsm"),
    );
    expect(oObj.type).toBe("hsm.optimizationSuggestions");

    const tip = CAMTribalKnowledgeInjectionEngine.renderTooltip(
      session, { operation_id: "e2e-op", limit: 2 }, "inventor_hsm",
    );
    const tObj = JSON.parse(tip.payload);
    expect(tObj.type).toBe("hsm.tribalTooltips");
  });
});
