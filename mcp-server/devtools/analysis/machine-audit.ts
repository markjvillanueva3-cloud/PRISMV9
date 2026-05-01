/**
 * MCAT-MS0 U-MCAT01: Machine Data Quality Audit
 *
 * Audits ALL_MACHINES_ENRICHED.json (920 machines) for field completeness.
 * Generates machine-audit-results.json with per-manufacturer and per-field metrics.
 *
 * Run: npx tsx devtools/analysis/machine-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuditResult {
  generated_at: string;
  corpus_path: string;
  total_machines: number;
  completeness: {
    controller: { complete: number; pct: number; missing_manufacturer: number; missing_model: number };
    spindle: { complete: number; pct: number; zero_rpm: number; null_power: number };
    coolant: { complete: number; pct: number; no_tsc: number; no_pressure: number };
    all_three: { complete: number; pct: number };
  };
  per_manufacturer: Record<string, {
    total: number;
    controller_pct: number;
    spindle_pct: number;
    coolant_pct: number;
    overall_pct: number;
  }>;
  type_distribution: Record<string, number>;
  data_bugs: {
    object_manufacturer: { count: number; ids: string[] };
    duplicate_ids: { count: number; ids: string[] };
    zero_envelope: { count: number; ids: string[] };
    missing_id: number;
  };
  unique_types: string[];
  recommendations: string[];
}

function audit(): AuditResult {
  const corpusPath = path.resolve(__dirname, '../../../data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json');
  const data: any[] = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

  const result: AuditResult = {
    generated_at: new Date().toISOString(),
    corpus_path: corpusPath,
    total_machines: data.length,
    completeness: {
      controller: { complete: 0, pct: 0, missing_manufacturer: 0, missing_model: 0 },
      spindle: { complete: 0, pct: 0, zero_rpm: 0, null_power: 0 },
      coolant: { complete: 0, pct: 0, no_tsc: 0, no_pressure: 0 },
      all_three: { complete: 0, pct: 0 },
    },
    per_manufacturer: {},
    type_distribution: {},
    data_bugs: {
      object_manufacturer: { count: 0, ids: [] },
      duplicate_ids: { count: 0, ids: [] },
      zero_envelope: { count: 0, ids: [] },
      missing_id: 0,
    },
    unique_types: [],
    recommendations: [],
  };

  const seenIds = new Set<string>();

  for (const m of data) {
    // ID check
    if (!m.id) { result.data_bugs.missing_id++; continue; }
    if (seenIds.has(m.id)) { result.data_bugs.duplicate_ids.count++; result.data_bugs.duplicate_ids.ids.push(m.id); }
    seenIds.add(m.id);

    // Manufacturer bug: object instead of string
    const mfr = typeof m.manufacturer === 'string' ? m.manufacturer : '[object]';
    if (typeof m.manufacturer !== 'string') {
      result.data_bugs.object_manufacturer.count++;
      result.data_bugs.object_manufacturer.ids.push(m.id);
    }

    // Type distribution
    const machType = m.type || 'unknown';
    result.type_distribution[machType] = (result.type_distribution[machType] || 0) + 1;

    // Per-manufacturer init
    if (!result.per_manufacturer[mfr]) {
      result.per_manufacturer[mfr] = { total: 0, controller_pct: 0, spindle_pct: 0, coolant_pct: 0, overall_pct: 0 };
    }
    result.per_manufacturer[mfr].total++;

    // Controller completeness
    const hasCtrlMfr = m.controller && typeof m.controller.manufacturer === 'string' && m.controller.manufacturer !== '' && m.controller.manufacturer !== 'unknown';
    const hasCtrlModel = m.controller && typeof m.controller.model === 'string' && m.controller.model !== '' && m.controller.model !== 'unknown';
    if (!hasCtrlMfr) result.completeness.controller.missing_manufacturer++;
    if (!hasCtrlModel) result.completeness.controller.missing_model++;
    const ctrlComplete = hasCtrlMfr && hasCtrlModel;
    if (ctrlComplete) { result.completeness.controller.complete++; result.per_manufacturer[mfr].controller_pct++; }

    // Spindle completeness
    const hasRpm = m.spindle && m.spindle.max_rpm > 0;
    const hasPower = m.spindle && ((m.spindle.power_kw > 0) || (m.spindle.power_continuous > 0));
    if (!hasRpm) result.completeness.spindle.zero_rpm++;
    if (!hasPower) result.completeness.spindle.null_power++;
    const spindleComplete = hasRpm && hasPower;
    if (spindleComplete) { result.completeness.spindle.complete++; result.per_manufacturer[mfr].spindle_pct++; }

    // Coolant completeness
    const hasTsc = m.spindle && m.spindle.coolant_through === true;
    const hasPressure = m.spindle && m.spindle.coolant_pressure > 0;
    if (!hasTsc) result.completeness.coolant.no_tsc++;
    if (!hasPressure) result.completeness.coolant.no_pressure++;
    const coolantComplete = hasTsc || hasPressure;
    if (coolantComplete) { result.completeness.coolant.complete++; result.per_manufacturer[mfr].coolant_pct++; }

    // All three
    if (ctrlComplete && spindleComplete && coolantComplete) result.completeness.all_three.complete++;

    // Envelope check
    const hasEnvelope = (m.envelope && (m.envelope.x_travel > 0 || m.envelope.y_travel > 0 || m.envelope.z_travel > 0)) ||
                        (m.work_envelope && (m.work_envelope.x_mm > 0 || m.work_envelope.y_mm > 0 || m.work_envelope.z_mm > 0)) ||
                        (m.travels && (m.travels.x > 0 || m.travels.y > 0 || m.travels.z > 0));
    if (!hasEnvelope) { result.data_bugs.zero_envelope.count++; result.data_bugs.zero_envelope.ids.push(m.id); }
  }

  // Compute percentages
  const n = data.length;
  result.completeness.controller.pct = +(100 * result.completeness.controller.complete / n).toFixed(1);
  result.completeness.spindle.pct = +(100 * result.completeness.spindle.complete / n).toFixed(1);
  result.completeness.coolant.pct = +(100 * result.completeness.coolant.complete / n).toFixed(1);
  result.completeness.all_three.pct = +(100 * result.completeness.all_three.complete / n).toFixed(1);

  // Per-manufacturer percentages
  for (const [mfr, stats] of Object.entries(result.per_manufacturer)) {
    const t = stats.total;
    stats.controller_pct = +(100 * stats.controller_pct / t).toFixed(1);
    stats.spindle_pct = +(100 * stats.spindle_pct / t).toFixed(1);
    stats.coolant_pct = +(100 * stats.coolant_pct / t).toFixed(1);
    stats.overall_pct = +((stats.controller_pct + stats.spindle_pct + stats.coolant_pct) / 3).toFixed(1);
  }

  // Unique types
  result.unique_types = Object.keys(result.type_distribution).sort();

  // Recommendations
  if (result.completeness.controller.pct < 50) {
    result.recommendations.push(`CRITICAL: Controller completeness at ${result.completeness.controller.pct}% — need backfill for top manufacturers`);
  }
  if (result.completeness.spindle.pct < 50) {
    result.recommendations.push(`CRITICAL: Spindle completeness at ${result.completeness.spindle.pct}% — ${result.completeness.spindle.zero_rpm} machines have zero RPM`);
  }
  if (result.completeness.coolant.pct < 10) {
    result.recommendations.push(`CRITICAL: Coolant completeness at ${result.completeness.coolant.pct}% — almost no machines have TSC or pressure data`);
  }
  if (result.data_bugs.object_manufacturer.count > 0) {
    result.recommendations.push(`BUG: ${result.data_bugs.object_manufacturer.count} machines have object instead of string manufacturer (Cincinnati brand)`);
  }
  if (result.unique_types.length > 15) {
    result.recommendations.push(`TAXONOMY: ${result.unique_types.length} unique type strings — need normalization to ≤15 canonical types`);
  }

  return result;
}

// Run
const result = audit();
const outPath = path.resolve(__dirname, 'machine-audit-results.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Audit complete: ${result.total_machines} machines analyzed`);
console.log(`Output: ${outPath}`);
console.log(`\nCompleteness: Controller ${result.completeness.controller.pct}% | Spindle ${result.completeness.spindle.pct}% | Coolant ${result.completeness.coolant.pct}% | All Three ${result.completeness.all_three.pct}%`);
console.log(`\nBugs: ${result.data_bugs.object_manufacturer.count} object-manufacturer, ${result.data_bugs.duplicate_ids.count} duplicate IDs, ${result.data_bugs.zero_envelope.count} zero-envelope`);
console.log(`\nTypes: ${result.unique_types.length} unique type strings`);
console.log(`\nRecommendations:`);
for (const r of result.recommendations) console.log(`  - ${r}`);
