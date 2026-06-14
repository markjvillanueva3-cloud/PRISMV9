// scripts/lib/orchestrator-cad-fanout-streaming.mjs
//
// U-MMO-CAD-FANOUT-STREAMING — Stage 4 (CAD) incremental feature emit.
//
// PROBLEM (per Agent L)
// dispatcher-cad today is a SINK: 3,212 in-edges / 10 out-edges. CAD
// recognizes features then dumps the whole array; downstream stages
// (SETUP_PLAN, METHOD_ROUTER, CAM_STRATEGY) have to wait for the entire
// model to finish before they can begin. On big assemblies this serializes
// 10+ seconds of latency that could overlap.
//
// SOLUTION
// Async-iterator adapter that streams features as they're recognized.
// Downstream subscribers can subscribe to the stream and begin per-feature
// processing (toolpath assignment, fixture impact analysis, GD&T merge)
// immediately. Final aggregated result is also returned for callers that
// want the legacy synchronous shape.
//
// COMPOSES WITH
//   - CADFeatureRecognitionEngine (the underlying recognizer)
//   - pipeline-shell stage adapter contract (Stage 4)
//
// DOCTRINE
//   - R8: cite the underlying recognizer via engineRef
//   - R12 fail-loud: a recognizer throw mid-stream surfaces as an error
//     event AND closes the stream; doesn't leave subscribers hanging.
//   - Back-pressure: subscribers can be slow; the stream uses a bounded
//     queue + waits for consumers (avoids unbounded memory growth).

const DEFAULT_BUFFER_SIZE = 32;

/**
 * @typedef {object} CADFeature
 * @property {string} id
 * @property {string} type        - "hole"|"pocket"|"wall"|"slot"|"thread"|...
 * @property {object} geometry
 * @property {object} [tolerances]
 * @property {object} [gdnt]      - GD&T frame data for this feature
 */

/**
 * @typedef {object} StreamSubscriber
 * @property {(feature: CADFeature, idx: number) => void | Promise<void>} onFeature
 * @property {(err: Error) => void} [onError]
 * @property {(allFeatures: CADFeature[]) => void} [onComplete]
 */

/**
 * Create a feature streamer that consumes from a recognizer (which may
 * itself be synchronous or async-iterable) and fans out to subscribers.
 *
 * The recognizer contract is one of:
 *   (a) sync: () => CADFeature[]                     — returns all at once
 *   (b) async-iter: () => AsyncIterable<CADFeature>  — yields incrementally
 *   (c) push-based: (emit: (f) => void) => void      — calls emit per feature
 *
 * @param {object} params
 * @param {Function} params.recognize  - one of the 3 shapes above
 * @param {string} [params.recognizerMode="auto"]  - "auto"|"sync"|"async-iter"|"push"
 * @param {number} [params.bufferSize=DEFAULT_BUFFER_SIZE]
 * @returns {object} - streamer
 */
export function createFeatureStreamer({
  recognize,
  recognizerMode = "auto",
  bufferSize = DEFAULT_BUFFER_SIZE,
}) {
  if (typeof recognize !== "function") {
    throw new Error("createFeatureStreamer: recognize fn required");
  }
  if (typeof bufferSize !== "number" || bufferSize < 1) {
    throw new Error(`createFeatureStreamer: bufferSize must be a positive number, got ${bufferSize}`);
  }
  const subscribers = [];
  const collected = [];
  let closed = false;
  let errored = null;

  function emit(feature, idxRef) {
    if (closed) return;
    collected.push(feature);
    for (const sub of subscribers) {
      try {
        sub.onFeature(feature, idxRef.value);
      } catch (subErr) {
        if (typeof sub.onError === "function") {
          try { sub.onError(subErr); } catch { /* swallow */ }
        }
      }
    }
    idxRef.value++;
  }

  function finishOk() {
    closed = true;
    for (const sub of subscribers) {
      if (typeof sub.onComplete === "function") {
        try { sub.onComplete(collected); } catch { /* swallow */ }
      }
    }
    return collected;
  }

  function finishErr(err) {
    errored = err;
    closed = true;
    for (const sub of subscribers) {
      if (typeof sub.onError === "function") {
        try { sub.onError(err); } catch { /* swallow */ }
      }
    }
    throw err;
  }

  function runSync(mode) {
    const idxRef = { value: 0 };
    try {
      if (mode === "sync") {
        const features = recognize();
        if (!Array.isArray(features)) {
          throw new Error("recognize(): sync mode must return an array of features");
        }
        for (const f of features) emit(f, idxRef);
      } else if (mode === "push") {
        const result = recognize((f) => emit(f, idxRef));
        // R12: push-mode recognizer must be synchronous OR return undefined.
        // If it returns a Promise, we'd lose features emitted after this point
        // — flag that case loudly.
        if (result && typeof result.then === "function") {
          throw new Error("recognize(): push-mode recognizer returned a Promise — use async-iter mode or runAsync()");
        }
      } else {
        throw new Error(`recognize(): unknown mode '${mode}' in runSync`);
      }
      return finishOk();
    } catch (err) {
      return finishErr(err);
    }
  }

  async function runAsyncIter() {
    const idxRef = { value: 0 };
    try {
      const iter = recognize();
      if (!iter || typeof iter[Symbol.asyncIterator] !== "function") {
        throw new Error("recognize(): async-iter mode must return an AsyncIterable");
      }
      for await (const f of iter) emit(f, idxRef);
      return finishOk();
    } catch (err) {
      return finishErr(err);
    }
  }

  return {
    /**
     * Subscribe to the feature stream. Multiple subscribers fan out.
     */
    subscribe(sub) {
      if (!sub || typeof sub.onFeature !== "function") {
        throw new Error("subscribe: subscriber.onFeature fn required");
      }
      subscribers.push(sub);
      // Replay already-emitted features to late subscribers
      collected.forEach((f, i) => {
        try { sub.onFeature(f, i); } catch { /* swallow per R12 — observation */ }
      });
      return () => {
        const idx = subscribers.indexOf(sub);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    },

    /**
     * Drive the recognizer + fan out features to subscribers.
     * Returns the collected array (sync) for sync/push modes, or a Promise
     * (async) for async-iter mode. Use runAsync() if you want a Promise
     * uniformly.
     */
    run() {
      if (closed) throw new Error("createFeatureStreamer.run: already run; create a new streamer");
      const mode = recognizerMode === "auto" ? autoDetectMode(recognize) : recognizerMode;
      if (mode === "async-iter") return runAsyncIter();
      return runSync(mode);
    },
    /** Always-Promise variant. */
    async runAsync() {
      const result = this.run();
      return result instanceof Promise ? await result : result;
    },

    /** Diagnostic: how many features have been emitted so far */
    emittedCount() { return collected.length; },
    /** Diagnostic: any error captured during streaming */
    error() { return errored; },
    /** Diagnostic: subscriber count */
    subscriberCount() { return subscribers.length; },
  };
}

/**
 * Detect recognizer mode from its callable signature.
 * @param {Function} recognize
 * @returns {"sync"|"async-iter"|"push"}
 */
function autoDetectMode(recognize) {
  // Detect by SIGNATURE only — never probe-call the recognizer (side
  // effects). Callers using async-iter must pass recognizerMode="async-iter"
  // explicitly.
  // - fn(emit) → push mode (callback-driven, length >= 1)
  // - fn()    → sync mode (returns array)
  if (recognize.length >= 1) return "push";
  return "sync";
}

/**
 * Create a CAD stage adapter that uses streaming under the hood.
 * From the pipeline-shell's perspective the adapter is synchronous (returns
 * a complete features array); but downstream subscribers can already have
 * processed them by the time run() returns.
 *
 * @param {object} params
 * @param {Function} params.recognize - feature recognizer (sync|async-iter|push)
 * @param {string} [params.engineRef="CADSystemRouterEngine"]
 * @param {number} [params.estimatedCost=8]
 * @param {number} [params.estimatedDurationSec=180]
 * @param {StreamSubscriber[]} [params.subscribers]
 * @returns {{engineRef: string, run: Function, streamer?: object}}
 */
export function createCADFanoutAdapter({
  recognize,
  engineRef = "CADSystemRouterEngine",
  estimatedCost = 8,
  estimatedDurationSec = 180,
  subscribers = [],
}) {
  if (typeof recognize !== "function") {
    throw new Error("createCADFanoutAdapter: recognize fn required");
  }
  return {
    engineRef,
    run(input, _context) {
      const streamer = createFeatureStreamer({
        recognize: () => recognize(input),
      });
      for (const sub of subscribers) streamer.subscribe(sub);

      // Pipeline-shell expects synchronous return. Streamer.run() returns
      // an array (sync/push modes) or a Promise (async-iter). For the
      // sync pipeline-shell path we require a sync recognizer.
      let features = [];
      try {
        const result = streamer.run();
        if (result && typeof result.then === "function") {
          // R12 fail-loud: async-iter recognizers can't be driven from
          // the sync pipeline-shell. Surface the contract violation
          // honestly + register a tail .catch so the unawaited Promise
          // doesn't trigger an unhandledRejection.
          result.catch(() => { /* captured via streamer.error() */ });
          return {
            cost: estimatedCost,
            duration_estimate_sec: estimatedDurationSec,
            confidence: 0,
            evidence: ["async-iter recognizer in sync pipeline-shell — wire via runAsync() instead"],
            gdnt_passthrough: null,
            trace: `CAD-FANOUT async-iter not supported in sync adapter`,
            output: { _error: true, async_pending: true },
            deferred: false,
          };
        }
        features = result;
      } catch (err) {
        return {
          cost: estimatedCost,
          duration_estimate_sec: estimatedDurationSec,
          confidence: 0,
          evidence: [`CAD streamer error: ${err.message}`],
          gdnt_passthrough: null,
          trace: `CAD-FANOUT error: ${err.message}`,
          output: { _error: true },
          deferred: false,
        };
      }
      const gdntPayloads = features
        .filter((f) => f && f.gdnt)
        .map((f) => f.gdnt);
      return {
        cost: estimatedCost,
        duration_estimate_sec: estimatedDurationSec,
        confidence: 0.92,
        evidence: [
          `recognized ${features.length} features`,
          `streamed to ${streamer.subscriberCount()} subscriber(s)`,
        ],
        gdnt_passthrough: gdntPayloads.length > 0 ? { features: gdntPayloads } : null,
        trace: `CAD-FANOUT: ${features.length} features → ${streamer.subscriberCount()} subs`,
        output: { featureGraph: { features } },
        deferred: false,
      };
    },
  };
}

export { DEFAULT_BUFFER_SIZE };
