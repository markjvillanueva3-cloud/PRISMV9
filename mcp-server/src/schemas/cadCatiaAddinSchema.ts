/**
 * cadCatiaAddinSchema — U-CAD-APP-05 (PHASE-48)
 *
 * Declarative CATIA V5/V6 Workbench add-in spec. CATIA's add-in model is
 * richer than Creo's ribbon: each workbench (Part Design, Assembly Design,
 * Drafting, Sketcher, Generative Shape Design, DMU Navigator, etc.) has its
 * own collection of **toolbars**, each containing **commands** (CAA CATCmd
 * objects). A single add-in can live across multiple workbenches and subscribe
 * to a rich set of CAA events.
 *
 * This schema captures the declarative shape of such a PRISM add-in so the
 * C++/CAA shell can render workbench-scoped toolbars and wire event callbacks
 * without per-command hard-coding.
 *
 * schemaVersion: 1.
 *
 * Sources:
 *  - CATIA V5 CAA Encyclopedia: Workbench Framework, Command Framework
 *  - CATIA V5 Automation Reference (CATIA.Application events)
 *  - Dassault "Add-In Development Guide"
 *
 * @module schemas/cadCatiaAddinSchema
 */

import { z } from "zod";
import {
  CATIA_FEATURE_KINDS,
  CATIA_MODEL_KINDS,
  CATIA_PLM_STATES,
} from "./cadCatiaCaaV5Schema.js";

// ── Workbenches ────────────────────────────────────────────────────────────

/** CATIA workbenches PRISM is allowed to extend. */
export const CATIA_WORKBENCHES = [
  "PartDesign",
  "AssemblyDesign",
  "Drafting",
  "Sketcher",
  "GenerativeShapeDesign",
  "DMUNavigator",
  "ProcessEngineer",
  "Machining",
] as const;
export type CatiaWorkbench = (typeof CATIA_WORKBENCHES)[number];

/** Workbench → CATIA document kind compatibility matrix. */
export const WORKBENCH_MODEL_KINDS: Readonly<
  Record<CatiaWorkbench, readonly (typeof CATIA_MODEL_KINDS)[number][]>
> = Object.freeze({
  PartDesign: ["CATPart"],
  AssemblyDesign: ["CATProduct"],
  Drafting: ["CATDrawing"],
  Sketcher: ["CATPart"],
  GenerativeShapeDesign: ["CATPart"],
  DMUNavigator: ["CATProduct"],
  ProcessEngineer: ["CATProduct"],
  Machining: ["CATPart", "CATProduct"],
});

// ── Commands ───────────────────────────────────────────────────────────────

/** PRISM actions surfaced as CATIA CAA commands. */
export const CATIA_COMMAND_ACTIONS = [
  "run_speed_feed",
  "run_dfm",
  "open_tribal",
  "open_setup_sheet",
  "open_program_release",
  "update_model",
  "open_handoff",
  "open_slo",
  "quote_current",
  "show_diff",
  "open_quality_report",
  "open_fixture_design",
  "run_collision_check",
  "open_tolerance_stack",
  "run_ekl_audit",
  "export_step",
  "open_plm_history",
] as const;
export type CatiaCommandAction = (typeof CATIA_COMMAND_ACTIONS)[number];

export const CATIA_ICON_SIZES = ["small", "medium", "large"] as const;

/**
 * Locale-aware label (CATIA ships multi-language resource catalogues; the
 * add-in shell uses the `default` string as fallback).
 */
export const LocalizedLabelSchema = z
  .object({
    default: z.string().min(1).max(32),
    fr_FR: z.string().max(32).optional(),
    de_DE: z.string().max(32).optional(),
    ja_JP: z.string().max(32).optional(),
    zh_CN: z.string().max(32).optional(),
    es_ES: z.string().max(32).optional(),
  })
  .strict();

export type LocalizedLabel = z.infer<typeof LocalizedLabelSchema>;

export const CatiaCommandSchema = z
  .object({
    /** PRISM-internal id (UPPER_SNAKE or dotted namespace). */
    commandId: z.string().min(1).regex(/^[A-Za-z][A-Za-z0-9_.]*$/),
    /** CAA command class name registered in the CATIA Command Framework. */
    caaClassName: z.string().min(1).max(80),
    label: LocalizedLabelSchema,
    tooltip: z.string().max(240),
    action: z.enum(CATIA_COMMAND_ACTIONS),
    iconSize: z.enum(CATIA_ICON_SIZES).default("medium"),
    /** Icon resource name (PNG in add-in resource folder). */
    iconName: z.string().min(1).max(80),
    /** Keyboard accelerator, CATIA-style (e.g. "Ctrl+Shift+S"). */
    accelerator: z.string().optional(),

    // ── Activation predicates ────────────────────────────────────────────
    /**
     * Workbenches in which this command is visible. Empty = all. Takes
     * precedence over model kind (a drafting-only command never shows in
     * PartDesign, even if the user somehow has a CATPart open).
     */
    workbenches: z.array(z.enum(CATIA_WORKBENCHES)).default([]),
    /** Only enable in these model kinds. Empty = infer from workbenches. */
    requiresModelKind: z.array(z.enum(CATIA_MODEL_KINDS)).default([]),
    /** Only enable when a feature of one of these kinds is selected. */
    requiresSelectionKind: z.array(z.enum(CATIA_FEATURE_KINDS)).default([]),
    /** Require at least N items in the selection. */
    minSelectionCount: z.number().int().nonnegative().default(0),
    /** Require at most N items (0 = no cap). */
    maxSelectionCount: z.number().int().nonnegative().default(0),
    /** Require bridge p95 below this ms threshold. */
    maxP95Ms: z.number().int().positive().optional(),
    /**
     * If `true`, command is disabled when the model's PLM state is outside
     * `in_work` (e.g. frozen/released — read-only).
     */
    requiresEditablePlm: z.boolean().default(false),
  })
  .strict();

export type CatiaCommand = z.infer<typeof CatiaCommandSchema>;

// ── Toolbars & Workbench Layout ────────────────────────────────────────────

export const CatiaToolbarSchema = z
  .object({
    toolbarId: z.string().min(1),
    label: LocalizedLabelSchema,
    order: z.number().int().nonnegative(),
    /** True for floating/detachable toolbars (CATIA default is dockable). */
    dockable: z.boolean().default(true),
    commands: z.array(z.string().min(1)).nonempty(),
  })
  .strict();

export type CatiaToolbar = z.infer<typeof CatiaToolbarSchema>;

export const CatiaWorkbenchLayoutSchema = z
  .object({
    workbenchId: z.enum(CATIA_WORKBENCHES),
    label: LocalizedLabelSchema,
    /** If true, this workbench must be active before the toolbars show. */
    exclusive: z.boolean().default(true),
    toolbars: z.array(CatiaToolbarSchema).nonempty(),
  })
  .strict();

export type CatiaWorkbenchLayout = z.infer<typeof CatiaWorkbenchLayoutSchema>;

// ── Events ─────────────────────────────────────────────────────────────────

/**
 * CATIA V5 CAA events the PRISM add-in can subscribe to. Names match the
 * event signatures from the CATIA Automation Reference.
 */
export const CATIA_EVENTS = [
  "NewDocument",
  "OpenDocument",
  "DocumentClosed",
  "BeforeSave",
  "AfterSave",
  "SelectionChanged",
  "BeforeUpdate",
  "AfterUpdate",
  "WorkbenchActivated",
  "WorkbenchDeactivated",
  "PlmStateChanged",
  "EklRelationFailed",
] as const;
export type CatiaEvent = (typeof CATIA_EVENTS)[number];

export const CatiaEventSubscriptionSchema = z
  .object({
    subscriptionId: z.string().min(1),
    event: z.enum(CATIA_EVENTS),
    /**
     * If present, event only fires the subscription when the model kind
     * matches. Empty array = all kinds.
     */
    forModelKinds: z.array(z.enum(CATIA_MODEL_KINDS)).default([]),
    /** If present, bind this event to a command (reaction-style). */
    triggerCommandId: z.string().optional(),
    /** Internal handler name (the CAA shell maps this to a C++ fn pointer). */
    handlerName: z.string().min(1),
    /**
     * If true, throttle events of this kind to at most once per
     * `throttleMs` window. Used to debounce SelectionChanged spam.
     */
    throttleMs: z.number().int().nonnegative().default(0),
  })
  .strict();

export type CatiaEventSubscription = z.infer<typeof CatiaEventSubscriptionSchema>;

// ── Add-in Spec ────────────────────────────────────────────────────────────

export const CatiaAddinSpecSchema = z
  .object({
    addinId: z.string().min(1),
    label: LocalizedLabelSchema,
    version: z.string().min(1),
    vendor: z.string().default("PRISM"),
    /** Per-workbench toolbar layouts. */
    workbenches: z.array(CatiaWorkbenchLayoutSchema).nonempty(),
    /** Flat catalog of every command referenced from any toolbar. */
    commands: z.array(CatiaCommandSchema).nonempty(),
    /** Event subscriptions. */
    events: z.array(CatiaEventSubscriptionSchema).default([]),
  })
  .strict();

export type CatiaAddinSpec = z.infer<typeof CatiaAddinSpecSchema>;

// ── Activation + event context ─────────────────────────────────────────────

export const CatiaActivationContextSchema = z
  .object({
    workbench: z.enum(CATIA_WORKBENCHES).optional(),
    modelKind: z.enum(CATIA_MODEL_KINDS).optional(),
    selectionKind: z.enum(CATIA_FEATURE_KINDS).optional(),
    selectionCount: z.number().int().nonnegative().default(0),
    bridgeP95Ms: z.number().int().nonnegative().optional(),
    plmState: z.enum(CATIA_PLM_STATES).optional(),
    /** True when a modal CAA dialog is on screen — all commands disabled. */
    isModalDialog: z.boolean().default(false),
  })
  .strict();

export type CatiaActivationContext = z.infer<typeof CatiaActivationContextSchema>;

export const CATIA_COMMAND_STATES = ["enabled", "disabled", "hidden"] as const;
export type CatiaCommandStateKind = (typeof CATIA_COMMAND_STATES)[number];

export const CatiaCommandStateSchema = z
  .object({
    commandId: z.string().min(1),
    state: z.enum(CATIA_COMMAND_STATES),
    reason: z.string(),
  })
  .strict();

export type CatiaCommandState = z.infer<typeof CatiaCommandStateSchema>;

// ── Event dispatch payload ─────────────────────────────────────────────────

export const CatiaEventPayloadSchema = z
  .object({
    event: z.enum(CATIA_EVENTS),
    modelName: z.string().optional(),
    modelKind: z.enum(CATIA_MODEL_KINDS).optional(),
    /** Monotonic ms timestamp. */
    at: z.number().int().nonnegative(),
    /** Arbitrary event-specific metadata (e.g. selectionKind for SelectionChanged). */
    meta: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type CatiaEventPayload = z.infer<typeof CatiaEventPayloadSchema>;

export const CatiaEventDispatchResultSchema = z
  .object({
    subscriptionId: z.string(),
    fired: z.boolean(),
    throttled: z.boolean().default(false),
    triggeredCommandId: z.string().optional(),
    reason: z.string().optional(),
  })
  .strict();

export type CatiaEventDispatchResult = z.infer<
  typeof CatiaEventDispatchResultSchema
>;

// ── Tribal tips (reuses CATIA feature kinds) ───────────────────────────────

export const CatiaTribalTipSchema = z
  .object({
    tipId: z.string().min(1),
    forFeatureKinds: z.array(z.enum(CATIA_FEATURE_KINDS)).nonempty(),
    forWorkbenches: z.array(z.enum(CATIA_WORKBENCHES)).default([]),
    title: z.string().min(1).max(80),
    body: z.string().min(1).max(800),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type CatiaTribalTip = z.infer<typeof CatiaTribalTipSchema>;
