// Tests for galaxy-synthesis-refresh.mjs (amplifier #2 — incremental compounding).
// Hermetic: injected gather + stored-hash readers; the real computeSourceHash runs.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { readStoredHash, classifyGalaxy, parseArgs, stripEmbeddingVectors, executeRegenAndCascade, resolveChatId, resolveModelForRun } from "./galaxy-synthesis-refresh.mjs";
import { computeSourceHash } from "./galaxy-reflection-synthesis.mjs";

const MEMS = [
  { namespace: "reference", name: "a" },
  { namespace: "feedback", name: "b" },
  { namespace: "project", name: "c" },
];

describe("computeSourceHash (the freshness fingerprint)", () => {
  it("is deterministic + order-independent (sorted keys)", () => {
    const h1 = computeSourceHash(MEMS);
    const h2 = computeSourceHash([...MEMS].reverse());
    assert.equal(h1, h2);
    assert.match(h1, /^[0-9a-f]{12}$/);
  });
  it("changes when a memory is added/removed (the staleness signal)", () => {
    const h1 = computeSourceHash(MEMS);
    const h2 = computeSourceHash([...MEMS, { namespace: "reference", name: "d" }]);
    assert.notEqual(h1, h2);
  });
  it("empty/non-array → stable hash, no throw", () => {
    assert.equal(computeSourceHash([]), computeSourceHash(null));
  });
  it("is CONTENT-sensitive — same keys, different description/opening → different hash (Reviewer-B P2-1)", () => {
    const base = [{ namespace: "reference", name: "a", description: "v1", opening: "o1" }];
    const edited = [{ namespace: "reference", name: "a", description: "v2-EDITED", opening: "o1" }];
    assert.notEqual(computeSourceHash(base), computeSourceHash(edited), "a content edit (same filename) must flip the hash");
    const openingEdit = [{ namespace: "reference", name: "a", description: "v1", opening: "o1-EDITED" }];
    assert.notEqual(computeSourceHash(base), computeSourceHash(openingEdit));
  });
});

describe("stripEmbeddingVectors", () => {
  it("removes only the named galaxies' synthesis vectors, writes atomically", () => {
    const sidecar = { records: [
      { key: "patterns/mill_synthesis" }, { key: "patterns/cad_synthesis" },
      { key: "patterns/_meta_synthesis" }, { key: "reference/foo" },
    ] };
    let written = null; const renames = [];
    const r = stripEmbeddingVectors(["mill", "cad"], "/emb.json", {
      existsImpl: () => true,
      readFileImpl: () => JSON.stringify(sidecar),
      writeFileImpl: (p, d) => { written = JSON.parse(d); },
      renameImpl: (from, to) => renames.push([from, to]),
    });
    assert.equal(r.stripped, 2);
    const keys = written.records.map((x) => x.key);
    assert.ok(!keys.includes("patterns/mill_synthesis") && !keys.includes("patterns/cad_synthesis"), "regenerated galaxies dropped");
    assert.ok(keys.includes("patterns/_meta_synthesis") && keys.includes("reference/foo"), "other records kept");
    assert.equal(renames[0][1], "/emb.json");
    assert.ok(renames[0][0].includes(".tmp."));
  });
  it("no-op (no throw) when the sidecar is absent or malformed", () => {
    assert.equal(stripEmbeddingVectors(["x"], "/e", { existsImpl: () => false }).stripped, 0);
    assert.equal(stripEmbeddingVectors(["x"], "/e", { existsImpl: () => true, readFileImpl: () => "not json" }).stripped, 0);
  });
});

describe("executeRegenAndCascade (main() orchestration oracle)", () => {
  const needsRegen = [
    { galaxy: "mill", status: "stale", currentHash: "h1", memCount: 24, memories: [{ namespace: "reference", name: "m" }] },
    { galaxy: "cad", status: "new", currentHash: "h2", memCount: 24, memories: [{ namespace: "reference", name: "c" }] },
  ];
  function fakes(overrides = {}) {
    const calls = { exec: [], strip: [], write: [] };
    return {
      calls,
      deps: {
        synthesizeImpl: async () => "## Recurring patterns\nreal synthesis text that is long enough to pass the 40-char gate",
        writeImpl: ({ galaxy }) => calls.write.push(galaxy),
        stripImpl: (g) => calls.strip.push(g),
        execImpl: (script, extra = []) => calls.exec.push(`${script.split("/").pop()} ${extra.join(" ")}`.trim()),
        nowImpl: () => "2026-05-29T00:00:00Z",
        logImpl: () => {},
        ...overrides,
      },
    };
  }

  it("P1 ORDER: regen → strip → index → embed → meta (sidecars rebuilt BEFORE L2)", async () => {
    const { calls, deps } = fakes();
    const r = await executeRegenAndCascade({ needsRegen, ollamaUp: true, model: "m", ...deps });
    assert.equal(r.regenerated, 2);
    assert.deepEqual(r.steps, ["strip", "index", "embed", "meta"], "L2 must run AFTER the sidecar rebuild, not against stale vectors");
    assert.deepEqual(calls.strip[0].sort(), ["cad", "mill"], "stripped exactly the regenerated galaxies");
    assert.deepEqual(calls.exec, ["build-memory-index-sidecar.mjs", "build-memory-embeddings-sidecar.mjs --resume", "galaxy-meta-synthesis.mjs --model m"]);
    assert.equal(r.sidecarRebuild, "ok");
    assert.equal(r.cascade, "ok");
  });

  it("R12: L2 cascade is SKIPPED when the sidecar rebuild fails (never cluster on stale vectors)", async () => {
    const { calls, deps } = fakes({
      execImpl: (script) => { if (script.includes("index")) throw new Error("disk full"); },
    });
    const r = await executeRegenAndCascade({ needsRegen, ollamaUp: true, model: "m", ...deps });
    assert.match(r.sidecarRebuild, /^failed/);
    assert.match(r.cascade, /skipped: sidecar-rebuild-failed/);
    assert.ok(!r.steps.includes("meta"), "L2 must NOT run on stale vectors");
  });

  it("deferred (no regen, no rebuild, no cascade) when ollama generation is down", async () => {
    const { deps } = fakes();
    const r = await executeRegenAndCascade({ needsRegen, ollamaUp: false, model: "m", ...deps });
    assert.equal(r.regenerated, 0);
    assert.deepEqual(r.deferred.sort(), ["cad", "mill"]);
    assert.deepEqual(r.steps, []);
  });

  it("--no-cascade rebuilds sidecars but skips L2", async () => {
    const { calls, deps } = fakes();
    const r = await executeRegenAndCascade({ needsRegen, ollamaUp: true, model: "m", noCascade: true, ...deps });
    assert.deepEqual(r.steps, ["strip", "index", "embed"]);
    assert.ok(!calls.exec.some((c) => c.includes("meta")), "L2 not run under --no-cascade");
  });

  it("a short/empty synthesis counts as a failure, not a silent write", async () => {
    const { calls, deps } = fakes({ synthesizeImpl: async () => "tiny" });
    const r = await executeRegenAndCascade({ needsRegen, ollamaUp: true, model: "m", ...deps });
    assert.equal(r.regenerated, 0);
    assert.equal(r.failed, 2);
    assert.equal(calls.write.length, 0, "short synthesis is never written");
    assert.deepEqual(r.steps, [], "no rebuild when nothing regenerated");
  });

  // ── rank-6 fleet-coordination gate (claim-or-skip) ──────────────────────────
  it("FLEET: a peer-claimed galaxy is SKIPPED + excluded from the sidecar strip", async () => {
    const { calls, deps } = fakes();
    const r = await executeRegenAndCascade({
      needsRegen, ollamaUp: true, model: "m",
      claimImpl: (g) => (g === "mill" ? { ok: false, conflict: { chatId: "claude-peer1234" } } : { ok: true }),
      ...deps,
    });
    assert.equal(r.regenerated, 1);
    assert.deepEqual(r.skipped, ["mill"]);
    assert.deepEqual(calls.write, ["cad"], "peer-claimed galaxy never written");
    assert.deepEqual(calls.strip[0], ["cad"], "skipped galaxy MUST NOT be stripped — would drop the peer's fresh vector");
  });

  it("FLEET: all galaxies peer-claimed → no rebuild, no cascade, exit-clean", async () => {
    const { calls, deps } = fakes();
    const r = await executeRegenAndCascade({
      needsRegen, ollamaUp: true, model: "m",
      claimImpl: () => ({ ok: false, conflict: { chatId: "claude-peer1234" } }),
      ...deps,
    });
    assert.equal(r.regenerated, 0);
    assert.deepEqual(r.skipped.sort(), ["cad", "mill"]);
    assert.deepEqual(r.steps, [], "peer owns its own rebuild — we MUST NOT rebuild on an all-skipped run");
    assert.equal(r.sidecarRebuild, "skipped");
    assert.equal(calls.strip.length, 0, "nothing stripped when nothing regenerated");
  });

  it("FLEET: releaseImpl runs for every CLAIMED galaxy (success path), never for a skipped one", async () => {
    const released = [];
    const { deps } = fakes();
    await executeRegenAndCascade({
      needsRegen, ollamaUp: true, model: "m",
      claimImpl: (g) => (g === "mill" ? { ok: false, conflict: { chatId: "x-peer1234" } } : { ok: true }),
      releaseImpl: (g) => released.push(g),
      ...deps,
    });
    assert.deepEqual(released, ["cad"], "released only the galaxy we actually claimed (mill was skipped → never claimed)");
  });

  it("FLEET: a claimed galaxy is released even when its synthesis FAILS (peer/next-run can retry)", async () => {
    const released = [];
    const { deps } = fakes({ synthesizeImpl: async () => "tiny" }); // < 40 chars → throws → counted failed
    const r = await executeRegenAndCascade({
      needsRegen, ollamaUp: true, model: "m",
      claimImpl: () => ({ ok: true }),
      releaseImpl: (g) => released.push(g),
      ...deps,
    });
    assert.equal(r.failed, 2);
    assert.deepEqual(released.sort(), ["cad", "mill"], "finally releases on the failure path too — no leaked claim");
  });
});

describe("resolveChatId (fleet-coordination chatId resolution)", () => {
  const VALID = "claude-abcd1234";
  it("prefers a valid --chat-id arg", () => {
    assert.equal(resolveChatId({ chatId: VALID }, { env: {}, pid: 5 }), VALID);
  });
  it("falls back to a valid PRISM_CHAT_ID env when no arg", () => {
    assert.equal(resolveChatId({ chatId: null }, { env: { PRISM_CHAT_ID: VALID }, pid: 5 }), VALID);
  });
  it("IGNORES an invalid arg (warns) and falls through to a valid env — not silently passed", () => {
    const warns = [];
    const got = resolveChatId({ chatId: "x" }, { env: { PRISM_CHAT_ID: VALID }, pid: 5, warn: (s) => warns.push(s) });
    assert.equal(got, VALID);
    assert.ok(warns.some((w) => /ignoring invalid chatId/.test(w)), "invalid arg warned (would otherwise fail-open every ledger call → dead gate)");
  });
  it("invalid arg AND invalid env → synthetic synth-<pid> (warns), gate stays functional", () => {
    const warns = [];
    const got = resolveChatId({ chatId: "!!bad" }, { env: { PRISM_CHAT_ID: "!!alsobad" }, pid: 4242, warn: (s) => warns.push(s) });
    assert.equal(got, "synth-4242");
    assert.ok(warns.length >= 1);
  });
  it("neither provided → synth-<pid>, always CHAT_ID_RE-valid", () => {
    const got = resolveChatId({ chatId: null }, { env: {}, pid: 99999 });
    assert.equal(got, "synth-99999");
    assert.match(got, /^[A-Za-z][A-Za-z0-9_-]{3,79}$/, "synthetic id never silently dies on the regex");
  });
});

describe("resolveModelForRun (host-aware synthesis model — token-savings wiring)", () => {
  it("an EXPLICIT --model flag overrides the resolver (operator intent wins)", async () => {
    const args = parseArgs(["--model", "qwen2.5-coder:32b"]); // == DEFAULT_MODEL on purpose
    let seenOverride = "UNSET";
    const m = await resolveModelForRun(args, ["node", "script", "--model", "qwen2.5-coder:32b"], {
      resolveImpl: async ({ override }) => { seenOverride = override; return { model: override || "RESOLVER-FALLBACK", source: "override" }; },
    });
    // The override must be threaded through (NOT detected via args.model !== DEFAULT_MODEL —
    // parseArgs bakes DEFAULT_MODEL, so an explicit default would otherwise be missed).
    assert.equal(seenOverride, "qwen2.5-coder:32b", "explicit --model passed as override even when == DEFAULT_MODEL");
    assert.equal(m, "qwen2.5-coder:32b");
  });

  it("NO --model flag → override is null → resolver decides (host-aware lift)", async () => {
    const args = parseArgs([]); // args.model is the baked DEFAULT_MODEL
    let seenOverride = "UNSET";
    const m = await resolveModelForRun(args, ["node", "script"], {
      resolveImpl: async ({ override, fallback }) => {
        seenOverride = override;
        assert.equal(fallback, "qwen2.5-coder:32b", "DEFAULT_MODEL is passed as the resolver fallback");
        return { model: "qwen2.5-coder:32b", source: "blackwell-best" }; // host-aware lift
      },
    });
    assert.equal(seenOverride, null, "no explicit flag → override null → resolver is free to lift the model");
    assert.equal(m, "qwen2.5-coder:32b", "resolver-chosen model is returned for threading");
  });

  it("FALLBACK preserved when the resolver yields nothing (ollama down / weak host)", async () => {
    const args = parseArgs([]);
    const m = await resolveModelForRun(args, ["node", "script"], {
      resolveImpl: async ({ fallback }) => ({ model: fallback, source: "fallback", reason: "no installed models" }),
    });
    assert.equal(m, "qwen2.5-coder:32b", "degrades to DEFAULT_MODEL when the resolver has nothing better");
  });

  it("guards a resolver returning an empty/undefined model → DEFAULT_MODEL (never an empty model into preflight)", async () => {
    const args = parseArgs([]);
    const m1 = await resolveModelForRun(args, ["node", "script"], { resolveImpl: async () => ({ model: "" }) });
    const m2 = await resolveModelForRun(args, ["node", "script"], { resolveImpl: async () => ({}) });
    assert.equal(m1, "qwen2.5-coder:32b");
    assert.equal(m2, "qwen2.5-coder:32b");
  });

  it("the resolved model is what would be threaded into the synth/preflight call (end-to-end shape)", async () => {
    // Simulate the main() seam: resolve once, then both preflight + executeRegenAndCascade use it.
    const args = parseArgs([]);
    const resolved = await resolveModelForRun(args, ["node", "script"], {
      resolveImpl: async () => ({ model: "qwen2.5-coder:32b", source: "router", tier: "best" }),
    });
    // Thread it into the orchestration oracle and assert the SAME model reaches the meta cascade.
    const exec = [];
    const r = await executeRegenAndCascade({
      needsRegen: [{ galaxy: "mill", status: "stale", currentHash: "h", memCount: 24, memories: [{ namespace: "reference", name: "m" }] }],
      ollamaUp: true, model: resolved,
      synthesizeImpl: async ({ model }) => { assert.equal(model, "qwen2.5-coder:32b", "resolved model flows into generation"); return "## patterns\n" + "x".repeat(60); },
      writeImpl: () => {},
      stripImpl: () => {},
      execImpl: (script, extra = []) => exec.push(`${script.split("/").pop()} ${extra.join(" ")}`.trim()),
      nowImpl: () => "2026-06-04T00:00:00Z",
      logImpl: () => {},
    });
    assert.equal(r.regenerated, 1);
    assert.ok(exec.includes("galaxy-meta-synthesis.mjs --model qwen2.5-coder:32b"), "the resolved model is threaded into the L2 meta cascade too");
  });
});

describe("readStoredHash", () => {
  it("parses sourceHash from synthesis frontmatter", () => {
    const body = `---\nname: mill_synthesis\nsourceHash: abc123def456\nadvisoryOnly: true\n---\n# body`;
    const h = readStoredHash("mill", "/p", { existsImpl: () => true, readFileImpl: () => body });
    assert.equal(h, "abc123def456");
  });
  it("returns null when the synthesis file is absent", () => {
    assert.equal(readStoredHash("nope", "/p", { existsImpl: () => false }), null);
  });
  it("returns null when present but has no sourceHash line (legacy/untracked)", () => {
    const body = `---\nname: old_synthesis\nadvisoryOnly: true\n---\n# body`;
    assert.equal(readStoredHash("old", "/p", { existsImpl: () => true, readFileImpl: () => body }), null);
  });
  it("returns null (no throw) on read error", () => {
    assert.equal(readStoredHash("x", "/p", { existsImpl: () => true, readFileImpl: () => { throw new Error("EIO"); } }), null);
  });
});

describe("classifyGalaxy (fresh | stale | new | thin)", () => {
  const gather = () => ({ memories: MEMS });
  it("FRESH when current hash === stored hash", () => {
    const c = classifyGalaxy("g", { gatherImpl: gather, readStoredImpl: () => computeSourceHash(MEMS) });
    assert.equal(c.status, "fresh");
  });
  it("STALE when stored hash differs (memories changed)", () => {
    const c = classifyGalaxy("g", { gatherImpl: gather, readStoredImpl: () => "deadbeef0000" });
    assert.equal(c.status, "stale");
    assert.ok(Array.isArray(c.memories), "stale carries memories for regen without a 2nd gather");
  });
  it("STALE when stored hash is the legacy 'none' sentinel", () => {
    const c = classifyGalaxy("g", { gatherImpl: gather, readStoredImpl: () => "none" });
    assert.equal(c.status, "stale");
  });
  it("NEW when no stored hash (no synthesis / untracked)", () => {
    const c = classifyGalaxy("g", { gatherImpl: gather, readStoredImpl: () => null });
    assert.equal(c.status, "new");
    assert.ok(Array.isArray(c.memories));
  });
  it("THIN when fewer than the minimum memories (can't synthesize)", () => {
    const c = classifyGalaxy("g", { gatherImpl: () => ({ memories: [{ namespace: "reference", name: "only" }] }), readStoredImpl: () => null });
    assert.equal(c.status, "thin");
    assert.equal(c.memCount, 1);
  });
  it("tolerates a gather impl returning null", () => {
    const c = classifyGalaxy("g", { gatherImpl: () => null, readStoredImpl: () => null });
    assert.equal(c.status, "thin");
  });
});

describe("parseArgs", () => {
  it("parses flags", () => {
    const a = parseArgs(["--dry-run", "--json", "--no-cascade", "--model", "m", "--topk", "8"]);
    assert.equal(a.dryRun, true);
    assert.equal(a.json, true);
    assert.equal(a.noCascade, true);
    assert.equal(a.model, "m");
    assert.equal(a.topK, 8);
  });
  it("topK floors at 4", () => {
    assert.equal(parseArgs(["--topk", "1"]).topK, 4);
  });
});
