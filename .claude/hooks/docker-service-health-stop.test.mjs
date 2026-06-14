#!/usr/bin/env node
/**
 * Hermetic suite for docker-service-health-stop.mjs.
 * Tests the pure advisory builder + the always-{continue:true} hook contract
 * (the hook must NEVER block Stop, even with no Docker / a downed stack).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { buildDockerAdvisory, buildOllamaAdvisory, ollamaNativeProbe, resolveCachedOllamaProbe, resolveProbeBudget } from "./docker-service-health-stop.mjs";

const HOOK = path.resolve(".claude/hooks/docker-service-health-stop.mjs");

test("buildDockerAdvisory: null when healthy / empty / malformed (no false alarms)", () => {
  assert.equal(buildDockerAdvisory(null), null);
  assert.equal(buildDockerAdvisory({ healthy: true }), null);
  assert.equal(buildDockerAdvisory({ healthy: false, down: [] }), null);   // down=false but empty list
  assert.equal(buildDockerAdvisory({ healthy: false }), null);             // no down array
});

test("buildDockerAdvisory: names downed services + the renamed real name + the --fix path", () => {
  const adv = buildDockerAdvisory({
    healthy: false, total: 4, downCount: 1,
    down: [{ service: "prism-qdrant", state: "created", renamed: true, realName: "fe30e81bd0ed_prism-qdrant" }],
  });
  assert.match(adv, /1\/4 service\(s\) DOWN/);
  assert.match(adv, /prism-qdrant=created \(real: fe30e81bd0ed_prism-qdrant\)/);
  assert.match(adv, /docker-service-health-check\.mjs --fix/);
  assert.match(adv, /PSN substrate/);
});

test("buildDockerAdvisory: caps the listed services at 5", () => {
  const down = Array.from({ length: 8 }, (_, i) => ({ service: "prism-s" + i, state: "exited" }));
  const adv = buildDockerAdvisory({ healthy: false, total: 8, down });
  assert.equal((adv.match(/prism-s\d=exited/g) || []).length, 5); // only first 5 named
  assert.match(adv, /8\/8 service\(s\) DOWN/);
});

test("buildOllamaAdvisory: silent when reachable / missing / malformed (no cry-wolf)", () => {
  assert.equal(buildOllamaAdvisory(null), null);
  assert.equal(buildOllamaAdvisory(undefined), null);
  assert.equal(buildOllamaAdvisory({ reachable: true, modelCount: 10 }), null);
  assert.equal(buildOllamaAdvisory({}), null);                       // unknown -> NOT asserted down
  assert.equal(buildOllamaAdvisory({ reachable: undefined }), null); // probe never ran -> silent
});

test("buildOllamaAdvisory: fires only on a confident down; names :11434 + the fix + the degraded substrate", () => {
  const adv = buildOllamaAdvisory({ reachable: false, modelCount: 0, error: "connect ECONNREFUSED 127.0.0.1:11434" });
  assert.match(adv, /:11434.*UNREACHABLE/);
  assert.match(adv, /ECONNREFUSED/);                       // the actionable cause is surfaced
  assert.match(adv, /PRISM Ollama Serve|ollama serve/);    // the fix
  assert.match(adv, /api\/tags/);                          // the verify step
  assert.match(adv, /token-economy|offload/);              // WHY it matters (R9 intent)
});

test("buildOllamaAdvisory: truncates a runaway error string (bounded advisory)", () => {
  const adv = buildOllamaAdvisory({ reachable: false, error: "x".repeat(500) });
  const seg = adv.match(/\(x+\)/);
  assert.ok(seg && seg[0].length <= 122, "error slice capped at 120 inside the parens");
});

// ollamaNativeProbe IO branches (injected fetch -- R15: happy + 3 failure modes)
test("ollamaNativeProbe: healthy daemon -> reachable + model count, no error", async () => {
  const r = await ollamaNativeProbe(async () => ({ ok: true, json: async () => ({ models: [1, 2, 3] }) }));
  assert.equal(r.reachable, true);
  assert.equal(r.modelCount, 3);
  assert.equal(r.error, null);
});

test("ollamaNativeProbe: non-2xx -> confident down with HTTP status (no throw)", async () => {
  const r = await ollamaNativeProbe(async () => ({ ok: false, status: 503 }));
  assert.equal(r.reachable, false);
  assert.match(r.error, /HTTP 503/);
});

test("ollamaNativeProbe: fetch throws / refused -> reachable:false, cause captured (fail-soft)", async () => {
  const r = await ollamaNativeProbe(async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:11434"); });
  assert.equal(r.reachable, false);
  assert.match(r.error, /ECONNREFUSED/);
});

test("ollamaNativeProbe: reachable daemon with unparseable body -> still UP, modelCount 0 (no cry-wolf)", async () => {
  const r = await ollamaNativeProbe(async () => ({ ok: true, json: async () => { throw new Error("bad json"); } }));
  assert.equal(r.reachable, true);   // a reachable daemon is up even if the body is junk
  assert.equal(r.modelCount, 0);
});

// Abort/timeout = UNKNOWN, never DOWN (papa-verified 2026-06-12: /api/tags takes
// >2.5s while UP under fleet load; only a refusal is a confident outage signal).
test("ollamaNativeProbe: abort/timeout -> UNKNOWN (silent), never a DOWN claim (busy != down)", async () => {
  const abortErr = Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
  const r = await ollamaNativeProbe(async () => { throw abortErr; });
  assert.equal(r.reachable, undefined, "abort must map to unknown, not false");
  assert.equal(buildOllamaAdvisory(r), null, "an aborted probe must not cry wolf");
  // The refusal branch is UNCHANGED by the abort split (regression pin):
  const refused = await ollamaNativeProbe(async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:11434"); });
  assert.equal(refused.reachable, false, "a refused connection stays a confident DOWN");
});

test("resolveCachedOllamaProbe: cached DOWN + re-probe ABORTS -> UNKNOWN replaces the stale DOWN (wedge cannot pin the alarm)", async () => {
  const cached = { ollamaProbe: { reachable: false, error: "old outage" } };
  const r = await resolveCachedOllamaProbe(cached, async () => ({ reachable: undefined, modelCount: 0, error: "This operation was aborted" }));
  assert.equal(r.refreshed, true, "the unknown verdict must be cached so later ticks stay zero-cost");
  assert.equal(buildOllamaAdvisory(r.probe), null, "unknown is silent -- the stale DOWN no longer re-emits");
});

test("resolveProbeBudget: garbage/empty/zero/negative/sub-second knob values fall back (a tiny budget is a cry-wolf machine)", () => {
  assert.equal(resolveProbeBudget(undefined), 8000);
  assert.equal(resolveProbeBudget(""), 8000);
  assert.equal(resolveProbeBudget("abc"), 8000);
  assert.equal(resolveProbeBudget("0"), 8000);
  assert.equal(resolveProbeBudget("-5"), 8000, "a negative budget would abort instantly -> permanent false-DOWN");
  assert.equal(resolveProbeBudget("250"), 8000, "sub-second floor: guaranteed-abort budgets rejected");
  assert.equal(resolveProbeBudget("12000"), 12000, "a sane operator override is honored");
});

// resolveCachedOllamaProbe -- the throttled-tick recovery path (slot:zulu 2026-06-12).
// WHY (R9): a cached DOWN verdict used to be re-emitted un-probed for the whole
// 5-min throttle window, crying wolf fleet-wide after the operator restarted the
// daemon (observed live: 3 false UNREACHABLE ticks). Down must re-probe; healthy
// must stay zero-cost.
test("resolveCachedOllamaProbe: cached DOWN + live recovery -> refreshed verdict clears the advisory", async () => {
  const cached = { healthy: true, ollamaProbe: { reachable: false, error: "This operation was aborted" } };
  let calls = 0;
  const r = await resolveCachedOllamaProbe(cached, async () => { calls++; return { reachable: true, modelCount: 5, error: null }; });
  assert.equal(calls, 1, "a cached DOWN verdict must trigger exactly one live re-probe");
  assert.equal(r.refreshed, true);
  assert.equal(buildOllamaAdvisory(r.probe), null, "the cry-wolf tick is gone the moment the daemon answers");
});

test("resolveCachedOllamaProbe: cached DOWN + still down -> advisory persists with the FRESH cause", async () => {
  const cached = { ollamaProbe: { reachable: false, error: "stale-cause" } };
  const r = await resolveCachedOllamaProbe(cached, async () => ({ reachable: false, modelCount: 0, error: "connect ECONNREFUSED 127.0.0.1:11434" }));
  assert.equal(r.refreshed, true);
  assert.match(buildOllamaAdvisory(r.probe), /ECONNREFUSED/, "a real outage keeps firing, with the live cause");
});

test("resolveCachedOllamaProbe: healthy / absent / never-ran cache NEVER re-probes (zero-cost common path)", async () => {
  let calls = 0;
  const probe = async () => { calls++; return { reachable: true }; };
  const healthy = await resolveCachedOllamaProbe({ ollamaProbe: { reachable: true, modelCount: 3 } }, probe);
  assert.equal(healthy.refreshed, false);
  assert.equal(healthy.probe.modelCount, 3, "healthy cached verdict passes through untouched");
  const absent = await resolveCachedOllamaProbe(null, probe);
  assert.equal(absent.refreshed, false);
  assert.equal(buildOllamaAdvisory(absent.probe), null);
  const neverRan = await resolveCachedOllamaProbe({ ollamaProbe: { reachable: undefined } }, probe);
  assert.equal(neverRan.refreshed, false, "unknown verdict is NOT treated as down (no cry-wolf)");
  assert.equal(calls, 0, "no live probe on any healthy/absent/unknown path");
});

test("hook contract: piping a Stop event ALWAYS yields {continue:true} (never blocks)", () => {
  // Disabled knob → silent {continue:true}. Proves the hook is import-safe + the
  // entry path emits the non-blocking verdict (no Docker dependency in this path).
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "Stop" }),
    encoding: "utf8",
    env: { ...process.env, PRISM_DOCKER_HEALTH_ADVISORY_DISABLE: "1" },
    timeout: 10000,
  });
  const j = JSON.parse(out);
  assert.equal(j.continue, true);
});
