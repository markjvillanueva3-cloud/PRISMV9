/**
 * CreoAddinRibbonEngine — U-CAD-APP-02 (PHASE-48)
 *
 * Declarative spec + resolver for the Creo Parametric PRISM ribbon add-in.
 * Produces:
 *   - A default ribbon layout (PRISM tab with groups: Programming, Quality,
 *     Quote/Cost, System)
 *   - Per-button activation state given current selection + model kind +
 *     bridge SLO
 *   - Tribal tip lookup keyed by feature kind
 *
 * The actual Creo ribbon shell (C++/Java) calls this engine over the same
 * transport used by CreoToolkitBridgeEngine, but we keep all logic here so
 * the shell stays paper-thin.
 *
 * @module engines/CreoAddinRibbonEngine
 */

import {
  RibbonSpecSchema,
  ButtonStateSchema,
  TribalTipSchema,
  type RibbonSpec,
  type RibbonButton,
  type RibbonGroup,
  type ActivationContext,
  type ButtonState,
  type TribalTip,
} from "../schemas/cadCreoRibbonSchema.js";
import type { CreoFeatureKind } from "../schemas/cadCreoToolkitSchema.js";

export class CreoAddinRibbonEngine {
  private spec: RibbonSpec;
  private tips = new Map<string, TribalTip>();

  constructor(opts: { spec?: RibbonSpec; tips?: TribalTip[] } = {}) {
    this.spec = opts.spec
      ? RibbonSpecSchema.parse(opts.spec)
      : CreoAddinRibbonEngine.defaultSpec();
    for (const t of opts.tips ?? []) this.registerTip(t);
  }

  // ── Spec ──────────────────────────────────────────────────────────────────

  getSpec(): RibbonSpec {
    return this.spec;
  }

  setSpec(spec: RibbonSpec): RibbonSpec {
    this.spec = RibbonSpecSchema.parse(spec);
    return this.spec;
  }

  /**
   * Flatten all groups in display order, then all buttons within a group in
   * declaration order.
   */
  allButtons(): RibbonButton[] {
    return [...this.spec.groups]
      .sort((a, b) => a.order - b.order)
      .flatMap((g) => g.buttons);
  }

  findButton(buttonId: string): RibbonButton | undefined {
    return this.allButtons().find((b) => b.buttonId === buttonId);
  }

  // ── Activation resolution ─────────────────────────────────────────────────

  /**
   * Compute per-button state given the current Creo session context.
   * Returns a state for every button in the spec.
   */
  resolve(ctx: ActivationContext): ButtonState[] {
    return this.allButtons().map((btn) => this.resolveOne(btn, ctx));
  }

  resolveOne(btn: RibbonButton, ctx: ActivationContext): ButtonState {
    if (ctx.isModalDialog) {
      return ButtonStateSchema.parse({
        buttonId: btn.buttonId,
        state: "disabled",
        reason: "Creo is in modal dialog",
      });
    }
    if (btn.requiresModelKind && btn.requiresModelKind.length > 0) {
      if (!ctx.modelKind || !btn.requiresModelKind.includes(ctx.modelKind)) {
        return ButtonStateSchema.parse({
          buttonId: btn.buttonId,
          state: "hidden",
          reason: `Requires model kind in [${btn.requiresModelKind.join(", ")}]`,
        });
      }
    }
    if (btn.requiresSelectionKind && btn.requiresSelectionKind.length > 0) {
      if (
        !ctx.selectionKind ||
        !btn.requiresSelectionKind.includes(ctx.selectionKind)
      ) {
        return ButtonStateSchema.parse({
          buttonId: btn.buttonId,
          state: "disabled",
          reason: `Select a feature of type [${btn.requiresSelectionKind.join(", ")}]`,
        });
      }
    }
    if (btn.maxP95Ms !== undefined && ctx.bridgeP95Ms !== undefined) {
      if (ctx.bridgeP95Ms > btn.maxP95Ms) {
        return ButtonStateSchema.parse({
          buttonId: btn.buttonId,
          state: "disabled",
          reason: `Bridge p95 ${ctx.bridgeP95Ms}ms exceeds max ${btn.maxP95Ms}ms`,
        });
      }
    }
    return ButtonStateSchema.parse({
      buttonId: btn.buttonId,
      state: "enabled",
      reason: "OK",
    });
  }

  // ── Tribal tips ───────────────────────────────────────────────────────────

  registerTip(tip: TribalTip): TribalTip {
    const parsed = TribalTipSchema.parse(tip);
    this.tips.set(parsed.tipId, parsed);
    return parsed;
  }

  /**
   * Lookup tips relevant to a feature kind, sorted by confidence descending.
   */
  tipsForFeature(kind: CreoFeatureKind, limit = 5): TribalTip[] {
    const hits = [...this.tips.values()]
      .filter((t) => t.forFeatureKinds.includes(kind))
      .sort((a, b) => b.confidence - a.confidence);
    return hits.slice(0, limit);
  }

  tipCount(): number {
    return this.tips.size;
  }

  // ── Defaults ──────────────────────────────────────────────────────────────

  static defaultSpec(): RibbonSpec {
    return RibbonSpecSchema.parse({
      tabId: "prism.tab",
      label: "PRISM",
      version: "1.0.0",
      groups: [
        {
          groupId: "programming",
          label: "Programming",
          order: 0,
          buttons: [
            {
              buttonId: "sf.calc",
              label: "Speed/Feed",
              tooltip: "Calculate optimal S/F for the selected feature",
              action: "run_speed_feed",
              iconSize: "large",
              requiresModelKind: ["part", "assembly"],
              requiresSelectionKind: ["extrude", "hole", "pattern", "revolve"],
              accelerator: "Ctrl+Shift+S",
            },
            {
              buttonId: "setup.sheet",
              label: "Setup Sheet",
              tooltip: "Generate a setup sheet for this model",
              action: "open_setup_sheet",
              requiresModelKind: ["part", "assembly"],
            },
            {
              buttonId: "release",
              label: "Program Release",
              tooltip: "Create a program release for this model",
              action: "open_program_release",
              requiresModelKind: ["part"],
            },
          ],
        },
        {
          groupId: "quality",
          label: "Quality",
          order: 1,
          buttons: [
            {
              buttonId: "dfm",
              label: "DFM Check",
              tooltip: "Design-for-manufacturing check",
              action: "run_dfm",
              requiresModelKind: ["part"],
            },
            {
              buttonId: "diff",
              label: "Diff Revs",
              tooltip: "Compare selected models side-by-side",
              action: "show_diff",
            },
          ],
        },
        {
          groupId: "cost",
          label: "Quote & Cost",
          order: 2,
          buttons: [
            {
              buttonId: "quote",
              label: "Quote Now",
              tooltip: "Generate a quote for the current model",
              action: "quote_current",
              requiresModelKind: ["part", "assembly"],
              maxP95Ms: 2000,
            },
          ],
        },
        {
          groupId: "system",
          label: "System",
          order: 3,
          buttons: [
            {
              buttonId: "regen",
              label: "Regenerate",
              tooltip: "Force model regeneration",
              action: "regenerate",
            },
            {
              buttonId: "tribal",
              label: "Tribal Tips",
              tooltip: "Show shop tribal tips for selected feature",
              action: "open_tribal",
            },
            {
              buttonId: "slo",
              label: "SLO Status",
              tooltip: "Bridge latency SLO widget",
              action: "open_slo",
            },
            {
              buttonId: "handoff",
              label: "Handoff",
              tooltip: "Hand model off to PRISM shop floor queue",
              action: "open_handoff",
              requiresModelKind: ["part", "assembly"],
            },
          ],
        },
      ],
    });
  }
}

export const creoAddinRibbonEngine = new CreoAddinRibbonEngine();
