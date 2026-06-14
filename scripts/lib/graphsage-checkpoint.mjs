#!/usr/bin/env node
/**
 * graphsage-checkpoint.mjs — JSON serialization of a trained GraphSAGE model.
 * Component (c) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
 *
 * The U4 training script saves a trained model here; U5's link predictor
 * loads it and runs inference with frozen weights. A checkpoint is a plain
 * JSON-safe object — `saveCheckpoint` returns it (the caller JSON.stringifies
 * to a file), `loadCheckpoint` accepts the string OR the object back.
 *
 * Round-trip contract: loadCheckpoint(JSON.stringify(saveCheckpoint(model)))
 * reconstructs a model byte-identical to the original — V8 round-trips IEEE-754
 * doubles exactly through JSON, so a forward pass over the reloaded model gives
 * byte-identical embeddings.
 *
 * Two correctness hazards this module guards against, loudly (R12):
 *   1. A layer's `activation` MUST survive the round trip. The output layer is
 *      "linear"; if a checkpoint dropped the field, a reload would default it
 *      to ReLU and silently cripple the model (the U4b output-orthant bug).
 *      Both save and load require `activation` on every layer.
 *   2. A non-finite weight (NaN/Infinity) JSON.stringifies to `null`, which
 *      `Float64Array.from` would silently coerce to 0. saveCheckpoint AND
 *      loadCheckpoint both scan for non-finite weights and throw.
 *
 * A schema-version mismatch throws — never silently loads a stale layout.
 * Consistent with the U3/U4 scripts/lib/*.mjs + node:test convention.
 */

export const CHECKPOINT_SCHEMA_VERSION = 1;

const KNOWN_ACTIVATIONS = new Set(["relu", "linear"]);

/** Validate a model has the createModel shape; throws RangeError on any fault. */
function assertModelShape(model) {
  if (!model || typeof model !== "object" || !Array.isArray(model.layers)) {
    throw new RangeError("graphsage-checkpoint: model must be an object with a `layers` array");
  }
  if (model.layers.length !== 2) {
    throw new RangeError(`graphsage-checkpoint: expected a 2-layer model (got ${model.layers.length})`);
  }
  const c = model.config;
  if (!c || typeof c !== "object") {
    throw new RangeError("graphsage-checkpoint: model.config is missing");
  }
  for (const key of ["inputDim", "hiddenDim", "embedDim"]) {
    if (!Number.isInteger(c[key]) || c[key] < 1) {
      throw new RangeError(`graphsage-checkpoint: config.${key} must be an integer >= 1 (got ${c[key]})`);
    }
  }
  model.layers.forEach((layer, i) => {
    if (!layer || typeof layer !== "object") {
      throw new RangeError(`graphsage-checkpoint: layer ${i} is not an object`);
    }
    if (!Number.isInteger(layer.rows) || layer.rows < 1 ||
        !Number.isInteger(layer.cols) || layer.cols < 1) {
      throw new RangeError(`graphsage-checkpoint: layer ${i} has invalid rows/cols`);
    }
    if (!layer.W || typeof layer.W.length !== "number" || layer.W.length !== layer.rows * layer.cols) {
      throw new RangeError(
        `graphsage-checkpoint: layer ${i} weight length must be rows*cols (${layer.rows * layer.cols})`);
    }
    if (!KNOWN_ACTIVATIONS.has(layer.activation)) {
      throw new RangeError(
        `graphsage-checkpoint: layer ${i} activation must be one of ${[...KNOWN_ACTIVATIONS].join("/")} ` +
        `(got ${JSON.stringify(layer.activation)}) — a missing activation silently reverts the output ` +
        `layer to ReLU and breaks the model`);
    }
  });
  // Cross-check layer geometry against the config (createModel's invariant):
  // layer 0 is [hiddenDim x 2*inputDim], layer 1 is [embedDim x 2*hiddenDim].
  // A corrupt checkpoint with internally-consistent but config-mismatched
  // dims would reconstruct cleanly, then forward() would mis-index — so the
  // mismatch must be caught here, not discovered as garbage embeddings later.
  const [l0, l1] = model.layers;
  if (l0.rows !== c.hiddenDim || l0.cols !== 2 * c.inputDim ||
      l1.rows !== c.embedDim || l1.cols !== 2 * c.hiddenDim) {
    throw new RangeError(
      "graphsage-checkpoint: layer geometry does not match config — expected " +
      `layer0 [${c.hiddenDim} x ${2 * c.inputDim}], layer1 [${c.embedDim} x ${2 * c.hiddenDim}]`);
  }
}

/** Throw if any weight is non-finite (would JSON.stringify to null). */
function assertFiniteWeights(W, layerIndex, where) {
  for (let i = 0; i < W.length; i++) {
    if (!Number.isFinite(W[i])) {
      throw new RangeError(
        `graphsage-checkpoint: layer ${layerIndex} weight ${i} is non-finite (${W[i]}) — ${where}`);
    }
  }
}

const BUNDLE_KEY_BLOCKLIST = new Set(["__proto__", "constructor", "prototype"]);
const MAX_BUNDLE_DEPTH = 64;

/**
 * Deep-copy an optional bundled value (calibrator / metadata) into a JSON-safe,
 * prototype-pollution-free form. A checkpoint file is attacker-reachable, and a
 * bare JSON.parse keeps a literal `__proto__` own key that a downstream spread
 * or merge would weaponize — so `__proto__`/`constructor`/`prototype` keys are
 * dropped. Values JSON cannot round-trip are rejected loudly (R12): a non-finite
 * number serializes to `null` and would silently corrupt e.g. a calibrator's
 * breakpoints; functions/bigints/symbols are not serializable at all. A depth
 * cap catches cyclic or pathological input before it overflows the stack.
 * Returns null for null/undefined.
 */
function sanitizeBundled(value, label, depth = 0) {
  if (value === null || value === undefined) return null;
  if (depth > MAX_BUNDLE_DEPTH) {
    throw new RangeError(
      `graphsage-checkpoint: ${label} exceeds max nesting depth ${MAX_BUNDLE_DEPTH} (cyclic or pathological input)`);
  }
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError(
        `graphsage-checkpoint: ${label} has a non-finite number (${value}) — JSON cannot round-trip it`);
    }
    return value;
  }
  if (t === "string" || t === "boolean") return value;
  if (t === "function" || t === "bigint" || t === "symbol") {
    throw new TypeError(`graphsage-checkpoint: ${label} has a non-JSON-safe ${t}`);
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => sanitizeBundled(v, `${label}[${i}]`, depth + 1));
  }
  if (t === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      if (BUNDLE_KEY_BLOCKLIST.has(key)) continue; // drop prototype-pollution vectors
      out[key] = sanitizeBundled(value[key], `${label}.${key}`, depth + 1);
    }
    return out;
  }
  throw new TypeError(`graphsage-checkpoint: ${label} has an unserializable value`);
}

/**
 * Serialize a trained model to a plain JSON-safe checkpoint object.
 * `options.calibrator` (e.g. isotonic-calibrator breakpoints) and
 * `options.metadata` (arbitrary) are bundled if given. `options.savedAt`
 * overrides the timestamp (pass a fixed value for a deterministic artifact).
 * The caller JSON.stringifies the returned object to persist it.
 */
export function saveCheckpoint(model, options = {}) {
  assertModelShape(model);
  const layers = model.layers.map((layer, i) => {
    assertFiniteWeights(layer.W, i, "refusing to persist a corrupt model");
    return {
      W: Array.from(layer.W), // Float64Array -> plain number[] for JSON
      rows: layer.rows,
      cols: layer.cols,
      activation: layer.activation,
    };
  });
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    savedAt: typeof options.savedAt === "string" ? options.savedAt : new Date().toISOString(),
    config: {
      inputDim: model.config.inputDim,
      hiddenDim: model.config.hiddenDim,
      embedDim: model.config.embedDim,
      seed: Number.isFinite(model.config.seed) ? model.config.seed : null,
      // U-AISYN-GNN-HETERO-CKPT-PROVENANCE (slot:alpha 2026-06-11): persist the H2GCN feature-widening
      // provenance so graphsage-predictor reproduces the SAME expansion at inference by READING it
      // (robust to normalize="sum") instead of inferring hops from inputDim + assuming "mean". Additive
      // + optional -- absent on legacy checkpoints (predictor falls back to inference).
      ...(model.config.heterophily && typeof model.config.heterophily === "object"
        ? { heterophily: {
            hops: model.config.heterophily.hops,
            normalize: model.config.heterophily.normalize === "sum" ? "sum" : "mean",
            egoDim: model.config.heterophily.egoDim,
          } }
        : {}),
    },
    layers,
    calibrator: sanitizeBundled(options.calibrator, "calibrator"),
    metadata: sanitizeBundled(options.metadata, "metadata"),
  };
}

/**
 * Reconstruct a model (and any bundled calibrator/metadata) from a checkpoint.
 * `input` is the JSON string OR the already-parsed object. Returns
 * { model, calibrator, metadata, schemaVersion, savedAt }; `model` has the
 * exact createModel shape (Float64Array weights), so `forward` runs on it
 * directly. Throws loudly on corrupt JSON, a schema-version mismatch, a
 * structural fault, a non-finite weight, or a missing layer activation.
 */
export function loadCheckpoint(input) {
  let obj;
  if (typeof input === "string") {
    try {
      obj = JSON.parse(input);
    } catch (e) {
      throw new Error(`graphsage-checkpoint: corrupt checkpoint JSON — ${e && e.message}`);
    }
  } else if (input && typeof input === "object") {
    obj = input;
  } else {
    throw new TypeError("graphsage-checkpoint: loadCheckpoint expects a JSON string or a parsed object");
  }

  if (obj.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(
      `graphsage-checkpoint: schema-version mismatch — checkpoint is v${obj.schemaVersion}, ` +
      `this loader is v${CHECKPOINT_SCHEMA_VERSION}`);
  }
  // Reconstruct with Float64Array weights — assertModelShape then re-validates
  // the rebuilt model exactly as saveCheckpoint validated the original.
  if (!Array.isArray(obj.layers)) {
    throw new RangeError("graphsage-checkpoint: checkpoint has no `layers` array");
  }
  const layers = obj.layers.map((layer, i) => {
    if (!layer || typeof layer !== "object") {
      throw new RangeError(`graphsage-checkpoint: layer ${i} is not an object`);
    }
    // Cheap structural checks BEFORE the O(n) finite-scan + Float64Array
    // allocation, so a malformed checkpoint (e.g. a huge W with rows=cols=1)
    // is rejected without first walking and allocating its weight array.
    if (!Number.isInteger(layer.rows) || layer.rows < 1 ||
        !Number.isInteger(layer.cols) || layer.cols < 1) {
      throw new RangeError(`graphsage-checkpoint: layer ${i} has invalid rows/cols`);
    }
    if (!Array.isArray(layer.W)) {
      throw new RangeError(`graphsage-checkpoint: layer ${i} weight array is missing`);
    }
    if (layer.W.length !== layer.rows * layer.cols) {
      throw new RangeError(
        `graphsage-checkpoint: layer ${i} weight length must be rows*cols (${layer.rows * layer.cols})`);
    }
    assertFiniteWeights(layer.W, i, "checkpoint weight is corrupt (JSON null = was NaN/Infinity)");
    return {
      W: Float64Array.from(layer.W),
      rows: layer.rows,
      cols: layer.cols,
      activation: layer.activation,
    };
  });
  const c = obj.config || {};
  const model = {
    config: {
      inputDim: c.inputDim,
      hiddenDim: c.hiddenDim,
      embedDim: c.embedDim,
      // Mirror saveCheckpoint's sentinel exactly (null, not 0) so a seedless
      // model round-trips to a byte-identical config. seed is inference-irrelevant.
      seed: Number.isFinite(c.seed) ? c.seed : null,
      // U-AISYN-GNN-HETERO-CKPT-PROVENANCE (slot:alpha 2026-06-11): carry the H2GCN feature-widening
      // provenance back through the load so graphsage-predictor READS hops/normalize (line 191) instead
      // of inferring -- WITHOUT this mirror, saveCheckpoint persists heterophily into the JSON but
      // loadCheckpoint silently drops it, making the predictor's persisted-preference a dead no-op.
      // Additive + optional: absent on legacy checkpoints (omitted -> predictor falls back to inference).
      ...(c.heterophily && typeof c.heterophily === "object"
        ? { heterophily: {
            hops: c.heterophily.hops,
            normalize: c.heterophily.normalize === "sum" ? "sum" : "mean",
            egoDim: c.heterophily.egoDim,
          } }
        : {}),
    },
    k: 2,
    layers,
  };
  assertModelShape(model);

  return {
    model,
    calibrator: sanitizeBundled(obj.calibrator, "calibrator"),
    metadata: sanitizeBundled(obj.metadata, "metadata"),
    schemaVersion: obj.schemaVersion,
    savedAt: typeof obj.savedAt === "string" ? obj.savedAt : null,
  };
}

export { CHECKPOINT_SCHEMA_VERSION as SCHEMA_VERSION };
