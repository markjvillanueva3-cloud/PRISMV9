/**
 * DataQualityEngine — U-LEARN-02
 * ================================
 *
 * Contract-based validator for every feature row before it lands in the
 * FeatureStoreEngine. Reads contracts from FeatureRegistryEngine and
 * emits a red/yellow/green verdict plus structured findings.
 *
 * Validates four categories per feature:
 *   1. Schema      — does the key exist with the right type?
 *   2. Nullability — is a null where nulls aren't allowed?
 *   3. Range       — for numerics, is value within [min, max]?
 *   4. Drift       — (optional, batch mode) PSI / KS between ref and current
 *
 * Returns `{ verdict: "red"|"yellow"|"green", findings: [...], blocked: bool }`.
 * Callers MUST check `blocked` before writing to the feature store — this
 * is the actual enforcement hook for exit criterion #4 ("DQ contracts block
 * bad data on red").
 *
 * @module engines/DataQualityEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import {
  featureRegistryEngine,
  FeatureRegistryEngine,
} from "./FeatureRegistryEngine.js";
import type {
  FeatureContract,
  FeatureGroupContract,
} from "../schemas/featureRegistrySchema.js";
import type { OutcomeDomainT } from "../schemas/outcomeEventSchema.js";

export type DQVerdict = "green" | "yellow" | "red";
export type DQSeverity = "info" | "warn" | "error";

export interface DQFinding {
  feature: string;
  severity: DQSeverity;
  rule: "schema" | "nullability" | "range" | "categories" | "regex" | "drift" | "required";
  message: string;
  actual?: unknown;
  expected?: unknown;
}

export interface ValidateRowInput {
  domain: OutcomeDomainT;
  feature_group: string;
  feature_values: Record<string, unknown>;
}

export interface ValidateRowResult {
  verdict: DQVerdict;
  blocked: boolean;
  findings: DQFinding[];
  contract_version?: string;
  checked_at: string;
}

export interface ValidateBatchInput {
  domain: OutcomeDomainT;
  feature_group: string;
  rows: Array<{ entity_id?: string; feature_values: Record<string, unknown> }>;
  reference_distribution?: Record<string, number[]>;
  current_distribution?: Record<string, number[]>;
}

export interface ValidateBatchResult {
  verdict: DQVerdict;
  blocked: boolean;
  total_rows: number;
  red_rows: number;
  yellow_rows: number;
  green_rows: number;
  drift: Record<string, { psi: number; ks: number; verdict: DQVerdict }>;
  findings_sample: Array<{ entity_id?: string; findings: DQFinding[] }>;
  checked_at: string;
}

/**
 * DataQualityEngine — stateless gate; instance only for test isolation.
 */
export class DataQualityEngine {
  private readonly registry: FeatureRegistryEngine;

  constructor(registry: FeatureRegistryEngine = featureRegistryEngine) {
    this.registry = registry;
  }

  /**
   * Validate a single feature row against the registered contract.
   * Returns blocked=true when verdict is red — callers must refuse the write.
   */
  validateRow(input: ValidateRowInput): ValidateRowResult {
    const checked_at = new Date().toISOString();
    const got = this.registry.get(input.domain, input.feature_group);
    if (!got.ok || !got.contract) {
      return {
        verdict: "red",
        blocked: true,
        findings: [{
          feature: "(contract)",
          severity: "error",
          rule: "schema",
          message: `no contract registered for ${input.domain}/${input.feature_group}`,
        }],
        checked_at,
      };
    }
    const contract = got.contract;
    const findings = this.validateAgainstContract(input.feature_values, contract);
    const verdict = this.summariseVerdict(findings);
    return {
      verdict,
      blocked: verdict === "red",
      findings,
      contract_version: contract.feature_group_version,
      checked_at,
    };
  }

  /**
   * Validate a batch of rows + optional drift check between reference and
   * current distributions. Drift runs only when both distributions are
   * supplied for a given key.
   */
  validateBatch(input: ValidateBatchInput): ValidateBatchResult {
    const checked_at = new Date().toISOString();
    const got = this.registry.get(input.domain, input.feature_group);
    if (!got.ok || !got.contract) {
      return {
        verdict: "red",
        blocked: true,
        total_rows: input.rows.length,
        red_rows: input.rows.length,
        yellow_rows: 0,
        green_rows: 0,
        drift: {},
        findings_sample: [{
          findings: [{
            feature: "(contract)",
            severity: "error",
            rule: "schema",
            message: `no contract for ${input.domain}/${input.feature_group}`,
          }],
        }],
        checked_at,
      };
    }

    let red_rows = 0, yellow_rows = 0, green_rows = 0;
    const findings_sample: Array<{ entity_id?: string; findings: DQFinding[] }> = [];

    for (const row of input.rows) {
      const rowFindings = this.validateAgainstContract(row.feature_values, got.contract);
      const rowVerdict = this.summariseVerdict(rowFindings);
      if (rowVerdict === "red") red_rows++;
      else if (rowVerdict === "yellow") yellow_rows++;
      else green_rows++;
      // Sample up to 20 non-green row findings so callers can inspect
      if (rowVerdict !== "green" && findings_sample.length < 20) {
        findings_sample.push({ entity_id: row.entity_id, findings: rowFindings });
      }
    }

    // Drift check — only for keys with reference AND current distributions
    const drift: Record<string, { psi: number; ks: number; verdict: DQVerdict }> = {};
    const refDist = input.reference_distribution ?? {};
    const curDist = input.current_distribution ?? {};
    for (const feature of got.contract.features) {
      const ref = refDist[feature.name];
      const cur = curDist[feature.name];
      if (!ref || !cur || ref.length < 2 || cur.length < 2) continue;
      const psi = computePSI(ref, cur);
      const ks = computeKS(ref, cur);
      const psi_red = feature.drift?.psi_red ?? 0.25;
      const psi_yellow = feature.drift?.psi_yellow ?? 0.10;
      const ks_red = feature.drift?.ks_red ?? 0.20;
      let dv: DQVerdict = "green";
      if (psi >= psi_red || ks >= ks_red) dv = "red";
      else if (psi >= psi_yellow) dv = "yellow";
      drift[feature.name] = { psi, ks, verdict: dv };
    }

    // Overall verdict: red if any row or drift red
    const anyDriftRed = Object.values(drift).some((d) => d.verdict === "red");
    const anyDriftYellow = Object.values(drift).some((d) => d.verdict === "yellow");
    let verdict: DQVerdict = "green";
    if (red_rows > 0 || anyDriftRed) verdict = "red";
    else if (yellow_rows > 0 || anyDriftYellow) verdict = "yellow";

    return {
      verdict,
      blocked: verdict === "red",
      total_rows: input.rows.length,
      red_rows,
      yellow_rows,
      green_rows,
      drift,
      findings_sample,
      checked_at,
    };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private validateAgainstContract(
    values: Record<string, unknown>,
    contract: FeatureGroupContract,
  ): DQFinding[] {
    const findings: DQFinding[] = [];

    // Required keys
    for (const key of contract.required_keys) {
      if (!(key in values)) {
        findings.push({
          feature: key,
          severity: "error",
          rule: "required",
          message: `required key '${key}' missing`,
        });
      }
    }

    // Per-feature validation
    for (const feature of contract.features) {
      if (!(feature.name in values)) continue;   // missing already flagged by required
      const v = values[feature.name];
      for (const f of this.validateOne(feature, v)) findings.push(f);
    }

    return findings;
  }

  private validateOne(feature: FeatureContract, value: unknown): DQFinding[] {
    const findings: DQFinding[] = [];

    if (value === null || value === undefined) {
      if (!feature.nullable) {
        findings.push({
          feature: feature.name,
          severity: "error",
          rule: "nullability",
          message: `null/undefined where non-nullable`,
          actual: value,
        });
      }
      return findings;   // skip further checks on null
    }

    // Type check
    const typeOk = this.matchesType(value, feature.type);
    if (!typeOk) {
      findings.push({
        feature: feature.name,
        severity: "error",
        rule: "schema",
        message: `type mismatch: expected ${feature.type}, got ${typeof value}`,
        actual: value,
        expected: feature.type,
      });
      return findings;
    }

    // Range check (numerics)
    if (feature.range && typeof value === "number") {
      const [min, max] = feature.range;
      if (!Number.isFinite(value) || value < min || value > max) {
        findings.push({
          feature: feature.name,
          severity: "error",
          rule: "range",
          message: `value ${value} outside [${min}, ${max}]`,
          actual: value,
          expected: feature.range,
        });
      }
    }

    // Categories check
    if (feature.categories && feature.categories.length > 0) {
      // Catches both categorical type and any literal-restricted feature
      if (!feature.categories.includes(value as string | number | boolean)) {
        findings.push({
          feature: feature.name,
          severity: "error",
          rule: "categories",
          message: `value not in allowed categories`,
          actual: value,
          expected: feature.categories,
        });
      }
    }

    // Regex check (strings)
    if (feature.regex && typeof value === "string") {
      let re: RegExp | null = null;
      try { re = new RegExp(feature.regex); } catch { /* bad regex in contract — skip */ }
      if (re && !re.test(value)) {
        findings.push({
          feature: feature.name,
          severity: "error",
          rule: "regex",
          message: `value does not match pattern /${feature.regex}/`,
          actual: value,
          expected: feature.regex,
        });
      }
    }

    return findings;
  }

  private matchesType(value: unknown, t: FeatureContract["type"]): boolean {
    switch (t) {
      case "number":       return typeof value === "number" && Number.isFinite(value);
      case "integer":      return typeof value === "number" && Number.isInteger(value);
      case "string":       return typeof value === "string";
      case "boolean":      return typeof value === "boolean";
      case "timestamp":    return typeof value === "string" && !Number.isNaN(Date.parse(value));
      case "categorical":  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
      case "json":         return true;
      default:             return false;
    }
  }

  private summariseVerdict(findings: DQFinding[]): DQVerdict {
    if (findings.some((f) => f.severity === "error")) return "red";
    if (findings.some((f) => f.severity === "warn")) return "yellow";
    return "green";
  }

  static getSelfAwareness() {
    return {
      name: "DataQualityEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-02",
      capabilities: ["validateRow", "validateBatch"],
      dependencies: ["FeatureRegistryEngine", "featureRegistrySchema"],
      dataSourcesUsed: ["mcp-server/data/contracts/*"],
    };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Statistics — PSI + KS for drift detection
// ──────────────────────────────────────────────────────────────────────

/**
 * Population Stability Index — classic drift metric.
 *   PSI = Σ (cur_pct - ref_pct) * ln(cur_pct / ref_pct)
 * 10 equal-width bins from min(ref ∪ cur) to max. Zero bins smoothed
 * with epsilon=1e-6 so PSI stays finite.
 */
function computePSI(ref: number[], cur: number[]): number {
  if (ref.length === 0 || cur.length === 0) return 0;
  const all = [...ref, ...cur].filter((x) => Number.isFinite(x));
  if (all.length === 0) return 0;
  const min = Math.min(...all), max = Math.max(...all);
  if (min === max) return 0;
  const bins = 10;
  const width = (max - min) / bins;
  const refCount = new Array(bins).fill(0);
  const curCount = new Array(bins).fill(0);
  for (const v of ref) {
    if (!Number.isFinite(v)) continue;
    const i = Math.min(bins - 1, Math.floor((v - min) / width));
    refCount[i]++;
  }
  for (const v of cur) {
    if (!Number.isFinite(v)) continue;
    const i = Math.min(bins - 1, Math.floor((v - min) / width));
    curCount[i]++;
  }
  const eps = 1e-6;
  let psi = 0;
  for (let i = 0; i < bins; i++) {
    const r = (refCount[i] / ref.length) || eps;
    const c = (curCount[i] / cur.length) || eps;
    psi += (c - r) * Math.log(c / r);
  }
  return psi;
}

/**
 * Kolmogorov-Smirnov D — max |CDF_ref - CDF_cur|. Distribution-free
 * statistic, widely used to flag distributional shift.
 */
function computeKS(ref: number[], cur: number[]): number {
  const r = ref.slice().filter(Number.isFinite).sort((a, b) => a - b);
  const c = cur.slice().filter(Number.isFinite).sort((a, b) => a - b);
  if (r.length === 0 || c.length === 0) return 0;
  let i = 0, j = 0, d = 0;
  while (i < r.length && j < c.length) {
    const cdfR = (i + 1) / r.length;
    const cdfC = (j + 1) / c.length;
    d = Math.max(d, Math.abs(cdfR - cdfC));
    if (r[i] < c[j]) i++;
    else if (r[i] > c[j]) j++;
    else { i++; j++; }
  }
  while (i < r.length) {
    d = Math.max(d, Math.abs((i + 1) / r.length - 1));
    i++;
  }
  while (j < c.length) {
    d = Math.max(d, Math.abs(1 - (j + 1) / c.length));
    j++;
  }
  return d;
}

export const dataQualityEngine = new DataQualityEngine();
