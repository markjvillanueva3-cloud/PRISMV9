/**
 * CommutativeTranslatorValidatorEngine — category-theory correctness harness.
 *
 * Purpose: structurally prevent the class of *silent divergence* bug PRISM shipped
 * in the G170/G168 dialect regression (two valid translation paths that disagreed).
 * The defect there was a broken commuting square: `post ∘ translate` produced a
 * different result than `translate ∘ post` and nothing detected it. This engine
 * makes that square a checkable law.
 *
 * What it verifies (all pure, deterministic — no I/O, no RNG):
 *   1. COMMUTATION      f(g(x)) ≟ g(f(x))            — two transforms agree in either order.
 *   2. NATURALITY       postT(translate(x)) ≟ translate(postS(x))
 *                       — the naturality square of a natural transformation (cross-
 *                         controller / cross-CAM translate commuting with a post op).
 *   3. IDENTITY         id(x) ≟ x                    — a transform is the identity.
 *   4. ASSOCIATIVITY    ((f∘g)∘h)(x) ≟ (f∘(g∘h))(x)  — composition regroups freely
 *                       (also catches impure/non-deterministic transforms).
 *   5. LENS LAWS        put(get(s), s) ≟ s   (GetPut / retention)
 *                       get(put(v, s)) ≟ v   (PutGet / restoration)
 *                       put(v2, put(v1, s)) ≟ put(v2, s) (PutPut / very-well-behaved)
 *                       — for print↔program↔CAD round-trips.
 *   6. FUNCTOR LAWS     map(id) ≟ id  and  map(f∘g) ≟ map(f)∘map(g).
 *
 * Every check returns a structured verdict AND, on failure, the FIRST counterexample
 * input plus the exact deep path to the diverging field — so a translator author can
 * jump straight to the offending value (fail-loud, R12).
 *
 * Deep equality: exact structural compare over JSON-shaped values (primitives, arrays,
 * plain objects). Numbers compare with `===` EXCEPT `NaN` equals `NaN` (a translator
 * that produces NaN on both paths still "agrees"); `+0`/`-0` are treated equal. A
 * transform that THROWS on an input is a legitimate outcome: two paths that both throw
 * the same message agree; a throw vs a value (or two different throws) diverge.
 *
 * The safe declarative surface (`buildTransform` + `checkFieldRewriteCommutation`)
 * compiles a JSON field-rewrite DSL to a pure function so this harness is callable
 * over the wire (MCP) with NO `eval` / no arbitrary-code execution.
 *
 * @module engines/CommutativeTranslatorValidatorEngine
 */

import { z } from "zod";
import { INCH_TO_MM } from "../physics/unit-conversions.js";

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

/** Location + values of the first structural divergence between two results. */
export interface DiffPath {
  /** Dot/bracket path from the root, e.g. `$.feed` or `$[2].code` or `<throw>`. */
  path: string;
  left: unknown;
  right: unknown;
}

/** A single input at which two composition orders disagree. */
export interface Counterexample<X> {
  input: X;
  /** Result of the "left" path (for commutation: f(g(x))). */
  leftPath: unknown;
  /** Result of the "right" path (for commutation: g(f(x))). */
  rightPath: unknown;
  /** First field where the two results differ. */
  firstDiff: DiffPath;
}

/** Verdict for a commutation / naturality check. */
export interface CommutationResult<X = unknown> {
  commutes: boolean;
  /** Number of inputs evaluated. */
  checked: number;
  /** Present iff `commutes === false`. */
  counterexample?: Counterexample<X>;
  /** Advisory note (e.g. empty input set → vacuously true). */
  warning?: string;
}

/** Verdict for a single law over a set of inputs. */
export interface LawCheck<X = unknown> {
  holds: boolean;
  checked: number;
  counterexample?: {
    input: X;
    expected: unknown;
    actual: unknown;
    firstDiff: DiffPath;
  };
}

/** Combined verdict for the well-behaved-lens laws. */
export interface LensLawResult<S = unknown, A = unknown> {
  /** true iff GetPut AND PutGet hold (the two required lens laws). */
  valid: boolean;
  /** put(get(s), s) === s */
  getPut: LawCheck<S>;
  /** get(put(v, s)) === v */
  putGet: LawCheck<{ value: A; state: S }>;
  /** put(v2, put(v1, s)) === put(v2, s) — "very well behaved" (advisory, not part of `valid`). */
  putPut: LawCheck<{ v1: A; v2: A; state: S }>;
}

/** Combined verdict for the functor laws. */
export interface FunctorLawResult<C = unknown> {
  valid: boolean;
  /** map(id, c) === c */
  preservesIdentity: LawCheck<C>;
  /** map(f∘g, c) === map(f, map(g, c)) */
  preservesComposition: LawCheck<C>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Declarative field-rewrite DSL (safe, JSON-serializable — the MCP surface)
// ─────────────────────────────────────────────────────────────────────────────

/** A single, side-effect-free rewrite of one field of a record. */
export const FieldRewriteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("identity") }),
  z.object({ kind: z.literal("scale"), field: z.string(), factor: z.number() }),
  z.object({ kind: z.literal("offset"), field: z.string(), delta: z.number() }),
  z.object({
    kind: z.literal("clamp"),
    field: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({
    kind: z.literal("map"),
    field: z.string(),
    table: z.record(z.string(), z.unknown()),
  }),
  z.object({ kind: z.literal("prefix"), field: z.string(), prefix: z.string() }),
]);
export type FieldRewrite = z.infer<typeof FieldRewriteSchema>;

/** Serializable record the DSL operates on. */
export type OpRecord = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Internal: deep equality with exact path reporting
// ─────────────────────────────────────────────────────────────────────────────

type Kind = "null" | "array" | "object" | "number" | "string" | "boolean" | "undefined" | "other";

function kindOf(v: unknown): Kind {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  const t = typeof v;
  if (t === "number") return "number";
  if (t === "string") return "string";
  if (t === "boolean") return "boolean";
  if (t === "undefined") return "undefined";
  if (t === "object") return "object";
  return "other";
}

/** Numbers agree if strictly equal (so +0===-0) or both NaN. */
function numbersEqual(a: number, b: number): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

/**
 * Return the first structural divergence between `a` and `b`, or `null` if
 * deeply equal. Object keys are visited in sorted order so the reported path is
 * deterministic across runs.
 */
function firstDiff(a: unknown, b: unknown, path = "$"): DiffPath | null {
  const ka = kindOf(a);
  const kb = kindOf(b);
  if (ka !== kb) return { path, left: a, right: b };

  switch (ka) {
    case "number":
      return numbersEqual(a as number, b as number) ? null : { path, left: a, right: b };
    case "string":
    case "boolean":
      return a === b ? null : { path, left: a, right: b };
    case "null":
    case "undefined":
      return null; // same kind, both null/undefined
    case "array": {
      const arrA = a as unknown[];
      const arrB = b as unknown[];
      if (arrA.length !== arrB.length) {
        return { path: `${path}.length`, left: arrA.length, right: arrB.length };
      }
      for (let i = 0; i < arrA.length; i++) {
        const d = firstDiff(arrA[i], arrB[i], `${path}[${i}]`);
        if (d) return d;
      }
      return null;
    }
    case "object": {
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;
      const keys = Array.from(new Set([...Object.keys(objA), ...Object.keys(objB)])).sort();
      for (const k of keys) {
        const inA = Object.prototype.hasOwnProperty.call(objA, k);
        const inB = Object.prototype.hasOwnProperty.call(objB, k);
        if (inA !== inB) {
          return { path: `${path}.${k}`, left: inA ? objA[k] : undefined, right: inB ? objB[k] : undefined };
        }
        const d = firstDiff(objA[k], objB[k], `${path}.${k}`);
        if (d) return d;
      }
      return null;
    }
    default:
      return a === b ? null : { path, left: a, right: b };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: outcome capture (a transform may throw — that is a valid outcome)
// ─────────────────────────────────────────────────────────────────────────────

type Outcome = { ok: true; value: unknown } | { ok: false; error: string };

function evalSafe(fn: (x: unknown) => unknown, x: unknown): Outcome {
  try {
    return { ok: true, value: fn(x) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Compose two safe outcomes: apply `outer` to the value of `inner` (if inner succeeded). */
function chain(outer: (x: unknown) => unknown, inner: Outcome): Outcome {
  return inner.ok ? evalSafe(outer, inner.value) : inner;
}

/** Human-readable projection of an Outcome for counterexample display. */
function outcomeValue(o: Outcome): unknown {
  return o.ok ? o.value : { threw: o.error };
}

/** First divergence between two outcomes (handles throw-vs-value + throw-vs-throw). */
function outcomeDiff(a: Outcome, b: Outcome): DiffPath | null {
  if (a.ok && b.ok) return firstDiff(a.value, b.value);
  if (!a.ok && !b.ok) {
    return a.error === b.error ? null : { path: "<throw>", left: a.error, right: b.error };
  }
  return {
    path: "<throw-divergence>",
    left: outcomeValue(a),
    right: outcomeValue(b),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class CommutativeTranslatorValidatorEngine {
  /**
   * Right-to-left function composition (mathematical ∘).
   * `compose(f, g, h)(x) === f(g(h(x)))`.
   * @param fns transforms, applied right-to-left
   * @returns a single composed transform
   */
  compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
    return (x: T) => fns.reduceRight<T>((acc, fn) => fn(acc), x);
  }

  /**
   * Public structural deep-equality (numbers: NaN===NaN, +0===-0; else exact).
   * @returns true iff `a` and `b` are deeply equal
   */
  deepEqual(a: unknown, b: unknown): boolean {
    return firstDiff(a, b) === null;
  }

  /**
   * COMMUTATION: verify `f(g(x)) === g(f(x))` for every input.
   * @param args.f first transform
   * @param args.g second transform
   * @param args.inputs test inputs
   * @returns verdict; on divergence, the first counterexample with `leftPath`=f(g(x)),
   *          `rightPath`=g(f(x)), and the exact diff path
   */
  checkCommutation<X>(args: {
    f: (x: X) => X;
    g: (x: X) => X;
    inputs: X[];
  }): CommutationResult<X> {
    const { f, g, inputs } = args;
    if (typeof f !== "function" || typeof g !== "function") {
      throw new TypeError("checkCommutation: f and g must be functions");
    }
    if (!Array.isArray(inputs)) {
      throw new TypeError("checkCommutation: inputs must be an array");
    }
    const uf = f as (x: unknown) => unknown;
    const ug = g as (x: unknown) => unknown;
    for (const x of inputs) {
      const left = chain(uf, evalSafe(ug, x)); // f(g(x))
      const right = chain(ug, evalSafe(uf, x)); // g(f(x))
      const diff = outcomeDiff(left, right);
      if (diff) {
        return {
          commutes: false,
          checked: inputs.length,
          counterexample: {
            input: x,
            leftPath: outcomeValue(left),
            rightPath: outcomeValue(right),
            firstDiff: diff,
          },
        };
      }
    }
    return {
      commutes: true,
      checked: inputs.length,
      ...(inputs.length === 0 ? { warning: "no inputs — commutation holds vacuously" } : {}),
    };
  }

  /**
   * NATURALITY: verify the naturality square commutes —
   * `postTarget(translate(x)) === translate(postSource(x))` for every input.
   *
   * This is the general category-theory statement (source-side and target-side
   * post ops may differ). When `postSource === postTarget` and domains coincide,
   * it reduces to plain endo-commutation. This is the exact law whose violation
   * caused the G170/G168 regression.
   *
   * @param args.translate the cross-controller / cross-CAM transform (A→B)
   * @param args.postSource post op on the source object (A→A)
   * @param args.postTarget post op on the target object (B→B)
   * @param args.inputs source-side test inputs
   * @returns verdict; `leftPath`=postTarget∘translate, `rightPath`=translate∘postSource
   */
  checkNaturality<S, T>(args: {
    translate: (s: S) => T;
    postSource: (s: S) => S;
    postTarget: (t: T) => T;
    inputs: S[];
  }): CommutationResult<S> {
    const { translate, postSource, postTarget, inputs } = args;
    for (const fn of [translate, postSource, postTarget]) {
      if (typeof fn !== "function") {
        throw new TypeError("checkNaturality: translate, postSource, postTarget must be functions");
      }
    }
    const utrans = translate as (x: unknown) => unknown;
    const ups = postSource as (x: unknown) => unknown;
    const upt = postTarget as (x: unknown) => unknown;
    for (const s of inputs) {
      const left = chain(upt, evalSafe(utrans, s)); // postTarget(translate(s))
      const right = chain(utrans, evalSafe(ups, s)); // translate(postSource(s))
      const diff = outcomeDiff(left, right);
      if (diff) {
        return {
          commutes: false,
          checked: inputs.length,
          counterexample: {
            input: s,
            leftPath: outcomeValue(left),
            rightPath: outcomeValue(right),
            firstDiff: diff,
          },
        };
      }
    }
    return {
      commutes: true,
      checked: inputs.length,
      ...(inputs.length === 0 ? { warning: "no inputs — naturality holds vacuously" } : {}),
    };
  }

  /**
   * IDENTITY: verify a transform is the identity (`f(x) === x`) for every input.
   * An identity transform commutes with anything — this confirms one is genuinely id.
   * @returns LawCheck; on failure the first `x` where `f(x) !== x`
   */
  checkIdentity<X>(args: { f: (x: X) => X; inputs: X[] }): LawCheck<X> {
    const { f, inputs } = args;
    if (typeof f !== "function") throw new TypeError("checkIdentity: f must be a function");
    const uf = f as (x: unknown) => unknown;
    for (const x of inputs) {
      const out = evalSafe(uf, x);
      const diff = out.ok ? firstDiff(out.value, x) : { path: "<throw>", left: out.error, right: x };
      if (diff) {
        return { holds: false, checked: inputs.length, counterexample: { input: x, expected: x, actual: outcomeValue(out), firstDiff: diff } };
      }
    }
    return { holds: true, checked: inputs.length };
  }

  /**
   * ASSOCIATIVITY: verify `((f∘g)∘h)(x) === (f∘(g∘h))(x)` for every input.
   * Composition is associative by construction; evaluating the two independent
   * groupings ALSO surfaces impurity / non-determinism (a pure transform gives
   * identical results, a stateful one may not).
   * @returns LawCheck; on failure the first divergent input
   */
  checkAssociativity<X>(args: {
    f: (x: X) => X;
    g: (x: X) => X;
    h: (x: X) => X;
    inputs: X[];
  }): LawCheck<X> {
    const { f, g, h, inputs } = args;
    for (const fn of [f, g, h]) {
      if (typeof fn !== "function") throw new TypeError("checkAssociativity: f, g, h must be functions");
    }
    const leftGroup = this.compose(this.compose(f, g), h); // (f∘g)∘h
    const rightGroup = this.compose(f, this.compose(g, h)); // f∘(g∘h)
    const ul = leftGroup as (x: unknown) => unknown;
    const ur = rightGroup as (x: unknown) => unknown;
    for (const x of inputs) {
      const l = evalSafe(ul, x);
      const r = evalSafe(ur, x);
      const diff = outcomeDiff(l, r);
      if (diff) {
        return { holds: false, checked: inputs.length, counterexample: { input: x, expected: outcomeValue(l), actual: outcomeValue(r), firstDiff: diff } };
      }
    }
    return { holds: true, checked: inputs.length };
  }

  /**
   * LENS LAWS for a `get`/`put` pair (print↔program↔CAD round-trips):
   *   GetPut : put(get(s), s) === s          (nothing lost by reading then writing back)
   *   PutGet : get(put(v, s)) === v          (writing then reading returns what was written)
   *   PutPut : put(v2, put(v1, s)) === put(v2, s)  (second write overwrites the first)
   * `valid` = GetPut && PutGet (the two required well-behaved-lens laws); PutPut is
   * reported for "very well behaved" but does not gate `valid`.
   *
   * @param args.get   focus: state → value
   * @param args.put   update: (value, state) → state
   * @param args.states test states
   * @param args.values test values to write
   * @returns per-law verdicts + combined `valid`
   */
  checkLensLaws<S, A>(args: {
    get: (s: S) => A;
    put: (v: A, s: S) => S;
    states: S[];
    values: A[];
  }): LensLawResult<S, A> {
    const { get, put, states, values } = args;
    if (typeof get !== "function" || typeof put !== "function") {
      throw new TypeError("checkLensLaws: get and put must be functions");
    }

    // GetPut: put(get(s), s) === s
    let getPut: LawCheck<S> = { holds: true, checked: states.length };
    for (const s of states) {
      const actual = put(get(s), s);
      const diff = firstDiff(actual, s);
      if (diff) {
        getPut = { holds: false, checked: states.length, counterexample: { input: s, expected: s, actual, firstDiff: diff } };
        break;
      }
    }

    // PutGet: get(put(v, s)) === v
    let putGet: LawCheck<{ value: A; state: S }> = { holds: true, checked: states.length * values.length };
    outer: for (const s of states) {
      for (const v of values) {
        const actual = get(put(v, s));
        const diff = firstDiff(actual, v);
        if (diff) {
          putGet = { holds: false, checked: states.length * values.length, counterexample: { input: { value: v, state: s }, expected: v, actual, firstDiff: diff } };
          break outer;
        }
      }
    }

    // PutPut: put(v2, put(v1, s)) === put(v2, s)
    let putPut: LawCheck<{ v1: A; v2: A; state: S }> = { holds: true, checked: states.length * values.length * values.length };
    outer2: for (const s of states) {
      for (const v1 of values) {
        for (const v2 of values) {
          const actual = put(v2, put(v1, s));
          const expected = put(v2, s);
          const diff = firstDiff(actual, expected);
          if (diff) {
            putPut = { holds: false, checked: states.length * values.length * values.length, counterexample: { input: { v1, v2, state: s }, expected, actual, firstDiff: diff } };
            break outer2;
          }
        }
      }
    }

    return { valid: getPut.holds && putGet.holds, getPut, putGet, putPut };
  }

  /**
   * FUNCTOR LAWS for a `map` over a container:
   *   Identity    : map(id, c) === c
   *   Composition : map(x => f(g(x)), c) === map(f, map(g, c))
   * @param args.map   the functor's map: (fn, container) → container
   * @param args.f     an arbitrary element transform
   * @param args.g     a second element transform (for the composition law)
   * @param args.inputs container instances to test
   * @returns per-law verdicts + combined `valid`
   */
  checkFunctorLaws<C, U, V, W>(args: {
    map: <P, Q>(fn: (x: P) => Q, container: C) => C;
    f: (x: V) => W;
    g: (x: U) => V;
    inputs: C[];
  }): FunctorLawResult<C> {
    const { map, f, g, inputs } = args;
    if (typeof map !== "function") throw new TypeError("checkFunctorLaws: map must be a function");
    const id = <P>(x: P): P => x;

    let preservesIdentity: LawCheck<C> = { holds: true, checked: inputs.length };
    for (const c of inputs) {
      const actual = map(id, c);
      const diff = firstDiff(actual, c);
      if (diff) {
        preservesIdentity = { holds: false, checked: inputs.length, counterexample: { input: c, expected: c, actual, firstDiff: diff } };
        break;
      }
    }

    let preservesComposition: LawCheck<C> = { holds: true, checked: inputs.length };
    const fg = (x: U): W => f(g(x));
    for (const c of inputs) {
      const composed = map(fg, c); // map(f∘g, c)
      const sequential = map(f, map(g, c)); // map(f, map(g, c))
      const diff = firstDiff(composed, sequential);
      if (diff) {
        preservesComposition = { holds: false, checked: inputs.length, counterexample: { input: c, expected: sequential, actual: composed, firstDiff: diff } };
        break;
      }
    }

    return { valid: preservesIdentity.holds && preservesComposition.holds, preservesIdentity, preservesComposition };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Safe declarative surface (MCP-callable — no eval)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Compile a JSON field-rewrite spec into a pure `(op) => op` transform.
   * Non-numeric fields for `scale`/`offset`/`clamp` are left unchanged (partial
   * transform) rather than coerced to NaN, so a rewrite touching a different
   * field cannot accidentally corrupt this one.
   * @param spec the field rewrite
   * @returns a pure transform over records
   */
  buildTransform(spec: FieldRewrite): (op: OpRecord) => OpRecord {
    switch (spec.kind) {
      case "identity":
        return (op) => ({ ...op });
      case "scale":
        return (op) => {
          const v = op[spec.field];
          return typeof v === "number" ? { ...op, [spec.field]: v * spec.factor } : { ...op };
        };
      case "offset":
        return (op) => {
          const v = op[spec.field];
          return typeof v === "number" ? { ...op, [spec.field]: v + spec.delta } : { ...op };
        };
      case "clamp":
        return (op) => {
          const v = op[spec.field];
          if (typeof v !== "number") return { ...op };
          let c = v;
          if (spec.min !== undefined) c = Math.max(spec.min, c);
          if (spec.max !== undefined) c = Math.min(spec.max, c);
          return { ...op, [spec.field]: c };
        };
      case "map":
        return (op) => {
          const key = String(op[spec.field]);
          return Object.prototype.hasOwnProperty.call(spec.table, key)
            ? { ...op, [spec.field]: spec.table[key] }
            : { ...op };
        };
      case "prefix":
        return (op) => ({ ...op, [spec.field]: spec.prefix + String(op[spec.field]) });
    }
  }

  /**
   * Commutation check driven entirely by JSON (the MCP entry point): compile two
   * field-rewrite specs and verify they commute over a set of records.
   * @param args.specA first rewrite
   * @param args.specB second rewrite
   * @param args.inputs records to test
   * @returns commutation verdict (same shape as {@link checkCommutation})
   */
  checkFieldRewriteCommutation(args: {
    specA: FieldRewrite;
    specB: FieldRewrite;
    inputs: OpRecord[];
  }): CommutationResult<OpRecord> {
    const a = FieldRewriteSchema.parse(args.specA);
    const b = FieldRewriteSchema.parse(args.specB);
    if (!Array.isArray(args.inputs)) throw new TypeError("checkFieldRewriteCommutation: inputs must be an array");
    return this.checkCommutation<OpRecord>({
      f: this.buildTransform(a),
      g: this.buildTransform(b),
      inputs: args.inputs,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Manufacturing demonstration (real transforms; commuting + non-commuting)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Worked manufacturing example proving the harness both PASSES commuting
   * translators and CATCHES divergence:
   *   - `unitAndPrefix`  : feedrate in→mm conversion (touches `feed`) vs a
   *      G-code block prefix (touches `code`) — disjoint fields → commute.
   *   - `feedAndSpindle` : feed scale (touches `feed`) vs spindle-code map
   *      (touches `spindle`) — disjoint fields → commute.
   *   - `scaleVsClamp`   : feed×2 vs clamp-to-100 — order-dependent (scale-then-
   *      clamp ≠ clamp-then-scale) → does NOT commute; counterexample at feed=60.
   * @returns the three verdicts
   */
  manufacturingExamples(): {
    unitAndPrefix: CommutationResult<OpRecord>;
    feedAndSpindle: CommutationResult<OpRecord>;
    scaleVsClamp: CommutationResult<OpRecord>;
  } {
    const ops: OpRecord[] = [
      { code: "G01", feed: 10, spindle: "M03" },
      { code: "G02", feed: 25, spindle: "M04" },
      { code: "G03", feed: 60, spindle: "M03" },
    ];

    // feedrate unit conversion (in/min → mm/min) — imported canonical constant.
    const feedInchToMm = this.buildTransform({ kind: "scale", field: "feed", factor: INCH_TO_MM });
    const prefixBlock = this.buildTransform({ kind: "prefix", field: "code", prefix: "N100 " });
    const scaleFeed = this.buildTransform({ kind: "scale", field: "feed", factor: 2 });
    const mapSpindle = this.buildTransform({ kind: "map", field: "spindle", table: { M03: "M3", M04: "M4" } });
    const clampFeed = this.buildTransform({ kind: "clamp", field: "feed", max: 100 });

    return {
      unitAndPrefix: this.checkCommutation<OpRecord>({ f: feedInchToMm, g: prefixBlock, inputs: ops }),
      feedAndSpindle: this.checkCommutation<OpRecord>({ f: scaleFeed, g: mapSpindle, inputs: ops }),
      scaleVsClamp: this.checkCommutation<OpRecord>({ f: scaleFeed, g: clampFeed, inputs: ops }),
    };
  }

  /**
   * Render any commutation/naturality verdict as a compact human line.
   * @param r a commutation result
   * @param label optional prefix (e.g. the translator name)
   */
  renderResult(r: CommutationResult, label = "commutation"): string {
    if (r.commutes) {
      return `[${label} OK] ${r.checked} input(s) agree${r.warning ? ` (${r.warning})` : ""}`;
    }
    const c = r.counterexample!;
    return [
      `[${label} DIVERGENCE] after ${r.checked} input(s)`,
      `  input: ${JSON.stringify(c.input)}`,
      `  left : ${JSON.stringify(c.leftPath)}`,
      `  right: ${JSON.stringify(c.rightPath)}`,
      `  diff @ ${c.firstDiff.path}: ${JSON.stringify(c.firstDiff.left)} != ${JSON.stringify(c.firstDiff.right)}`,
    ].join("\n");
  }
}

/** Singleton — mirror the `export const fooEngine = new FooEngine()` convention. */
export const commutativetranslatorEngine = new CommutativeTranslatorValidatorEngine();
