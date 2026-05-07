/**
 * CATIAAddinPluginEngine — U-CAD-APP-05 (PHASE-48)
 *
 * Declarative spec + resolver for the Dassault CATIA V5/V6 PRISM add-in.
 * Unlike Creo's single PRISM ribbon tab, CATIA add-ins live *inside*
 * workbenches (Part Design, Assembly Design, Drafting, Sketcher, GSD, DMU,
 * Machining) and attach toolbars + commands per workbench. This engine:
 *
 *   - Holds a declarative `CatiaAddinSpec` (workbenches[], commands[], events[])
 *   - Resolves per-command state (enabled / disabled / hidden) for any
 *     activation context (workbench, model kind, selection, PLM state,
 *     bridge SLO, modal-dialog flag)
 *   - Indexes event subscriptions and dispatches CAA events to handlers,
 *     including optional reaction-style command triggers and per-event
 *     throttling (prevents SelectionChanged spam)
 *   - Tracks tribal tips filtered by feature kind + workbench
 *
 * The CATIA shell (C++/CAA) stays paper-thin: it loads the spec over the
 * same transport used by CATIACAAV5BridgeEngine, renders toolbars, and
 * forwards CAA events to this engine via dispatchEvent().
 *
 * @module engines/CATIAAddinPluginEngine
 */

import {
  CatiaAddinSpecSchema,
  CatiaCommandStateSchema,
  CatiaEventPayloadSchema,
  CatiaEventDispatchResultSchema,
  CatiaTribalTipSchema,
  WORKBENCH_MODEL_KINDS,
  type CatiaAddinSpec,
  type CatiaCommand,
  type CatiaToolbar,
  type CatiaWorkbenchLayout,
  type CatiaActivationContext,
  type CatiaCommandState,
  type CatiaEvent,
  type CatiaEventSubscription,
  type CatiaEventPayload,
  type CatiaEventDispatchResult,
  type CatiaTribalTip,
  type CatiaWorkbench,
} from "../schemas/cadCatiaAddinSchema.js";
import type { CatiaFeatureKind } from "../schemas/cadCatiaCaaV5Schema.js";

export interface CatiaAddinClock {
  monotonicMs(): number;
}

export class CATIAAddinPluginEngine {
  private spec: CatiaAddinSpec;
  private tips = new Map<string, CatiaTribalTip>();
  private lastFireMs = new Map<string, number>(); // subscriptionId → last fire ms
  private clock: CatiaAddinClock;

  constructor(
    opts: {
      spec?: CatiaAddinSpec;
      tips?: CatiaTribalTip[];
      clock?: CatiaAddinClock;
    } = {},
  ) {
    this.spec = opts.spec
      ? CatiaAddinSpecSchema.parse(opts.spec)
      : CATIAAddinPluginEngine.defaultSpec();
    for (const t of opts.tips ?? []) this.registerTip(t);
    this.clock = opts.clock ?? { monotonicMs: () => Date.now() };
  }

  // ── Spec ──────────────────────────────────────────────────────────────────

  getSpec(): CatiaAddinSpec {
    return this.spec;
  }

  setSpec(spec: CatiaAddinSpec): CatiaAddinSpec {
    this.spec = CatiaAddinSpecSchema.parse(spec);
    this.lastFireMs.clear();
    return this.spec;
  }

  /** Flat list of every command in the spec, in declaration order. */
  allCommands(): CatiaCommand[] {
    return [...this.spec.commands];
  }

  findCommand(commandId: string): CatiaCommand | undefined {
    return this.spec.commands.find((c) => c.commandId === commandId);
  }

  /** Workbench layouts sorted by toolbar order. */
  workbenchLayout(workbench: CatiaWorkbench): CatiaWorkbenchLayout | undefined {
    const layout = this.spec.workbenches.find((w) => w.workbenchId === workbench);
    if (!layout) return undefined;
    return {
      ...layout,
      toolbars: [...layout.toolbars].sort((a, b) => a.order - b.order),
    };
  }

  /** Commands that appear (via any toolbar) inside a given workbench. */
  commandsForWorkbench(workbench: CatiaWorkbench): CatiaCommand[] {
    const layout = this.workbenchLayout(workbench);
    if (!layout) return [];
    const ids = new Set<string>();
    for (const tb of layout.toolbars) for (const c of tb.commands) ids.add(c);
    return this.spec.commands.filter((c) => ids.has(c.commandId));
  }

  /** Toolbars defined for a given workbench. */
  toolbarsForWorkbench(workbench: CatiaWorkbench): CatiaToolbar[] {
    return this.workbenchLayout(workbench)?.toolbars ?? [];
  }

  // ── Activation resolution ─────────────────────────────────────────────────

  /**
   * Resolve every command in the spec against the activation context.
   * Callers (the CATIA shell) apply these states per refresh cycle.
   */
  resolve(ctx: CatiaActivationContext): CatiaCommandState[] {
    return this.allCommands().map((c) => this.resolveOne(c, ctx));
  }

  resolveOne(
    cmd: CatiaCommand,
    ctx: CatiaActivationContext,
  ): CatiaCommandState {
    // Modal dialog disables everything.
    if (ctx.isModalDialog) {
      return CatiaCommandStateSchema.parse({
        commandId: cmd.commandId,
        state: "disabled",
        reason: "CATIA is in modal dialog",
      });
    }

    // Workbench scoping (hidden outside declared workbenches).
    if (cmd.workbenches.length > 0) {
      if (!ctx.workbench || !cmd.workbenches.includes(ctx.workbench)) {
        return CatiaCommandStateSchema.parse({
          commandId: cmd.commandId,
          state: "hidden",
          reason: `Workbench scope: [${cmd.workbenches.join(", ")}]`,
        });
      }
    }

    // Model kind scope (explicit, or inferred from workbench).
    const allowedKinds =
      cmd.requiresModelKind.length > 0
        ? cmd.requiresModelKind
        : ctx.workbench
        ? WORKBENCH_MODEL_KINDS[ctx.workbench]
        : [];
    if (allowedKinds.length > 0) {
      if (!ctx.modelKind || !allowedKinds.includes(ctx.modelKind)) {
        return CatiaCommandStateSchema.parse({
          commandId: cmd.commandId,
          state: "hidden",
          reason: `Model kind scope: [${allowedKinds.join(", ")}]`,
        });
      }
    }

    // PLM editability gate.
    if (cmd.requiresEditablePlm && ctx.plmState && ctx.plmState !== "in_work") {
      return CatiaCommandStateSchema.parse({
        commandId: cmd.commandId,
        state: "disabled",
        reason: `PLM state ${ctx.plmState} is read-only`,
      });
    }

    // Selection kind predicate.
    if (cmd.requiresSelectionKind.length > 0) {
      if (
        !ctx.selectionKind ||
        !cmd.requiresSelectionKind.includes(ctx.selectionKind)
      ) {
        return CatiaCommandStateSchema.parse({
          commandId: cmd.commandId,
          state: "disabled",
          reason: `Select a feature of type [${cmd.requiresSelectionKind.join(", ")}]`,
        });
      }
    }

    // Selection count bounds.
    if (cmd.minSelectionCount > 0 && ctx.selectionCount < cmd.minSelectionCount) {
      return CatiaCommandStateSchema.parse({
        commandId: cmd.commandId,
        state: "disabled",
        reason: `Need ≥${cmd.minSelectionCount} items selected`,
      });
    }
    if (cmd.maxSelectionCount > 0 && ctx.selectionCount > cmd.maxSelectionCount) {
      return CatiaCommandStateSchema.parse({
        commandId: cmd.commandId,
        state: "disabled",
        reason: `Too many items: max ${cmd.maxSelectionCount}`,
      });
    }

    // Bridge SLO gate.
    if (cmd.maxP95Ms !== undefined && ctx.bridgeP95Ms !== undefined) {
      if (ctx.bridgeP95Ms > cmd.maxP95Ms) {
        return CatiaCommandStateSchema.parse({
          commandId: cmd.commandId,
          state: "disabled",
          reason: `Bridge p95 ${ctx.bridgeP95Ms}ms exceeds max ${cmd.maxP95Ms}ms`,
        });
      }
    }

    return CatiaCommandStateSchema.parse({
      commandId: cmd.commandId,
      state: "enabled",
      reason: "OK",
    });
  }

  // ── Events ────────────────────────────────────────────────────────────────

  eventSubscriptions(event?: CatiaEvent): CatiaEventSubscription[] {
    const subs = this.spec.events;
    return event ? subs.filter((s) => s.event === event) : [...subs];
  }

  /**
   * Dispatch a CAA event to all matching subscriptions. Returns per-subscription
   * outcome records. Fires are suppressed when the model-kind filter rejects
   * the payload or when throttling is active.
   */
  dispatchEvent(payload: CatiaEventPayload): CatiaEventDispatchResult[] {
    const parsed = CatiaEventPayloadSchema.parse(payload);
    const subs = this.eventSubscriptions(parsed.event);
    const out: CatiaEventDispatchResult[] = [];
    for (const sub of subs) {
      // Model kind filter.
      if (
        sub.forModelKinds.length > 0 &&
        (!parsed.modelKind || !sub.forModelKinds.includes(parsed.modelKind))
      ) {
        out.push(
          CatiaEventDispatchResultSchema.parse({
            subscriptionId: sub.subscriptionId,
            fired: false,
            reason: `Model kind ${parsed.modelKind ?? "none"} not in [${sub.forModelKinds.join(", ")}]`,
          }),
        );
        continue;
      }
      // Throttle.
      if (sub.throttleMs > 0) {
        const last = this.lastFireMs.get(sub.subscriptionId);
        if (last !== undefined && parsed.at - last < sub.throttleMs) {
          out.push(
            CatiaEventDispatchResultSchema.parse({
              subscriptionId: sub.subscriptionId,
              fired: false,
              throttled: true,
              reason: `Throttled (${sub.throttleMs}ms window)`,
            }),
          );
          continue;
        }
      }
      this.lastFireMs.set(sub.subscriptionId, parsed.at);
      out.push(
        CatiaEventDispatchResultSchema.parse({
          subscriptionId: sub.subscriptionId,
          fired: true,
          triggeredCommandId: sub.triggerCommandId,
        }),
      );
    }
    return out;
  }

  /** Reset throttle state (useful after a workbench change). */
  resetThrottles(): void {
    this.lastFireMs.clear();
  }

  // ── Tribal tips ───────────────────────────────────────────────────────────

  registerTip(tip: CatiaTribalTip): CatiaTribalTip {
    const parsed = CatiaTribalTipSchema.parse(tip);
    this.tips.set(parsed.tipId, parsed);
    return parsed;
  }

  tipsForFeature(
    kind: CatiaFeatureKind,
    opts: { workbench?: CatiaWorkbench; limit?: number } = {},
  ): CatiaTribalTip[] {
    const limit = opts.limit ?? 5;
    const hits = [...this.tips.values()].filter((t) => {
      if (!t.forFeatureKinds.includes(kind)) return false;
      if (
        opts.workbench &&
        t.forWorkbenches.length > 0 &&
        !t.forWorkbenches.includes(opts.workbench)
      ) {
        return false;
      }
      return true;
    });
    hits.sort((a, b) => b.confidence - a.confidence);
    return hits.slice(0, limit);
  }

  tipCount(): number {
    return this.tips.size;
  }

  // ── Defaults ──────────────────────────────────────────────────────────────

  /**
   * Default PRISM add-in spec: 4 workbenches (PartDesign, AssemblyDesign,
   * Drafting, Machining), 17 commands, 7 event subscriptions.
   */
  static defaultSpec(): CatiaAddinSpec {
    return CatiaAddinSpecSchema.parse({
      addinId: "prism.catia.addin",
      label: { default: "PRISM" },
      version: "1.0.0",
      vendor: "PRISM",
      commands: [
        // Programming — part design
        {
          commandId: "sf.calc",
          caaClassName: "CATPrismSpeedFeedCmd",
          label: { default: "Speed/Feed", fr_FR: "Vit./Avance" },
          tooltip: "Calculate optimal speeds and feeds for the selected feature",
          action: "run_speed_feed",
          iconSize: "large",
          iconName: "prism_speedfeed_32.png",
          workbenches: ["PartDesign", "Machining"],
          requiresSelectionKind: ["Pad", "Hole", "Pocket", "Shaft"],
          accelerator: "Ctrl+Shift+S",
        },
        {
          commandId: "setup.sheet",
          caaClassName: "CATPrismSetupSheetCmd",
          label: { default: "Setup Sheet" },
          tooltip: "Generate a setup sheet for this model",
          action: "open_setup_sheet",
          iconName: "prism_setupsheet_24.png",
          workbenches: ["PartDesign", "AssemblyDesign", "Machining"],
          requiresEditablePlm: false,
        },
        {
          commandId: "release",
          caaClassName: "CATPrismProgramReleaseCmd",
          label: { default: "Program Release" },
          tooltip: "Create a program release for this model",
          action: "open_program_release",
          iconName: "prism_release_24.png",
          workbenches: ["PartDesign"],
          requiresEditablePlm: true,
        },
        {
          commandId: "fixture",
          caaClassName: "CATPrismFixtureDesignCmd",
          label: { default: "Fixture" },
          tooltip: "Design a workholding fixture",
          action: "open_fixture_design",
          iconName: "prism_fixture_24.png",
          workbenches: ["PartDesign", "AssemblyDesign"],
        },
        // Quality
        {
          commandId: "dfm",
          caaClassName: "CATPrismDfmCmd",
          label: { default: "DFM Check" },
          tooltip: "Design-for-manufacturing check",
          action: "run_dfm",
          iconName: "prism_dfm_24.png",
          workbenches: ["PartDesign"],
        },
        {
          commandId: "diff",
          caaClassName: "CATPrismDiffCmd",
          label: { default: "Diff Revs" },
          tooltip: "Compare selected models side-by-side",
          action: "show_diff",
          iconName: "prism_diff_24.png",
          minSelectionCount: 2,
          maxSelectionCount: 2,
        },
        {
          commandId: "quality.report",
          caaClassName: "CATPrismQualityReportCmd",
          label: { default: "Quality Report" },
          tooltip: "Open the quality / inspection report",
          action: "open_quality_report",
          iconName: "prism_quality_24.png",
          workbenches: ["PartDesign", "AssemblyDesign", "Drafting"],
        },
        {
          commandId: "tolerance.stack",
          caaClassName: "CATPrismToleranceStackCmd",
          label: { default: "Tolerance Stack" },
          tooltip: "Run tolerance stack-up analysis",
          action: "open_tolerance_stack",
          iconName: "prism_tolstack_24.png",
          workbenches: ["AssemblyDesign", "Drafting"],
        },
        // Quote / Cost
        {
          commandId: "quote",
          caaClassName: "CATPrismQuoteCmd",
          label: { default: "Quote Now" },
          tooltip: "Generate a quote for the current model",
          action: "quote_current",
          iconName: "prism_quote_24.png",
          workbenches: ["PartDesign", "AssemblyDesign"],
          maxP95Ms: 2000,
        },
        // System
        {
          commandId: "update",
          caaClassName: "CATPrismUpdateCmd",
          label: { default: "Update Model" },
          tooltip: "Trigger the CATIA Update cycle",
          action: "update_model",
          iconName: "prism_update_24.png",
        },
        {
          commandId: "tribal",
          caaClassName: "CATPrismTribalCmd",
          label: { default: "Tribal Tips" },
          tooltip: "Show shop-floor tips for the selected feature",
          action: "open_tribal",
          iconName: "prism_tribal_24.png",
        },
        {
          commandId: "slo",
          caaClassName: "CATPrismSloCmd",
          label: { default: "SLO Status" },
          tooltip: "Bridge latency SLO widget",
          action: "open_slo",
          iconName: "prism_slo_24.png",
        },
        {
          commandId: "handoff",
          caaClassName: "CATPrismHandoffCmd",
          label: { default: "Handoff" },
          tooltip: "Hand model off to PRISM shop floor queue",
          action: "open_handoff",
          iconName: "prism_handoff_24.png",
          workbenches: ["PartDesign", "AssemblyDesign"],
          requiresEditablePlm: false,
        },
        // Collision / machining
        {
          commandId: "collision",
          caaClassName: "CATPrismCollisionCmd",
          label: { default: "Collision Check" },
          tooltip: "Run collision check across the active setup",
          action: "run_collision_check",
          iconName: "prism_collision_24.png",
          workbenches: ["AssemblyDesign", "DMUNavigator", "Machining"],
        },
        // EKL + PLM
        {
          commandId: "ekl.audit",
          caaClassName: "CATPrismEklAuditCmd",
          label: { default: "EKL Audit" },
          tooltip: "Run all EKL relations and report failing checks",
          action: "run_ekl_audit",
          iconName: "prism_ekl_24.png",
          workbenches: ["PartDesign", "AssemblyDesign"],
        },
        {
          commandId: "plm.history",
          caaClassName: "CATPrismPlmHistoryCmd",
          label: { default: "PLM History" },
          tooltip: "Open the PLM state / revision history timeline",
          action: "open_plm_history",
          iconName: "prism_plm_24.png",
        },
        {
          commandId: "export.step",
          caaClassName: "CATPrismExportStepCmd",
          label: { default: "Export STEP" },
          tooltip: "Export the current model as AP242 STEP",
          action: "export_step",
          iconName: "prism_step_24.png",
          workbenches: ["PartDesign", "AssemblyDesign"],
        },
      ],
      workbenches: [
        {
          workbenchId: "PartDesign",
          label: { default: "PRISM (Part)" },
          toolbars: [
            {
              toolbarId: "prism.part.programming",
              label: { default: "PRISM Programming" },
              order: 0,
              commands: ["sf.calc", "setup.sheet", "release", "fixture"],
            },
            {
              toolbarId: "prism.part.quality",
              label: { default: "PRISM Quality" },
              order: 1,
              commands: ["dfm", "diff", "quality.report", "ekl.audit"],
            },
            {
              toolbarId: "prism.part.system",
              label: { default: "PRISM System" },
              order: 2,
              commands: ["update", "tribal", "slo", "handoff", "plm.history", "export.step"],
            },
          ],
        },
        {
          workbenchId: "AssemblyDesign",
          label: { default: "PRISM (Assembly)" },
          toolbars: [
            {
              toolbarId: "prism.asm.programming",
              label: { default: "PRISM Programming" },
              order: 0,
              commands: ["setup.sheet", "fixture"],
            },
            {
              toolbarId: "prism.asm.quality",
              label: { default: "PRISM Quality" },
              order: 1,
              commands: ["quality.report", "tolerance.stack", "collision", "ekl.audit"],
            },
            {
              toolbarId: "prism.asm.system",
              label: { default: "PRISM System" },
              order: 2,
              commands: ["quote", "handoff", "export.step", "slo"],
            },
          ],
        },
        {
          workbenchId: "Drafting",
          label: { default: "PRISM (Drawing)" },
          toolbars: [
            {
              toolbarId: "prism.draw.quality",
              label: { default: "PRISM Quality" },
              order: 0,
              commands: ["quality.report", "tolerance.stack"],
            },
          ],
        },
        {
          workbenchId: "Machining",
          label: { default: "PRISM (Machining)" },
          toolbars: [
            {
              toolbarId: "prism.mach.programming",
              label: { default: "PRISM Machining" },
              order: 0,
              commands: ["sf.calc", "setup.sheet", "collision"],
            },
          ],
        },
      ],
      events: [
        {
          subscriptionId: "on.new.doc",
          event: "NewDocument",
          handlerName: "CATPrismOnNewDocument",
        },
        {
          subscriptionId: "on.open.doc",
          event: "OpenDocument",
          handlerName: "CATPrismOnOpenDocument",
        },
        {
          subscriptionId: "on.save.before",
          event: "BeforeSave",
          handlerName: "CATPrismOnBeforeSave",
          // Auto-trigger DFM when saving a part.
          triggerCommandId: "dfm",
          forModelKinds: ["CATPart"],
        },
        {
          subscriptionId: "on.selection",
          event: "SelectionChanged",
          handlerName: "CATPrismOnSelectionChanged",
          throttleMs: 150, // debounce selection spam
        },
        {
          subscriptionId: "on.update.after",
          event: "AfterUpdate",
          handlerName: "CATPrismOnAfterUpdate",
        },
        {
          subscriptionId: "on.ekl.fail",
          event: "EklRelationFailed",
          handlerName: "CATPrismOnEklRelationFailed",
          triggerCommandId: "ekl.audit",
        },
        {
          subscriptionId: "on.wb.activated",
          event: "WorkbenchActivated",
          handlerName: "CATPrismOnWorkbenchActivated",
        },
      ],
    });
  }
}

export const catiaAddinPluginEngine = new CATIAAddinPluginEngine();
