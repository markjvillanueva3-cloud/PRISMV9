/**
 * Dispatcher round-trip for cad_class_drive_build (CAD-FUSION-LIVE-MS0/U-CAD-CORPUS-PHASE16).
 *
 * Verifies the generalised loop-closure action: given a part_class and the
 * features already built, the dispatcher consults MasterCADControlBrainEngine
 * for missing class-typical features and dispatches each to the Fusion live
 * bridge. The bridge is intentionally offline (dry_run=true), so dispatched
 * entries record their intended call params with ok=false + error="dry_run".
 *
 * No network — bridge healthCheck short-circuits to false via dry_run flag.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  } | Record<string, unknown>>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && (res as { success?: boolean }).success === false) return res;
  const content = (res as { content?: Array<{ type: string; text: string }> }).content;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

interface DriveBuildResult {
  success: boolean;
  data: {
    part_class: string;
    bridge_up: boolean;
    dry_run: boolean;
    baseline_fidelity: number;
    upgraded_fidelity: number;
    lift_pct: number;
    built_features: string[];
    still_missing: string[];
    dispatched: Array<{ kind: string; build_hint: string; params: Record<string, unknown>; ok: boolean; error?: string }>;
    skipped: Array<{ kind: string; reason: string }>;
    visual_fidelity_notes: string[];
  };
  error?: string;
}

describe("cad_class_drive_build — dispatcher round-trip", () => {
  describe("baseline fidelity scoring", () => {
    it("returns 0% baseline when no features have been built yet", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: [],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      expect(r.success).toBe(true);
      expect(r.data.baseline_fidelity).toBeCloseTo(0, 5);
    });

    it("returns 53.6% baseline for the 2475-037 canary plan (3 of 6 punch features)", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis", "central_oil_hole", "cross_drilled_relief_holes"],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      expect(r.success).toBe(true);
      // Prevalence sum 1.0 + 0.9 + 0.7 = 2.6 / 4.85 = 0.5360
      expect(r.data.baseline_fidelity).toBeCloseTo(0.5361, 3);
    });

    it("returns 100% baseline when all class-typical features are already built", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: [
          "stepped_revolved_axis", "working_tip_taper", "central_oil_hole",
          "cross_drilled_relief_holes", "bevel_face_chamfer", "shoulder_fillet",
        ],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      expect(r.data.baseline_fidelity).toBeCloseTo(1.0, 5);
      expect(r.data.lift_pct).toBeCloseTo(0, 5);
      // slimResponse drops empty arrays for transport efficiency.
      expect(r.data.still_missing === undefined || r.data.still_missing.length === 0).toBe(true);
      expect(r.data.dispatched === undefined || r.data.dispatched.length === 0).toBe(true);
    });
  });

  describe("loop closure — dry_run dispatches", () => {
    it("dispatches all 3 missing features for the 2475-037 canary plan", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis", "central_oil_hole", "cross_drilled_relief_holes"],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      expect(r.data.dispatched.length).toBe(3);
      const kinds = r.data.dispatched.map((d) => d.kind).sort();
      expect(kinds).toEqual(["bevel_face_chamfer", "shoulder_fillet", "working_tip_taper"]);
    });

    it("marks dry_run dispatches with ok=false and error='dry_run'", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      for (const d of r.data.dispatched) {
        expect(d.ok).toBe(false);
        expect(d.error).toBe("dry_run");
      }
    });

    it("uses revolution_axis='Y' by default in chamfer/fillet call params", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      for (const d of r.data.dispatched) {
        expect(d.params.revolution_axis).toBe("Y");
      }
    });

    it("respects an explicit revolution_axis override", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        revolution_axis: "Z",
        dry_run: true,
      })) as unknown as DriveBuildResult;
      for (const d of r.data.dispatched) {
        expect(d.params.revolution_axis).toBe("Z");
      }
    });

    it("uses internal_horizontal selector for shoulder_fillet (avoids clobbering tip/base chamfers)", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      const fillet = r.data.dispatched.find((d) => d.kind === "shoulder_fillet");
      expect(fillet).not.toBe(undefined);
      expect(fillet?.params.edge_selection).toBe("internal_horizontal");
    });
  });

  describe("threshold filtering", () => {
    it("skips low-prevalence features when threshold is raised above their prevalence", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        prevalence_threshold: 0.75,
        dry_run: true,
      })) as unknown as DriveBuildResult;
      // shoulder_fillet (0.6) and cross_drilled_relief_holes (0.7) both fall under 0.75
      // but cross_drilled_* may not be in missing_features if it was built.
      const dispatchedKinds = new Set(r.data.dispatched.map((d) => d.kind));
      expect(dispatchedKinds.has("shoulder_fillet")).toBe(false);
    });
  });

  describe("feature_overrides", () => {
    it("applies a fillet radius override", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        feature_overrides: { shoulder_fillet: { radius_mm: 0.5 } },
        dry_run: true,
      })) as unknown as DriveBuildResult;
      const fillet = r.data.dispatched.find((d) => d.kind === "shoulder_fillet");
      expect(fillet?.params.radius_mm).toBe(0.5);
    });

    it("applies a chamfer distance override", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis"],
        feature_overrides: { bevel_face_chamfer: { distance_mm: 0.42 } },
        dry_run: true,
      })) as unknown as DriveBuildResult;
      const cham = r.data.dispatched.find((d) => d.kind === "bevel_face_chamfer");
      expect(cham?.params.distance_mm).toBe(0.42);
    });
  });

  describe("upgraded fidelity", () => {
    it("reports a positive lift when missing features get dispatched", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "extrude_punch",
        built_kinds: ["stepped_revolved_axis", "central_oil_hole", "cross_drilled_relief_holes"],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      const lift = r.data.upgraded_fidelity - r.data.baseline_fidelity;
      expect(lift).toBeGreaterThan(0);
      // 3 missing features added → 100% ceiling
      expect(r.data.upgraded_fidelity).toBeCloseTo(1.0, 5);
    });
  });

  describe("error path", () => {
    it("returns success=false for an unknown part_class", async () => {
      const r = (await invoke("cad_class_drive_build", {
        part_class: "definitely_not_a_known_part_class",
        built_kinds: [],
        dry_run: true,
      })) as unknown as DriveBuildResult;
      expect(r.success).toBe(false);
      expect(r.error).toContain("no template");
    });
  });
});
