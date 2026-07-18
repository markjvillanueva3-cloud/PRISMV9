/**
 * embed-pool.mjs — order-preserving, bounded-concurrency worker pool for the
 * GPU-backed embed passes (build-wiki-embeddings + the four
 * embed-*-into-tribal-index generators). As of BLACKWELL-DB-GEN-MS0 the two
 * all-or-nothing embedders (wiki, knowledge-store) are wired; engines + cited-
 * tips follow — they need a chunked-checkpoint variant (their checkpoint-every-N
 * + consecutive-failure circuit breaker are sequential-by-design).
 *
 * WHY (Blackwell DB-gen efficiency, BLACKWELL-DB-GEN-MS0):
 *   Each embedder issues one Ollama `/api/embeddings` call per item, serially.
 *   `nomic-embed-text` (137M params) leaves a 96 GB RTX PRO 6000 Blackwell ~94%
 *   idle when fed one request at a time. Issuing up to N requests in flight
 *   saturates the GPU. The wiki *concept* embedder already proved this lever:
 *   ~15× at N=16, vectors byte-identical (min cosine 1.0). This lib single-
 *   sources that pool so the four still-serial tribal embedders get the same win
 *   without copy-pasting the loop four times (and drifting).
 *
 * CONTRACT (the invariants the callers depend on — tested in embed-pool.test.mjs):
 *   1. ORDER: `results[i]` always corresponds to `items[i]`, regardless of the
 *      order in which workers actually finished.
 *   2. BYTE-IDENTICAL AT conc=1: with concurrency 1 the items are processed
 *      0..n-1 strictly in order and the first throw aborts immediately, before
 *      any later item starts — i.e. exactly a plain `for (const it of items) {
 *      await worker(it) }`. This is the default, so wiring an embedder to the
 *      pool changes nothing until the operator sets PRISM_EMBED_CONCURRENCY > 1.
 *   3. ABORT-ON-THROW (all-or-nothing callers — wiki, knowledge-store): if a
 *      worker throws, the pool stops scheduling new items, lets the in-flight
 *      peers settle, then re-throws the FIRST error. The caller's try/catch then
 *      hard-aborts before it writes the index → R12 all-or-nothing preserved.
 *   4. TOLERATE-ON-RETURN (partial callers — engines, cited-tips): if a worker
 *      RETURNS instead of throwing (e.g. a `{ ok:false, reason }` sentinel for a
 *      single failed item), the pool keeps going and never throws. The pool
 *      never inspects the returned value — the caller decides how to fold it.
 *
 * The pool itself touches no Ollama, no filesystem, no clock — it is a pure
 * scheduling primitive, which is what makes it cheaply testable.
 *
 * SCOPE OF THE WIN: this parallelizes embeds WITHIN a single embedder process.
 * It does NOT make the index a multi-writer store — the embedders still write
 * `tribal-embed-index.json` with an unlocked read-modify-write (see the caveat
 * in each embedder), so do NOT run two embedders concurrently against the same
 * index or one batch's writes are lost. Concurrency here = more in-flight Ollama
 * calls per run, not more concurrent writers.
 */

/**
 * Coerce a value to a positive integer (>= 1), falling back to `dflt` on
 * anything non-finite / < 1. Used for both the concurrency arg and the env knob
 * so "0", "", "-3", "abc", NaN all degrade to the safe default rather than
 * silently disabling the pool or spawning an unbounded burst.
 */
export function toPosInt(v, dflt = 1) {
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : dflt;
}

/**
 * Resolve the shared embed-concurrency knob. ONE env var (PRISM_EMBED_CONCURRENCY)
 * tunes the whole embed fleet — the same name the wiki concept embedder already
 * honors, kept identical so an operator does not have to learn a second knob.
 * Default 1 = legacy sequential (byte-identical output).
 */
export function resolveEmbedConcurrency(env = process.env, dflt = 1) {
  return toPosInt(env && env.PRISM_EMBED_CONCURRENCY, dflt);
}

/**
 * Run `worker(item, index)` over `items` with at most `concurrency` calls in
 * flight, preserving input order in the returned results array.
 *
 * @param {Array<any>} items
 * @param {(item:any, index:number) => Promise<any>} worker
 * @param {{ concurrency?: number|string }} [opts]
 * @returns {Promise<Array<any>>} results, results[i] === await worker(items[i], i)
 * @throws the first error a worker threw (abort-on-throw); never throws if every
 *         worker returns.
 */
export async function runEmbedPool(items, worker, opts = {}) {
  if (!Array.isArray(items)) throw new TypeError("runEmbedPool: items must be an array");
  if (typeof worker !== "function") throw new TypeError("runEmbedPool: worker must be a function");

  const n = items.length;
  const results = new Array(n);
  if (n === 0) return results;

  // Never spawn more workers than there are items — a 16-wide pool over 3 items
  // is just 3 workers, and clamps the "first error" determinism at conc=1.
  const concurrency = Math.min(toPosInt(opts.concurrency, 1), n);

  let next = 0;            // index of the next item to claim (monotonic)
  let aborted = false;     // set on the first throw — stops further scheduling
  let hasError = false;    // a boolean, NOT `firstError != null` — so a worker
  let firstError;          // that throws `null`/`undefined` is still re-thrown.

  const runWorker = async () => {
    for (;;) {
      // INVARIANT: there must be NO `await` between this abort-check and the
      // `next++` claim below — otherwise a worker could claim an index in the
      // window after `aborted` flips true, breaking the conc=1 byte-identical
      // guarantee (no later item starts once an earlier one threw).
      if (aborted) return;
      const i = next++;
      if (i >= n) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        // Record the FIRST failure to settle and stop scheduling. In-flight
        // peers finish their current item (their writes, e.g. a resumable blurb
        // cache, are intentionally allowed to persist) then exit on the
        // `aborted` check. A second concurrent throw is dropped — any error is
        // enough for an all-or-nothing caller to hard-abort.
        if (!hasError) { hasError = true; firstError = e; }
        aborted = true;
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

  if (hasError) throw firstError;
  return results;
}
