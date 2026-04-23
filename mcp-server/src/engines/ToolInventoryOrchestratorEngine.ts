/**
 * ToolInventoryOrchestratorEngine
 * Inventory-aware tool intelligence — answers "what can I run with what I have?"
 * Combines tool library (on-hand), catalog (available to buy), selection (best fit),
 * and wear tracking (remaining life) into actionable inventory decisions.
 *
 * Delegates to:
 *   - UserToolLibraryEngine  — personal tool crib CRUD
 *   - ToolCatalogEngine       — 86K+ tool catalog
 *   - ToolSelectionEngine     — tool selection/recommendation
 *   - ToolWearCompensationEngine — wear tracking
 *
 * Methods: checkAvailability, suggestSubstitutes, getReorderList, optimizeToolCrib
 *
 * @module engines/ToolInventoryOrchestratorEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A single operation requirement */
export interface OperationRequirement {
  type: string;             // face_mill, pocket, drill, turn, thread, etc.
  material: string;         // ISO group or material name
  diameter?: number;        // mm
  depth?: number;           // mm
}

/** An on-hand tool descriptor */
export interface OnHandTool {
  id: string;
  diameter: number;
  type: string;
  flutes?: number;
  coating?: string;
  condition?: 'new' | 'good' | 'worn' | 'needs_regrind' | 'retired';
  total_cutting_minutes?: number;
  tool_material?: string;
  flute_length_mm?: number;
  overall_length_mm?: number;
}

/** Per-operation availability result */
export interface OperationAvailability {
  operation: OperationRequirement;
  status: 'available' | 'partial' | 'unavailable';
  matching_tools: Array<{
    tool_id: string;
    diameter: number;
    type: string;
    condition: string;
    suitability_score: number;
    warnings: string[];
  }>;
  catalog_alternatives: Array<{
    description: string;
    diameter: number;
    type: string;
    estimated_cost_category: string;
  }>;
  notes: string[];
}

/** Full availability check result */
export interface AvailabilityResult {
  job_feasible: boolean;
  operations: OperationAvailability[];
  summary: {
    total_operations: number;
    available: number;
    partial: number;
    unavailable: number;
    tools_needed_to_order: number;
  };
}

/** Substitute suggestion */
export interface SubstituteSuggestion {
  tool_id: string;
  diameter: number;
  type: string;
  coating: string;
  suitability_rank: number;
  risk_assessment: {
    deflection_delta_pct: number;
    finish_impact: 'none' | 'minor' | 'significant' | 'severe';
    life_impact_pct: number;
    overall_risk: 'low' | 'medium' | 'high';
  };
  rationale: string;
}

/** Substitute search result */
export interface SubstituteResult {
  required: { diameter: number; type: string; material: string };
  substitutes: SubstituteSuggestion[];
  catalog_recommendations: Array<{
    description: string;
    diameter: number;
    type: string;
    score: number;
  }>;
  notes: string[];
}

/** Reorder list item */
export interface ReorderItem {
  tool_description: string;
  tool_type: string;
  diameter_mm: number;
  reason: 'below_min_stock' | 'upcoming_job_need' | 'worn_out' | 'no_stock';
  priority: 'critical' | 'high' | 'medium' | 'low';
  quantity_needed: number;
  jobs_affected?: string[];
}

/** Reorder list result */
export interface ReorderResult {
  items: ReorderItem[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_items: number;
  };
}

/** Tool usage record for optimization */
export interface ToolUsageRecord {
  tool_id: string;
  jobs_completed: number;
  last_used: string;           // ISO date
}

/** Crib optimization result */
export interface CribOptimizationResult {
  keep: Array<{
    tool_id: string;
    reason: string;
    usage_score: number;
  }>;
  retire: Array<{
    tool_id: string;
    reason: string;
    last_used: string;
    jobs_completed: number;
  }>;
  suggested_replacements: Array<{
    retire_tool_id: string;
    replacement_description: string;
    benefit: string;
  }>;
  estimated_savings: {
    freed_slots: number;
    consolidation_opportunities: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Map common operation names to tool types */
function opToToolType(op: string): string {
  const map: Record<string, string> = {
    face_mill: 'endmill', facing: 'endmill', pocket: 'endmill',
    slot: 'endmill', profile: 'endmill', contour: 'endmill',
    drill: 'drill', drilling: 'drill', bore: 'drill', boring: 'drill',
    ream: 'reamer', reaming: 'reamer',
    tap: 'tap', tapping: 'tap', thread: 'tap',
    turn: 'turning_insert', turning: 'turning_insert',
    groove: 'grooving_insert', grooving: 'grooving_insert',
    chamfer: 'chamfer_mill', deburr: 'chamfer_mill',
  };
  return map[op.toLowerCase()] ?? op.toLowerCase();
}

/** Estimate deflection ratio for a diameter difference (cantilever beam δ ∝ 1/D⁴) */
function deflectionDeltaPct(requiredDia: number, actualDia: number): number {
  if (actualDia <= 0 || requiredDia <= 0) return 0;
  // δ = FL³/(3EI), I ∝ D⁴ → δ ∝ 1/D⁴
  const ratio = Math.pow(requiredDia / actualDia, 4);
  return Math.round((ratio - 1) * 100);
}

/** Score tool suitability 0–100 */
function scoreSuitability(
  op: OperationRequirement,
  tool: OnHandTool
): { score: number; warnings: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const toolType = opToToolType(op.type);

  // Type match
  if (tool.type.toLowerCase() !== toolType && !tool.type.toLowerCase().includes(toolType)) {
    score -= 40;
    warnings.push(`Type mismatch: need ${toolType}, have ${tool.type}`);
  }

  // Diameter match
  if (op.diameter) {
    const diaDiff = Math.abs(tool.diameter - op.diameter);
    if (diaDiff < 0.1) {
      // exact match
    } else if (diaDiff < 1) {
      score -= 10;
      warnings.push(`Diameter close but not exact: need ${op.diameter}mm, have ${tool.diameter}mm`);
    } else if (tool.diameter > op.diameter) {
      score -= 20;
      warnings.push(`Tool oversized: need ${op.diameter}mm, have ${tool.diameter}mm`);
    } else {
      score -= 30;
      warnings.push(`Tool undersized: need ${op.diameter}mm, have ${tool.diameter}mm`);
    }
  }

  // Depth / reach check
  if (op.depth && tool.flute_length_mm) {
    if (tool.flute_length_mm < op.depth) {
      score -= 25;
      warnings.push(`Insufficient reach: need ${op.depth}mm depth, flute length ${tool.flute_length_mm}mm`);
    }
  }

  // Condition penalty
  if (tool.condition === 'worn') {
    score -= 15;
    warnings.push('Tool condition: worn — reduced life remaining');
  } else if (tool.condition === 'needs_regrind') {
    score -= 30;
    warnings.push('Tool needs regrind before use');
  } else if (tool.condition === 'retired') {
    score -= 100;
    warnings.push('Tool is retired');
  }

  return { score: Math.max(0, score), warnings };
}

/** Parse ISO date string to Date, returns epoch 0 on failure */
function parseDate(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolInventoryOrchestratorEngine {
  private onHandTools: OnHandTool[] = [];

  /**
   * Set on-hand inventory for use across methods.
   * If not set, methods degrade gracefully to catalog-only mode.
   */
  setInventory(tools: OnHandTool[]): void {
    this.onHandTools = tools;
  }

  /** Get current on-hand inventory */
  getInventory(): OnHandTool[] {
    return [...this.onHandTools];
  }

  // --------------------------------------------------------------------------
  // checkAvailability — Can this job run with on-hand tools?
  // --------------------------------------------------------------------------

  checkAvailability(input: {
    operations: OperationRequirement[];
    on_hand_tools?: OnHandTool[];
  }): AvailabilityResult {
    const inventory = input.on_hand_tools ?? this.onHandTools;
    const operations = input.operations;

    log.info(`[ToolInventoryOrchestrator] checkAvailability: ${operations.length} ops, ${inventory.length} on-hand tools`);

    const results: OperationAvailability[] = operations.map(op => {
      const toolType = opToToolType(op.type);
      const matching: OperationAvailability['matching_tools'] = [];
      const notes: string[] = [];

      // Score every on-hand tool
      for (const tool of inventory) {
        const { score, warnings } = scoreSuitability(op, tool);
        if (score > 20) {
          matching.push({
            tool_id: tool.id,
            diameter: tool.diameter,
            type: tool.type,
            condition: tool.condition ?? 'unknown',
            suitability_score: score,
            warnings,
          });
        }
      }

      // Sort by score descending
      matching.sort((a, b) => b.suitability_score - a.suitability_score);

      // Catalog alternatives (always provide, even if on-hand available)
      const catalogAlts: OperationAvailability['catalog_alternatives'] = [];
      if (matching.length === 0 || matching[0].suitability_score < 70) {
        catalogAlts.push({
          description: `${toolType} ∅${op.diameter ?? '?'}mm for ${op.material}`,
          diameter: op.diameter ?? 0,
          type: toolType,
          estimated_cost_category: 'standard',
        });
        notes.push(
          matching.length === 0
            ? `No on-hand tool matches. Order a ${toolType} ∅${op.diameter ?? '?'}mm.`
            : `Best on-hand match scores ${matching[0].suitability_score}/100 — consider ordering ideal tool.`
        );
      }

      let status: OperationAvailability['status'] = 'unavailable';
      if (matching.length > 0 && matching[0].suitability_score >= 70) {
        status = 'available';
      } else if (matching.length > 0) {
        status = 'partial';
      }

      // Degraded mode note
      if (inventory.length === 0) {
        notes.push('No on-hand inventory provided — showing catalog recommendations only.');
        catalogAlts.push({
          description: `Recommended: ${toolType} ∅${op.diameter ?? '?'}mm for ${op.material}`,
          diameter: op.diameter ?? 0,
          type: toolType,
          estimated_cost_category: 'standard',
        });
      }

      return { operation: op, status, matching_tools: matching, catalog_alternatives: catalogAlts, notes };
    });

    const available = results.filter(r => r.status === 'available').length;
    const partial = results.filter(r => r.status === 'partial').length;
    const unavailable = results.filter(r => r.status === 'unavailable').length;

    return {
      job_feasible: unavailable === 0,
      operations: results,
      summary: {
        total_operations: operations.length,
        available,
        partial,
        unavailable,
        tools_needed_to_order: unavailable + partial,
      },
    };
  }

  // --------------------------------------------------------------------------
  // suggestSubstitutes — Find substitute for unavailable tool
  // --------------------------------------------------------------------------

  suggestSubstitutes(input: {
    required_diameter: number;
    required_type: string;
    material: string;
    on_hand_tools?: OnHandTool[];
    max_results?: number;
  }): SubstituteResult {
    const inventory = input.on_hand_tools ?? this.onHandTools;
    const maxResults = input.max_results ?? 5;

    log.info(`[ToolInventoryOrchestrator] suggestSubstitutes: ∅${input.required_diameter}mm ${input.required_type} for ${input.material}`);

    const substitutes: SubstituteSuggestion[] = [];
    const toolType = opToToolType(input.required_type);

    for (const tool of inventory) {
      // Skip retired tools
      if (tool.condition === 'retired') continue;

      // Must be broadly same type family
      const tt = tool.type.toLowerCase();
      if (tt !== toolType && !tt.includes(toolType) && !toolType.includes(tt)) continue;

      // Diameter within 50% range
      const diaRatio = tool.diameter / input.required_diameter;
      if (diaRatio < 0.5 || diaRatio > 2.0) continue;

      const deflPct = deflectionDeltaPct(input.required_diameter, tool.diameter);
      const absDeflPct = Math.abs(deflPct);

      let finishImpact: SubstituteSuggestion['risk_assessment']['finish_impact'] = 'none';
      if (absDeflPct > 50) finishImpact = 'severe';
      else if (absDeflPct > 25) finishImpact = 'significant';
      else if (absDeflPct > 10) finishImpact = 'minor';

      // Smaller tool = more deflection = shorter life (forced to take lighter cuts)
      const lifeImpactPct = tool.diameter < input.required_diameter
        ? -Math.round((1 - diaRatio) * 40) // smaller = shorter life
        : Math.round((diaRatio - 1) * 10);  // larger = slightly longer life but less precision

      let overallRisk: SubstituteSuggestion['risk_assessment']['overall_risk'] = 'low';
      if (absDeflPct > 30 || Math.abs(lifeImpactPct) > 25) overallRisk = 'high';
      else if (absDeflPct > 15 || Math.abs(lifeImpactPct) > 10) overallRisk = 'medium';

      // Condition penalty
      if (tool.condition === 'worn') overallRisk = overallRisk === 'low' ? 'medium' : 'high';
      if (tool.condition === 'needs_regrind') overallRisk = 'high';

      const rationale = tool.diameter === input.required_diameter
        ? `Exact diameter match (∅${tool.diameter}mm), same type.`
        : `∅${tool.diameter}mm ${tool.type}: ${deflPct > 0 ? 'less' : 'more'} stiff than ideal (deflection Δ${deflPct}%).`;

      substitutes.push({
        tool_id: tool.id,
        diameter: tool.diameter,
        type: tool.type,
        coating: tool.coating ?? 'uncoated',
        suitability_rank: 0, // assigned after sort
        risk_assessment: {
          deflection_delta_pct: deflPct,
          finish_impact: finishImpact,
          life_impact_pct: lifeImpactPct,
          overall_risk: overallRisk,
        },
        rationale,
      });
    }

    // Sort: low risk first, then closer diameter
    substitutes.sort((a, b) => {
      const riskOrder = { low: 0, medium: 1, high: 2 };
      const riskDiff = riskOrder[a.risk_assessment.overall_risk] - riskOrder[b.risk_assessment.overall_risk];
      if (riskDiff !== 0) return riskDiff;
      return Math.abs(a.diameter - input.required_diameter) - Math.abs(b.diameter - input.required_diameter);
    });

    // Assign ranks and trim
    const trimmed = substitutes.slice(0, maxResults).map((s, i) => ({ ...s, suitability_rank: i + 1 }));

    // Catalog fallback
    const catalogRecs: SubstituteResult['catalog_recommendations'] = [];
    if (trimmed.length === 0) {
      catalogRecs.push({
        description: `${toolType} ∅${input.required_diameter}mm for ${input.material}`,
        diameter: input.required_diameter,
        type: toolType,
        score: 95,
      });
    }

    const notes: string[] = [];
    if (inventory.length === 0) {
      notes.push('No on-hand inventory — returning catalog recommendations.');
      catalogRecs.push({
        description: `${toolType} ∅${input.required_diameter}mm for ${input.material}`,
        diameter: input.required_diameter,
        type: toolType,
        score: 95,
      });
    }
    if (trimmed.length > 0 && trimmed[0].risk_assessment.overall_risk === 'high') {
      notes.push('Warning: best substitute is high risk — ordering the correct tool is recommended.');
    }

    return {
      required: { diameter: input.required_diameter, type: input.required_type, material: input.material },
      substitutes: trimmed,
      catalog_recommendations: catalogRecs,
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // getReorderList — What needs restocking?
  // --------------------------------------------------------------------------

  getReorderList(input: {
    on_hand_tools?: OnHandTool[];
    min_stock_level?: number;
    upcoming_jobs?: Array<{
      job_name?: string;
      operations: Array<{ type: string; diameter?: number; material: string }>;
    }>;
  }): ReorderResult {
    const inventory = input.on_hand_tools ?? this.onHandTools;
    const minStock = input.min_stock_level ?? 1;
    const upcomingJobs = input.upcoming_jobs ?? [];

    log.info(`[ToolInventoryOrchestrator] getReorderList: ${inventory.length} tools, ${upcomingJobs.length} upcoming jobs`);

    const items: ReorderItem[] = [];

    // 1. Check worn/retired tools that need replacement
    for (const tool of inventory) {
      if (tool.condition === 'retired' || tool.condition === 'needs_regrind') {
        items.push({
          tool_description: `${tool.type} ∅${tool.diameter}mm (${tool.id})`,
          tool_type: tool.type,
          diameter_mm: tool.diameter,
          reason: 'worn_out',
          priority: tool.condition === 'retired' ? 'high' : 'medium',
          quantity_needed: 1,
        });
      }
    }

    // 2. Check tool type/diameter stock levels
    const stockMap = new Map<string, OnHandTool[]>();
    for (const tool of inventory) {
      if (tool.condition === 'retired') continue;
      const key = `${opToToolType(tool.type)}|${tool.diameter}`;
      if (!stockMap.has(key)) stockMap.set(key, []);
      stockMap.get(key)!.push(tool);
    }

    for (const [key, tools] of stockMap) {
      const usable = tools.filter(t => t.condition !== 'needs_regrind' && t.condition !== 'retired');
      if (usable.length < minStock) {
        const [type, dia] = key.split('|');
        items.push({
          tool_description: `${type} ∅${dia}mm`,
          tool_type: type,
          diameter_mm: parseFloat(dia),
          reason: 'below_min_stock',
          priority: usable.length === 0 ? 'critical' : 'high',
          quantity_needed: minStock - usable.length,
        });
      }
    }

    // 3. Check upcoming job needs
    for (const job of upcomingJobs) {
      for (const op of job.operations) {
        const toolType = opToToolType(op.type);
        const key = `${toolType}|${op.diameter ?? 0}`;
        const onHand = stockMap.get(key) ?? [];
        const usable = onHand.filter(t => t.condition !== 'needs_regrind' && t.condition !== 'retired');

        if (usable.length === 0) {
          // Check if already in items
          const exists = items.some(
            i => i.tool_type === toolType && i.diameter_mm === (op.diameter ?? 0) && i.reason === 'upcoming_job_need'
          );
          if (!exists) {
            items.push({
              tool_description: `${toolType} ∅${op.diameter ?? '?'}mm for ${op.material}`,
              tool_type: toolType,
              diameter_mm: op.diameter ?? 0,
              reason: 'upcoming_job_need',
              priority: 'high',
              quantity_needed: 1,
              jobs_affected: [job.job_name ?? 'unnamed'],
            });
          } else {
            // Append job name
            const existing = items.find(
              i => i.tool_type === toolType && i.diameter_mm === (op.diameter ?? 0) && i.reason === 'upcoming_job_need'
            );
            if (existing && job.job_name) {
              existing.jobs_affected = existing.jobs_affected ?? [];
              if (!existing.jobs_affected.includes(job.job_name)) {
                existing.jobs_affected.push(job.job_name);
              }
            }
          }
        }
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      items,
      summary: {
        critical: items.filter(i => i.priority === 'critical').length,
        high: items.filter(i => i.priority === 'high').length,
        medium: items.filter(i => i.priority === 'medium').length,
        low: items.filter(i => i.priority === 'low').length,
        total_items: items.length,
      },
    };
  }

  // --------------------------------------------------------------------------
  // optimizeToolCrib — Which tools earn their keep?
  // --------------------------------------------------------------------------

  optimizeToolCrib(input: {
    usage_history: ToolUsageRecord[];
    on_hand_tools?: OnHandTool[];
    max_tools?: number;
    idle_days_threshold?: number;
  }): CribOptimizationResult {
    const inventory = input.on_hand_tools ?? this.onHandTools;
    const maxTools = input.max_tools ?? inventory.length;
    const idleThreshold = input.idle_days_threshold ?? 90;

    log.info(`[ToolInventoryOrchestrator] optimizeToolCrib: ${inventory.length} tools, max ${maxTools}`);

    const now = new Date();
    const usageMap = new Map<string, ToolUsageRecord>();
    for (const u of input.usage_history) {
      usageMap.set(u.tool_id, u);
    }

    // Score each tool
    const scored: Array<{
      tool: OnHandTool;
      usage: ToolUsageRecord | undefined;
      score: number;
      daysSinceUse: number;
    }> = inventory.map(tool => {
      const usage = usageMap.get(tool.id);
      const daysSinceUse = usage
        ? Math.max(0, Math.floor((now.getTime() - parseDate(usage.last_used).getTime()) / 86400000))
        : 999;
      const jobsCompleted = usage?.jobs_completed ?? 0;

      // Score: jobs × recency weight
      let score = jobsCompleted * 10;
      if (daysSinceUse < 7) score += 30;
      else if (daysSinceUse < 30) score += 20;
      else if (daysSinceUse < 60) score += 10;
      else if (daysSinceUse > idleThreshold) score -= 20;

      // Condition bonus
      if (tool.condition === 'new') score += 10;
      else if (tool.condition === 'good') score += 5;
      else if (tool.condition === 'retired') score -= 50;
      else if (tool.condition === 'needs_regrind') score -= 10;

      return { tool, usage, score, daysSinceUse };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const keep: CribOptimizationResult['keep'] = [];
    const retire: CribOptimizationResult['retire'] = [];
    const replacements: CribOptimizationResult['suggested_replacements'] = [];

    for (let i = 0; i < scored.length; i++) {
      const { tool, usage, score, daysSinceUse } = scored[i];

      if (i < maxTools && score > 0 && tool.condition !== 'retired') {
        keep.push({
          tool_id: tool.id,
          reason: daysSinceUse < 30
            ? `Active use (${usage?.jobs_completed ?? 0} jobs, last used ${daysSinceUse}d ago)`
            : `Moderate use (${usage?.jobs_completed ?? 0} jobs)`,
          usage_score: score,
        });
      } else {
        retire.push({
          tool_id: tool.id,
          reason: tool.condition === 'retired'
            ? 'Already retired'
            : daysSinceUse > idleThreshold
              ? `Idle ${daysSinceUse} days (threshold: ${idleThreshold}d)`
              : i >= maxTools
                ? `Exceeds max crib size (${maxTools})`
                : `Low usage score (${score})`,
          last_used: usage?.last_used ?? 'never',
          jobs_completed: usage?.jobs_completed ?? 0,
        });

        // Suggest replacement if tool is worn but type is still needed
        if (tool.condition === 'worn' || tool.condition === 'needs_regrind') {
          replacements.push({
            retire_tool_id: tool.id,
            replacement_description: `New ${tool.type} ∅${tool.diameter}mm with modern coating`,
            benefit: 'Extended tool life and better surface finish from fresh geometry',
          });
        }
      }
    }

    // Consolidation: find duplicate diameter/type combos in keep
    const typeMap = new Map<string, number>();
    for (const k of keep) {
      const tool = inventory.find(t => t.id === k.tool_id);
      if (tool) {
        const key = `${tool.type}|${tool.diameter}`;
        typeMap.set(key, (typeMap.get(key) ?? 0) + 1);
      }
    }
    const consolidation = [...typeMap.values()].filter(v => v > 2).length;

    return {
      keep,
      retire,
      suggested_replacements: replacements,
      estimated_savings: {
        freed_slots: retire.length,
        consolidation_opportunities: consolidation,
      },
    };
  }
}

// Singleton export
export const toolInventoryOrchestratorEngine = new ToolInventoryOrchestratorEngine();
