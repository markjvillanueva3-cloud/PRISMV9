/**
 * PlaywrightAutomationEngine — GUI Automation Script Generation for Web-Based CAD
 * Generates Playwright automation scripts to control web-based CAD software
 * (OnShape, TinkerCAD, FreeCAD web) from extracted video action sequences.
 * Includes execution planning to decide between CadQuery and Playwright paths.
 */
import { log } from "../utils/Logger.js";
import type { ExtractedAction } from "./VideoActionExtractorEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface PlaywrightAction {
  step: number;
  action: "click" | "fill" | "select" | "key" | "wait" | "screenshot" | "navigate";
  target?: string;
  value?: string;
  key?: string;
  wait_ms?: number;
  description: string;
  video_timestamp_s?: number;
}

export interface GUIProfile {
  name: string;
  software: string;
  url?: string;
  selectors: Record<string, string>;
  workflows: Record<string, PlaywrightAction[]>;
}

export interface PlaywrightScript {
  target_software: string;
  actions: PlaywrightAction[];
  estimated_duration_s: number;
  requires_login: boolean;
  warnings: string[];
}

export interface ExecutionPlan {
  mode: "cadquery" | "playwright" | "hybrid";
  reason: string;
  cadquery_steps: number[];
  playwright_steps: number[];
  execution_order: { step: number; engine: "cadquery" | "playwright" }[];
}

// ── Action timing constants (seconds) ──────────────────────────────

const TIMING = {
  click: 0.5,
  fill: 1.0,
  select: 0.8,
  key: 0.3,
  wait: 0, // uses wait_ms from action
  screenshot: 2.0,
  navigate: 3.0,
} as const;

// ── CadQuery-compatible action types ───────────────────────────────

const CADQUERY_ACTIONS = new Set([
  "sketch_rectangle",
  "sketch_circle",
  "sketch_line",
  "sketch_polygon",
  "sketch_arc",
  "sketch_spline",
  "extrude",
  "cut",
  "revolve",
  "fillet",
  "chamfer",
  "mirror",
  "shell",
  "loft",
  "sweep",
  "hole",
  "counterbore",
  "countersink",
]);

const PLAYWRIGHT_ONLY_ACTIONS = new Set([
  "toolpath",
  "toolpath_contour",
  "toolpath_pocket",
  "toolpath_drill",
  "toolpath_adaptive",
  "assembly_mate",
  "assembly_insert",
  "assembly_constrain",
  "cam_setup",
  "cam_generate",
  "simulation",
  "render",
  "export",
  "import",
  "measure",
]);

// ── GUI Profiles ───────────────────────────────────────────────────

function buildOnShapeProfile(): GUIProfile {
  return {
    name: "OnShape",
    software: "onshape",
    url: "https://cad.onshape.com",
    selectors: {
      toolbar_features: '[data-test="feature-toolbar"]',
      toolbar_sketch: '[data-test="sketch-toolbar"]',
      extrude_btn: '[data-test="extrude-tool"]',
      fillet_btn: '[data-test="fillet-tool"]',
      chamfer_btn: '[data-test="chamfer-tool"]',
      sketch_btn: '[data-test="sketch-tool"]',
      rectangle_btn: '[data-test="rectangle-tool"]',
      circle_btn: '[data-test="circle-tool"]',
      line_btn: '[data-test="line-tool"]',
      depth_input: '[data-test="depth-input"]',
      radius_input: '[data-test="radius-input"]',
      confirm_btn: '[data-test="confirm-btn"]',
      cancel_btn: '[data-test="cancel-btn"]',
      canvas: "#onshape-canvas",
      feature_list: '[data-test="feature-list"]',
      dimension_input: 'input[data-test="dimension"]',
      sketch_plane_top: '[data-test="plane-top"]',
      sketch_plane_front: '[data-test="plane-front"]',
      sketch_plane_right: '[data-test="plane-right"]',
    },
    workflows: {
      extrude: [
        { step: 1, action: "click", target: '[data-test="extrude-tool"]', description: "Click extrude tool" },
        { step: 2, action: "fill", target: '[data-test="depth-input"]', value: "{{depth}}", description: "Enter extrude depth" },
        { step: 3, action: "click", target: '[data-test="confirm-btn"]', description: "Confirm extrude" },
        { step: 4, action: "wait", wait_ms: 1500, description: "Wait for geometry update" },
        { step: 5, action: "screenshot", description: "Capture post-extrude state" },
      ],
      fillet: [
        { step: 1, action: "click", target: '[data-test="fillet-tool"]', description: "Click fillet tool" },
        { step: 2, action: "click", target: "#onshape-canvas", description: "Select edge for fillet" },
        { step: 3, action: "fill", target: '[data-test="radius-input"]', value: "{{radius}}", description: "Enter fillet radius" },
        { step: 4, action: "click", target: '[data-test="confirm-btn"]', description: "Confirm fillet" },
        { step: 5, action: "wait", wait_ms: 1500, description: "Wait for geometry update" },
        { step: 6, action: "screenshot", description: "Capture post-fillet state" },
      ],
      sketch_rectangle: [
        { step: 1, action: "click", target: '[data-test="sketch-tool"]', description: "Enter sketch mode" },
        { step: 2, action: "click", target: '[data-test="plane-top"]', description: "Select sketch plane" },
        { step: 3, action: "click", target: '[data-test="rectangle-tool"]', description: "Select rectangle tool" },
        { step: 4, action: "click", target: "#onshape-canvas", description: "Click first corner" },
        { step: 5, action: "click", target: "#onshape-canvas", description: "Click second corner" },
        { step: 6, action: "fill", target: 'input[data-test="dimension"]', value: "{{width}}", description: "Enter width" },
        { step: 7, action: "key", key: "Tab", description: "Tab to next dimension" },
        { step: 8, action: "fill", target: 'input[data-test="dimension"]', value: "{{height}}", description: "Enter height" },
        { step: 9, action: "key", key: "Enter", description: "Confirm dimensions" },
        { step: 10, action: "screenshot", description: "Capture sketch state" },
      ],
      chamfer: [
        { step: 1, action: "click", target: '[data-test="chamfer-tool"]', description: "Click chamfer tool" },
        { step: 2, action: "click", target: "#onshape-canvas", description: "Select edge for chamfer" },
        { step: 3, action: "fill", target: '[data-test="depth-input"]', value: "{{distance}}", description: "Enter chamfer distance" },
        { step: 4, action: "click", target: '[data-test="confirm-btn"]', description: "Confirm chamfer" },
        { step: 5, action: "wait", wait_ms: 1500, description: "Wait for geometry update" },
        { step: 6, action: "screenshot", description: "Capture post-chamfer state" },
      ],
    },
  };
}

function buildTinkerCADProfile(): GUIProfile {
  return {
    name: "TinkerCAD",
    software: "tinkercad",
    url: "https://www.tinkercad.com",
    selectors: {
      shape_menu: "#shape-menu",
      box_shape: '[data-shape="box"]',
      cylinder_shape: '[data-shape="cylinder"]',
      sphere_shape: '[data-shape="sphere"]',
      workplane: "#workplane",
      width_input: 'input[name="width"]',
      height_input: 'input[name="height"]',
      depth_input: 'input[name="depth"]',
      group_btn: "#group-btn",
      align_btn: "#align-btn",
      hole_toggle: "#hole-toggle",
      move_handle: ".move-handle",
      resize_handle: ".resize-handle",
      canvas: "#tinkercad-canvas",
    },
    workflows: {
      extrude: [
        { step: 1, action: "click", target: "#shape-menu", description: "Open shape menu" },
        { step: 2, action: "click", target: '[data-shape="box"]', description: "Select box shape" },
        { step: 3, action: "click", target: "#workplane", description: "Place on workplane" },
        { step: 4, action: "fill", target: 'input[name="height"]', value: "{{depth}}", description: "Set extrude height" },
        { step: 5, action: "wait", wait_ms: 1000, description: "Wait for shape update" },
        { step: 6, action: "screenshot", description: "Capture shape state" },
      ],
      sketch_rectangle: [
        { step: 1, action: "click", target: "#shape-menu", description: "Open shape menu" },
        { step: 2, action: "click", target: '[data-shape="box"]', description: "Select box shape" },
        { step: 3, action: "click", target: "#workplane", description: "Place on workplane" },
        { step: 4, action: "fill", target: 'input[name="width"]', value: "{{width}}", description: "Set width" },
        { step: 5, action: "fill", target: 'input[name="depth"]', value: "{{height}}", description: "Set depth" },
        { step: 6, action: "fill", target: 'input[name="height"]', value: "1", description: "Minimal height for 2D sketch" },
        { step: 7, action: "screenshot", description: "Capture rectangle" },
      ],
      fillet: [
        { step: 1, action: "click", target: "#tinkercad-canvas", description: "Select object" },
        { step: 2, action: "click", target: "#shape-menu", description: "Open shape menu for fillet helper" },
        { step: 3, action: "wait", wait_ms: 500, description: "Wait for menu" },
        { step: 4, action: "screenshot", description: "Note: TinkerCAD has limited fillet support" },
      ],
    },
  };
}

function buildFreeCADWebProfile(): GUIProfile {
  return {
    name: "FreeCAD Web",
    software: "freecad_web",
    url: "https://freecad-web.org",
    selectors: {
      toolbar_part: "#part-toolbar",
      toolbar_sketch: "#sketch-toolbar",
      extrude_btn: "#extrude-btn",
      fillet_btn: "#fillet-btn",
      chamfer_btn: "#chamfer-btn",
      sketch_btn: "#sketch-btn",
      rectangle_btn: "#rectangle-btn",
      circle_btn: "#circle-btn",
      pad_depth: 'input[name="pad-depth"]',
      fillet_radius: 'input[name="fillet-radius"]',
      ok_btn: "#ok-btn",
      cancel_btn: "#cancel-btn",
      canvas: "#freecad-canvas",
    },
    workflows: {
      extrude: [
        { step: 1, action: "click", target: "#extrude-btn", description: "Click pad/extrude" },
        { step: 2, action: "fill", target: 'input[name="pad-depth"]', value: "{{depth}}", description: "Enter pad depth" },
        { step: 3, action: "click", target: "#ok-btn", description: "Confirm pad" },
        { step: 4, action: "wait", wait_ms: 2000, description: "Wait for geometry recompute" },
        { step: 5, action: "screenshot", description: "Capture post-pad state" },
      ],
      fillet: [
        { step: 1, action: "click", target: "#fillet-btn", description: "Click fillet tool" },
        { step: 2, action: "click", target: "#freecad-canvas", description: "Select edge" },
        { step: 3, action: "fill", target: 'input[name="fillet-radius"]', value: "{{radius}}", description: "Enter radius" },
        { step: 4, action: "click", target: "#ok-btn", description: "Confirm fillet" },
        { step: 5, action: "wait", wait_ms: 2000, description: "Wait for geometry recompute" },
        { step: 6, action: "screenshot", description: "Capture post-fillet state" },
      ],
      sketch_rectangle: [
        { step: 1, action: "click", target: "#sketch-btn", description: "Enter sketcher" },
        { step: 2, action: "click", target: "#rectangle-btn", description: "Select rectangle" },
        { step: 3, action: "click", target: "#freecad-canvas", description: "Click first point" },
        { step: 4, action: "click", target: "#freecad-canvas", description: "Click second point" },
        { step: 5, action: "wait", wait_ms: 500, description: "Wait for constraint solver" },
        { step: 6, action: "screenshot", description: "Capture sketch" },
      ],
    },
  };
}

function buildGenericProfile(): GUIProfile {
  return {
    name: "Generic CAD",
    software: "generic",
    selectors: {
      toolbar: "#toolbar",
      canvas: "#canvas",
      extrude_btn: "#extrude",
      fillet_btn: "#fillet",
      chamfer_btn: "#chamfer",
      sketch_btn: "#sketch",
      rectangle_btn: "#rectangle",
      circle_btn: "#circle",
      depth_input: "#depth-input",
      radius_input: "#radius-input",
      confirm_btn: "#confirm",
      cancel_btn: "#cancel",
    },
    workflows: {
      extrude: [
        { step: 1, action: "click", target: "#extrude", description: "Click extrude" },
        { step: 2, action: "fill", target: "#depth-input", value: "{{depth}}", description: "Enter depth" },
        { step: 3, action: "click", target: "#confirm", description: "Confirm" },
        { step: 4, action: "wait", wait_ms: 1000, description: "Wait for update" },
        { step: 5, action: "screenshot", description: "Capture result" },
      ],
      fillet: [
        { step: 1, action: "click", target: "#fillet", description: "Click fillet" },
        { step: 2, action: "click", target: "#canvas", description: "Select edge" },
        { step: 3, action: "fill", target: "#radius-input", value: "{{radius}}", description: "Enter radius" },
        { step: 4, action: "click", target: "#confirm", description: "Confirm" },
        { step: 5, action: "wait", wait_ms: 1000, description: "Wait for update" },
        { step: 6, action: "screenshot", description: "Capture result" },
      ],
      sketch_rectangle: [
        { step: 1, action: "click", target: "#sketch", description: "Enter sketch" },
        { step: 2, action: "click", target: "#rectangle", description: "Select rectangle" },
        { step: 3, action: "click", target: "#canvas", description: "Click first corner" },
        { step: 4, action: "click", target: "#canvas", description: "Click second corner" },
        { step: 5, action: "screenshot", description: "Capture sketch" },
      ],
      chamfer: [
        { step: 1, action: "click", target: "#chamfer", description: "Click chamfer" },
        { step: 2, action: "click", target: "#canvas", description: "Select edge" },
        { step: 3, action: "fill", target: "#depth-input", value: "{{distance}}", description: "Enter distance" },
        { step: 4, action: "click", target: "#confirm", description: "Confirm" },
        { step: 5, action: "wait", wait_ms: 1000, description: "Wait for update" },
        { step: 6, action: "screenshot", description: "Capture result" },
      ],
    },
  };
}

// ── Profile registry ───────────────────────────────────────────────

const PROFILES: Record<string, () => GUIProfile> = {
  onshape: buildOnShapeProfile,
  tinkercad: buildTinkerCADProfile,
  freecad_web: buildFreeCADWebProfile,
  generic: buildGenericProfile,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PlaywrightAutomationEngine {
  /**
   * Return the GUI profile for a given CAD software.
   * Falls back to "generic" if the software is unknown.
   */
  getProfile(software: string): GUIProfile {
    const builder = PROFILES[software.toLowerCase()] ?? PROFILES["generic"];
    return builder();
  }

  /**
   * Generate a complete Playwright GUI automation script from extracted actions.
   */
  generateGUIScript(actions: ExtractedAction[], target: string): PlaywrightScript {
    const profile = this.getProfile(target);
    const warnings: string[] = [];

    if (actions.length === 0) {
      return {
        target_software: target,
        actions: [],
        estimated_duration_s: 0,
        requires_login: target === "onshape" || target === "tinkercad",
        warnings: [],
      };
    }

    const pwActions: PlaywrightAction[] = [];
    let stepCounter = 0;

    // Navigate to software URL if known
    if (profile.url) {
      stepCounter++;
      pwActions.push({
        step: stepCounter,
        action: "navigate",
        value: profile.url,
        description: `Navigate to ${profile.name}`,
      });
    }

    for (const action of actions) {
      const opKey = this.mapActionToWorkflow(action.action_type, action.operation);
      const workflow = profile.workflows[opKey];

      if (workflow) {
        // Clone and parameterise the workflow template
        for (const templateStep of workflow) {
          stepCounter++;
          const pwAction: PlaywrightAction = {
            ...templateStep,
            step: stepCounter,
            video_timestamp_s: action.timestamp_s,
          };

          // Substitute template variables with action parameters
          if (pwAction.value) {
            pwAction.value = this.substituteParams(pwAction.value, action.parameters);
          }

          pwActions.push(pwAction);
        }
      } else {
        // No workflow template — emit generic click + wait + screenshot
        warnings.push(`No workflow template for "${action.action_type}/${action.operation}" in ${profile.name} — using generic fallback`);

        stepCounter++;
        pwActions.push({
          step: stepCounter,
          action: "click",
          target: profile.selectors["canvas"] ?? "#canvas",
          description: `[Generic] Perform ${action.operation}: ${action.description}`,
          video_timestamp_s: action.timestamp_s,
        });

        stepCounter++;
        pwActions.push({
          step: stepCounter,
          action: "wait",
          wait_ms: 1500,
          description: `Wait after ${action.operation}`,
          video_timestamp_s: action.timestamp_s,
        });

        stepCounter++;
        pwActions.push({
          step: stepCounter,
          action: "screenshot",
          description: `Capture after ${action.operation}`,
          video_timestamp_s: action.timestamp_s,
        });
      }
    }

    const estimated = this.estimateDuration(pwActions);
    const requiresLogin = target === "onshape" || target === "tinkercad";

    log.info(`[PlaywrightAutomation] Generated ${pwActions.length} steps for ${target}, est. ${estimated.toFixed(1)}s`);

    return {
      target_software: target,
      actions: pwActions,
      estimated_duration_s: estimated,
      requires_login: requiresLogin,
      warnings,
    };
  }

  /**
   * Plan execution strategy: decide which engine handles each action.
   */
  planExecution(
    actions: ExtractedAction[],
    preferences?: { prefer?: "cadquery" | "playwright" },
  ): ExecutionPlan {
    const cadqSteps: number[] = [];
    const pwSteps: number[] = [];
    const order: { step: number; engine: "cadquery" | "playwright" }[] = [];
    const prefer = preferences?.prefer ?? "cadquery";

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const isCadQuery = CADQUERY_ACTIONS.has(a.action_type);
      const isPlaywrightOnly = PLAYWRIGHT_ONLY_ACTIONS.has(a.action_type);

      if (isPlaywrightOnly) {
        pwSteps.push(i);
        order.push({ step: i, engine: "playwright" });
      } else if (isCadQuery) {
        if (prefer === "playwright") {
          pwSteps.push(i);
          order.push({ step: i, engine: "playwright" });
        } else {
          cadqSteps.push(i);
          order.push({ step: i, engine: "cadquery" });
        }
      } else {
        // Unknown action — Playwright is more flexible
        pwSteps.push(i);
        order.push({ step: i, engine: "playwright" });
      }
    }

    // Determine mode
    let mode: "cadquery" | "playwright" | "hybrid";
    let reason: string;

    if (pwSteps.length === 0 && cadqSteps.length > 0) {
      mode = "cadquery";
      reason = "All actions are pure geometry operations compatible with CadQuery";
    } else if (cadqSteps.length === 0 && pwSteps.length > 0) {
      mode = "playwright";
      reason = "All actions require GUI interaction (CAM/assembly/custom)";
    } else if (cadqSteps.length > 0 && pwSteps.length > 0) {
      mode = "hybrid";
      reason = `${cadqSteps.length} geometry actions via CadQuery, ${pwSteps.length} GUI actions via Playwright`;
    } else {
      mode = "cadquery";
      reason = "No actions to plan";
    }

    // Sort execution order to keep step sequence
    order.sort((a, b) => a.step - b.step);

    log.info(`[PlaywrightAutomation] Execution plan: mode=${mode}, cadquery=${cadqSteps.length}, playwright=${pwSteps.length}`);

    return { mode, reason, cadquery_steps: cadqSteps, playwright_steps: pwSteps, execution_order: order };
  }

  /**
   * Estimate total duration in seconds for a set of Playwright actions.
   */
  estimateDuration(actions: PlaywrightAction[]): number {
    let total = 0;
    for (const a of actions) {
      const base = TIMING[a.action] ?? 0.5;
      if (a.action === "wait" && a.wait_ms) {
        total += a.wait_ms / 1000;
      } else {
        total += base;
      }
    }
    // 10% buffer for page rendering variability
    return total * 1.1;
  }

  // ── Private helpers ──────────────────────────────────────────────

  /** Map an action_type/operation to a workflow key. */
  private mapActionToWorkflow(actionType: string, operation: string): string {
    // Direct match on action_type first
    const at = actionType.toLowerCase();
    if (at.startsWith("sketch_")) return "sketch_rectangle"; // simplify sketch variants
    if (at === "extrude" || at === "cut") return "extrude";
    if (at === "fillet") return "fillet";
    if (at === "chamfer") return "chamfer";

    // Try operation name
    const op = operation.toLowerCase();
    if (op.includes("extrude") || op.includes("pad")) return "extrude";
    if (op.includes("fillet") || op.includes("round")) return "fillet";
    if (op.includes("chamfer")) return "chamfer";
    if (op.includes("rectangle") || op.includes("sketch")) return "sketch_rectangle";

    return at; // will likely miss the workflow → trigger generic fallback
  }

  /** Replace {{param}} placeholders with actual values from parameters. */
  private substituteParams(template: string, params: Record<string, number | string>): string {
    let result = template;
    for (const [key, val] of Object.entries(params)) {
      result = result.replace(`{{${key}}}`, String(val));
    }
    return result;
  }
}

export const playwrightAutomationEngine = new PlaywrightAutomationEngine();
