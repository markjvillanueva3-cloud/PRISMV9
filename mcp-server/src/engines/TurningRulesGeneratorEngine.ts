/**
 * TurningRulesGeneratorEngine
 * =============================
 *
 * Generates machining rules (valid speed/feed/DoC envelopes) for lathe
 * operations, parameterized by material × tool × machine × operation.
 * Rules are structured, searchable, and composable — downstream engines
 * pick the tightest envelope that still covers the planned operation.
 *
 * Produces rule types:
 *   - VELOCITY_ENVELOPE: Vc min/max per material × operation
 *   - FEED_ENVELOPE:     fn min/max per material × nose radius
 *   - DOC_ENVELOPE:      ap/ae min/max per insert type × material
 *   - SPINDLE_CONSTRAINT: RPM cap per chuck type + part diameter
 *   - CHATTER_CONSTRAINT: L/D limits per tool material
 *
 * Serializable as JSON for cross-session reuse.
 *
 * @module engines/TurningRulesGeneratorEngine
 * @milestone LATHE-PRO
 */

export type RuleKind =
  | "velocity_envelope"
  | "feed_envelope"
  | "doc_envelope"
  | "spindle_constraint"
  | "chatter_constraint";

export interface MachiningRule {
  id: string;
  kind: RuleKind;
  name: string;
  description: string;
  conditions: Record<string, string | number>; // material, operation, etc.
  bounds: {
    min?: number;
    max?: number;
    unit: string;
    field: string; // Vc_m_min, fn_mm_rev, ap_mm, rpm, l_over_d
  };
  priority: number; // 1-10
  source: string; // Kienzle, Sandvik, Kennametal, Machinery's Handbook, JM Die tribal
}

export interface RuleGenerationContext {
  material: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  operation?: "roughing" | "finishing" | "threading" | "grooving" | "parting" | "drilling" | "boring";
  tool_type?: string;
  machine_class?: "slant_bed" | "vertical" | "swiss" | "mill_turn";
}

export interface RuleSet {
  context: RuleGenerationContext;
  rules: MachiningRule[];
  generated_at: string;
  rule_count_by_kind: Record<RuleKind, number>;
}

// ── Reference data ─────────────────────────────────────────────────────────

/**
 * Vc ranges (m/min) per ISO group × operation. Drawn from Sandvik
 * Coromant turning reference tables (2023 edition).
 */
const VC_REFERENCE: Record<string, { rough: [number, number]; finish: [number, number] }> = {
  P: { rough: [180, 260], finish: [260, 400] }, // steel
  M: { rough: [140, 200], finish: [200, 320] }, // stainless
  K: { rough: [200, 400], finish: [400, 800] }, // cast iron
  N: { rough: [350, 700], finish: [700, 1500] }, // aluminum
  S: { rough: [30, 60], finish: [60, 120] }, // superalloys + Ti
  H: { rough: [120, 180], finish: [180, 260] }, // hardened steel
};

/**
 * fn ranges (mm/rev) per operation. Lower bound avoids rubbing; upper
 * bound avoids chip-load overload.
 */
const FN_REFERENCE: Record<string, [number, number]> = {
  roughing: [0.2, 0.5],
  finishing: [0.08, 0.2],
  threading: [0.5, 5.0], // pitch
  grooving: [0.05, 0.15],
  parting: [0.03, 0.1],
  drilling: [0.05, 0.3],
  boring: [0.1, 0.3],
};

/**
 * ap (depth of cut, mm) per operation.
 */
const AP_REFERENCE: Record<string, [number, number]> = {
  roughing: [1.5, 6.0],
  finishing: [0.2, 1.0],
  threading: [0.01, 0.5],
  grooving: [0.5, 4.0],
  parting: [0, 0],
  drilling: [0, 0],
  boring: [0.2, 2.0],
};

/**
 * L/D stiffness limits (length/diameter ratio) per tool material —
 * beyond these, regenerative chatter dominates.
 */
const LD_LIMITS: Record<string, number> = {
  steel: 4,
  carbide: 6,
  heavy_metal: 8, // tungsten-copper
  dampened: 10, // anti-vibration boring bar
};

// ── Engine Implementation ──────────────────────────────────────────────────

class TurningRulesGeneratorEngineImpl {
  private ruleCounter = 0;

  /**
   * Generate a full rule set for the given context.
   */
  generate(context: RuleGenerationContext): RuleSet {
    const rules: MachiningRule[] = [];

    if (context.iso_group) {
      rules.push(...this.velocityRules(context));
    }
    if (context.operation) {
      rules.push(...this.feedRules(context));
      rules.push(...this.docRules(context));
    }
    if (context.machine_class) {
      rules.push(...this.spindleConstraints(context));
    }
    if (context.tool_type) {
      rules.push(...this.chatterConstraints(context));
    }

    // Count by kind
    const counts: Record<RuleKind, number> = {
      velocity_envelope: 0,
      feed_envelope: 0,
      doc_envelope: 0,
      spindle_constraint: 0,
      chatter_constraint: 0,
    };
    for (const r of rules) counts[r.kind]++;

    return {
      context,
      rules,
      generated_at: new Date().toISOString(),
      rule_count_by_kind: counts,
    };
  }

  private velocityRules(ctx: RuleGenerationContext): MachiningRule[] {
    if (!ctx.iso_group) return [];
    const vc = VC_REFERENCE[ctx.iso_group];
    if (!vc) return [];

    const roughRule: MachiningRule = {
      id: this.nextId("vc_rough"),
      kind: "velocity_envelope",
      name: `Vc roughing for ISO ${ctx.iso_group}`,
      description: `Roughing cutting velocity for ${ctx.material} (${ctx.iso_group})`,
      conditions: { material: ctx.material, iso_group: ctx.iso_group, operation: "roughing" },
      bounds: { min: vc.rough[0], max: vc.rough[1], unit: "m/min", field: "Vc_m_min" },
      priority: 8,
      source: "Sandvik Coromant 2023",
    };
    const finishRule: MachiningRule = {
      id: this.nextId("vc_finish"),
      kind: "velocity_envelope",
      name: `Vc finishing for ISO ${ctx.iso_group}`,
      description: `Finishing cutting velocity for ${ctx.material} (${ctx.iso_group})`,
      conditions: { material: ctx.material, iso_group: ctx.iso_group, operation: "finishing" },
      bounds: { min: vc.finish[0], max: vc.finish[1], unit: "m/min", field: "Vc_m_min" },
      priority: 8,
      source: "Sandvik Coromant 2023",
    };

    if (ctx.operation === "roughing") return [roughRule];
    if (ctx.operation === "finishing") return [finishRule];
    return [roughRule, finishRule];
  }

  private feedRules(ctx: RuleGenerationContext): MachiningRule[] {
    if (!ctx.operation) return [];
    const fn = FN_REFERENCE[ctx.operation];
    if (!fn) return [];
    return [
      {
        id: this.nextId("fn"),
        kind: "feed_envelope",
        name: `Feed envelope for ${ctx.operation}`,
        description: `Feed per revolution for ${ctx.operation}`,
        conditions: { operation: ctx.operation, material: ctx.material },
        bounds: { min: fn[0], max: fn[1], unit: "mm/rev", field: "fn_mm_rev" },
        priority: 7,
        source: "Machinery's Handbook 31e",
      },
    ];
  }

  private docRules(ctx: RuleGenerationContext): MachiningRule[] {
    if (!ctx.operation) return [];
    const ap = AP_REFERENCE[ctx.operation];
    if (!ap) return [];
    return [
      {
        id: this.nextId("ap"),
        kind: "doc_envelope",
        name: `Depth of cut for ${ctx.operation}`,
        description: `Radial depth per pass for ${ctx.operation}`,
        conditions: { operation: ctx.operation, material: ctx.material },
        bounds: { min: ap[0], max: ap[1], unit: "mm", field: "ap_mm" },
        priority: 6,
        source: "Machinery's Handbook 31e",
      },
    ];
  }

  private spindleConstraints(ctx: RuleGenerationContext): MachiningRule[] {
    if (!ctx.machine_class) return [];
    const rpmCap: Record<string, number> = {
      slant_bed: 5000,
      vertical: 1500,
      swiss: 12000,
      mill_turn: 5000,
    };
    const max = rpmCap[ctx.machine_class];
    if (!max) return [];
    return [
      {
        id: this.nextId("rpm"),
        kind: "spindle_constraint",
        name: `Spindle RPM cap for ${ctx.machine_class}`,
        description: `Maximum spindle speed for ${ctx.machine_class} class`,
        conditions: { machine_class: ctx.machine_class },
        bounds: { max, unit: "RPM", field: "rpm" },
        priority: 10,
        source: "Machine manufacturer spec",
      },
    ];
  }

  private chatterConstraints(ctx: RuleGenerationContext): MachiningRule[] {
    if (!ctx.tool_type) return [];
    const material = this.inferToolBodyMaterial(ctx.tool_type);
    const ld = LD_LIMITS[material];
    if (ld === undefined) return [];
    return [
      {
        id: this.nextId("ld"),
        kind: "chatter_constraint",
        name: `L/D ratio limit for ${material} tool body`,
        description: `Maximum overhang (length ÷ shank diameter) before chatter`,
        conditions: { tool_type: ctx.tool_type, tool_body: material },
        bounds: { max: ld, unit: "ratio", field: "l_over_d" },
        priority: 9,
        source: "Sandvik chatter reference",
      },
    ];
  }

  private inferToolBodyMaterial(toolType: string): string {
    const lower = toolType.toLowerCase();
    if (/dampen|anti.?vib/.test(lower)) return "dampened";
    if (/heavy.?metal|tungsten.?copper/.test(lower)) return "heavy_metal";
    if (/carbide/.test(lower)) return "carbide";
    return "steel";
  }

  /**
   * Combine multiple rule sets, keeping the tightest (most restrictive)
   * envelope for each field.
   */
  mergeRuleSets(sets: RuleSet[]): RuleSet {
    const merged: Record<string, MachiningRule> = {};
    for (const set of sets) {
      for (const rule of set.rules) {
        const key = `${rule.kind}::${rule.bounds.field}`;
        const existing = merged[key];
        if (!existing) {
          merged[key] = { ...rule };
          continue;
        }
        // Tighten bounds
        if (rule.bounds.min !== undefined) {
          existing.bounds.min = Math.max(existing.bounds.min ?? -Infinity, rule.bounds.min);
        }
        if (rule.bounds.max !== undefined) {
          existing.bounds.max = Math.min(existing.bounds.max ?? Infinity, rule.bounds.max);
        }
      }
    }

    const rules = Object.values(merged);
    const counts: Record<RuleKind, number> = {
      velocity_envelope: 0,
      feed_envelope: 0,
      doc_envelope: 0,
      spindle_constraint: 0,
      chatter_constraint: 0,
    };
    for (const r of rules) counts[r.kind]++;

    return {
      context: sets[0]?.context ?? { material: "mixed" },
      rules,
      generated_at: new Date().toISOString(),
      rule_count_by_kind: counts,
    };
  }

  private nextId(prefix: string): string {
    this.ruleCounter++;
    return `rule_${prefix}_${this.ruleCounter}`;
  }

  getStats(): {
    rule_kinds: RuleKind[];
    supported_iso_groups: string[];
    supported_operations: string[];
    rules_generated: number;
  } {
    return {
      rule_kinds: [
        "velocity_envelope",
        "feed_envelope",
        "doc_envelope",
        "spindle_constraint",
        "chatter_constraint",
      ],
      supported_iso_groups: Object.keys(VC_REFERENCE),
      supported_operations: Object.keys(FN_REFERENCE),
      rules_generated: this.ruleCounter,
    };
  }
}

export const turningRulesGeneratorEngine = new TurningRulesGeneratorEngineImpl();
export type { TurningRulesGeneratorEngineImpl };
