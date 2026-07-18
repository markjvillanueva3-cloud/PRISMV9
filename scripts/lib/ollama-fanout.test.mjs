// scripts/lib/ollama-fanout.test.mjs
// R9 tests for the rate-limit-fix fan-out primitive. The LOAD-BEARING guarantee is BOUNDED
// CONCURRENCY (the whole reason this exists: an unbounded fan-out is what trips Anthropic's
// throttle -- the local pool must never exceed its cap) and FAIL-SOFT (one bad task must not
// reject the batch). IO (fetch) is injected -- no live Ollama needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  callOllamaOnce,
  ollamaFanout,
  ollamaFanoutWithFallback,
  classifyFanoutFailure,
  buildFanoutFallbackSignal,
  DEFAULT_FANOUT_MODEL,
  DEFAULT_CONCURRENCY,
} from "./ollama-fanout.mjs";

const okFetch = (response = "the gist") => async () => ({ ok: true, json: async () => ({ response }) });

test("defaults: gpt-oss:120b model, concurrency 3 (single-GPU-safe)", () => {
  assert.equal(DEFAULT_FANOUT_MODEL, "gpt-oss:120b");
  assert.equal(DEFAULT_CONCURRENCY, 3);
});

test("callOllamaOnce: good response -> ok + trimmed text + model", async () => {
  const r = await callOllamaOnce("hi", { fetchImpl: async () => ({ ok: true, json: async () => ({ response: "  answer  " }) }) });
  assert.equal(r.ok, true);
  assert.equal(r.text, "answer");
  assert.equal(r.model, "gpt-oss:120b");
});

test("callOllamaOnce: FAIL-SOFT on throw / non-200 / engine-error / empty -> ok:false, never throws", async () => {
  const thrown = await callOllamaOnce("x", { fetchImpl: async () => { throw new Error("down"); } });
  assert.equal(thrown.ok, false);
  assert.equal(thrown.text, "");
  assert.match(thrown.error, /down/);

  const non200 = await callOllamaOnce("x", { fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(non200.ok, false);
  assert.match(non200.error, /503/);

  const engineErr = await callOllamaOnce("x", { fetchImpl: async () => ({ ok: true, json: async () => ({ error: "model not found" }) }) });
  assert.equal(engineErr.ok, false);
  assert.match(engineErr.error, /model not found/);

  const empty = await callOllamaOnce("x", { fetchImpl: async () => ({ ok: true, json: async () => ({ response: "   " }) }) });
  assert.equal(empty.ok, false);
  assert.equal(empty.error, "empty-response");
});

test("callOllamaOnce: defaults to 127.0.0.1 NOT localhost (the IPv6 regression)", async () => {
  let calledUrl = "";
  await callOllamaOnce("x", { fetchImpl: async (url) => { calledUrl = url; return { ok: true, json: async () => ({ response: "ok" }) }; } });
  assert.match(calledUrl, /^http:\/\/127\.0\.0\.1:11434\//);
  assert.equal(calledUrl.includes("localhost"), false);
});

test("ollamaFanout: N tasks -> N results IN INPUT ORDER, ids preserved", async () => {
  const tasks = [{ id: "a", prompt: "1" }, { id: "b", prompt: "2" }, { id: "c", prompt: "3" }];
  const { results, total, okCount } = await ollamaFanout(tasks, { fetchImpl: okFetch("r"), concurrency: 2 });
  assert.equal(total, 3);
  assert.equal(okCount, 3);
  assert.deepEqual(results.map((r) => r.id), ["a", "b", "c"]);
  assert.equal(results.every((r) => r.ok && r.text === "r"), true);
});

test("ollamaFanout: bare-string tasks -> id = index", async () => {
  const { results } = await ollamaFanout(["p0", "p1"], { fetchImpl: okFetch("r"), concurrency: 2 });
  assert.deepEqual(results.map((r) => r.id), [0, 1]);
});

test("ollamaFanout: BOUNDED CONCURRENCY -- peak never exceeds the cap (the load-bearing guarantee)", async () => {
  let live = 0;
  let observedPeak = 0;
  const slowFetch = async () => {
    live++;
    if (live > observedPeak) observedPeak = live;
    await new Promise((res) => setTimeout(res, 15)); // hold the slot so overlap is real
    live--;
    return { ok: true, json: async () => ({ response: "r" }) };
  };
  const { results, peakConcurrency } = await ollamaFanout(
    Array.from({ length: 10 }, (_, i) => ({ id: i, prompt: `t${i}` })),
    { fetchImpl: slowFetch, concurrency: 3 }
  );
  assert.equal(results.length, 10);
  assert.ok(observedPeak <= 3, `observed peak ${observedPeak} exceeded cap 3`);
  assert.ok(peakConcurrency <= 3, `reported peak ${peakConcurrency} exceeded cap 3`);
  assert.ok(observedPeak >= 2, `expected real overlap (>=2), got ${observedPeak}`); // proves it DID parallelize
});

test("ollamaFanout: FAIL-SOFT -- one throwing task does NOT reject the batch; others succeed", async () => {
  let n = 0;
  const flakyFetch = async () => {
    n++;
    if (n === 2) throw new Error("task-2-down");
    return { ok: true, json: async () => ({ response: "r" }) };
  };
  const { results, okCount, total } = await ollamaFanout(
    [{ id: 0, prompt: "a" }, { id: 1, prompt: "b" }, { id: 2, prompt: "c" }],
    { fetchImpl: flakyFetch, concurrency: 1 } // concurrency 1 -> deterministic ordering of the throw
  );
  assert.equal(total, 3);
  assert.equal(okCount, 2);            // 2 of 3 succeeded despite the failure
  assert.equal(results[1].ok, false); // the 2nd task failed soft
  assert.match(results[1].error, /task-2-down/);
});

test("ollamaFanout: empty task list -> empty result, no calls", async () => {
  let called = false;
  const { results, total } = await ollamaFanout([], { fetchImpl: async () => { called = true; return { ok: true, json: async () => ({ response: "x" }) }; } });
  assert.deepEqual(results, []);
  assert.equal(total, 0);
  assert.equal(called, false);
});

test("ollamaFanout: onResult fires once per task as it completes", async () => {
  const seen = [];
  await ollamaFanout([{ id: "x", prompt: "1" }, { id: "y", prompt: "2" }], {
    fetchImpl: okFetch("r"),
    concurrency: 2,
    onResult: (res) => seen.push(res.id),
  });
  assert.equal(seen.length, 2);
  assert.deepEqual([...seen].sort(), ["x", "y"]);
});

// ── Sonnet-fallback (operator rule 2026-06-11): batch parity with ask-ollama ───────────
// The load-bearing guarantee: when Ollama is DOWN/REAPED (connection-class failure) the batch
// emits a SONNET-lane directive for the failed mechanical tasks -- NEVER Opus, and NEVER for
// content-class failures (Ollama ran, just produced nothing).

test("classifyFanoutFailure: connection-class (down/reaped/timeout) vs content-class vs none", () => {
  for (const e of ["fetch failed", "ECONNREFUSED", "connect ECONNREFUSED 127.0.0.1:11434",
                    "The operation was aborted", "request timeout", "http-503", "http-502", "http-error"]) {
    assert.equal(classifyFanoutFailure(e), "connection", `expected connection for "${e}"`);
  }
  for (const e of ["empty-response", "model not found", "http-404", "http-400"]) {
    assert.equal(classifyFanoutFailure(e), "content", `expected content for "${e}"`);
  }
  assert.equal(classifyFanoutFailure(""), "none");
  assert.equal(classifyFanoutFailure(null), "none");
});

test("buildFanoutFallbackSignal: lane is SONNET (never Opus) + carries the failed tasks + directive", () => {
  const sig = buildFanoutFallbackSignal({ failedTasks: [{ id: "a", prompt: "p1" }, { id: "b", prompt: "p2" }], total: 3, okCount: 1 });
  assert.equal(sig.lane, "sonnet");
  assert.equal(sig.ollamaUnavailable, true);
  assert.equal(sig.failedCount, 2);
  assert.equal(sig.total, 3);
  assert.equal(sig.okCount, 1);
  assert.deepEqual(sig.tasks.map((t) => t.id), ["a", "b"]);
  assert.match(sig.directive, /SONNET/);
  assert.match(sig.directive, /NOT Opus/i);
  assert.equal(/\bopus\b/i.test(sig.lane), false); // lane must NEVER be opus
});

test("ollamaFanoutWithFallback: Ollama UP -> no fallback, superset return shape preserved", async () => {
  const r = await ollamaFanoutWithFallback([{ id: "a", prompt: "1" }, { id: "b", prompt: "2" }], { fetchImpl: okFetch("r"), concurrency: 2 });
  assert.equal(r.okCount, 2);
  assert.equal(r.total, 2);              // superset: still carries ollamaFanout's fields
  assert.ok(Number.isFinite(r.peakConcurrency));
  assert.equal(r.fallback.needed, false);
  assert.deepEqual(r.fallback.tasks, []);
});

test("ollamaFanoutWithFallback: Ollama FULLY DOWN -> all tasks land in the Sonnet fallback", async () => {
  const downFetch = async () => { throw new Error("fetch failed"); }; // realistic node-fetch down message
  const r = await ollamaFanoutWithFallback([{ id: "a", prompt: "pa" }, { id: "b", prompt: "pb" }], { fetchImpl: downFetch, concurrency: 2 });
  assert.equal(r.okCount, 0);
  assert.equal(r.fallback.needed, true);
  assert.equal(r.fallback.lane, "sonnet");
  assert.equal(r.fallback.failedCount, 2);
  assert.deepEqual(r.fallback.tasks.map((t) => t.id), ["a", "b"]);
  assert.deepEqual(r.fallback.tasks.map((t) => t.prompt), ["pa", "pb"]); // prompts carried so the caller can re-run
});

test("ollamaFanoutWithFallback: PARTIAL down -> only the connection-failed task is re-routed (partial-degrade)", async () => {
  let n = 0;
  const partialFetch = async () => {
    n++;
    if (n === 2) throw new Error("connect ECONNREFUSED"); // 2nd task: daemon dropped mid-batch
    return { ok: true, json: async () => ({ response: "graded" }) };
  };
  const r = await ollamaFanoutWithFallback(
    [{ id: "a", prompt: "pa" }, { id: "b", prompt: "pb" }, { id: "c", prompt: "pc" }],
    { fetchImpl: partialFetch, concurrency: 1 } // serial -> deterministic which task throws
  );
  assert.equal(r.okCount, 2);                       // a + c succeeded locally (kept, not re-run)
  assert.equal(r.fallback.needed, true);
  assert.equal(r.fallback.failedCount, 1);
  assert.deepEqual(r.fallback.tasks.map((t) => t.id), ["b"]); // ONLY the down task re-routes
});

test("ollamaFanoutWithFallback: CONTENT failure (empty-response) -> NO fallback (Ollama ran, don't waste Sonnet)", async () => {
  const emptyFetch = async () => ({ ok: true, json: async () => ({ response: "   " }) }); // Ollama up, empty output
  const r = await ollamaFanoutWithFallback([{ id: "a", prompt: "pa" }], { fetchImpl: emptyFetch });
  assert.equal(r.okCount, 0);
  assert.equal(r.fallback.needed, false); // content-class is NOT fallback-eligible
});

test("ollamaFanoutWithFallback: MIXED connection+content failures -> only connection-class re-routes (adversarial)", async () => {
  let n = 0;
  const mixedFetch = async () => {
    n++;
    if (n === 1) throw new Error("fetch failed");                              // connection -> re-route
    if (n === 2) return { ok: true, json: async () => ({ response: "" }) };    // content (empty) -> NOT
    if (n === 3) return { ok: false, status: 503 };                           // connection (5xx) -> re-route
    return { ok: false, status: 404 };                                        // content (4xx) -> NOT
  };
  const r = await ollamaFanoutWithFallback(
    [{ id: "a", prompt: "pa" }, { id: "b", prompt: "pb" }, { id: "c", prompt: "pc" }, { id: "d", prompt: "pd" }],
    { fetchImpl: mixedFetch, concurrency: 1 }
  );
  assert.equal(r.okCount, 0);
  assert.equal(r.fallback.needed, true);
  assert.deepEqual(r.fallback.tasks.map((t) => t.id).sort(), ["a", "c"]); // only the 2 connection-class
});

test("ollamaFanoutWithFallback: empty task list -> no fallback, no calls", async () => {
  let called = false;
  const r = await ollamaFanoutWithFallback([], { fetchImpl: async () => { called = true; return { ok: true, json: async () => ({ response: "x" }) }; } });
  assert.equal(r.total, 0);
  assert.equal(called, false);
  assert.equal(r.fallback.needed, false);
});
