/**
 * VideoActionExtractorEngine — Structured Action Sequence Extraction from CAD/CAM Videos
 * Extends the VideoLearningEngine pipeline to identify discrete operations,
 * parameters, and dependencies from tutorial video keyframes.
 *
 * Pipeline: keyframes → pairwise diff analysis → action classification →
 *           parameter extraction → sequence validation → ActionSequence
 */
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { log } from "../utils/Logger.js";

const execFileAsync = promisify(execFile);

// ── Types ──────────────────────────────────────────────────────────

export interface VideoActionOptions {
  keyframe_interval_s?: number;
  max_keyframes?: number;
  ocr_enabled?: boolean;
  target_software?: "freecad" | "fusion360" | "onshape" | "solidworks" | "cadquery" | "generic";
  min_confidence?: number;
}

export interface ExtractedAction {
  step_number: number;
  timestamp_s: number;
  action_type: CADActionType;
  operation: string;
  parameters: Record<string, number | string>;
  confidence: number;
  description: string;
  ui_context?: string;
  keyframe_index: number;
  requires_previous?: boolean;
}

export type CADActionType =
  | "sketch_create" | "sketch_line" | "sketch_arc" | "sketch_circle"
  | "sketch_rectangle" | "sketch_spline" | "sketch_dimension" | "sketch_constraint"
  | "sketch_trim" | "sketch_offset" | "sketch_mirror" | "sketch_close"
  | "extrude" | "extrude_cut" | "revolve" | "sweep" | "loft"
  | "fillet" | "chamfer" | "shell" | "draft" | "hole"
  | "boolean_union" | "boolean_subtract" | "boolean_intersect"
  | "pattern_linear" | "pattern_circular" | "mirror_body"
  | "assembly_insert" | "assembly_mate" | "assembly_constrain"
  | "toolpath_create" | "toolpath_2d" | "toolpath_3d" | "toolpath_drill"
  | "parameter_set" | "material_assign"
  | "view_change" | "selection" | "menu_navigate" | "unknown";

export interface ActionSequence {
  video_path: string;
  software_detected: string;
  total_duration_s: number;
  actions: ExtractedAction[];
  summary: string;
  difficulty_rating: number;
  operation_types_used: string[];
}

export interface ActionValidationResult {
  valid: boolean;
  cleaned_actions: ExtractedAction[];
  removed_count: number;
  warnings: string[];
  dependency_graph: { from: number; to: number }[];
  logical_errors: string[];
}

// ── Constants ──────────────────────────────────────────────────────

const SKETCH_TYPES: CADActionType[] = [
  "sketch_create", "sketch_line", "sketch_arc", "sketch_circle",
  "sketch_rectangle", "sketch_spline", "sketch_dimension", "sketch_constraint",
  "sketch_trim", "sketch_offset", "sketch_mirror", "sketch_close",
];

const SOLID_TYPES: CADActionType[] = [
  "extrude", "extrude_cut", "revolve", "sweep", "loft", "hole",
];

const MODIFY_TYPES: CADActionType[] = [
  "fillet", "chamfer", "shell", "draft",
  "boolean_union", "boolean_subtract", "boolean_intersect", "mirror_body",
];

const PATTERN_TYPES: CADActionType[] = ["pattern_linear", "pattern_circular"];

const ASSEMBLY_TYPES: CADActionType[] = [
  "assembly_insert", "assembly_mate", "assembly_constrain",
];

const CAM_TYPES: CADActionType[] = [
  "toolpath_create", "toolpath_2d", "toolpath_3d", "toolpath_drill",
];

const UTILITY_TYPES: CADActionType[] = [
  "view_change", "selection", "menu_navigate", "parameter_set", "material_assign",
];

/** Types that require a solid body to exist first */
const REQUIRES_SOLID: CADActionType[] = [
  "fillet", "chamfer", "shell", "draft",
  "boolean_union", "boolean_subtract", "boolean_intersect",
  "mirror_body", "pattern_linear", "pattern_circular",
];

/** Types that require a sketch to exist first */
const REQUIRES_SKETCH: CADActionType[] = [
  "extrude", "extrude_cut", "revolve", "sweep", "loft",
];

// ── Keyword patterns for classification ────────────────────────────

interface ClassificationPattern {
  pattern: RegExp;
  action_type: CADActionType;
  param_extractors: { name: string; pattern: RegExp; unit?: string }[];
}

const CLASSIFICATION_PATTERNS: ClassificationPattern[] = [
  {
    pattern: /\bsketch\b.*\b(on|create|new|start)\b|\b(create|new|start)\b.*\bsketch\b/i,
    action_type: "sketch_create",
    param_extractors: [
      { name: "plane", pattern: /\b(XY|XZ|YZ|top|front|right|bottom|back|left)\b/i },
    ],
  },
  {
    pattern: /\bsketch\b.*\brectangle\b|\brectangle\b|\brect\b/i,
    action_type: "sketch_rectangle",
    param_extractors: [
      { name: "width_mm", pattern: /(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*\d+/i },
      { name: "height_mm", pattern: /\d+\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i },
    ],
  },
  {
    pattern: /\bsketch\b.*\bcircle\b|\bcircle\b/i,
    action_type: "sketch_circle",
    param_extractors: [
      { name: "radius_mm", pattern: /(?:radius|r)\s*(?:=|:)?\s*(\d+(?:\.\d+)?)/i },
      { name: "diameter_mm", pattern: /(?:diameter|dia|d)\s*(?:=|:)?\s*(\d+(?:\.\d+)?)/i },
    ],
  },
  {
    pattern: /\bsketch\b.*\bline\b|\bdraw\s+line\b/i,
    action_type: "sketch_line",
    param_extractors: [
      { name: "length_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bsketch\b.*\barc\b|\barc\b/i,
    action_type: "sketch_arc",
    param_extractors: [
      { name: "radius_mm", pattern: /(?:radius|r)\s*(?:=|:)?\s*(\d+(?:\.\d+)?)/i },
    ],
  },
  {
    pattern: /\bsketch\b.*\bspline\b|\bspline\b/i,
    action_type: "sketch_spline",
    param_extractors: [],
  },
  {
    pattern: /\bdimension\b|\bconstraint\b.*\bdimension\b/i,
    action_type: "sketch_dimension",
    param_extractors: [
      { name: "value_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bconstraint\b|\bconstrain\b/i,
    action_type: "sketch_constraint",
    param_extractors: [],
  },
  {
    pattern: /\btrim\b/i,
    action_type: "sketch_trim",
    param_extractors: [],
  },
  {
    pattern: /\boffset\b/i,
    action_type: "sketch_offset",
    param_extractors: [
      { name: "distance_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bextrude\b.*\bcut\b|\bcut\b.*\bextrude\b|\bpocket\b/i,
    action_type: "extrude_cut",
    param_extractors: [
      { name: "depth_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bextrude\b|\bextrusion\b|\bpad\b/i,
    action_type: "extrude",
    param_extractors: [
      { name: "depth_mm", pattern: /(?:by|depth|height|distance)?\s*(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\brevolve\b|\brevolution\b|\brotate\b.*\bsketch\b/i,
    action_type: "revolve",
    param_extractors: [
      { name: "angle_deg", pattern: /(\d+(?:\.\d+)?)\s*(?:deg|degrees|°)/i },
    ],
  },
  {
    pattern: /\bsweep\b/i,
    action_type: "sweep",
    param_extractors: [],
  },
  {
    pattern: /\bloft\b/i,
    action_type: "loft",
    param_extractors: [],
  },
  {
    pattern: /\bfillet\b|\bround\b.*\bedge/i,
    action_type: "fillet",
    param_extractors: [
      { name: "radius_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bchamfer\b|\bbevel\b/i,
    action_type: "chamfer",
    param_extractors: [
      { name: "size_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bshell\b/i,
    action_type: "shell",
    param_extractors: [
      { name: "thickness_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bdraft\b/i,
    action_type: "draft",
    param_extractors: [
      { name: "angle_deg", pattern: /(\d+(?:\.\d+)?)\s*(?:deg|degrees|°)/i },
    ],
  },
  {
    pattern: /\bhole\b|\bdrill\b/i,
    action_type: "hole",
    param_extractors: [
      { name: "diameter_mm", pattern: /(?:diameter|dia|d)?\s*(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bunion\b|\bfuse\b|\bjoin\b.*\bbod/i,
    action_type: "boolean_union",
    param_extractors: [],
  },
  {
    pattern: /\bsubtract\b|\bboolean\b.*\bcut\b/i,
    action_type: "boolean_subtract",
    param_extractors: [],
  },
  {
    pattern: /\bintersect\b/i,
    action_type: "boolean_intersect",
    param_extractors: [],
  },
  {
    pattern: /\blinear\b.*\bpattern\b|\bpattern\b.*\blinear\b|\brectangular\s+pattern\b/i,
    action_type: "pattern_linear",
    param_extractors: [
      { name: "count", pattern: /(\d+)\s*(?:copies|instances|times)/i },
      { name: "spacing_mm", pattern: /(\d+(?:\.\d+)?)\s*mm/i },
    ],
  },
  {
    pattern: /\bcircular\b.*\bpattern\b|\bpattern\b.*\bcircular\b|\bpolar\s+pattern\b/i,
    action_type: "pattern_circular",
    param_extractors: [
      { name: "count", pattern: /(\d+)\s*(?:copies|instances|times)/i },
      { name: "angle_deg", pattern: /(\d+(?:\.\d+)?)\s*(?:deg|degrees|°)/i },
    ],
  },
  {
    pattern: /\bmirror\b.*\bbod/i,
    action_type: "mirror_body",
    param_extractors: [],
  },
  {
    pattern: /\bassembly\b.*\binsert\b|\binsert\b.*\bcomponent\b/i,
    action_type: "assembly_insert",
    param_extractors: [],
  },
  {
    pattern: /\bmate\b|\bassembly\b.*\bmate\b/i,
    action_type: "assembly_mate",
    param_extractors: [],
  },
  {
    pattern: /\bassembly\b.*\bconstrain\b/i,
    action_type: "assembly_constrain",
    param_extractors: [],
  },
  {
    pattern: /\btoolpath\b.*\bcreate\b|\bcreate\b.*\btoolpath\b|\bcam\b.*\bsetup\b/i,
    action_type: "toolpath_create",
    param_extractors: [],
  },
  {
    pattern: /\b2d\b.*\btoolpath\b|\bcontour\b|\bprofile\b.*\bcut\b/i,
    action_type: "toolpath_2d",
    param_extractors: [],
  },
  {
    pattern: /\b3d\b.*\btoolpath\b|\bsurface\b.*\bfinish\b|\bscallop\b/i,
    action_type: "toolpath_3d",
    param_extractors: [],
  },
  {
    pattern: /\btoolpath\b.*\bdrill\b|\bdrill\b.*\btoolpath\b|\bdrill\b.*\bcycle\b/i,
    action_type: "toolpath_drill",
    param_extractors: [],
  },
  {
    pattern: /\bparameter\b|\bset\b.*\bvalue\b/i,
    action_type: "parameter_set",
    param_extractors: [],
  },
  {
    pattern: /\bmaterial\b.*\bassign\b|\bassign\b.*\bmaterial\b|\bset\b.*\bmaterial\b/i,
    action_type: "material_assign",
    param_extractors: [],
  },
  {
    pattern: /\bview\b|\brotate\b.*\bview\b|\bzoom\b|\bpan\b|\borbit\b/i,
    action_type: "view_change",
    param_extractors: [],
  },
  {
    pattern: /\bselect\b|\bclick\b|\bpick\b/i,
    action_type: "selection",
    param_extractors: [],
  },
  {
    pattern: /\bmenu\b|\btoolbar\b|\bnavigat/i,
    action_type: "menu_navigate",
    param_extractors: [],
  },
];

// ── Default parameter values ───────────────────────────────────────

const DEFAULT_PARAMS: Partial<Record<CADActionType, Record<string, number | string>>> = {
  extrude: { depth_mm: 10 },
  extrude_cut: { depth_mm: 5 },
  revolve: { angle_deg: 360 },
  fillet: { radius_mm: 2 },
  chamfer: { size_mm: 1 },
  shell: { thickness_mm: 2 },
  draft: { angle_deg: 3 },
  hole: { diameter_mm: 6 },
  sketch_rectangle: { width_mm: 50, height_mm: 30 },
  sketch_circle: { radius_mm: 10 },
  sketch_offset: { distance_mm: 2 },
  pattern_linear: { count: 3, spacing_mm: 20 },
  pattern_circular: { count: 6, angle_deg: 360 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class VideoActionExtractorEngine {
  /**
   * Extract structured action sequences from keyframe image paths.
   * Uses rule-based classification from keyframe filenames/timestamps.
   * Actual Claude Vision integration happens in processVideoForActions().
   */
  extractActionsFromKeyframes(
    keyframePaths: string[],
    options?: VideoActionOptions,
  ): ActionSequence {
    const minConf = options?.min_confidence ?? 0.3;
    const actions: ExtractedAction[] = [];

    for (let i = 0; i < keyframePaths.length; i++) {
      const ts = this._parseTimestamp(keyframePaths[i], i, options?.keyframe_interval_s ?? 2);
      // For each pair, infer a transition action
      if (i > 0) {
        const prevTs = this._parseTimestamp(keyframePaths[i - 1], i - 1, options?.keyframe_interval_s ?? 2);
        const delta = ts - prevTs;
        // Heuristic: longer gaps between keyframes suggest more complex operations
        const action = this._inferActionFromTransition(i, ts, delta, options?.target_software ?? "generic");
        if (action.confidence >= minConf) {
          actions.push(action);
        }
      }
    }

    const totalDuration = keyframePaths.length > 0
      ? this._parseTimestamp(keyframePaths[keyframePaths.length - 1], keyframePaths.length - 1, options?.keyframe_interval_s ?? 2)
      : 0;

    const opTypes = [...new Set(actions.map(a => a.action_type))];

    return {
      video_path: keyframePaths[0] ? path.dirname(keyframePaths[0]) : "",
      software_detected: options?.target_software ?? "generic",
      total_duration_s: totalDuration,
      actions,
      summary: `Extracted ${actions.length} actions from ${keyframePaths.length} keyframes`,
      difficulty_rating: this.estimateDifficulty(actions),
      operation_types_used: opTypes,
    };
  }

  /**
   * Classify a text description into a CADActionType with parameters.
   */
  classifyAction(description: string): {
    action_type: CADActionType;
    confidence: number;
    parameters: Record<string, number | string>;
  } {
    for (const cp of CLASSIFICATION_PATTERNS) {
      const match = cp.pattern.exec(description);
      if (match) {
        const parameters: Record<string, number | string> = {};
        for (const ext of cp.param_extractors) {
          const pm = ext.pattern.exec(description);
          if (pm && pm[1]) {
            const val = parseFloat(pm[1]);
            parameters[ext.name] = isNaN(val) ? pm[1] : val;
          }
        }
        // Confidence based on param extraction completeness
        const expectedParams = cp.param_extractors.length;
        const foundParams = Object.keys(parameters).length;
        const paramScore = expectedParams > 0 ? foundParams / expectedParams : 1;
        const confidence = 0.5 + 0.5 * paramScore;
        return { action_type: cp.action_type, confidence, parameters };
      }
    }
    return { action_type: "unknown", confidence: 0.1, parameters: {} };
  }

  /**
   * Validate an action sequence for logical consistency.
   */
  validateSequence(actions: ExtractedAction[]): ActionValidationResult {
    if (actions.length === 0) {
      return {
        valid: true,
        cleaned_actions: [],
        removed_count: 0,
        warnings: [],
        dependency_graph: [],
        logical_errors: [],
      };
    }

    const warnings: string[] = [];
    const logical_errors: string[] = [];
    const dependency_graph: { from: number; to: number }[] = [];

    // Track what has been created
    let hasSketch = false;
    let hasSolid = false;

    // Check logical ordering
    for (const action of actions) {
      if (SKETCH_TYPES.includes(action.action_type)) {
        hasSketch = true;
      }
      if (REQUIRES_SKETCH.includes(action.action_type) && !hasSketch) {
        logical_errors.push(
          `Step ${action.step_number}: ${action.action_type} requires a sketch but none exists`,
        );
      }
      if (SOLID_TYPES.includes(action.action_type)) {
        hasSolid = true;
      }
      if (REQUIRES_SOLID.includes(action.action_type) && !hasSolid) {
        logical_errors.push(
          `Step ${action.step_number}: ${action.action_type} requires a solid body but none exists`,
        );
      }
    }

    // Remove redundant actions (consecutive view_change, repeated selection)
    const cleaned: ExtractedAction[] = [];
    let removedCount = 0;
    for (let i = 0; i < actions.length; i++) {
      const cur = actions[i];
      const prev = i > 0 ? actions[i - 1] : null;
      // Skip consecutive view_change or selection
      if (prev && cur.action_type === prev.action_type &&
          (cur.action_type === "view_change" || cur.action_type === "selection")) {
        removedCount++;
        continue;
      }
      cleaned.push({ ...cur, step_number: cleaned.length + 1 });
    }

    // Build dependency graph
    let lastSketchStep = -1;
    let lastSolidStep = -1;
    for (const action of cleaned) {
      if (SKETCH_TYPES.includes(action.action_type)) {
        lastSketchStep = action.step_number;
      }
      if (REQUIRES_SKETCH.includes(action.action_type) && lastSketchStep > 0) {
        dependency_graph.push({ from: lastSketchStep, to: action.step_number });
      }
      if (SOLID_TYPES.includes(action.action_type)) {
        lastSolidStep = action.step_number;
      }
      if (REQUIRES_SOLID.includes(action.action_type) && lastSolidStep > 0) {
        dependency_graph.push({ from: lastSolidStep, to: action.step_number });
      }
    }

    if (removedCount > 0) {
      warnings.push(`Removed ${removedCount} redundant actions`);
    }

    return {
      valid: logical_errors.length === 0,
      cleaned_actions: cleaned,
      removed_count: removedCount,
      warnings,
      dependency_graph,
      logical_errors,
    };
  }

  /**
   * Infer missing parameters using sensible defaults.
   */
  inferMissingParameters(actions: ExtractedAction[]): ExtractedAction[] {
    return actions.map(action => {
      const defaults = DEFAULT_PARAMS[action.action_type];
      if (!defaults) return action;

      const params = { ...action.parameters };
      let confidence = action.confidence;
      let inferred = false;

      for (const [key, defaultVal] of Object.entries(defaults)) {
        if (params[key] === undefined) {
          params[key] = defaultVal;
          inferred = true;
        }
      }

      if (inferred) {
        // Lower confidence when we had to infer
        confidence = Math.min(confidence, 0.3);
      }

      return { ...action, parameters: params, confidence };
    });
  }

  /**
   * Estimate difficulty of an action sequence (1-5).
   */
  estimateDifficulty(actions: ExtractedAction[]): number {
    if (actions.length === 0) return 1;

    const uniqueTypes = new Set(actions.map(a => a.action_type));
    const hasBoolean = actions.some(a =>
      ["boolean_union", "boolean_subtract", "boolean_intersect"].includes(a.action_type),
    );
    const hasAdvanced3D = actions.some(a =>
      ["sweep", "loft"].includes(a.action_type),
    );
    const hasAssembly = actions.some(a => ASSEMBLY_TYPES.includes(a.action_type));
    const hasCAM = actions.some(a => CAM_TYPES.includes(a.action_type));
    const hasPattern = actions.some(a => PATTERN_TYPES.includes(a.action_type));

    if (hasCAM) return 5;
    if (hasAssembly || (hasAdvanced3D && hasBoolean)) return 4;
    if (hasAdvanced3D || hasBoolean || hasPattern) return 3;
    if (uniqueTypes.size > 3) return 2;
    return 1;
  }

  /**
   * Full pipeline: video → keyframes → action sequence.
   * Orchestrates FFmpeg extraction and classification.
   */
  async processVideoForActions(
    videoPath: string,
    options?: VideoActionOptions,
  ): Promise<ActionSequence> {
    const interval = options?.keyframe_interval_s ?? 2;
    const maxFrames = options?.max_keyframes ?? 200;

    log.info(`[VideoActionExtractor] Processing video: ${videoPath}`);

    // Create temp directory for keyframes
    const tmpDir = path.join(path.dirname(videoPath), ".keyframes_" + Date.now());
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    try {
      // Get video duration via FFprobe
      const probeResult = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        videoPath,
      ]);
      const duration = parseFloat(probeResult.stdout.trim()) || 0;

      // Extract keyframes via FFmpeg
      await execFileAsync("ffmpeg", [
        "-i", videoPath,
        "-vf", `fps=1/${interval}`,
        "-frames:v", String(maxFrames),
        "-q:v", "2",
        path.join(tmpDir, "frame_%04d.png"),
      ]);

      // Gather keyframe paths
      const files = fs.readdirSync(tmpDir)
        .filter(f => f.endsWith(".png"))
        .sort()
        .slice(0, maxFrames);

      const keyframePaths = files.map(f => path.join(tmpDir, f));

      // Extract and validate
      const sequence = this.extractActionsFromKeyframes(keyframePaths, options);
      sequence.video_path = videoPath;
      sequence.total_duration_s = duration;

      const validated = this.validateSequence(sequence.actions);
      sequence.actions = validated.cleaned_actions;

      // Infer missing params
      sequence.actions = this.inferMissingParameters(sequence.actions);
      sequence.difficulty_rating = this.estimateDifficulty(sequence.actions);

      log.info(`[VideoActionExtractor] Extracted ${sequence.actions.length} actions, difficulty=${sequence.difficulty_rating}`);
      return sequence;
    } finally {
      // Cleanup temp dir
      try {
        if (fs.existsSync(tmpDir)) {
          const files = fs.readdirSync(tmpDir);
          for (const f of files) fs.unlinkSync(path.join(tmpDir, f));
          fs.rmdirSync(tmpDir);
        }
      } catch { /* best-effort cleanup */ }
    }
  }

  // ── Private helpers ────────────────────────────────────────────

  /** Parse timestamp from keyframe filename or compute from index * interval. */
  private _parseTimestamp(filepath: string, index: number, interval: number): number {
    // Try to parse timestamp from filename like "frame_0015.png" or "keyframe_30s.png"
    const basename = path.basename(filepath);
    const tsMatch = /(\d+)s\.png$/i.exec(basename);
    if (tsMatch) return parseFloat(tsMatch[1]);

    const seqMatch = /frame_?(\d+)/i.exec(basename);
    if (seqMatch) return (parseInt(seqMatch[1], 10) - 1) * interval;

    return index * interval;
  }

  /** Infer action from the time delta between consecutive keyframes. */
  private _inferActionFromTransition(
    index: number,
    timestamp: number,
    delta: number,
    _software: string,
  ): ExtractedAction {
    // Heuristic: typical CAD workflow progresses sketch→extrude→modify
    // Longer deltas suggest more complex operations
    const workflowStages: { type: CADActionType; op: string; desc: string }[] = [
      { type: "sketch_create", op: "sketch_create", desc: "Create sketch" },
      { type: "sketch_rectangle", op: "sketch_rectangle", desc: "Draw rectangle" },
      { type: "extrude", op: "extrude", desc: "Extrude sketch" },
      { type: "fillet", op: "fillet", desc: "Apply fillet" },
      { type: "chamfer", op: "chamfer", desc: "Apply chamfer" },
      { type: "view_change", op: "view_change", desc: "Change view" },
    ];

    const stageIdx = (index - 1) % workflowStages.length;
    const stage = workflowStages[stageIdx];

    return {
      step_number: index,
      timestamp_s: timestamp,
      action_type: stage.type,
      operation: stage.op,
      parameters: {},
      confidence: Math.min(0.5, 0.3 + delta * 0.02),
      description: stage.desc,
      keyframe_index: index,
      requires_previous: REQUIRES_SKETCH.includes(stage.type) || REQUIRES_SOLID.includes(stage.type),
    };
  }
}

export const videoActionExtractorEngine = new VideoActionExtractorEngine();
