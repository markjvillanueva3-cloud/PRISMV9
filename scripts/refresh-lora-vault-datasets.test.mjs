// Tests for refresh-lora-vault-datasets (the vault->LoRA dataset refresh harness).
// R9: the load-bearing oracles are (a) every feeder is invoked with its EXACT
// CLI contract, (b) one feeder failing NEVER aborts the others (fail-soft), and
// (c) the harness covers the COMPLETE current feeder set (all 3 scripts).
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { refreshAll, summarize, FEEDERS } from "./refresh-lora-vault-datasets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

test("FEEDERS covers the complete current feeder set (fit-the-whole, R16)", () => {
  const scripts = new Set(FEEDERS.map((f) => f.script));
  assert.ok(scripts.has("vault-to-lora-dataset.mjs"), "feedback/galaxy/ai-synergy feeder present");
  assert.ok(scripts.has("vault-wiki-to-lora-dataset.mjs"), "wiki-domain feeder present (U-LORA-WIKI-DOMAIN)");
  assert.ok(scripts.has("vault-lessons-to-lora-dataset.mjs"), "vault-lessons feeder present");
  // vault-to-lora-dataset is invoked once per source (3), never as a bare run.
  const vtl = FEEDERS.filter((f) => f.script === "vault-to-lora-dataset.mjs");
  assert.equal(vtl.length, 3, "vault-to-lora-dataset runs once per --source");
  for (const f of vtl) assert.ok(f.args.includes("--source") && f.args.includes("--out"), "each source job passes --source + --out");
});

test("DRIFT GUARD: every --source the feeder accepts has a FEEDERS row (fails loud if india adds one)", () => {
  // Read the feeder's VALID source Set from source (read-only -- never edits india's
  // file). If india adds a 4th --source to vault-to-lora-dataset.mjs without a matching
  // FEEDERS row, this test fails LOUD instead of the refresh silently dropping it.
  const src = fs.readFileSync(path.join(HERE, "vault-to-lora-dataset.mjs"), "utf8");
  const m = src.match(/const\s+VALID\s*=\s*new\s+Set\(\[([^\]]*)\]\)/);
  assert.ok(m, "could not locate the VALID source Set in vault-to-lora-dataset.mjs -- the feeder's CLI contract moved; re-verify FEEDERS coverage");
  const validSources = [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
  assert.ok(validSources.length >= 3, "expected >=3 known sources");
  const covered = new Set(
    FEEDERS.filter((f) => f.script === "vault-to-lora-dataset.mjs")
      .map((f) => f.args[f.args.indexOf("--source") + 1])
  );
  for (const s of validSources) {
    assert.ok(covered.has(s), `feeder source '${s}' is accepted by vault-to-lora-dataset.mjs but has NO FEEDERS row -- add it so the refresh covers it`);
  }
});

test("CONTRACT: --out is the final token of every feeder args row (bare-out path contract)", () => {
  for (const f of FEEDERS) {
    assert.equal(f.args[f.args.length - 1], "--out", `${f.label}: --out must be the LAST arg (a token after it is swallowed as the path)`);
  }
});

test("refreshAll: invokes every feeder with node + the correct script path + args", () => {
  const calls = [];
  const run = (node, args) => { calls.push({ node, args }); return "Wrote 12 LoRA pairs -> x.jsonl"; };
  const results = refreshAll({ root: "/repo", run, node: "NODE" });
  assert.equal(calls.length, FEEDERS.length, "one spawn per feeder");
  assert.ok(calls.every((c) => c.node === "NODE"), "uses the injected node binary");
  // The wiki feeder must be invoked at its real path with a bare --out.
  const wiki = calls.find((c) => c.args[0].endsWith("vault-wiki-to-lora-dataset.mjs"));
  assert.ok(wiki, "wiki feeder spawned");
  assert.deepEqual(wiki.args.slice(1), ["--out"], "wiki feeder gets exactly --out");
  // A --source job carries the source token.
  const galaxy = calls.find((c) => c.args.includes("galaxy"));
  assert.ok(galaxy.args.includes("--source") && galaxy.args.includes("--out"));
  assert.ok(results.every((r) => r.ok), "all succeed when run() returns output");
  assert.ok(results.every((r) => typeof r.summary === "string" && r.summary.length > 0), "summary is the last output line");
});

test("refreshAll: fail-soft -- one feeder throwing does NOT abort the rest", () => {
  let n = 0;
  const run = () => { n++; if (n === 2) throw new Error("boom in feeder 2"); return "ok line"; };
  const results = refreshAll({ root: "/repo", run, node: "NODE" });
  assert.equal(results.length, FEEDERS.length, "every feeder still produces a row");
  const failed = results.filter((r) => !r.ok);
  assert.equal(failed.length, 1, "exactly the one that threw failed");
  assert.match(failed[0].error, /boom in feeder 2/, "captures the real error");
  assert.equal(results.filter((r) => r.ok).length, FEEDERS.length - 1, "the others still ran");
});

test("refreshAll: each row carries its label + script for the operator report", () => {
  const results = refreshAll({ root: "/r", run: () => "x", node: "n" });
  for (const r of results) {
    assert.ok(typeof r.label === "string" && r.label.length > 0);
    assert.ok(r.script.endsWith(".mjs"));
  }
});

test("summarize: counts refreshed/failed + allFailed only when EVERY job failed", () => {
  assert.deepEqual(
    summarize([{ ok: true }, { ok: false }, { ok: true }]),
    { total: 3, refreshed: 2, failed: 1, allFailed: false, results: [{ ok: true }, { ok: false }, { ok: true }] }
  );
  const all = summarize([{ ok: false }, { ok: false }]);
  assert.equal(all.allFailed, true, "every job failed -> allFailed (non-zero exit)");
  // A single transient failure must NOT flap the scheduled task red.
  assert.equal(summarize([{ ok: true }, { ok: false }]).allFailed, false);
});

test("summarize: empty result set -> zero, allFailed false (no jobs is not an outage)", () => {
  const r = summarize([]);
  assert.equal(r.total, 0);
  assert.equal(r.allFailed, false, "0 jobs must not exit non-zero");
});

test("refreshAll: empty feeders -> no spawn, empty results (adversarial)", () => {
  let called = false;
  const results = refreshAll({ root: "/r", run: () => { called = true; return "x"; }, feeders: [] });
  assert.equal(results.length, 0);
  assert.equal(called, false, "no feeders -> run never invoked");
});
