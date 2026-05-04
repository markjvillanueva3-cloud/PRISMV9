/**
 * WEDMPostDialectRouterEngine — thin dispatcher in front of the per-vendor
 * WEDM post-processor engines. The vendor-specific emission logic lives
 * in five sibling engines — one per manufacturer family:
 *
 *   • WEDMPostMitsubishiEngine  → mitsubishi_fa, mitsubishi_mv
 *   • WEDMPostSodickEngine      → sodick_aq, sodick_al
 *   • WEDMPostMakinoEngine      → makino_u, makino_eu
 *   • WEDMPostAgieEngine        → agie_cut, agie_charm
 *   • WEDMPostFanucEngine       → fanuc_robocut
 *
 * Having a single source of truth per vendor eliminates dialect drift
 * between the router's inline dialect table and the per-vendor engines
 * (which was the original OS-04 scrutiny concern). The router is now
 * responsible only for:
 *
 *   1. Mapping controller-id → vendor engine.
 *   2. Selecting a controller-id from a shop-profile machine inventory.
 *   3. Dialect-to-dialect conversion by generating from both engines.
 *
 * Re-exports the shared types for backwards compatibility with callers
 * that imported them from the router file.
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import type {
  IWEDMPostEngine,
  WEDMController,
  WEDMOperation,
  WEDMPostInput,
  WEDMPostOutput,
} from "./WEDMPostTypes.js";

import { wedmPostMitsubishiEngine } from "./WEDMPostMitsubishiEngine.js";
import { wedmPostSodickEngine } from "./WEDMPostSodickEngine.js";
import { wedmPostMakinoEngine } from "./WEDMPostMakinoEngine.js";
import { wedmPostAgieEngine } from "./WEDMPostAgieEngine.js";
import { wedmPostFanucEngine } from "./WEDMPostFanucEngine.js";

// Re-export shared types so external imports keep working.
export type {
  WEDMController,
  WEDMOperation,
  WEDMPostInput,
  WEDMPostOutput,
  WEDMParsedPlan,
  WEDMPassId,
  WEDMProfilePoint,
  WEDMOperationType,
  IWEDMPostEngine,
} from "./WEDMPostTypes.js";

/**
 * Minimal public view of a dialect. Kept for backwards compatibility with
 * code (and tests) that called `getDialectConfig(controller)` on the
 * pre-refactor router. Full dialect detail now lives inside each engine.
 */
export interface DialectConfig {
  name: string;
  manufacturer: string;
  engine: IWEDMPostEngine;
}

// Controller → engine registry.
const ENGINE_BY_CONTROLLER: Record<WEDMController, IWEDMPostEngine> = {
  mitsubishi_fa: wedmPostMitsubishiEngine,
  mitsubishi_mv: wedmPostMitsubishiEngine,
  sodick_aq: wedmPostSodickEngine,
  sodick_al: wedmPostSodickEngine,
  makino_u: wedmPostMakinoEngine,
  makino_eu: wedmPostMakinoEngine,
  agie_cut: wedmPostAgieEngine,
  agie_charm: wedmPostAgieEngine,
  fanuc_robocut: wedmPostFanucEngine,
};

/**
 * Machine-name → controller-id routing. Keys are case-insensitive
 * substrings; the first matching entry wins. Designed to consume strings
 * straight from ShopConfigurationEngine's machine inventory (e.g.
 * "Mitsubishi FA20S Advance", "Sodick AQ535L", "Fanuc ROBOCUT α-C600iB").
 */
const MACHINE_TO_CONTROLLER: Array<{ pattern: RegExp; controller: WEDMController }> = [
  { pattern: /mitsubishi\s*fa/i,       controller: "mitsubishi_fa" },
  { pattern: /mitsubishi\s*mv/i,       controller: "mitsubishi_mv" },
  { pattern: /\bmv\d{3,}\w*/i,         controller: "mitsubishi_mv" },
  { pattern: /\bfa\d{2,}\w*/i,         controller: "mitsubishi_fa" },
  { pattern: /sodick\s*(aq|aq\d+)/i,   controller: "sodick_aq" },
  { pattern: /sodick\s*(al|sl|aq)/i,   controller: "sodick_al" },
  { pattern: /\baq\d+/i,               controller: "sodick_aq" },
  { pattern: /\bsl\d+g?/i,             controller: "sodick_al" },
  { pattern: /makino\s*eu/i,           controller: "makino_eu" },
  { pattern: /makino\s*u/i,            controller: "makino_u" },
  { pattern: /\beu\d+/i,               controller: "makino_eu" },
  { pattern: /\bu\d+i/i,               controller: "makino_u" },
  // Check "CUT" product line first — string "AgieCharmilles CUT ..." contains
  // both the brand "Charmilles" and the product line "CUT", so a Charm-first
  // match would incorrectly claim it.
  { pattern: /cut\s*p\s*\d+/i,         controller: "agie_cut" },
  { pattern: /agie\s*cut|charmilles\s*cut/i, controller: "agie_cut" },
  { pattern: /agie\s*charm|^charm\b|\bfw\d+/i, controller: "agie_charm" },
  { pattern: /gf\s*machining/i,        controller: "agie_cut" },
  { pattern: /fanuc|robocut|α-?c\d/i,  controller: "fanuc_robocut" },
];

export class WEDMPostDialectRouterEngine {
  readonly name = "WEDMPostDialectRouterEngine";
  readonly version = "2.0.0";

  /**
   * Controllers the router can dispatch to (9 total, across 5 vendors).
   */
  getSupportedControllers(): WEDMController[] {
    return Object.keys(ENGINE_BY_CONTROLLER) as WEDMController[];
  }

  /**
   * Public dialect summary for introspection. Unknown controllers return
   * `undefined`. Vendor-specific detail (tech tables, macro vars…) is
   * exposed on the vendor engine itself.
   */
  getDialectConfig(controller: WEDMController): DialectConfig | undefined {
    const engine = ENGINE_BY_CONTROLLER[controller];
    if (!engine) return undefined;
    const name = this.dialectNameFor(controller);
    return { name, manufacturer: engine.manufacturer, engine };
  }

  /**
   * Best-effort display name for a controller id.
   */
  dialectNameFor(controller: WEDMController): string {
    const engine = ENGINE_BY_CONTROLLER[controller];
    if (!engine) return "UNKNOWN";
    // Each engine has a `dialectNameFor` helper, but it's vendor-specific.
    // Call through `(engine as any).dialectNameFor` when present.
    const fn = (engine as unknown as { dialectNameFor?: (c: WEDMController) => string }).dialectNameFor;
    if (typeof fn === "function") return fn.call(engine, controller);
    return controller;
  }

  /**
   * Select a controller id from a shop-profile machine description.
   * Returns `undefined` when nothing matches — callers should fall back
   * to an explicit controller choice in that case.
   *
   * OS-04 exit criterion 2: "dialect router selects by shop profile
   * machine inventory".
   */
  selectByMachine(machineDescription: string): WEDMController | undefined {
    if (!machineDescription) return undefined;
    for (const { pattern, controller } of MACHINE_TO_CONTROLLER) {
      if (pattern.test(machineDescription)) return controller;
    }
    return undefined;
  }

  /**
   * Generate G-code for the specified controller by delegating to the
   * owning vendor engine.
   */
  generate(input: WEDMPostInput): WEDMPostOutput {
    const engine = ENGINE_BY_CONTROLLER[input.controller];
    if (!engine) {
      return {
        success: false,
        controller: input.controller,
        dialect_name: "UNKNOWN",
        gcode_lines: [],
        gcode_text: "",
        line_count: 0,
        operation_count: 0,
        warnings: [`Unsupported controller: ${input.controller}`],
        dialect_specific: {},
      };
    }
    return engine.generate(input);
  }

  /**
   * Alias for `generate`. Keeps the old router API.
   */
  route(input: WEDMPostInput): WEDMPostOutput {
    return this.generate(input);
  }

  /**
   * Dialect-to-dialect conversion: emit the same plan through two
   * different vendor engines so a shop can compare (or roundtrip-verify)
   * the result of moving a job between machines.
   */
  convert(
    sourceDialect: WEDMController,
    targetDialect: WEDMController,
    input: WEDMPostInput
  ): { source: WEDMPostOutput; target: WEDMPostOutput } {
    const source = this.generate({ ...input, controller: sourceDialect });
    const target = this.generate({ ...input, controller: targetDialect });
    return { source, target };
  }

  /**
   * Roundtrip verification helper used by OS-04 exit criterion 4: emit
   * the plan through a dialect, re-parse it, and return the parsed plan
   * alongside the generated output so callers can assert equivalence.
   */
  roundtrip(input: WEDMPostInput): {
    output: WEDMPostOutput;
    parsed: ReturnType<IWEDMPostEngine["parse"]>;
  } {
    const engine = ENGINE_BY_CONTROLLER[input.controller];
    const output = this.generate(input);
    const parsed = engine ? engine.parse(output.gcode_text) : { operations: [] };
    return { output, parsed };
  }
}

export const wedmPostDialectRouterEngine = new WEDMPostDialectRouterEngine();
