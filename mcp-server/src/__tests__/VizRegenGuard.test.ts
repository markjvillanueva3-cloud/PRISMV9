/**
 * VizRegenGuard.test.ts — U-CLEANUP-F5.
 *
 * Tests scripts/viz-regen-guard.mjs — the centralized, dependency-aware gate in
 * front of regen-wiki-from-viz.mjs. Two behaviors under test:
 *   1. hash gate keyed on the graph's CONTENT (the generatedAt-stripped meta
 *      header) + the wiki generator scripts — NOT the raw churning graph.json
 *   2. staleness REFUSAL when system-graph.json is missing or >24h old
 *
 * Isolation: the script is pure ESM with an isDirectRun guard, so importing it
 * does not run main(). Every helper takes an explicit `root`; guardedRegen takes
 * injectable `spawn` + path options + `nowMs` — so the 8-min orchestrator is
 * never invoked and time is deterministic. The CLI block (H) spawns the REAL
 * script with --check, which is read-only (no spawn, no persist) and safe.
 *
 * Real-value tests only — every assertion checks concrete behavior / exact values.
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-F5
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import cp from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname_test = path.dirname(fileURLToPath(import.meta.url));
const GUARD_PATH = path.resolve(__dirname_test, "../../../scripts/viz-regen-guard.mjs");
const guard = await import(pathToFileURL(GUARD_PATH).href);
const {
  graphContentSignature, resolveGlob, manifestEntrySignature, computeManifestHash,
  checkStaleInputs, guardedRegen, renderHuman, STALE_THRESHOLD_MS, DEP_MANIFEST,
} = guard;

const HOUR_MS = 3_600_000;

let TMP: string;
beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "f5-test-")); });
afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

// write a file under TMP, optionally backdating its mtime by `ageMs`
function w(rel: string, content = "x", ageMs = 0): string {
  const abs = path.join(TMP, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  if (ageMs > 0) {
    const t = (Date.now() - ageMs) / 1000;
    fs.utimesSync(abs, t, t);
  }
  return abs;
}
// a realistic system-graph.json: schemaVersion + generatedAt + meta.headline +
// the real top-level "nodes":[ array. `genAt` and `wired` are the two knobs.
function writeGraph(rel: string, genAt: string, wired: number, ageMs = 0): string {
  const header = JSON.stringify({ schemaVersion: 1, generatedAt: genAt, meta: { headline: { nodes: 110375, enginesWired: wired } } }).slice(0, -1);
  const nodes = Array.from({ length: 200 }, (_, i) => JSON.stringify({ id: "n" + i, layer: "L5" })).join(",");
  return w(rel, `${header},"nodes":[${nodes}]}`, ageMs);
}
// a spawn stub that records calls and returns a configurable status
function spawnStub(status = 0) {
  const calls: { cmd: string; args: string[] }[] = [];
  const fn = (cmd: string, args: string[]) => { calls.push({ cmd, args }); return { status, stdout: "ok", stderr: status ? "boom" : "" }; };
  return { fn, calls };
}

// ════════════════════════════════════════════════════════════════════════════
// A. graphContentSignature — the F5 core primitive
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.graphContentSignature", () => {
  it("is STABLE across a generatedAt-only rewrite — even when the new timestamp is a different length", () => {
    const g = writeGraph("graph.json", "2026-05-14T00:00:00Z", 2362);
    const sig1 = graphContentSignature(g);
    writeGraph("graph.json", "2026-05-14T23:59:59-a-much-longer-cosmetic-timestamp", 2362);
    const sig2 = graphContentSignature(g);
    expect(sig1).toBe(sig2); // F5 core: a cosmetic re-timestamp must not move the hash
    expect(sig1).not.toBe("missing");
    expect(sig1).not.toBe("unreadable");
  });

  it("MOVES when the graph's headline counts change (real content change)", () => {
    const g = writeGraph("graph.json", "2026-05-14T00:00:00Z", 2362);
    const before = graphContentSignature(g);
    writeGraph("graph.json", "2026-05-14T00:00:00Z", 9999); // enginesWired changed
    expect(graphContentSignature(g)).not.toBe(before);
  });

  it("returns 'missing' for an absent file", () => {
    expect(graphContentSignature(path.join(TMP, "nope.json"))).toBe("missing");
  });

  it("STABLE on a graph with a LARGE meta header (>64KB) across a generatedAt rewrite — the real-world case", () => {
    // The real system-graph.json has a meta header that exceeds any reasonable
    // head budget (meta.roadmap.phases alone can exceed 16KB). A full-file
    // streaming hash with first-chunk generatedAt stripping must be stable
    // across genAt rewrite REGARDLESS of meta size.
    const bigMeta = Array.from({ length: 1000 }, (_, i) => JSON.stringify({ i, name: "item-" + i, desc: "x".repeat(80) })).join(",");
    const mkBig = (genAt: string, wired: number) =>
      `{"schemaVersion":1,"generatedAt":"${genAt}","meta":{"headline":{"enginesWired":${wired}},"phases":[${bigMeta}]},"nodes":[{"id":"n1"},{"id":"n2"}]}`;
    const g = w("big.json", mkBig("ts-A", 5));
    const big1 = graphContentSignature(g);
    w("big.json", mkBig("a much longer cosmetic timestamp string here ts-B", 5)); // genAt-only
    expect(graphContentSignature(g)).toBe(big1);
    w("big.json", mkBig("ts-A", 9)); // real headline change
    expect(graphContentSignature(g)).not.toBe(big1);
  });

  it("MOVES on a node-content change — the original P0 case a head-only hash would silently miss", () => {
    // A change to data PAST any reasonable head boundary must be detected. Two
    // graphs with identical meta but different node-array contents → different
    // signatures (the full file is hashed, not just the header).
    const a = writeGraph("a.json", "ts", 2362); // 200 nodes (writeGraph default)
    const sigA = graphContentSignature(a);
    // hand-build a graph with the SAME header but a completely different node array
    const sameHeader = JSON.stringify({ schemaVersion: 1, generatedAt: "ts", meta: { headline: { nodes: 110375, enginesWired: 2362 } } }).slice(0, -1);
    const b = w("b.json", `${sameHeader},"nodes":[${JSON.stringify({ id: "completely-different-content" })}]}`);
    expect(graphContentSignature(b)).not.toBe(sigA);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// B. resolveGlob
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.resolveGlob", () => {
  it("matches files by prefix+suffix and returns them sorted", () => {
    w("s/generate-z.mjs"); w("s/generate-a.mjs"); w("s/build-x.mjs"); w("s/generate-m.mjs");
    const m = resolveGlob(path.join(TMP, "s", "generate-*.mjs"));
    expect(m.map((p: string) => path.basename(p))).toEqual(["generate-a.mjs", "generate-m.mjs", "generate-z.mjs"]);
  });

  it("returns [] when no file matches the pattern", () => {
    w("s/other.mjs");
    expect(resolveGlob(path.join(TMP, "s", "generate-*.mjs"))).toEqual([]);
  });

  it("ADVERSARIAL: a non-glob path is a literal existence check", () => {
    const f = w("s/literal.mjs");
    expect(resolveGlob(f)).toEqual([f]);
    expect(resolveGlob(path.join(TMP, "s", "missing.mjs"))).toEqual([]);
  });

  it("does not match a file shorter than prefix+suffix combined", () => {
    w("s/gen.mjs");
    expect(resolveGlob(path.join(TMP, "s", "generate-*.mjs"))).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// C. manifestEntrySignature
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.manifestEntrySignature", () => {
  it("encodes a graph-content entry via the content signature", () => {
    writeGraph("graph.json", "ts", 2362);
    const sig = manifestEntrySignature({ rel: "graph.json", kind: "graph-content" }, TMP);
    expect(sig).toMatch(/^graph:graph\.json:[0-9a-f]{24}$/);
  });

  it("encodes a missing graph-content entry as graph:<rel>:missing", () => {
    expect(manifestEntrySignature({ rel: "graph.json", kind: "graph-content" }, TMP)).toBe("graph:graph.json:missing");
  });

  it("encodes file size+mtime", () => {
    w("f.txt", "hello");
    expect(manifestEntrySignature({ rel: "f.txt", kind: "file" }, TMP)).toMatch(/^file:f\.txt:5:\d+$/);
  });

  it("encodes a missing file explicitly", () => {
    expect(manifestEntrySignature({ rel: "gone.txt", kind: "file" }, TMP)).toBe("file:gone.txt:missing");
  });

  it("encodes a glob group and moves when a matched file's content changes", () => {
    w("s/generate-a.mjs", "v1");
    const sig1 = manifestEntrySignature({ rel: "s/generate-*.mjs", kind: "glob" }, TMP);
    expect(sig1).toMatch(/^glob:s\/generate-\*\.mjs:[0-9a-f]{16}$/);
    w("s/generate-a.mjs", "v2-longer-content");
    expect(manifestEntrySignature({ rel: "s/generate-*.mjs", kind: "glob" }, TMP)).not.toBe(sig1);
  });

  it("encodes an empty glob group explicitly", () => {
    expect(manifestEntrySignature({ rel: "s/generate-*.mjs", kind: "glob" }, TMP)).toBe("glob:s/generate-*.mjs:empty");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// D. computeManifestHash — the F5 contract at the gate level
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.computeManifestHash", () => {
  const manifest = [
    { rel: "graph.json", kind: "graph-content", inHashGate: true, staleCheck: true, regeneratedBy: "gen.mjs" },
    { rel: "s/generate-x.mjs", kind: "file", inHashGate: true },
    { rel: "s/notgated.mjs", kind: "file", inHashGate: false },
  ];

  it("is a deterministic 40-hex sha1", () => {
    writeGraph("graph.json", "ts", 1); w("s/generate-x.mjs"); w("s/notgated.mjs");
    const h = computeManifestHash(manifest, TMP);
    expect(h).toMatch(/^[0-9a-f]{40}$/);
    expect(computeManifestHash(manifest, TMP)).toBe(h);
  });

  it("F5 CORE: does NOT change when the graph is rewritten with only a new generatedAt", () => {
    writeGraph("graph.json", "ts-original", 2362); w("s/generate-x.mjs"); w("s/notgated.mjs");
    const before = computeManifestHash(manifest, TMP);
    writeGraph("graph.json", "ts-completely-different-and-longer", 2362); // cosmetic re-timestamp
    expect(computeManifestHash(manifest, TMP)).toBe(before);
  });

  it("changes when the graph's headline counts change", () => {
    writeGraph("graph.json", "ts", 2362); w("s/generate-x.mjs"); w("s/notgated.mjs");
    const before = computeManifestHash(manifest, TMP);
    writeGraph("graph.json", "ts", 2400); // real content change
    expect(computeManifestHash(manifest, TMP)).not.toBe(before);
  });

  it("changes when an inHashGate generator script changes", () => {
    writeGraph("graph.json", "ts", 1); w("s/generate-x.mjs", "v1", 60_000); w("s/notgated.mjs");
    const before = computeManifestHash(manifest, TMP);
    w("s/generate-x.mjs", "v2");
    expect(computeManifestHash(manifest, TMP)).not.toBe(before);
  });

  it("does NOT change when only a non-gate (inHashGate:false) entry changes", () => {
    writeGraph("graph.json", "ts", 1); w("s/generate-x.mjs"); w("s/notgated.mjs", "v1", 60_000);
    const before = computeManifestHash(manifest, TMP);
    w("s/notgated.mjs", "v2");
    expect(computeManifestHash(manifest, TMP)).toBe(before);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// E. checkStaleInputs — wall-clock staleness
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.checkStaleInputs", () => {
  const manifest = [{ rel: "graph.json", kind: "graph-content", inHashGate: true, staleCheck: true, regeneratedBy: "scripts/generate-system-viz.mjs" }];

  it("flags an input older than the threshold as stale", () => {
    writeGraph("graph.json", "ts", 1, 26 * HOUR_MS); // 26h old
    const r = checkStaleInputs(manifest, TMP, STALE_THRESHOLD_MS);
    expect(r.stale.length).toBe(1);
    expect(r.stale[0].reason).toBe("input_stale");
    expect(r.stale[0].ageHours).toBeGreaterThan(24);
    expect(r.stale[0].regeneratedBy).toBe("scripts/generate-system-viz.mjs");
  });

  it("does NOT flag an input under the threshold", () => {
    writeGraph("graph.json", "ts", 1, 23 * HOUR_MS); // 23h old — under 24h
    expect(checkStaleInputs(manifest, TMP, STALE_THRESHOLD_MS).stale).toEqual([]);
  });

  it("does NOT flag a freshly-written input", () => {
    writeGraph("graph.json", "ts", 1);
    expect(checkStaleInputs(manifest, TMP, STALE_THRESHOLD_MS).stale).toEqual([]);
  });

  it("FAILURE MODE: flags a missing input as stale (input_missing)", () => {
    const r = checkStaleInputs(manifest, TMP, STALE_THRESHOLD_MS);
    expect(r.stale.length).toBe(1);
    expect(r.stale[0].reason).toBe("input_missing");
  });

  it("nowMs is injectable — deterministic regardless of wall clock", () => {
    const g = writeGraph("graph.json", "ts", 1); // fresh (mtime ~now)
    const mtime = fs.statSync(g).mtimeMs;
    // pretend "now" is 30h after the file's mtime
    const r = checkStaleInputs(manifest, TMP, STALE_THRESHOLD_MS, mtime + 30 * HOUR_MS);
    expect(r.stale.length).toBe(1);
    expect(r.stale[0].reason).toBe("input_stale");
  });

  it("ignores manifest entries without staleCheck", () => {
    const noStale = [{ rel: "graph.json", kind: "graph-content", inHashGate: true, staleCheck: false }];
    writeGraph("graph.json", "ts", 1, 99 * HOUR_MS); // ancient, but not staleChecked
    expect(checkStaleInputs(noStale, TMP, STALE_THRESHOLD_MS).stale).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// F. guardedRegen — orchestration (injectable spawn, never runs the real chain)
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.guardedRegen", () => {
  function setupRepo({ staleGraph = false, wired = 2362 } = {}) {
    w("s/generate-x.mjs");
    writeGraph("graph.json", "ts", wired, staleGraph ? 26 * HOUR_MS : 0);
    return [
      { rel: "graph.json", kind: "graph-content", inHashGate: true, staleCheck: true, regeneratedBy: "scripts/generate-system-viz.mjs" },
      { rel: "s/generate-x.mjs", kind: "file", inHashGate: true },
    ];
  }
  const hashFile = () => path.join(TMP, ".hash");
  const regenScript = () => path.join(TMP, "regen.mjs");

  it("REFUSES (exit 3) when the graph is stale, and never spawns the regen", () => {
    const manifest = setupRepo({ staleGraph: true });
    const sp = spawnStub();
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp.fn });
    expect(r.action).toBe("refused");
    expect(r.exit).toBe(3);
    expect(r.stale[0].reason).toBe("input_stale");
    expect(sp.calls.length).toBe(0);
  });

  it("RUNS the regen on first invocation (no prior hash) and spawns it WITH --force", () => {
    const manifest = setupRepo();
    const sp = spawnStub(0);
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp.fn });
    expect(r.action).toBe("regen_ran");
    expect(r.exit).toBe(0);
    expect(sp.calls.length).toBe(1);
    expect(sp.calls[0].args[0]).toBe(regenScript());
    expect(sp.calls[0].args).toContain("--force"); // guard is the sole authority
    expect(fs.existsSync(hashFile())).toBe(true);
    expect(fs.readFileSync(hashFile(), "utf8").trim()).toBe(r.currentHash);
  });

  it("SKIPS (exit 0, no spawn) on a second invocation when the manifest is unchanged", () => {
    const manifest = setupRepo();
    guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn });
    const sp2 = spawnStub(0);
    const r2 = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp2.fn });
    expect(r2.action).toBe("skipped");
    expect(sp2.calls.length).toBe(0);
  });

  it("F5 CONTRACT: a generatedAt-only graph rewrite after a run does NOT re-trigger the regen", () => {
    const manifest = setupRepo();
    guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn });
    writeGraph("graph.json", "a-brand-new-cosmetic-timestamp-string", 2362); // genAt-only
    const sp2 = spawnStub(0);
    const r2 = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp2.fn });
    expect(r2.action).toBe("skipped");
    expect(sp2.calls.length).toBe(0);
  });

  it("RE-RUNS when the graph's headline counts actually change", () => {
    const manifest = setupRepo({ wired: 2362 });
    guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn });
    writeGraph("graph.json", "ts", 2400); // real content change
    const sp2 = spawnStub(0);
    const r2 = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp2.fn });
    expect(r2.action).toBe("regen_ran");
    expect(sp2.calls.length).toBe(1);
  });

  it("--force bypasses BOTH gates — runs even when stale AND unchanged", () => {
    const manifest = setupRepo({ staleGraph: true });
    const sp = spawnStub(0);
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp.fn, force: true });
    expect(r.action).toBe("regen_ran");
    expect(sp.calls.length).toBe(1);
  });

  it("--check on a fresh repo with no prior hash reports would_run and NEVER spawns", () => {
    const manifest = setupRepo();
    const sp = spawnStub(0);
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp.fn, check: true });
    expect(r.action).toBe("would_run");
    expect(r.exit).toBe(0);
    expect(sp.calls.length).toBe(0);
    expect(fs.existsSync(hashFile())).toBe(false); // --check must not persist
  });

  it("--check after a run with an unchanged manifest reports would_skip", () => {
    const manifest = setupRepo();
    guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn });
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn, check: true });
    expect(r.action).toBe("would_skip");
    expect(r.exit).toBe(0);
  });

  it("--check --force reports would_run_forced", () => {
    const manifest = setupRepo();
    guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn });
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn, check: true, force: true });
    expect(r.action).toBe("would_run_forced");
  });

  it("FAILURE MODE: a non-zero regen exit yields regen_failed, exit 1, and does NOT persist the hash", () => {
    const manifest = setupRepo();
    const sp = spawnStub(1);
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp.fn });
    expect(r.action).toBe("regen_failed");
    expect(r.exit).toBe(1);
    expect(fs.existsSync(hashFile())).toBe(false); // a failed run must re-attempt
  });

  it("--dry-run passes --dry-run through, labels the action regen_dry_ran (not regen_ran), and does NOT persist the hash", () => {
    const manifest = setupRepo();
    const sp = spawnStub(0);
    const r = guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: sp.fn, dryRun: true });
    expect(r.action).toBe("regen_dry_ran"); // honest label — a caller scripting on `action` must not be misled
    expect(sp.calls[0].args).toContain("--dry-run");
    expect(fs.existsSync(hashFile())).toBe(false);
  });

  it("persists the hash atomically — no leftover .tmp file after a successful run", () => {
    const manifest = setupRepo();
    guardedRegen({ root: TMP, manifest, hashFile: hashFile(), regenScript: regenScript(), spawn: spawnStub(0).fn });
    const leftover = fs.readdirSync(TMP).filter((f) => f.includes(".hash") && f.endsWith(".tmp"));
    expect(leftover).toEqual([]); // temp-write + rename leaves no .tmp
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G. renderHuman — EVERY action branch
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.renderHuman", () => {
  it("renders 'refused' with the stale reason", () => {
    const out = renderHuman({ action: "refused", stale: [{ rel: "graph.json", reason: "input_stale", ageHours: 30, regeneratedBy: "scripts/generate-system-viz.mjs" }] });
    expect(out).toContain("REFUSED");
    expect(out).toContain("30h old");
  });

  it("renders 'refused' for a missing input", () => {
    const out = renderHuman({ action: "refused", stale: [{ rel: "graph.json", reason: "input_missing", regeneratedBy: "scripts/generate-system-viz.mjs" }] });
    expect(out).toContain("REFUSED");
    expect(out).toContain("input_missing");
  });

  it("renders 'skipped'", () => { expect(renderHuman({ action: "skipped" })).toContain("SKIPPED"); });
  it("renders 'regen_ran'", () => { expect(renderHuman({ action: "regen_ran", elapsedMs: 5000 })).toContain("REGEN RAN"); });
  it("renders 'regen_dry_ran' distinctly from regen_ran", () => {
    expect(renderHuman({ action: "regen_dry_ran", elapsedMs: 500 })).toContain("DRY-RAN");
  });
  it("renders 'regen_failed' with stderr", () => {
    const out = renderHuman({ action: "regen_failed", reason: "exit_1", elapsedMs: 200, stderr: "boom line" });
    expect(out).toContain("REGEN FAILED");
    expect(out).toContain("boom line");
  });
  it("renders the three --check actions", () => {
    expect(renderHuman({ action: "would_run", reason: "manifest_changed", currentHash: "abc123", prevHash: "" })).toContain("would_run");
    expect(renderHuman({ action: "would_skip", reason: "manifest_unchanged", currentHash: "abc", prevHash: "abc" })).toContain("would_skip");
    expect(renderHuman({ action: "would_run_forced", reason: "force", currentHash: "x", prevHash: "y" })).toContain("would_run_forced");
  });
  it("renders an unknown action via the default branch without throwing", () => {
    expect(renderHuman({ action: "weird_unexpected", reason: "?" })).toContain("weird_unexpected");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// H. CLI surface — spawn the REAL script (--check is read-only: no spawn, no persist)
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard CLI (--check is side-effect-free against the real repo)", () => {
  it("--check exits 0 or 3 and emits a JSON result whose .exit matches the process exit code", () => {
    const r = cp.spawnSync(process.execPath, [GUARD_PATH, "--check"], { encoding: "utf8" });
    expect([0, 3]).toContain(r.status); // 0 = would_run/would_skip, 3 = real graph happens to be stale
    const parsed = JSON.parse(r.stdout);
    expect(["would_run", "would_skip", "would_run_forced", "refused"]).toContain(parsed.action);
    expect(parsed.exit).toBe(r.status);
  });

  it("--check --human emits human-readable text (not JSON)", () => {
    const r = cp.spawnSync(process.execPath, [GUARD_PATH, "--check", "--human"], { encoding: "utf8" });
    expect([0, 3]).toContain(r.status);
    expect(r.stdout).toContain("viz-regen-guard:");
    expect(() => JSON.parse(r.stdout)).toThrow(); // human mode is NOT json
  });
});

// ════════════════════════════════════════════════════════════════════════════
// I. shipped DEP_MANIFEST + constant sanity
// ════════════════════════════════════════════════════════════════════════════
describe("viz-regen-guard.DEP_MANIFEST + constants", () => {
  it("the shipped manifest gates on graph CONTENT and staleness-checks it", () => {
    const graphEntries = DEP_MANIFEST.filter((e: { rel: string }) => e.rel.endsWith("system-graph.json"));
    expect(graphEntries.length).toBe(1);
    const g = graphEntries[0];
    expect(g.kind).toBe("graph-content"); // hashed by content, not the raw file — the F5 decision
    expect(g.inHashGate).toBe(true);
    expect(g.staleCheck).toBe(true);
    expect(g.regeneratedBy).toBe("scripts/generate-system-viz.mjs");
  });

  it("the shipped manifest also gates on the wiki generator scripts", () => {
    const scriptEntries = DEP_MANIFEST.filter((e: { rel: string; inHashGate: boolean }) => e.inHashGate && e.rel.startsWith("scripts/"));
    expect(scriptEntries.length).toBeGreaterThan(1);
    expect(DEP_MANIFEST.some((e: { rel: string }) => e.rel === "scripts/regen-wiki-from-viz.mjs")).toBe(true);
  });

  it("STALE_THRESHOLD_MS is exactly 24 hours", () => {
    expect(STALE_THRESHOLD_MS).toBe(24 * 60 * 60 * 1000);
  });
});
