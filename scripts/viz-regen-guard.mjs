#!/usr/bin/env node
/**
 * viz-regen-guard.mjs — centralized, dependency-aware gate in front of
 * scripts/regen-wiki-from-viz.mjs.
 *
 * U-CLEANUP-F5 (CLEANUP-MS0). Every caller of the ~8-min wiki-regen orchestrator
 * routes through this guard. In practice there is ONE chokepoint —
 * scripts/system-viz-on-commit.mjs — and the git post-commit hook, the hourly
 * cron, and the /system-viz slash command all reach the orchestrator THROUGH
 * that file (see its header). So rewiring system-viz-on-commit.mjs to call this
 * guard centralizes all three.
 *
 * Two improvements over regen-wiki-from-viz.mjs's built-in fingerprint gate:
 *
 *  1. HASH-GATE ON A MANIFEST OF DEPS — keyed on the graph's *content*, NOT the
 *     raw graph.json file. system-graph.json is rewritten on every commit with a
 *     fresh `generatedAt` even when nothing meaningful changed; gating on the raw
 *     file's size+mtime (or a hash that includes `generatedAt`) therefore means
 *     "always regen". This guard hashes a `generatedAt`-stripped slice of the
 *     graph's meta header — the headline / node-edge counts that actually drive
 *     wiki content — together with the wiki generator scripts. A no-op commit
 *     that only re-timestamps the graph leaves this hash unchanged → skip.
 *     (The wiki generators read system-graph.json as their sole data input, so
 *     its *content* is the correct and complete dependency signal — engine,
 *     dispatcher, skill, hook, registry changes all reach the wiki through it.)
 *
 *  2. STALENESS REFUSAL — refuse to build the wiki from a stale graph. If
 *     system-graph.json is missing, or its wall-clock age exceeds
 *     STALE_THRESHOLD_MS (24 h) — i.e. its regenerator (generate-system-viz.mjs)
 *     has not run in over a day — the guard refuses rather than propagate a
 *     day-old graph into the wiki. (In the post-commit path this never fires:
 *     system-viz-on-commit.mjs runs generate-system-viz.mjs first. It guards the
 *     standalone cron / slash-command paths.)
 *
 * When the guard decides to run, it spawns regen-wiki-from-viz.mjs with --force
 * so the orchestrator's own (now-redundant) inner gate cannot override the
 * guard's decision — the guard is the single authority.
 *
 * Pure helpers are exported for in-process testing; main() runs only on direct
 * invocation (the isDirectRun guard).
 *
 * Flags:
 *   (default)    staleness check → hash gate → spawn regen-wiki-from-viz.mjs --force
 *   --check      report what WOULD happen — never spawns
 *   --force      bypass BOTH gates and run unconditionally
 *   --dry-run    pass --dry-run through to regen-wiki-from-viz.mjs
 *   --quiet      suppress success JSON (refusals/failures still print)
 *   --human      human-readable summary instead of JSON
 *
 * Exit codes:
 *   0 — regen ran successfully, or was skipped (gate clean / up-to-date)
 *   1 — regen subprocess failed
 *   2 — internal error
 *   3 — refused: the graph is stale or missing
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, statSync, readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, openSync, readSync, closeSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = resolve(__dirname, "..");
const HASH_FILE = resolve(PRISM_ROOT, "state/shared/system-viz/.viz-regen-guard-manifest-hash");
const REGEN_SCRIPT = resolve(PRISM_ROOT, "scripts/regen-wiki-from-viz.mjs");

export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 h
const GRAPH_HASH_CHUNK = 65536; // 64 KB streaming chunk for the full-file content hash

// The dependency manifest. `inHashGate` entries feed the change-detection hash;
// `staleCheck` entries feed the wall-clock staleness refusal. system-graph.json
// is `kind: "graph-content"` — hashed by its meta-header content (NOT the raw
// file: a `generatedAt`-only rewrite must not trip the gate) — and is the one
// entry that is BOTH hash-gated and staleness-checked. The rest are the wiki
// generator/orchestrator scripts: a code change to any of them changes wiki
// output, so a content change must trigger a rebuild.
export const DEP_MANIFEST = [
  { rel: "state/shared/system-viz/system-graph.json", kind: "graph-content", inHashGate: true, staleCheck: true, regeneratedBy: "scripts/generate-system-viz.mjs" },
  { rel: "scripts/regen-wiki-from-viz.mjs", kind: "file", inHashGate: true },
  { rel: "scripts/generate-*.mjs", kind: "glob", inHashGate: true },
  { rel: "scripts/build-wiki-*.mjs", kind: "glob", inHashGate: true },
  { rel: "scripts/inject-wiki-crosslinks.mjs", kind: "file", inHashGate: true },
  { rel: "scripts/audit-wiki-coverage.mjs", kind: "file", inHashGate: true },
  { rel: "scripts/system-viz-obsidian-bridge-v2.mjs", kind: "file", inHashGate: true },
  { rel: "scripts/export-graph-cypher.mjs", kind: "file", inHashGate: true },
];

// ─── Pure helpers (exported for in-process testing) ─────────────────────────

// Content signature of system-graph.json — a FULL-FILE streaming sync hash with
// cosmetic timestamps normalized away.
//
// Earlier head-slice designs (a fixed byte window, or a window anchored on the
// top-level `"nodes":[` marker) were rejected because the real graph's meta
// header carries an embedded `meta.roadmap.phases[]` structure that can exceed
// any reasonable head budget, so any head-only signal silently omits whatever
// the wiki generators read past that boundary — exactly the original P0
// "generators read graph.json content but the gate doesn't" failure.
//
// Approach: stream the whole file in fixed-size chunks via openSync/readSync
// (NOT a 20+ MB readFileSync), update a sha1 with each chunk. The FIRST chunk
// is round-tripped through latin1 (byte-exact 1:1, no UTF-8 boundary hazards)
// to regex-strip `generatedAt`/`timestamp` — both fields live in the JSON
// header, well within the first chunk, so a no-op re-generation that only
// re-stamps the graph is normalized to the same content. Subsequent chunks are
// hashed raw — their concatenation reconstructs the full content stream
// regardless of where chunk boundaries fall, so the strip in chunk 1 is the
// only deliberate transform and the hash is order-stable across genAt length
// variance. Returns "missing"/"unreadable" on fs failure.
export function graphContentSignature(absGraphPath, chunkBytes = GRAPH_HASH_CHUNK) {
  if (!existsSync(absGraphPath)) return "missing";
  let fd;
  try { fd = openSync(absGraphPath, "r"); } catch { return "unreadable"; }
  try {
    const hash = createHash("sha1");
    const buf = Buffer.alloc(chunkBytes);
    let pos = 0;
    let first = true;
    for (;;) {
      let bytesRead;
      try { bytesRead = readSync(fd, buf, 0, chunkBytes, pos); }
      catch { return "unreadable"; }
      if (bytesRead <= 0) break;
      if (first) {
        // latin1 round-trip is byte-exact (1:1, no UTF-8 boundary hazards on a
        // partial chunk). generatedAt + timestamp are pure ASCII so the regex
        // operates correctly on the latin1 string.
        const stripped = buf.subarray(0, bytesRead).toString("latin1")
          .replace(/"generatedAt"\s*:\s*"[^"]*"/g, '"generatedAt":""')
          .replace(/"timestamp"\s*:\s*"[^"]*"/g, '"timestamp":""');
        hash.update(Buffer.from(stripped, "latin1"));
        first = false;
      } else {
        hash.update(buf.subarray(0, bytesRead));
      }
      pos += bytesRead;
      if (bytesRead < chunkBytes) break; // end of file
    }
    return hash.digest("hex").slice(0, 24);
  } finally {
    try { closeSync(fd); } catch { /* best effort */ }
  }
}

// Resolve a single-`*`-in-basename glob to a sorted absolute-path list.
export function resolveGlob(absPattern) {
  const dir = dirname(absPattern);
  const base = absPattern.slice(dir.length + 1);
  if (!base.includes("*")) return existsSync(absPattern) ? [absPattern] : [];
  const star = base.indexOf("*");
  const prefix = base.slice(0, star);
  const suffix = base.slice(star + 1);
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter((e) => e.isFile() && e.name.startsWith(prefix) && e.name.endsWith(suffix) && e.name.length >= prefix.length + suffix.length)
    .map((e) => join(dir, e.name))
    .sort();
}

// A stable signature string for one manifest entry. "graph-content" → the
// content signature above; "file" → size:mtime; "glob" → a hash over each
// match's relative-path/size/mtime. Missing paths get an explicit token.
export function manifestEntrySignature(entry, root = PRISM_ROOT) {
  const abs = resolve(root, entry.rel);
  if (entry.kind === "graph-content") {
    return `graph:${entry.rel}:${graphContentSignature(abs)}`;
  }
  if (entry.kind === "glob") {
    const matches = resolveGlob(abs);
    if (!matches.length) return `glob:${entry.rel}:empty`;
    const parts = matches.map((m) => {
      try { const st = statSync(m); return `${m.slice(root.length + 1)}=${st.size}:${Math.round(st.mtimeMs)}`; }
      catch { return `${m}=missing`; }
    });
    return `glob:${entry.rel}:${createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16)}`;
  }
  // file
  try { const st = statSync(abs); return `file:${entry.rel}:${st.size}:${Math.round(st.mtimeMs)}`; }
  catch { return `file:${entry.rel}:missing`; }
}

// sha1 over every inHashGate manifest entry's signature, in manifest order.
export function computeManifestHash(manifest = DEP_MANIFEST, root = PRISM_ROOT) {
  const parts = manifest.filter((e) => e.inHashGate).map((e) => manifestEntrySignature(e, root));
  return createHash("sha1").update(parts.join("\n")).digest("hex");
}

// Staleness check: a `staleCheck` input is stale when it is missing, or when its
// wall-clock age exceeds thresholdMs (its regenerator has not run in that long).
// Returns { stale: [{ rel, reason, ... }] }. `nowMs` is injectable for tests.
export function checkStaleInputs(manifest = DEP_MANIFEST, root = PRISM_ROOT, thresholdMs = STALE_THRESHOLD_MS, nowMs = Date.now()) {
  const stale = [];
  for (const entry of manifest) {
    if (!entry.staleCheck) continue;
    const abs = resolve(root, entry.rel);
    if (!existsSync(abs)) {
      stale.push({ rel: entry.rel, reason: "input_missing", regeneratedBy: entry.regeneratedBy || null });
      continue;
    }
    let mtimeMs;
    try { mtimeMs = statSync(abs).mtimeMs; } catch {
      stale.push({ rel: entry.rel, reason: "input_unreadable", regeneratedBy: entry.regeneratedBy || null });
      continue;
    }
    const ageMs = nowMs - mtimeMs;
    if (ageMs > thresholdMs) {
      stale.push({
        rel: entry.rel,
        reason: "input_stale",
        regeneratedBy: entry.regeneratedBy || null,
        ageMs: Math.round(ageMs),
        ageHours: Math.round((ageMs / 3_600_000) * 10) / 10,
      });
    }
  }
  return { stale };
}

// ─── Orchestration ──────────────────────────────────────────────────────────

// The guarded regen. Options are fully injectable for testing:
//   root, manifest, hashFile, regenScript, thresholdMs, nowMs, spawn
//   force   bypass both gates
//   check   report only — never spawn
//   dryRun  pass --dry-run through to the regen
//   quiet   pass --quiet through to the regen
export function guardedRegen(opts = {}) {
  const root = opts.root || PRISM_ROOT;
  const manifest = opts.manifest || DEP_MANIFEST;
  const hashFile = opts.hashFile || HASH_FILE;
  const regenScript = opts.regenScript || REGEN_SCRIPT;
  const thresholdMs = opts.thresholdMs ?? STALE_THRESHOLD_MS;
  const nowMs = opts.nowMs ?? Date.now();
  const force = !!opts.force;
  const checkOnly = !!opts.check;
  const spawn = opts.spawn || spawnSync;

  // 1. Staleness refusal (skippable only with --force).
  const { stale } = checkStaleInputs(manifest, root, thresholdMs, nowMs);
  if (stale.length && !force) {
    return { action: "refused", reason: "stale_graph", stale, exit: 3 };
  }

  // 2. Hash gate.
  const currentHash = computeManifestHash(manifest, root);
  let prevHash = "";
  try { prevHash = readFileSync(hashFile, "utf8").trim(); } catch { /* no prior run */ }
  const hashUnchanged = prevHash === currentHash && prevHash !== "";
  if (hashUnchanged && !force && !checkOnly) {
    return { action: "skipped", reason: "manifest_unchanged", currentHash, stale, exit: 0 };
  }

  if (checkOnly) {
    return {
      action: force ? "would_run_forced" : hashUnchanged ? "would_skip" : "would_run",
      reason: force ? "force" : hashUnchanged ? "manifest_unchanged" : "manifest_changed",
      currentHash, prevHash, stale, exit: 0,
    };
  }

  // 3. Spawn the orchestrator with --force — the guard is the single authority,
  // so the orchestrator's own inner gate must not second-guess this decision.
  const args = [regenScript, "--force"];
  if (opts.dryRun) args.push("--dry-run");
  if (opts.quiet) args.push("--quiet");
  const t0 = Date.now();
  const res = spawn(process.execPath, args, { cwd: root, encoding: "utf8" });
  const elapsedMs = Date.now() - t0;
  if (res.status !== 0) {
    return {
      action: "regen_failed", reason: `exit_${res.status}`, elapsedMs,
      stderr: (res.stderr || "").split("\n").slice(-6).join("\n"), stale, exit: 1,
    };
  }
  // Persist the manifest hash only on a clean, real (non-dry-run) run — so a
  // failed or dry run re-attempts next time. Atomic temp-write + rename so
  // concurrent guard processes (post-commit fires across the fleet) can't tear it.
  if (!opts.dryRun) {
    try {
      mkdirSync(dirname(hashFile), { recursive: true });
      const tmp = `${hashFile}.${process.pid}.tmp`;
      writeFileSync(tmp, currentHash, "utf8");
      renameSync(tmp, hashFile);
    } catch { /* hash persist is best-effort — a miss just means one extra regen */ }
  }
  // Distinguish a dry run from a real one — a caller scripting against
  // `action` must not be told work was done when it wasn't (R12: fail loud).
  return {
    action: opts.dryRun ? "regen_dry_ran" : "regen_ran",
    reason: "manifest_changed", currentHash, elapsedMs, stale, exit: 0,
  };
}

// ─── Render ─────────────────────────────────────────────────────────────────
export function renderHuman(r) {
  const lines = [];
  switch (r.action) {
    case "refused":
      lines.push("viz-regen-guard: REFUSED — graph is stale or missing");
      for (const s of r.stale || []) {
        lines.push(s.reason === "input_stale"
          ? `  ✗ ${s.rel} — ${s.ageHours}h old (>24h); regenerator: ${s.regeneratedBy}`
          : `  ✗ ${s.rel} — ${s.reason}; regenerator: ${s.regeneratedBy}`);
      }
      lines.push("  Re-run the regenerator above (or `node scripts/system-viz-on-commit.mjs`), then retry. Override with --force.");
      break;
    case "skipped":
      lines.push("viz-regen-guard: SKIPPED — manifest unchanged since last regen (graph content + generators all stable)");
      break;
    case "would_run": case "would_run_forced": case "would_skip":
      lines.push(`viz-regen-guard: --check → ${r.action} (${r.reason})`);
      lines.push(`  current hash: ${(r.currentHash || "").slice(0, 16)}  prev: ${(r.prevHash || "(none)").slice(0, 16)}`);
      break;
    case "regen_ran":
      lines.push(`viz-regen-guard: REGEN RAN (${Math.round(r.elapsedMs / 1000)}s) — manifest changed`);
      break;
    case "regen_dry_ran":
      lines.push(`viz-regen-guard: REGEN DRY-RAN (${Math.round(r.elapsedMs / 1000)}s) — no state written`);
      break;
    case "regen_failed":
      lines.push(`viz-regen-guard: REGEN FAILED (${r.reason}, ${Math.round(r.elapsedMs / 1000)}s)`);
      if (r.stderr) lines.push(r.stderr.split("\n").map((l) => "  " + l).join("\n"));
      break;
    default:
      lines.push(`viz-regen-guard: ${r.action} (${r.reason || "?"})`);
  }
  return lines.join("\n");
}

// ─── Entry point — only on direct invocation ────────────────────────────────
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
  const result = guardedRegen({
    force: flags.has("--force"),
    check: flags.has("--check"),
    dryRun: flags.has("--dry-run"),
    quiet: flags.has("--quiet"),
  });
  if (flags.has("--human")) {
    process.stdout.write(renderHuman(result) + "\n");
  } else if (flags.has("--quiet") && result.exit === 0) {
    // silent success for cron notify-only-on-change semantics (skipped + regen_ran)
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
  process.exit(result.exit);
}
