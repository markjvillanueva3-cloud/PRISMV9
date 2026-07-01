/**
 * CatalogConsumerAdapterEngine — U-DB-BRIDGE-CONSUMERS
 * ===================================================
 *
 * Single 1-line wire-point for ALL 8 high-ROI consumer categories named in
 * the JULIETT-DB-BRIDGE-MS0 work order:
 *
 *   1. speedfeed     — UltimateSpeedFeed / AutoSpeedFeed / MachineAwareSpeedFeed
 *   2. post          — AdvancedPostProcessor / PostProcessorPipeline / CrossCAMPost
 *   3. masterpost    — HurcoV11MillMaster / OkumaB250LatheMaster / MitsubishiMV1200RWireEDMMaster
 *   4. mill_wizard   — MillingUltimateAI / Mill studio entry points
 *   5. lathe_wizard  — Lathe studio + LatheSpeedFeedCalculatorFacade
 *   6. wedm_wizard   — Wire EDM studio + EDMPostProcessGCode
 *   7. quoting       — InstantQuote / BlueprintToQuoteBridge / Casting/Injection/AdditiveQuote / ActualCost
 *   8. cadcam        — CAM strategy + CAD validation pipelines
 *
 * Each consumer category gets a tailored param-transform on top of the
 * underlying CatalogUnifiedQueryEngine.query(). One MCP action
 * (catalog_resolve_for_consumer) exposes the consumer-tagged variant; any
 * engine can also import { catalogConsumerAdapter } directly.
 *
 * Pattern: ANY consumer engine calls ONE line —
 *   const ctx = await catalogConsumerAdapter.resolve({ consumer: "quoting", material: "Ti6Al4V", op_type: "mill" });
 * — and receives material + tools + coatings + machines + consumer-specific
 * extras (e.g. coolant for quoting; ISO group emphasis for speedfeed).
 *
 * Spec: state/shared/specs/CONSUMER-WIRES-JULIETT-DB-BRIDGE.md (this commit).
 * Upstream: U-DB-BRIDGE-03 CatalogUnifiedQueryEngine (commit b783f986ab).
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-CONSUMERS (slot juliett, 2026-05-25)
 */

import { catalogUnifiedQueryEngine, MAX_PER_CATALOG_CEILING } from "./CatalogUnifiedQueryEngine.js";
import { registryManager } from "../registries/manager.js";

/** All consumer categories the work order names — extend here as new
 *  consumer classes adopt the bridge. */
export const CONSUMERS = [
  "speedfeed",
  "post",
  "masterpost",
  "mill_wizard",
  "lathe_wizard",
  "wedm_wizard",
  "quoting",
  "cadcam",
] as const;
export type Consumer = typeof CONSUMERS[number];

/** Per-consumer max-result tuning. Quoting + cadcam see more catalog items
 *  (more options for the user); post/masterpost see fewer (post needs the
 *  one chosen machine, not a list). */
export const PER_CONSUMER_MAX: Record<Consumer, number> = {
  speedfeed:    5,   // SF picks one material + a few tool candidates
  post:         3,   // post is one machine + one controller
  masterpost:   3,   // same
  mill_wizard:  8,   // wizard surfaces options to user
  lathe_wizard: 8,
  wedm_wizard:  8,
  quoting:      10,  // quoting cross-checks many tool/material combos
  cadcam:       10,
};

export interface ConsumerResolveInput {
  consumer: Consumer;
  material: string;
  op_type?: string;
  iso_group?: string;
  machine_class?: string;       // post / masterpost / wizard filter
  max_per_catalog?: number;     // operator override; else PER_CONSUMER_MAX
}

export interface ConsumerResolveResult {
  ok: boolean;
  consumer: Consumer;
  material: any | null;
  iso_group: string | null;
  tools_top: any[];
  coatings_top: any[];
  machines_top: any[];
  /** Consumer-specific extras (coolant for quoting; controller hint for post). */
  extras: Record<string, unknown>;
  stats: {
    consumer: Consumer;
    queried_material: string;
    op_type: string | null;
    machine_class: string | null;
    max_per_catalog: number;
    tools_returned: number;
    coatings_returned: number;
    machines_returned: number;
    extras_keys: string[];
    miss_reasons: string[];
  };
  warning?: string;
}

/**
 * CatalogConsumerAdapterEngine — wraps CatalogUnifiedQueryEngine with
 * consumer-specific param transforms + extras. Stateless. Singleton.
 */
export class CatalogConsumerAdapterEngine {
  /**
   * Resolve catalog context for a named consumer. Returns ok:false with
   * warning on bad input; never throws.
   */
  async resolve(input: ConsumerResolveInput): Promise<ConsumerResolveResult> {
    const consumer = input.consumer;
    if (!consumer || !(CONSUMERS as readonly string[]).includes(consumer)) {
      return this.errorResult(input, "invalid_consumer", `consumer must be one of: ${CONSUMERS.join(", ")}`);
    }
    const queried = String(input.material ?? "").trim();
    if (!queried) {
      return this.errorResult(input, "empty_material", "material query is empty");
    }

    // Pick per-consumer max if not overridden by caller.
    const max = Math.min(
      Math.max(1, input.max_per_catalog ?? PER_CONSUMER_MAX[consumer] ?? 5),
      MAX_PER_CATALOG_CEILING,
    );

    // Underlying cross-catalog query.
    const base = await catalogUnifiedQueryEngine.query({
      material: queried,
      op_type: input.op_type,
      iso_group: input.iso_group,
      max_per_catalog: max,
    });

    // Consumer-specific extras (coolant, controller hint, wizard mode, etc.).
    const extras = await this.buildExtras(consumer, base.material, input);

    return {
      ok: base.ok,
      consumer,
      material: base.material,
      iso_group: base.iso_group,
      tools_top: base.tools_top,
      coatings_top: base.coatings_top,
      machines_top: base.machines_top,
      extras,
      stats: {
        consumer,
        queried_material: queried,
        op_type: input.op_type ?? null,
        machine_class: input.machine_class ?? null,
        max_per_catalog: max,
        tools_returned: base.stats.tools_returned,
        coatings_returned: base.stats.coatings_returned,
        machines_returned: base.stats.machines_returned,
        extras_keys: Object.keys(extras),
        miss_reasons: base.stats.miss_reasons,
      },
    };
  }

  private errorResult(input: ConsumerResolveInput, reason: string, warning: string): ConsumerResolveResult {
    const consumer = (CONSUMERS as readonly string[]).includes(input.consumer)
      ? input.consumer
      : ("speedfeed" as Consumer); // default for shape stability
    return {
      ok: false, consumer,
      material: null, iso_group: null,
      tools_top: [], coatings_top: [], machines_top: [],
      extras: {},
      stats: {
        consumer,
        queried_material: String(input.material ?? "").trim(),
        op_type: input.op_type ?? null,
        machine_class: input.machine_class ?? null,
        max_per_catalog: 0,
        tools_returned: 0, coatings_returned: 0, machines_returned: 0,
        extras_keys: [],
        miss_reasons: [reason],
      },
      warning,
    };
  }

  /**
   * Consumer-specific extras layer. Pure (no I/O beyond registryManager).
   * Each consumer gets the slice of cross-leg data it cares about.
   */
  private async buildExtras(
    consumer: Consumer,
    material: any | null,
    input: ConsumerResolveInput,
  ): Promise<Record<string, unknown>> {
    const extras: Record<string, unknown> = {};
    switch (consumer) {
      case "speedfeed":
        // SF cares most about ISO group + material kc1.1 / mc for Kienzle route
        extras.iso_emphasis = material?.iso_group ?? input.iso_group ?? null;
        extras.kc11_mpa = material?.kc11 ?? material?.kc1_1 ?? null;
        extras.mc = material?.mc ?? null;
        extras.machinability_index = material?.machinability ?? null;
        break;
      case "post":
      case "masterpost":
        // Post needs the controller dialect hint
        extras.machine_class = input.machine_class ?? null;
        extras.controller_hint = input.machine_class
          ? this.controllerHintFor(input.machine_class) : null;
        break;
      case "mill_wizard":
      case "lathe_wizard":
      case "wedm_wizard":
        // Wizard surfaces operation candidates
        extras.wizard_mode = consumer.replace("_wizard", "");
        extras.op_type_default = input.op_type
          ?? (consumer === "mill_wizard" ? "mill"
            : consumer === "lathe_wizard" ? "turn"
            : "wedm");
        break;
      case "quoting":
        // Quoting needs coolant cost line + material density for stock calc
        try {
          await registryManager.initialize();
          const coolants = await registryManager.coolants.list();
          extras.coolants_count = Array.isArray(coolants) ? coolants.length : 0;
          extras.coolants_sample = Array.isArray(coolants) ? coolants.slice(0, 3) : [];
        } catch { extras.coolants_count = 0; }
        extras.density_g_cc = material?.density ?? null;
        extras.cost_per_kg = material?.cost_per_kg ?? null;
        break;
      case "cadcam":
        // CAD/CAM needs feature-recog hints + tolerance defaults
        extras.dfm_iso = material?.iso_group ?? input.iso_group ?? null;
        extras.gdtgeo_default_tolerance = material?.iso_2768_default ?? "medium";
        break;
    }
    return extras;
  }

  /** Best-effort controller family hint from a machine class string. */
  private controllerHintFor(machineClass: string): string {
    const s = machineClass.toLowerCase();
    if (s.includes("hurco")) return "hurco_winmax";
    if (s.includes("okuma")) return "okuma_osp";
    if (s.includes("mitsubishi")) return "mitsubishi_meldas";
    if (s.includes("fanuc")) return "fanuc_30i";
    if (s.includes("haas")) return "haas_ngc";
    if (s.includes("siemens")) return "siemens_840d";
    if (s.includes("heidenhain")) return "heidenhain_530";
    return "generic_iso6983";
  }
}

/** Singleton — share across dispatcher invocations + consumer engines. */
export const catalogConsumerAdapter = new CatalogConsumerAdapterEngine();
