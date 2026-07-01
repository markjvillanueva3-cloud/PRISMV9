/**
 * MasterPostProcessorUnifiedAGIEngine Tests
 * ==========================================
 * Verifies the 5 capability blocks of the PP-UNIFIED-AGI facade:
 *   (1) Unified Post Generation     -> generatePost()
 *   (2) G-Code Analysis             -> analyzeGCode()
 *   (3) Post Optimization           -> optimizePost()
 *   (4) Kinematics Validation       -> validateAgainstKinematics()
 *   (5) Provenance Tracking         -> generatePost(...).provenance
 * Plus engine metadata + error path.
 *
 * Closes U-CAMP14 (CAM-PARITY-AGI-MS0). Real-behavior assertions only.
 */

import { describe, it, expect } from "vitest";
import {
  masterPostProcessorUnifiedAGIEngine,
  MasterPostProcessorUnifiedAGIEngine,
  type UnifiedPostInput,
} from "../engines/MasterPostProcessorUnifiedAGIEngine.js";

/**
 * Minimal Fanuc-flavored G-code with a safe start block, one tool change,
 * an HSM call, a few feed moves, and an end-of-program. Used by analyze /
 * optimize paths so we can assert structural counts and detection.
 */
const SAMPLE_FANUC_GCODE = [
  "%",
  "O1000 (TEST PART)",
  "G17 G20 G40 G49 G80 G90",
  "G91 G28 Z0.",
  "T1 M06 (1/2 ENDMILL)",
  "G54",
  "G00 X0. Y0.",
  "G43 H1 Z1.",
  "G5.1 Q1 R0.01 (HSM ON)",
  "M03 S8000",
  "M08",
  "G01 Z-0.25 F20.",
  "G01 X2.0 Y0. F30.",
  "G01 X2.0 Y2.0",
  "G01 X0. Y2.0",
  "G01 X0. Y0.",
  "G00 Z1.",
  "M09",
  "M05",
  "G91 G28 Z0.",
  "M30",
  "%",
].join("\n");

describe("MasterPostProcessorUnifiedAGIEngine", () => {

  // -------------------------------------------------------------------------
  // ENGINE METADATA / SINGLETON
  // -------------------------------------------------------------------------
  describe("metadata", () => {
    it("exports a working singleton instance", () => {
      expect(masterPostProcessorUnifiedAGIEngine).toBeInstanceOf(
        MasterPostProcessorUnifiedAGIEngine
      );
    });

    it("getStatistics returns engine inventory with expected scale", () => {
      const stats = masterPostProcessorUnifiedAGIEngine.getStatistics();
      // Header doc claims 133+ engines; registry lists ~64 explicit entries.
      // Assert a structural minimum rather than the documentation headline.
      expect(stats.total_engines).toBeGreaterThanOrEqual(40);
      // CONTROLLER_PROFILES currently has 14 entries — assert a stable forward-
      // compat floor so adding a profile doesn't break this test for an
      // unrelated reason. (Reviewer B P1-B, 2026-05-17.)
      expect(stats.controllers_supported).toBeGreaterThanOrEqual(10);
      // Tribal tip seed corpus is non-empty.
      expect(stats.tribal_tips).toBeGreaterThan(0);
      expect(stats.physics_models).toBe(8);
      expect(stats.cam_systems).toBe(18);
      expect(typeof stats.engine_categories).toBe("object");
      // Engine-categories histogram must sum to total_engines.
      const sum = Object.values(stats.engine_categories).reduce(
        (a, b) => a + b,
        0
      );
      expect(sum).toBe(stats.total_engines);
    });

    it("getContextForAI emits a human-readable LLM-facing summary", () => {
      const ctx = masterPostProcessorUnifiedAGIEngine.getContextForAI();
      expect(ctx).toContain("MASTER POST PROCESSOR UNIFIED AGI ENGINE");
      expect(ctx).toContain("generatePost(input)");
      expect(ctx).toContain("analyzeGCode(gcode)");
      expect(ctx).toContain("optimizePost(gcode, controller)");
      expect(ctx).toContain("Kienzle");
      expect(ctx).toContain("Taylor");
    });
  });

  // -------------------------------------------------------------------------
  // (1) UNIFIED POST GENERATION  — getControllerProfile()
  // -------------------------------------------------------------------------
  describe("getControllerProfile", () => {
    it("returns the Fanuc profile with G43.4 RTCP and G5.1 Q1 HSM", () => {
      const p = masterPostProcessorUnifiedAGIEngine.getControllerProfile("fanuc");
      expect(p.id).toBe("fanuc");
      expect(p.rtcp_mode).toBe("G43.4");
      expect(p.hsm_code).toBe("G5.1 Q1");
      // Fanuc is the dominant controller — should carry a market_share weight.
      expect(p.market_share).toBeGreaterThan(0);
    });

    it("returns the Haas profile with G234 RTCP and G187 HSM and TSC M88/M89", () => {
      const p = masterPostProcessorUnifiedAGIEngine.getControllerProfile("haas");
      expect(p.id).toBe("haas");
      expect(p.rtcp_mode).toBe("G234");
      expect(p.hsm_code).toContain("G187");
      // Haas uses TSC on M88 / off M89 — the canonical TSC pair from the profile.
      expect(p.features.tsc?.on).toBe("M88");
      expect(p.features.tsc?.off).toBe("M89");
    });

    it("falls back to the generic profile for an unknown controller id", () => {
      // Probe the runtime fallback by addressing the method through a string-arg
      // signature — the engine's lookup uses `CONTROLLER_PROFILES[controller]`
      // and falls back to `CONTROLLER_PROFILES.generic`, so an unknown key
      // must resolve to the generic profile at runtime.
      const lookup = masterPostProcessorUnifiedAGIEngine
        .getControllerProfile as (c: string) => { id: string; name: string };
      const p = lookup("nonesuch");
      expect(p.id).toBe("generic");
      expect(p.name).toMatch(/Generic/i);
    });
  });

  // -------------------------------------------------------------------------
  // (2) G-CODE ANALYSIS  — analyzeGCode()
  // -------------------------------------------------------------------------
  describe("analyzeGCode", () => {
    it("counts line statistics (rapids, feeds, tool changes, comments)", () => {
      const result =
        masterPostProcessorUnifiedAGIEngine.analyzeGCode(SAMPLE_FANUC_GCODE);
      expect(result.line_stats.total).toBeGreaterThan(0);
      // Sample has multiple G00 rapids and G01 feed moves.
      expect(result.line_stats.rapid_moves).toBeGreaterThanOrEqual(2);
      expect(result.line_stats.feed_moves).toBeGreaterThanOrEqual(5);
      // T1 M06 is a tool change.
      expect(result.line_stats.tool_changes).toBeGreaterThanOrEqual(1);
      // O1000 + several parenthesized comments.
      expect(result.line_stats.comments).toBeGreaterThanOrEqual(2);
    });

    it("auto-detects the Fanuc controller from G5.1 Q1 + G43 idiom", () => {
      const result =
        masterPostProcessorUnifiedAGIEngine.analyzeGCode(SAMPLE_FANUC_GCODE);
      // Detected controller falls back to "fanuc" when no other dialect markers fire.
      expect(result.detected_controller).toBe("fanuc");
      // HSM idiom (G5.1) is one of the recognized operation classes.
      expect(result.detected_operations).toContain("hsm");
    });

    it("returns 8-dimension quality score with all scores in [0,100]", () => {
      const result =
        masterPostProcessorUnifiedAGIEngine.analyzeGCode(SAMPLE_FANUC_GCODE);
      const dims = result.dimensions;
      const keys = [
        "safety",
        "efficiency",
        "accuracy",
        "maintainability",
        "controller_optimization",
        "physics_compliance",
        "tribal_adherence",
        "best_practices",
      ] as const;
      for (const k of keys) {
        expect(dims[k]).toBeGreaterThanOrEqual(0);
        expect(dims[k]).toBeLessThanOrEqual(100);
      }
      expect(result.quality_score).toBeGreaterThanOrEqual(0);
      expect(result.quality_score).toBeLessThanOrEqual(100);
    });

    it("handles empty G-code without throwing (zero-input edge case)", () => {
      const result = masterPostProcessorUnifiedAGIEngine.analyzeGCode("");
      // No rapids, no feeds, no tool changes — but the analyzer still returns
      // a fully-shaped result with finite scores.
      expect(result.line_stats.rapid_moves).toBe(0);
      expect(result.line_stats.feed_moves).toBe(0);
      expect(result.line_stats.tool_changes).toBe(0);
      expect(Number.isFinite(result.quality_score)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // (3) POST OPTIMIZATION  — optimizePost()
  // -------------------------------------------------------------------------
  describe("optimizePost", () => {
    it("produces a UnifiedPostResult with provenance for Haas optimization", () => {
      const result = masterPostProcessorUnifiedAGIEngine.optimizePost(
        SAMPLE_FANUC_GCODE,
        "haas",
        { inject_hsm: true, inject_tribal: true, optimize_feeds: true }
      );
      expect(typeof result.gcode).toBe("string");
      expect(result.line_count).toBeGreaterThan(0);
      expect(result.controller_profile.id).toBe("haas");
      // Optimization is supposed to record processing time deterministically (>=0).
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      // Provenance must record at least the orchestrator entry-point invocation
      // AND a physics-category invocation — `optimizePost` enables physics
      // validation by default (`validate_physics: opts.optimize_feeds`), so a
      // stub that hand-rolls a single fake `engines_invoked[]` entry would not
      // hit the physics branch (Reviewer B P1-C, 2026-05-17).
      expect(result.provenance.engines_invoked.length).toBeGreaterThan(0);
      expect(
        result.provenance.engines_invoked.some(
          (inv) => inv.engine_category === "physics"
        )
      ).toBe(true);
      // total_confidence is computed as a normalized [0,1] score.
      expect(result.provenance.total_confidence).toBeGreaterThanOrEqual(0);
      expect(result.provenance.total_confidence).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // UNIFIED POST GENERATION — generatePost() error path
  // -------------------------------------------------------------------------
  describe("generatePost — error path", () => {
    it("returns an error UnifiedPostResult when no segments or gcode are supplied", () => {
      const input: UnifiedPostInput = { controller: "fanuc" };
      const result = masterPostProcessorUnifiedAGIEngine.generatePost(input);
      expect(result.gcode).toBe("");
      expect(result.line_count).toBe(0);
      expect(result.quality_score).toBe(0);
      // Error mode must surface a warning so the caller cannot silently consume
      // an empty success result (R12 fail-loud). Match the canonical phrase
      // emitted by `createErrorResult("No segments or G-code provided", ...)`
      // — alternation `|` previously made a stub returning just "provided"
      // pass (Reviewer B P1-A, 2026-05-17).
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toMatch(/no segments.*g-?code.*provided/i);
      // Controller profile is still populated so downstream UIs don't crash.
      expect(result.controller_profile.id).toBe("fanuc");
    });

    it("treats an empty-string gcode field the same as missing (hostile-payload class)", () => {
      // Empty string is falsy at the routing branch `else if (input.gcode)` —
      // so it must NOT be silently optimized-as-empty; it must hit the same
      // error path as `gcode: undefined`. Surfaced by Reviewer B's hostile-
      // payload check, 2026-05-17.
      const input: UnifiedPostInput = { controller: "fanuc", gcode: "" };
      const result = masterPostProcessorUnifiedAGIEngine.generatePost(input);
      expect(result.gcode).toBe("");
      expect(result.line_count).toBe(0);
      expect(result.warnings[0]).toMatch(/no segments.*g-?code.*provided/i);
    });
  });

  // -------------------------------------------------------------------------
  // (4) KINEMATICS VALIDATION  — validateAgainstKinematics()
  // -------------------------------------------------------------------------
  describe("validateAgainstKinematics", () => {
    it("returns an invalid-result envelope for an unknown machine id", () => {
      const k = masterPostProcessorUnifiedAGIEngine.validateAgainstKinematics(
        SAMPLE_FANUC_GCODE,
        "machine-that-does-not-exist"
      );
      // Envelope shape: missing machine -> valid=false + per-axis travels=false
      // + collision unsafe + accuracy_mm=0 + warnings naming the lookup miss.
      expect(k.valid).toBe(false);
      expect(k.machine_id).toBe("machine-that-does-not-exist");
      expect(k.topology).toBe("unknown");
      expect(k.way_type).toBe("unknown");
      expect(k.build_tier).toBe("unknown");
      expect(k.travel_check.x_ok).toBe(false);
      expect(k.travel_check.y_ok).toBe(false);
      expect(k.travel_check.z_ok).toBe(false);
      expect(k.travel_check.rotary_ok).toBe(false);
      expect(k.collision_check.safe).toBe(false);
      expect(k.collision_check.danger_zones).toContain("Machine profile not found");
      expect(k.accuracy_check.sufficient).toBe(false);
      expect(k.accuracy_check.machine_accuracy_mm).toBe(0);
      expect(k.warnings).toContain("Machine profile not found");
    });
  });

  // -------------------------------------------------------------------------
  // (5) PROVENANCE TRACKING  — provenance field on every result
  // -------------------------------------------------------------------------
  describe("provenance", () => {
    it("stamps a deterministic session_id and ISO timestamp on every call", () => {
      const result = masterPostProcessorUnifiedAGIEngine.optimizePost(
        SAMPLE_FANUC_GCODE,
        "fanuc"
      );
      const p = result.provenance;
      expect(typeof p.session_id).toBe("string");
      expect(p.session_id.length).toBeGreaterThan(0);
      // ISO-8601 timestamp parses to a valid Date.
      expect(Number.isNaN(Date.parse(p.timestamp))).toBe(false);
      // Each engine invocation must carry the four audit-trail fields.
      for (const inv of p.engines_invoked) {
        expect(typeof inv.engine_name).toBe("string");
        expect(typeof inv.engine_category).toBe("string");
        expect(inv.confidence).toBeGreaterThanOrEqual(0);
        expect(inv.confidence).toBeLessThanOrEqual(1);
        expect(typeof inv.contribution).toBe("string");
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FEATURE-GAP-AUDIT-MS0/U-BRIDGE-MASTERPOST-CAM — one post surface emits
  // controller-correct NC for every CAM bridge. A caller that names only its
  // source CAM gets that CAM's signature cross-CAM feature auto-injected.
  // ──────────────────────────────────────────────────────────────────────────
  describe("U-BRIDGE-MASTERPOST-CAM — source_cam drives cross-CAM unification", () => {
    /** Minimal valid CamToolpathSegment[] so generatePost() takes the segments path. */
    function pocketSegments(): UnifiedPostInput["segments"] {
      return [
        {
          source_cam: "mastercam",
          intent: "pocket_2d",
          moves: [
            { type: "rapid", x: 0, y: 0, z: 5 },
            { type: "feed", x: 0, y: 0, z: -2, feed: 200 },
            { type: "feed", x: 20, y: 0, z: -2, feed: 400 },
            { type: "feed", x: 20, y: 20, z: -2, feed: 400 },
            { type: "rapid", x: 0, y: 0, z: 5 },
          ],
          tool_number: 1,
          tool_diameter_mm: 10,
          tool_flutes: 4,
          spindle_rpm: 6000,
          feed_rate_mmmin: 400,
          coolant: "flood",
          material_iso: "P",
        },
      ] as UnifiedPostInput["segments"];
    }

    function genFromCam(source_cam: unknown, extra: Partial<UnifiedPostInput> = {}): {
      gcode: string;
      enhancements: string[];
    } {
      const r = masterPostProcessorUnifiedAGIEngine.generatePost({
        segments: pocketSegments(),
        controller: "fanuc",
        source_cam: source_cam as UnifiedPostInput["source_cam"],
        validate_kinematics: false,
        ...extra,
      });
      return { gcode: r.gcode, enhancements: r.enhancements };
    }

    // ── variability floor: 5 CAM bridges, each with a signature feature flag.
    // The 3rd column is the controller-correct NC annotation the derived
    // feature must emit into the G-code for a pocket_2d segment (null for the
    // two whose feature is gated to a non-pocket intent — marker still fires).
    it.each([
      ["mastercam", "cross_cam_auto_mastercam", "MASTERCAM DYNAMIC MOTION"],
      ["hypermill", "cross_cam_auto_hypermill", "HYPERMILL"],
      ["solidcam", "cross_cam_auto_solidcam", "SOLIDCAM IMACHINING"],
      ["nx", "cross_cam_auto_nx", null],
      ["fusion360", "cross_cam_auto_fusion360", null],
    ])("auto-injects the cross-CAM feature for source_cam=%s", (cam, marker, annotation) => {
      const { gcode, enhancements } = genFromCam(cam);
      // The bridge fired — CAM identity drove feature selection.
      expect(enhancements).toContain(marker);
      // ...and still emits real NC.
      expect(gcode.length).toBeGreaterThan(0);
      // ...and the derived feature reached MasterPostProcessorEngine — proven
      // by its signature annotation landing in the actual G-code, not just a
      // cosmetic enhancement string.
      if (annotation) expect(gcode).toContain(annotation);
    });

    it("emits controller-correct NC: every CAM routes to the same fanuc post", () => {
      // One post surface — each CAM origin yields a non-empty NC program.
      for (const cam of ["mastercam", "hypermill", "nx"]) {
        const r = masterPostProcessorUnifiedAGIEngine.generatePost({
          segments: pocketSegments(),
          controller: "fanuc",
          source_cam: cam as UnifiedPostInput["source_cam"],
          validate_kinematics: false,
        });
        expect(r.line_count).toBeGreaterThan(0);
        expect(r.gcode.length).toBeGreaterThan(0);
        expect(r.quality_score).toBeGreaterThan(0);
      }
    });

    it("a CAM bridge with no signature feature (esprit) takes the generic path", () => {
      const { gcode, enhancements } = genFromCam("esprit");
      // No cross_cam_auto_* marker — esprit has no dedicated feature flag.
      expect(enhancements.some((e) => e.startsWith("cross_cam_auto_"))).toBe(false);
      // Still produces NC — the generic post path is honoured.
      expect(gcode.length).toBeGreaterThan(0);
    });

    it("omitting source_cam entirely produces no auto-derivation", () => {
      const { enhancements } = genFromCam(undefined);
      expect(enhancements.some((e) => e.startsWith("cross_cam_auto_"))).toBe(false);
    });

    it("an explicit cross_cam_features overrides source_cam auto-derivation", () => {
      // Caller hand-picks features AND names a different CAM — the explicit set
      // wins: no auto-derivation marker (R12: no silent double-apply), AND the
      // explicit feature genuinely reaches the engine (its annotation lands in
      // the G-code), so a regression that silently dropped explicit features
      // would fail here, not pass.
      const { gcode, enhancements } = genFromCam("hypermill", {
        cross_cam_features: { mastercam_dynamic_chip_load: true },
      });
      expect(enhancements.some((e) => e.startsWith("cross_cam_auto_"))).toBe(false);
      // The explicit mastercam feature applied; the hypermill source_cam did NOT.
      expect(gcode).toContain("MASTERCAM DYNAMIC MOTION");
      expect(gcode).not.toContain("HYPERMILL");
    });

    it("an unrecognized source_cam value degrades gracefully (no throw, no marker)", () => {
      // Adversarial: a value outside UnifiedCamSource. deriveCrossCamFeatures's
      // switch default returns undefined — the post still generates.
      const { gcode, enhancements } = genFromCam("not-a-real-cam");
      expect(enhancements.some((e) => e.startsWith("cross_cam_auto_"))).toBe(false);
      expect(gcode.length).toBeGreaterThan(0);
    });

    it("round-trips through the prism_cam master_post_generate dispatcher action", async () => {
      const tools: Array<{ name: string; handler: (a: { action: string; params?: Record<string, unknown> }) => Promise<unknown> }> = [];
      const server = {
        tool: (...args: unknown[]) => {
          tools.push({ name: args[0] as string, handler: args[3] as (typeof tools)[number]["handler"] });
        },
      };
      const { registerCamDispatcher } = await import("../tools/dispatchers/camDispatcher.js");
      registerCamDispatcher(server as never);
      const cam = tools.find((t) => t.name === "prism_cam");
      expect(cam?.name).toBe("prism_cam");
      const resp = await cam!.handler({
        action: "master_post_generate",
        params: {
          segments: pocketSegments(),
          controller: "fanuc",
          source_cam: "mastercam",
          validate_kinematics: false,
        },
      });
      const content = (resp as { content: Array<{ text?: string }> }).content;
      const parsed = JSON.parse(content[0]?.text ?? "{}");
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.enhancements)).toBe(true);
      expect(parsed.enhancements).toContain("cross_cam_auto_mastercam");
    });
  });
});
