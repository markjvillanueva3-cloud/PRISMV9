/**
 * cadCreoRibbonSchema — U-CAD-APP-02 (PHASE-48)
 *
 * Declarative Creo ribbon add-in spec. Describes the PRISM menu tab,
 * button groups, and per-button activation rules so the Creo add-in shell
 * can render (and rerender after state change) without each button being
 * hard-coded.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadCreoRibbonSchema
 */

import { z } from "zod";
import { CREO_FEATURE_KINDS, CREO_MODEL_KINDS } from "./cadCreoToolkitSchema.js";

// ── Ribbon structure ───────────────────────────────────────────────────────

export const BUTTON_ACTIONS = [
  "run_speed_feed",
  "run_dfm",
  "open_tribal",
  "open_setup_sheet",
  "open_program_release",
  "regenerate",
  "open_handoff",
  "open_slo",
  "quote_current",
  "show_diff",
] as const;
export type ButtonAction = (typeof BUTTON_ACTIONS)[number];

export const BUTTON_ICON_SIZES = ["small", "medium", "large"] as const;

export const RibbonButtonSchema = z
  .object({
    buttonId: z.string().min(1),
    label: z.string().min(1).max(24),
    tooltip: z.string().max(240),
    action: z.enum(BUTTON_ACTIONS),
    iconSize: z.enum(BUTTON_ICON_SIZES).default("medium"),
    /** Keyboard accelerator (e.g. "Ctrl+Shift+P"). */
    accelerator: z.string().optional(),
    /**
     * If set, button only shows/enables when the active model matches one of
     * these kinds (part / assembly / drawing).
     */
    requiresModelKind: z.array(z.enum(CREO_MODEL_KINDS)).optional(),
    /** If set, button is enabled only when a feature of one of these kinds is selected. */
    requiresSelectionKind: z.array(z.enum(CREO_FEATURE_KINDS)).optional(),
    /** If set, button requires a bridge SLO healthier than `maxP95Ms`. */
    maxP95Ms: z.number().int().positive().optional(),
  })
  .strict();

export type RibbonButton = z.infer<typeof RibbonButtonSchema>;

export const RibbonGroupSchema = z
  .object({
    groupId: z.string().min(1),
    label: z.string().min(1).max(24),
    order: z.number().int().nonnegative(),
    buttons: z.array(RibbonButtonSchema).nonempty(),
  })
  .strict();

export type RibbonGroup = z.infer<typeof RibbonGroupSchema>;

export const RibbonSpecSchema = z
  .object({
    tabId: z.string().min(1),
    label: z.string().min(1).max(24),
    version: z.string().min(1),
    groups: z.array(RibbonGroupSchema).nonempty(),
  })
  .strict();

export type RibbonSpec = z.infer<typeof RibbonSpecSchema>;

// ── Activation state ───────────────────────────────────────────────────────

export const ActivationContextSchema = z
  .object({
    modelKind: z.enum(CREO_MODEL_KINDS).optional(),
    selectionKind: z.enum(CREO_FEATURE_KINDS).optional(),
    bridgeP95Ms: z.number().int().nonnegative().optional(),
    /** If true, Creo is in modal dialog; all buttons disabled. */
    isModalDialog: z.boolean().default(false),
  })
  .strict();

export type ActivationContext = z.infer<typeof ActivationContextSchema>;

export const BUTTON_STATES = ["enabled", "disabled", "hidden"] as const;

export const ButtonStateSchema = z
  .object({
    buttonId: z.string().min(1),
    state: z.enum(BUTTON_STATES),
    reason: z.string(),
  })
  .strict();

export type ButtonState = z.infer<typeof ButtonStateSchema>;

// ── Tribal tips ────────────────────────────────────────────────────────────

export const TribalTipSchema = z
  .object({
    tipId: z.string().min(1),
    /** Feature kinds this tip is relevant to. */
    forFeatureKinds: z.array(z.enum(CREO_FEATURE_KINDS)).nonempty(),
    title: z.string().min(1).max(80),
    body: z.string().min(1).max(800),
    /** 0-1 confidence from shop data. */
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type TribalTip = z.infer<typeof TribalTipSchema>;
