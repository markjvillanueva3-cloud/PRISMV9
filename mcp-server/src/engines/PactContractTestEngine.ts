/**
 * PactContractTestEngine — U-LPR-CONTRACT
 *
 * Consumer-driven contract testing for the LATHE-PROD-READY pipeline.
 *
 * A Pact-style contract captures the exact shape + matchers that a CONSUMER
 * expects from a PROVIDER. Verification checks whether a real provider
 * output would have been accepted by the consumer at contract time. Breaking
 * changes (removed required fields, tightened types, widened enums consumer
 * hasn't seen) are flagged so the pilot can block release.
 *
 * Scope is intentionally tight:
 *   - Pure calculation, no HTTP / no provider stubs / no broker
 *   - 7 matcher types: exact, type, regex, range, contains, enum, optional
 *   - Backward-compat diff between two contract versions
 *   - Deterministic output usable by audit log + four-eyes review
 *
 * The consumer/provider idea maps 1:1 onto PRISM: a dispatcher action or
 * UI page is the consumer; an engine or orchestrator is the provider. The
 * contract pins the response shape (not the request — requests are already
 * pinned by Zod schemas in src/schemas/). Verification fails = pilot gate
 * closes under the U-LPR-CKPT-5 rules.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CONTRACT
 * @phase PHASE-4 (QA Resilience)
 */

// ============================================================================
// TYPES
// ============================================================================

export type PactPrimitive = "string" | "number" | "integer" | "boolean" | "null";
export type MatcherKind =
  | "exact"
  | "type"
  | "regex"
  | "range"
  | "contains"
  | "enum"
  | "optional";

export interface ExactMatcher {
  kind: "exact";
  value: string | number | boolean | null;
}
export interface TypeMatcher {
  kind: "type";
  /** One of PactPrimitive or "array" or "object". */
  type: PactPrimitive | "array" | "object";
}
export interface RegexMatcher {
  kind: "regex";
  pattern: string;
  /** Regex flags, e.g. "i". Empty string means no flags. */
  flags?: string;
}
export interface RangeMatcher {
  kind: "range";
  /** Inclusive lower bound. If omitted, no lower bound. */
  min?: number;
  /** Inclusive upper bound. If omitted, no upper bound. */
  max?: number;
  /** If true, integer-only. */
  integer?: boolean;
}
export interface ContainsMatcher {
  kind: "contains";
  /** The value that the actual array must contain (deep-equal compare). */
  needle: unknown;
}
export interface EnumMatcher {
  kind: "enum";
  /** Allowed values. Actual must be one of these. */
  values: ReadonlyArray<string | number | boolean>;
}
export interface OptionalMatcher {
  kind: "optional";
  /** Inner matcher applied only when the field is present. */
  inner: PactMatcher;
}
export type PactMatcher =
  | ExactMatcher
  | TypeMatcher
  | RegexMatcher
  | RangeMatcher
  | ContainsMatcher
  | EnumMatcher
  | OptionalMatcher;

/** Dot-path → matcher. Supports "a.b.c" and "a.0.b" (array index). */
export type MatcherMap = Record<string, PactMatcher>;

export interface Interaction {
  /** Stable human identifier, e.g. "turning-orchestrator:successful-run". */
  id: string;
  /** Free-text description for audit. */
  description: string;
  /** Provider state preconditions. For documentation only — not executed. */
  providerState?: string;
  /** Matchers keyed by dot-path into the provider response. */
  expected: MatcherMap;
  /** Fields that MUST be present (null counts as present). */
  required: ReadonlyArray<string>;
}

export interface Contract {
  consumer: string;
  provider: string;
  version: string;
  createdAt: number;
  interactions: ReadonlyArray<Interaction>;
}

export interface MatchFailure {
  path: string;
  reason: string;
  expected: unknown;
  actual: unknown;
}

export interface VerificationResult {
  interactionId: string;
  passed: boolean;
  failures: ReadonlyArray<MatchFailure>;
  /** Number of matchers that ran, including optional-skipped. */
  matchersRun: number;
  /** Number of required-path existence checks that ran. */
  requiredChecked: number;
}

export type BreakingChangeKind =
  | "required_field_added"
  | "required_field_removed"
  | "matcher_tightened"
  | "matcher_type_changed"
  | "enum_narrowed";

export interface BreakingChange {
  path: string;
  kind: BreakingChangeKind;
  detail: string;
}

export interface CompatResult {
  backwardCompatible: boolean;
  breakingChanges: ReadonlyArray<BreakingChange>;
  /** Non-breaking additions for the record. */
  additions: ReadonlyArray<string>;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function parsePath(path: string): ReadonlyArray<string | number> {
  if (path === "") return [];
  return path.split(".").map((seg) => {
    if (/^\d+$/.test(seg)) return Number.parseInt(seg, 10);
    return seg;
  });
}

function getAtPath(root: unknown, path: string): { found: boolean; value: unknown } {
  const segments = parsePath(path);
  let cursor: unknown = root;
  for (const seg of segments) {
    if (cursor === null || cursor === undefined) return { found: false, value: undefined };
    if (typeof seg === "number") {
      if (!Array.isArray(cursor)) return { found: false, value: undefined };
      if (seg < 0 || seg >= cursor.length) return { found: false, value: undefined };
      cursor = cursor[seg];
    } else {
      if (typeof cursor !== "object") return { found: false, value: undefined };
      const obj = cursor as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(obj, seg)) {
        return { found: false, value: undefined };
      }
      cursor = obj[seg];
    }
  }
  return { found: true, value: cursor };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao).sort();
  const bKeys = Object.keys(bo).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (!deepEqual(ao[aKeys[i]], bo[bKeys[i]])) return false;
  }
  return true;
}

function typeOf(v: unknown): PactPrimitive | "array" | "object" | "undefined" {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return "array";
  const t = typeof v;
  if (t === "string") return "string";
  if (t === "boolean") return "boolean";
  if (t === "number") return Number.isInteger(v) ? "integer" : "number";
  if (t === "object") return "object";
  return "null";
}

function matchValue(
  matcher: PactMatcher,
  actual: unknown,
  present: boolean,
): { ok: boolean; reason?: string } {
  switch (matcher.kind) {
    case "optional":
      if (!present) return { ok: true };
      return matchValue(matcher.inner, actual, true);
    case "exact":
      if (!present) return { ok: false, reason: "missing" };
      return deepEqual(actual, matcher.value)
        ? { ok: true }
        : { ok: false, reason: "not-equal" };
    case "type": {
      if (!present) return { ok: false, reason: "missing" };
      const t = typeOf(actual);
      if (matcher.type === "number") {
        if (t === "number" || t === "integer") return { ok: true };
        return { ok: false, reason: `type-mismatch:${t}` };
      }
      if (t === matcher.type) return { ok: true };
      return { ok: false, reason: `type-mismatch:${t}` };
    }
    case "regex": {
      if (!present) return { ok: false, reason: "missing" };
      if (typeof actual !== "string") return { ok: false, reason: "not-string" };
      let re: RegExp;
      try {
        re = new RegExp(matcher.pattern, matcher.flags ?? "");
      } catch {
        return { ok: false, reason: "invalid-regex" };
      }
      return re.test(actual) ? { ok: true } : { ok: false, reason: "regex-mismatch" };
    }
    case "range": {
      if (!present) return { ok: false, reason: "missing" };
      if (typeof actual !== "number" || Number.isNaN(actual)) {
        return { ok: false, reason: "not-number" };
      }
      if (matcher.integer && !Number.isInteger(actual)) {
        return { ok: false, reason: "not-integer" };
      }
      if (matcher.min !== undefined && actual < matcher.min) {
        return { ok: false, reason: `below-min:${matcher.min}` };
      }
      if (matcher.max !== undefined && actual > matcher.max) {
        return { ok: false, reason: `above-max:${matcher.max}` };
      }
      return { ok: true };
    }
    case "contains": {
      if (!present) return { ok: false, reason: "missing" };
      if (!Array.isArray(actual)) return { ok: false, reason: "not-array" };
      for (const item of actual) {
        if (deepEqual(item, matcher.needle)) return { ok: true };
      }
      return { ok: false, reason: "needle-absent" };
    }
    case "enum": {
      if (!present) return { ok: false, reason: "missing" };
      for (const v of matcher.values) {
        if (deepEqual(actual, v)) return { ok: true };
      }
      return { ok: false, reason: "not-in-enum" };
    }
  }
}

// ============================================================================
// ENGINE
// ============================================================================

export class PactContractTestEngine {
  /**
   * Build a contract from raw interaction records. Deduplicates by id;
   * throws on duplicate ids so the same consumer cannot register two
   * conflicting expectations under the same name.
   */
  static defineContract(params: {
    consumer: string;
    provider: string;
    version: string;
    interactions: ReadonlyArray<Interaction>;
    now?: number;
  }): Contract {
    if (!params.consumer) throw new Error("consumer required");
    if (!params.provider) throw new Error("provider required");
    if (!params.version) throw new Error("version required");
    if (params.interactions.length === 0) {
      throw new Error("at least one interaction required");
    }
    const seen = new Set<string>();
    for (const ix of params.interactions) {
      if (seen.has(ix.id)) {
        throw new Error(`duplicate interaction id: ${ix.id}`);
      }
      seen.add(ix.id);
    }
    return {
      consumer: params.consumer,
      provider: params.provider,
      version: params.version,
      createdAt: params.now ?? Date.now(),
      interactions: params.interactions,
    };
  }

  /**
   * Verify a provider response against the named interaction. Returns a
   * structured result — never throws on match failure.
   */
  static verifyInteraction(
    contract: Contract,
    interactionId: string,
    actualResponse: unknown,
  ): VerificationResult {
    const interaction = contract.interactions.find((i) => i.id === interactionId);
    if (!interaction) {
      throw new Error(`interaction not found: ${interactionId}`);
    }
    const failures: MatchFailure[] = [];
    let matchersRun = 0;
    let requiredChecked = 0;

    for (const reqPath of interaction.required) {
      requiredChecked++;
      const { found } = getAtPath(actualResponse, reqPath);
      if (!found) {
        failures.push({
          path: reqPath,
          reason: "required-missing",
          expected: "present",
          actual: undefined,
        });
      }
    }

    for (const [path, matcher] of Object.entries(interaction.expected)) {
      matchersRun++;
      const { found, value } = getAtPath(actualResponse, path);
      const result = matchValue(matcher, value, found);
      if (!result.ok) {
        failures.push({
          path,
          reason: result.reason ?? "unknown",
          expected: matcher,
          actual: value,
        });
      }
    }

    return {
      interactionId,
      passed: failures.length === 0,
      failures,
      matchersRun,
      requiredChecked,
    };
  }

  /**
   * Diff two contracts and classify changes as breaking / additive /
   * neutral. Breaking changes are those that would cause an older consumer
   * to reject responses that were previously acceptable.
   *
   * Rules (consumer-driven perspective):
   *   - Adding a required field = breaking (older provider won't send it,
   *     but new consumer now demands it)
   *   - Removing a required field that an old consumer needed = breaking
   *   - Tightening a range / narrowing an enum = breaking
   *   - Changing matcher kind (type → regex, etc.) = breaking
   *   - Loosening a matcher (wider range, bigger enum, optional→required
   *     is breaking; required→optional is NOT breaking) = additive
   */
  static checkBackwardCompat(oldC: Contract, newC: Contract): CompatResult {
    const breakingChanges: BreakingChange[] = [];
    const additions: string[] = [];
    const newMap = new Map(newC.interactions.map((i) => [i.id, i]));

    for (const oldIx of oldC.interactions) {
      const newIx = newMap.get(oldIx.id);
      if (!newIx) {
        breakingChanges.push({
          path: oldIx.id,
          kind: "required_field_removed",
          detail: `interaction "${oldIx.id}" removed from new contract`,
        });
        continue;
      }

      const oldReq = new Set(oldIx.required);
      const newReq = new Set(newIx.required);
      for (const r of newReq) {
        if (!oldReq.has(r)) {
          breakingChanges.push({
            path: `${oldIx.id}:${r}`,
            kind: "required_field_added",
            detail: "field was not required before",
          });
        }
      }
      for (const r of oldReq) {
        if (!newReq.has(r)) additions.push(`${oldIx.id}:${r} (no longer required)`);
      }

      for (const [path, oldM] of Object.entries(oldIx.expected)) {
        const newM = newIx.expected[path];
        if (!newM) {
          breakingChanges.push({
            path: `${oldIx.id}:${path}`,
            kind: "required_field_removed",
            detail: "matcher removed",
          });
          continue;
        }
        const classify = classifyMatcherChange(oldM, newM);
        if (classify.breaking) {
          breakingChanges.push({
            path: `${oldIx.id}:${path}`,
            kind: classify.kind ?? "matcher_tightened",
            detail: classify.detail,
          });
        } else if (classify.additive) {
          additions.push(`${oldIx.id}:${path} — ${classify.detail}`);
        }
      }

      for (const [path] of Object.entries(newIx.expected)) {
        if (!oldIx.expected[path]) {
          additions.push(`${oldIx.id}:${path} (new matcher)`);
        }
      }
    }

    for (const newIx of newC.interactions) {
      if (!oldC.interactions.find((i) => i.id === newIx.id)) {
        additions.push(`interaction:${newIx.id} (new)`);
      }
    }

    return {
      backwardCompatible: breakingChanges.length === 0,
      breakingChanges,
      additions,
    };
  }

  /** Pure match test — exposed for external callers building ad-hoc assertions. */
  static match(
    matcher: PactMatcher,
    actual: unknown,
    present = true,
  ): { ok: boolean; reason?: string } {
    return matchValue(matcher, actual, present);
  }
}

function classifyMatcherChange(
  oldM: PactMatcher,
  newM: PactMatcher,
): { breaking: boolean; additive: boolean; kind?: BreakingChangeKind; detail: string } {
  if (oldM.kind !== newM.kind) {
    if (oldM.kind === "optional" && newM.kind !== "optional") {
      return {
        breaking: true,
        additive: false,
        kind: "matcher_type_changed",
        detail: `optional→${newM.kind}`,
      };
    }
    if (oldM.kind !== "optional" && newM.kind === "optional") {
      return { breaking: false, additive: true, detail: "required→optional" };
    }
    return {
      breaking: true,
      additive: false,
      kind: "matcher_type_changed",
      detail: `${oldM.kind}→${newM.kind}`,
    };
  }
  switch (oldM.kind) {
    case "range": {
      const nn = newM as RangeMatcher;
      const tightened =
        (nn.min !== undefined && (oldM.min === undefined || nn.min > oldM.min)) ||
        (nn.max !== undefined && (oldM.max === undefined || nn.max < oldM.max)) ||
        (nn.integer === true && oldM.integer !== true);
      if (tightened) {
        return {
          breaking: true,
          additive: false,
          kind: "matcher_tightened",
          detail: "range narrowed",
        };
      }
      return { breaking: false, additive: false, detail: "range equal or widened" };
    }
    case "enum": {
      const nn = newM as EnumMatcher;
      const oldSet = new Set(oldM.values.map((v) => JSON.stringify(v)));
      const newSet = new Set(nn.values.map((v) => JSON.stringify(v)));
      let narrowed = false;
      for (const v of oldSet) if (!newSet.has(v)) narrowed = true;
      if (narrowed) {
        return {
          breaking: true,
          additive: false,
          kind: "enum_narrowed",
          detail: "enum value removed",
        };
      }
      if (newSet.size > oldSet.size) {
        return { breaking: false, additive: true, detail: "enum widened" };
      }
      return { breaking: false, additive: false, detail: "enum equal" };
    }
    case "exact": {
      const nn = newM as ExactMatcher;
      if (!deepEqual(oldM.value, nn.value)) {
        return {
          breaking: true,
          additive: false,
          kind: "matcher_tightened",
          detail: "exact value changed",
        };
      }
      return { breaking: false, additive: false, detail: "exact unchanged" };
    }
    case "type": {
      const nn = newM as TypeMatcher;
      if (oldM.type !== nn.type) {
        return {
          breaking: true,
          additive: false,
          kind: "matcher_type_changed",
          detail: `type ${oldM.type}→${nn.type}`,
        };
      }
      return { breaking: false, additive: false, detail: "type unchanged" };
    }
    case "regex": {
      const nn = newM as RegexMatcher;
      if (oldM.pattern !== nn.pattern || (oldM.flags ?? "") !== (nn.flags ?? "")) {
        return {
          breaking: true,
          additive: false,
          kind: "matcher_tightened",
          detail: "regex changed",
        };
      }
      return { breaking: false, additive: false, detail: "regex unchanged" };
    }
    case "contains": {
      const nn = newM as ContainsMatcher;
      if (!deepEqual(oldM.needle, nn.needle)) {
        return {
          breaking: true,
          additive: false,
          kind: "matcher_tightened",
          detail: "contains needle changed",
        };
      }
      return { breaking: false, additive: false, detail: "contains unchanged" };
    }
    case "optional": {
      const nn = newM as OptionalMatcher;
      return classifyMatcherChange(oldM.inner, nn.inner);
    }
  }
}

export const pactContractTestEngine = PactContractTestEngine;
