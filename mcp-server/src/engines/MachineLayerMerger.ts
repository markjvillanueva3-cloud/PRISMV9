/**
 * MCAT-MS0 P1-U01: Machine Layer Merger
 *
 * Merges machine data from multiple layers with field-level provenance tracking.
 * Priority order (highest wins): USER > LEVEL5 > ENHANCED > BASIC
 *
 * Key guarantees:
 * - Zero data loss: all source values preserved in provenance
 * - Array fields: append-not-overwrite
 * - Zero vs undefined: zero is a valid value, undefined skips
 * - Conflict resolution: higher-priority layer wins, alternatives tracked
 */

import type { Machine, MachineController, MachineSpindle, MachineEnvelope, MachineAxes, MachineToolChanger, MachineCoolant, MachineKinematics } from '../types.js';
import type { MachineLayer } from '../constants.js';
import type { MachineAxisTopology } from '../contracts/userMachineProfile.js';
import type { CanonicalMachinePackage, MachineFieldProvenance, MachineAmbiguity, MachineEnrichmentRecord, MachineConfidenceBreakdown, CanonicalMachineType } from '../types/MachinePackage.js';

/**
 * Enrichment-layer vocabulary used by the merger (priority: USER > LEVEL5 > ENHANCED > BASIC).
 * Distinct from the canonical MachineLayer ("core"/"extended"/...) — mapped to the canonical
 * vocabulary at the provenance/package boundary via mergeLayerToCanonical().
 */
type MergeLayer = 'BASIC' | 'ENHANCED' | 'LEVEL5' | 'USER';

/** Map a merger enrichment layer to the canonical MachineLayer vocabulary. */
function mergeLayerToCanonical(layer: MergeLayer): MachineLayer | 'LEVEL5' {
  switch (layer) {
    case 'BASIC': return 'core';
    case 'ENHANCED': return 'extended';
    case 'LEVEL5': return 'LEVEL5';
    case 'USER': return 'user';
  }
}

const LAYER_PRIORITY: Record<MergeLayer, number> = {
  'BASIC': 1,
  'ENHANCED': 2,
  'LEVEL5': 3,
  'USER': 4,
};

export interface MachineLayerInput {
  machine: Machine;
  layer: MergeLayer;
  source_id: string;
  enriched_at?: string;
  confidence?: number;
}

export interface MergeResult {
  package: CanonicalMachinePackage;
  fields_merged: number;
  conflicts_resolved: number;
  ambiguities_created: number;
  warnings: string[];
}

interface FieldMergeResult<T> {
  value: T;
  provenance: MachineFieldProvenance;
  conflict?: { alternative: T; from_layer: string };
}

class MachineLayerMergerEngine {
  private mergeField<T>(
    path: string,
    values: Array<{ value: T | undefined; layer: MergeLayer; source_id: string; enriched_at: string; confidence: number }>,
  ): FieldMergeResult<T> | null {
    const definedValues = values.filter(v => v.value !== undefined && v.value !== null);
    if (definedValues.length === 0) return null;

    definedValues.sort((a, b) => LAYER_PRIORITY[b.layer] - LAYER_PRIORITY[a.layer]);
    const winner = definedValues[0];
    const result: FieldMergeResult<T> = {
      value: winner.value!,
      provenance: {
        source: winner.source_id as any,
        layer: mergeLayerToCanonical(winner.layer),
        enriched_at: winner.enriched_at,
        confidence: winner.confidence,
      },
    };

    if (definedValues.length > 1) {
      const secondPlace = definedValues[1];
      if (JSON.stringify(winner.value) !== JSON.stringify(secondPlace.value)) {
        result.conflict = {
          alternative: secondPlace.value!,
          from_layer: secondPlace.layer,
        };
      }
    }

    return result;
  }

  private mergeArrayField<T>(
    path: string,
    values: Array<{ value: T[] | undefined; layer: MergeLayer; source_id: string; enriched_at: string; confidence: number }>,
  ): FieldMergeResult<T[]> | null {
    const allItems: T[] = [];
    const seenJson = new Set<string>();
    let bestLayer: MergeLayer = 'BASIC';
    let bestEnriched = '';
    let bestSource = '';
    let maxConfidence = 0;

    const sortedValues = [...values].sort((a, b) => LAYER_PRIORITY[b.layer] - LAYER_PRIORITY[a.layer]);

    for (const v of sortedValues) {
      if (!v.value || !Array.isArray(v.value)) continue;
      if (LAYER_PRIORITY[v.layer] > LAYER_PRIORITY[bestLayer]) {
        bestLayer = v.layer;
        bestEnriched = v.enriched_at;
        bestSource = v.source_id;
        maxConfidence = Math.max(maxConfidence, v.confidence);
      }
      for (const item of v.value) {
        const json = JSON.stringify(item);
        if (!seenJson.has(json)) {
          seenJson.add(json);
          allItems.push(item);
        }
      }
    }

    if (allItems.length === 0) return null;

    return {
      value: allItems,
      provenance: {
        source: bestSource as any,
        layer: mergeLayerToCanonical(bestLayer),
        enriched_at: bestEnriched,
        confidence: maxConfidence,
      },
    };
  }

  private mergeObject<T extends object>(
    basePath: string,
    objects: Array<{ value: T | undefined; layer: MergeLayer; source_id: string; enriched_at: string; confidence: number }>,
  ): { merged: T; provenance: Record<string, MachineFieldProvenance>; conflicts: number } {
    const result: Record<string, unknown> = {};
    const provenance: Record<string, MachineFieldProvenance> = {};
    let conflicts = 0;

    const allKeys = new Set<string>();
    for (const obj of objects) {
      if (obj.value && typeof obj.value === 'object') {
        for (const key of Object.keys(obj.value)) {
          allKeys.add(key);
        }
      }
    }

    for (const key of allKeys) {
      const fieldPath = `${basePath}.${key}`;
      const fieldValues = objects.map(obj => ({
        value: (obj.value as Record<string, unknown> | undefined)?.[key],
        layer: obj.layer,
        source_id: obj.source_id,
        enriched_at: obj.enriched_at,
        confidence: obj.confidence,
      }));

      const merged = this.mergeField(fieldPath, fieldValues);
      if (merged) {
        result[key] = merged.value;
        provenance[fieldPath] = merged.provenance;
        if (merged.conflict) conflicts++;
      }
    }

    return { merged: result as unknown as T, provenance, conflicts };
  }

  merge(inputs: MachineLayerInput[]): MergeResult {
    if (inputs.length === 0) {
      throw new Error('MachineLayerMerger requires at least one input');
    }

    const now = new Date().toISOString();
    const warnings: string[] = [];
    let fieldsChanged = 0;
    let conflictsResolved = 0;
    const ambiguities: MachineAmbiguity[] = [];
    const provenance: Record<string, MachineFieldProvenance> = {};

    const sorted = [...inputs].sort((a, b) => LAYER_PRIORITY[b.layer] - LAYER_PRIORITY[a.layer]);
    const primary = sorted[0];
    const primaryMachine = primary.machine;

    const normalizedInputs = inputs.map(inp => ({
      value: inp.machine,
      layer: inp.layer,
      source_id: inp.source_id,
      enriched_at: inp.enriched_at ?? now,
      confidence: inp.confidence ?? (LAYER_PRIORITY[inp.layer] / 4),
    }));

    const manufacturer = this.mergeField('manufacturer', normalizedInputs.map(i => ({ ...i, value: i.value.manufacturer })));
    const model = this.mergeField('model', normalizedInputs.map(i => ({ ...i, value: i.value.model })));
    const series = this.mergeField('series', normalizedInputs.map(i => ({ ...i, value: i.value.series })));
    const machineType = this.mergeField('type', normalizedInputs.map(i => ({ ...i, value: i.value.type })));

    if (manufacturer) { provenance['manufacturer'] = manufacturer.provenance; fieldsChanged++; if (manufacturer.conflict) conflictsResolved++; }
    if (model) { provenance['model'] = model.provenance; fieldsChanged++; if (model.conflict) conflictsResolved++; }
    if (series) { provenance['series'] = series.provenance; fieldsChanged++; if (series.conflict) conflictsResolved++; }
    if (machineType) { provenance['type'] = machineType.provenance; fieldsChanged++; if (machineType.conflict) conflictsResolved++; }

    const controllerResult = this.mergeObject('controller', normalizedInputs.map(i => ({ ...i, value: i.value.controller })));
    Object.assign(provenance, controllerResult.provenance);
    fieldsChanged += Object.keys(controllerResult.provenance).length;
    conflictsResolved += controllerResult.conflicts;

    const spindleResult = this.mergeObject('spindle', normalizedInputs.map(i => ({ ...i, value: i.value.spindle })));
    Object.assign(provenance, spindleResult.provenance);
    fieldsChanged += Object.keys(spindleResult.provenance).length;
    conflictsResolved += spindleResult.conflicts;

    const envelopeResult = this.mergeObject('envelope', normalizedInputs.map(i => ({ ...i, value: i.value.envelope })));
    Object.assign(provenance, envelopeResult.provenance);
    fieldsChanged += Object.keys(envelopeResult.provenance).length;
    conflictsResolved += envelopeResult.conflicts;

    const axesResult = this.mergeObject('axes', normalizedInputs.map(i => ({ ...i, value: i.value.axes })));
    Object.assign(provenance, axesResult.provenance);
    fieldsChanged += Object.keys(axesResult.provenance).length;
    conflictsResolved += axesResult.conflicts;

    const toolChangerResult = this.mergeObject('tool_changer', normalizedInputs.map(i => ({ ...i, value: i.value.tool_changer })));
    Object.assign(provenance, toolChangerResult.provenance);
    fieldsChanged += Object.keys(toolChangerResult.provenance).length;
    conflictsResolved += toolChangerResult.conflicts;

    const coolantResult = this.mergeObject('coolant', normalizedInputs.map(i => ({ ...i, value: i.value.coolant })));
    Object.assign(provenance, coolantResult.provenance);
    fieldsChanged += Object.keys(coolantResult.provenance).length;
    conflictsResolved += coolantResult.conflicts;

    const kinematicsResult = this.mergeObject('kinematics', normalizedInputs.map(i => ({ ...i, value: i.value.kinematics })));
    Object.assign(provenance, kinematicsResult.provenance);
    fieldsChanged += Object.keys(kinematicsResult.provenance).length;
    conflictsResolved += kinematicsResult.conflicts;

    const options = this.mergeArrayField('options', normalizedInputs.map(i => ({ ...i, value: i.value.options })));
    if (options) { provenance['options'] = options.provenance; fieldsChanged++; }

    const canonicalId = `${(manufacturer?.value ?? '').toLowerCase().replace(/\s+/g, '-')}-${(model?.value ?? '').toLowerCase().replace(/\s+/g, '-')}`;
    const sourceIds = inputs.map(i => i.source_id);

    const spindle: MachineSpindle = {
      max_rpm: spindleResult.merged.max_rpm as number ?? 0,
      power: spindleResult.merged.power as number ?? 0,
      ...(spindleResult.merged as Partial<MachineSpindle>),
    };

    if (spindle.max_rpm === 0) {
      ambiguities.push({
        id: `${canonicalId}-spindle-rpm-zero`,
        field_path: 'spindle.max_rpm',
        current_value: 0,
        severity: 'blocker',
        description: 'Spindle max_rpm is 0 or missing — calculator cannot compute speeds',
        detected_at: now,
        detected_by: 'MachineLayerMerger',
        resolved: false,
      });
    }

    if (spindle.power === 0) {
      ambiguities.push({
        id: `${canonicalId}-spindle-power-zero`,
        field_path: 'spindle.power',
        current_value: 0,
        severity: 'warning',
        description: 'Spindle power is 0 or missing — power budget checks will fail',
        detected_at: now,
        detected_by: 'MachineLayerMerger',
        resolved: false,
      });
    }

    const confidence = this.computeConfidence(provenance);

    const enrichmentHistory: MachineEnrichmentRecord[] = inputs.map(inp => ({
      action: inp.layer === 'USER' ? 'shop_override' : 'layer_merge',
      source: inp.source_id,
      timestamp: inp.enriched_at ?? now,
      fields_changed: 0,
      description: `Merged from ${inp.layer} layer`,
    }));

    const result: CanonicalMachinePackage = {
      canonical_id: canonicalId,
      source_record_ids: sourceIds,
      version: 1,
      manufacturer: manufacturer?.value ?? '',
      manufacturer_id: (manufacturer?.value ?? '').toLowerCase().replace(/\s+/g, '-'),
      model: model?.value ?? '',
      series: series?.value,
      raw_type: machineType?.value ?? 'unknown',
      canonical_type: this.normalizeType(machineType?.value ?? 'unknown'),
      topology: this.inferTopology(axesResult.merged),
      controller: controllerResult.merged as MachineController,
      spindle,
      envelope: envelopeResult.merged as MachineEnvelope,
      axes: Object.keys(axesResult.merged).length > 0 ? axesResult.merged as MachineAxes : undefined,
      tool_changer: Object.keys(toolChangerResult.merged).length > 0 ? toolChangerResult.merged as MachineToolChanger : undefined,
      coolant: Object.keys(coolantResult.merged).length > 0 ? coolantResult.merged as MachineCoolant : undefined,
      kinematics: Object.keys(kinematicsResult.merged).length > 0 ? kinematicsResult.merged as MachineKinematics : undefined,
      controller_packages: [],
      spindle_packages: [],
      coolant_strategies: [],
      allowed_options: [],
      confidence,
      provenance,
      ambiguities,
      enrichment_history: enrichmentHistory,
      primary_layer: mergeLayerToCanonical(primary.layer),
      generated_at: now,
    };

    return {
      package: result,
      fields_merged: fieldsChanged,
      conflicts_resolved: conflictsResolved,
      ambiguities_created: ambiguities.length,
      warnings,
    };
  }

  private computeConfidence(provenance: Record<string, MachineFieldProvenance>): MachineConfidenceBreakdown {
    const groups: Record<string, number[]> = {
      controller: [],
      spindle: [],
      coolant: [],
      envelope: [],
      axes: [],
      tool_changer: [],
    };

    for (const [path, prov] of Object.entries(provenance)) {
      const group = path.split('.')[0];
      if (group in groups) {
        groups[group].push(prov.confidence);
      }
    }

    const avg = (arr: number[]): number => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const breakdown: MachineConfidenceBreakdown = {
      controller: avg(groups.controller),
      spindle: avg(groups.spindle),
      coolant: avg(groups.coolant),
      envelope: avg(groups.envelope),
      axes: avg(groups.axes),
      tool_changer: avg(groups.tool_changer),
      overall: 0,
    };

    const weights = { controller: 0.2, spindle: 0.3, coolant: 0.1, envelope: 0.2, axes: 0.1, tool_changer: 0.1 };
    breakdown.overall = Object.entries(weights).reduce((sum, [k, w]) => sum + breakdown[k as keyof typeof breakdown] * w, 0);

    return breakdown;
  }

  private normalizeType(raw: string): CanonicalMachineType {
    const lower = raw.toLowerCase();
    if (lower.includes('vmc') || lower.includes('vertical machining')) return 'VMC';
    if (lower.includes('hmc') || lower.includes('horizontal machining')) return 'HMC';
    if (lower.includes('5-axis') || lower.includes('5 axis') || lower.includes('simultaneous')) return '5AXIS';
    if (lower.includes('lathe') || lower.includes('turning')) return 'LATHE';
    if (lower.includes('mill-turn') || lower.includes('millturn') || lower.includes('multitask')) return 'MILL_TURN';
    if (lower.includes('swiss')) return 'SWISS';
    if (lower.includes('vtl') || lower.includes('vertical turret')) return 'VTL';
    if (lower.includes('grind')) return 'GRINDER';
    if (lower.includes('wire edm') || lower.includes('wire-edm')) return 'EDM_WIRE';
    if (lower.includes('sinker') || lower.includes('die sink')) return 'EDM_SINKER';
    if (lower.includes('laser')) return 'LASER';
    if (lower.includes('waterjet') || lower.includes('water jet')) return 'WATERJET';
    if (lower.includes('router')) return 'ROUTER';
    if (lower.includes('boring')) return 'BORING_MILL';
    if (lower.includes('drill') && lower.includes('tap')) return 'DRILL_TAP';
    return 'OTHER';
  }

  private inferTopology(axes: MachineAxes | undefined): MachineAxisTopology {
    const linear = axes?.linear_axes ?? 3;
    const rotary = axes?.rotary_axes ?? 0;
    const total = linear + rotary;
    if (total >= 5) return '5_axis_vertical';
    if (total === 4) return '4_axis_vertical';
    if (linear === 3 && rotary === 0) return '3_axis_vertical';
    if (linear === 2 && rotary <= 1) return '2_axis_lathe';
    return 'other';
  }
}

export const machineLayerMerger = new MachineLayerMergerEngine();
