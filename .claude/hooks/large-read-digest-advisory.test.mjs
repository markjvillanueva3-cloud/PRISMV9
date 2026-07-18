// large-read-digest-advisory.test.mjs
// U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (2026-06-09, slot:alpha): the read-advisory must
// (1) classify ONLY large non-wiki source files as candidates, (2) skip wiki/noise/
// data/below-threshold, (3) emit a suggestion that names the file-digest CLI + the
// path. Pure-function tests, NO stdin/network (R9: assert exact behavior).
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifySourcePath, decideAdvisory, estimateLineCount, DEFAULT_MIN_LINES, HOOK_KEY } from "./large-read-digest-advisory.mjs";

// ---- classifySourcePath ----
test("classifySourcePath: source-code extensions are candidates", () => {
  for (const p of ["H:/prism/scripts/foo.mjs", "H:/prism/src/Bar.ts", "H:/prism/x.py", "C:\\a\\b\\c.tsx"]) {
    const c = classifySourcePath(p);
    assert.ok(c && c.isSource, `expected ${p} -> source`);
  }
});

test("classifySourcePath: base + normalized (forward-slash) path are returned", () => {
  const c = classifySourcePath("C:\\Users\\x\\scripts\\thing.mjs");
  assert.equal(c.base, "thing.mjs");
  assert.equal(c.normPath, "C:/Users/x/scripts/thing.mjs");
});

test("classifySourcePath: wiki .md is NOT a candidate (the wiki sibling owns it)", () => {
  assert.equal(classifySourcePath("H:/prism/knowledge/wiki/lessons/x.md"), null);
});

test("classifySourcePath: data/doc extensions are excluded", () => {
  assert.equal(classifySourcePath("H:/prism/data/big.json"), null);
  assert.equal(classifySourcePath("H:/prism/README.md"), null);
  assert.equal(classifySourcePath("H:/prism/notes.txt"), null);
});

test("classifySourcePath: node_modules / .git / dist noise is excluded", () => {
  assert.equal(classifySourcePath("H:/prism/node_modules/pkg/index.js"), null);
  assert.equal(classifySourcePath("H:/prism/.git/hooks/x.mjs"), null);
  assert.equal(classifySourcePath("H:/prism/dist/bundle.js"), null);
});

test("classifySourcePath: non-string / empty -> null", () => {
  assert.equal(classifySourcePath(null), null);
  assert.equal(classifySourcePath(""), null);
  assert.equal(classifySourcePath(42), null);
});

// ---- decideAdvisory ----
const SRC = { isSource: true, base: "big.mjs", normPath: "H:/prism/scripts/big.mjs" };

test("decideAdvisory: a large source file is advised, suggestion names the digest CLI + path", () => {
  const d = decideAdvisory({ classification: SRC, lineCount: 900, byteSize: 40000, minLines: DEFAULT_MIN_LINES });
  assert.equal(d.advise, true);
  assert.equal(d.reason, "large-source-file");
  assert.ok(d.suggestion.includes("ollama-file-digest.mjs"), "names the digest CLI");
  assert.ok(d.suggestion.includes("H:/prism/scripts/big.mjs"), "names the path");
  assert.ok(d.tokensSavedIfTaken > 0);
});

test("decideAdvisory: below the threshold -> not advised", () => {
  const d = decideAdvisory({ classification: SRC, lineCount: 120, byteSize: 5000, minLines: DEFAULT_MIN_LINES });
  assert.equal(d.advise, false);
  assert.match(d.reason, /below-threshold/);
});

test("decideAdvisory: the floor (200) clamps a too-low minLines so it can't advise on small files", () => {
  // minLines 10 would advise on a 150-line file; the floor forces 200 -> not advised.
  const d = decideAdvisory({ classification: SRC, lineCount: 150, byteSize: 6000, minLines: 10 });
  assert.equal(d.advise, false);
});

test("decideAdvisory: a non-source classification is never advised", () => {
  assert.equal(decideAdvisory({ classification: null, lineCount: 9000 }).advise, false);
  assert.equal(decideAdvisory({ classification: { isSource: false }, lineCount: 9000 }).advise, false);
});

test("HOOK_KEY is the stats key the advisory-decay machinery will measure", () => {
  assert.equal(HOOK_KEY, "large-read-digest-advisory");
});

// ---- estimateLineCount (used above MAX_READ_BYTES so the hook never loads huge files) ----
test("estimateLineCount: ~40 bytes/line, so a large file still crosses the threshold without a read", () => {
  assert.equal(estimateLineCount(40000), 1000); // 40000/40
  assert.equal(estimateLineCount(0), 0);
  assert.equal(estimateLineCount(undefined), 0);
  assert.equal(estimateLineCount("not a number"), 0);
  // a 5MB source file estimates well above the 600-line threshold -> still advised
  assert.ok(estimateLineCount(5 * 1024 * 1024) > DEFAULT_MIN_LINES);
});

// === decay-gate integration (U-LARGE-READ-DECAY-WIRE, 2026-06-10) ===
// The hook must MUTE its advisory once proven noise (>=50 injections at <5% conversion)
// and FIRE when telemetry is insufficient (fail-safe) or on the 1-in-20 self-revival
// probe. The gate is IMPURE (reads offload-stats), so a real subprocess round-trip is
// the only honest verification (R9) -- pure-fn tests above cannot cover it. Fixtures
// point STATS_PATH at a temp file via PRISM_LARGE_READ_DIGEST_STATS_PATH so read==write.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("./large-read-digest-advisory.mjs", import.meta.url));

function runHook(filePath, statsPath) {
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: "Read", tool_input: { file_path: filePath } }),
    env: { ...process.env, PRISM_LARGE_READ_DIGEST_STATS_PATH: statsPath, PRISM_ADVISORY_DECAY_DISABLE: "" },
    encoding: "utf8",
  });
  return JSON.parse(out);
}

// stat = the byHook[HOOK_KEY] slot to seed; bumpStats() increments `suggested` by 1
// BEFORE the decay read, so probe math uses (seed.suggested + 1).
function withFixtures(stat, fn) {
  const dir = mkdtempSync(join(tmpdir(), "lrd-decay-"));
  try {
    // a >600-line .mjs source file (>8192 bytes) so decideAdvisory advises pre-gate
    const big = join(dir, "big-source.mjs");
    writeFileSync(big, Array.from({ length: 700 }, (_, i) => `// padding source line ${i} ----------\n`).join(""));
    const stats = join(dir, "ollama-offload-stats.json");
    writeFileSync(stats, JSON.stringify({ schemaVersion: "2.0.0", byHook: { "large-read-digest-advisory": stat } }, null, 2));
    return fn({ big, stats });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("decay-gate: PROVEN-NOISE (>=50 injections, 0% conversion, off-probe) MUTES the advisory", () => {
  // seed 52 -> bumpStats -> 53 injections; 53 % 20 != 0 so NOT a probe-fire -> muted.
  withFixtures({ fired: 52, suggested: 52, offloaded: 0, kept: 0 }, ({ big, stats }) => {
    const res = runHook(big, stats);
    assert.equal(res.continue, true);
    assert.ok(
      !res.hookSpecificOutput || !res.hookSpecificOutput.additionalContext,
      "a proven-noise advisory must be muted (no additionalContext injected)",
    );
  });
});

test("decay-gate: INSUFFICIENT telemetry (<50 injections) still FIRES (fail-safe)", () => {
  withFixtures({ fired: 5, suggested: 5, offloaded: 0, kept: 0 }, ({ big, stats }) => {
    const res = runHook(big, stats);
    assert.equal(res.continue, true);
    assert.ok(
      res.hookSpecificOutput && res.hookSpecificOutput.additionalContext &&
        res.hookSpecificOutput.additionalContext.includes("ollama-file-digest.mjs"),
      "with insufficient telemetry the advisory must still fire (names the digest CLI)",
    );
  });
});

test("decay-gate: PROVEN-NOISE but on the probe interval (injected % 20 == 0) FIRES the self-revival probe", () => {
  // seed 59 -> bumpStats -> 60 injections; 60 % 20 == 0 -> probe fire even though muted.
  withFixtures({ fired: 59, suggested: 59, offloaded: 0, kept: 0 }, ({ big, stats }) => {
    const res = runHook(big, stats);
    assert.ok(
      res.hookSpecificOutput && res.hookSpecificOutput.additionalContext,
      "the 1-in-20 probe must keep the advisory alive for self-revival",
    );
  });
});
