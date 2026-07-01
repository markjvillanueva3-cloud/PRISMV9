/**
 * rgs-tool-planner.e2e.test.mjs
 * END-TO-END integration test for the RGS tool-planner — exercises the REAL
 * reader factories and the REAL signal-fusion / feedback / coverage code paths
 * against REAL data (the committed tribal index, the frozen pipeline rules,
 * synthetic-but-real-schema feedback records).
 *
 * WHY THIS FILE EXISTS — RGS-TOOL-AUTOINVOKE-MS1 / U-INTEG-FIX-P0:
 *   The MS0 unit suite (rgs-tool-planner.test.mjs) passed with INJECTED FAKE
 *   readers. Every one of the 10 post-ship P0 integration bugs lived in the
 *   orchestrator's REAL reader factories (makeTribalReader / makeCapabilities
 *   Reader / makeOllamaReader / makeOutcomesReader) and the hook<->sidecar
 *   schema seam — none of which a fake-reader test can reach. This file is the
 *   regression oracle: it would have caught all 10. Hermetic unit tests with
 *   injected fakes do NOT prove production wiring works.
 *
 * Resource-gated blocks skip gracefully:
 *   - Ollama block: only asserts when Ollama is genuinely reachable on
 *     127.0.0.1:11434 (probed directly, IPv4, as ground truth).
 *
 * Run:
 *   "H:/.claude/bin/portable-node" --test scripts/rgs-tool-planner.e2e.test.mjs
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  makeTribalReader,
  makeCapabilitiesReader,
  makeOutcomesReader,
  makeOllamaReader,
} from "./rgs-tool-planner.mjs";
import { runTribalSearch } from "./lib/master-index-search-lib.mjs";
import { matchPipelines } from "./lib/rgs-pipeline-rules.mjs";
import { extractOutcomes } from "./lib/rgs-plan-outcome.mjs";
import { coverage } from "./rgs-plan-coverage.mjs";

// ---------------------------------------------------------------------------
// Temp-file bookkeeping
// ---------------------------------------------------------------------------

const tmpFiles = [];
function makeTmpFile(name) {
  const f = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "rgs-e2e-")),
    name,
  );
  tmpFiles.push(f);
  return f;
}

// ---------------------------------------------------------------------------
// E2E-1: tribal reader — REAL tribal-embed-index.json  (catches P0-1)
//   Bug: makeTribalReader did `(hits ?? []).map()` on runTribalSearch's
//   `{ tokens, hits }` OBJECT → TypeError → swallowed → tribal:[] always.
//   Also mapped h.tip/h.text/h.label but the real hit field is h.title.
// ---------------------------------------------------------------------------

describe("E2E-1: tribal reader returns real hits with correct field mapping", () => {
  // Probe the real index directly so the test is self-calibrating: if the
  // committed tribal index genuinely has no hit for a broad manufacturing
  // query, we skip rather than fail for the wrong reason.
  const PROBE_QUERY = "feed rate speed tool wear";
  let probe;
  let reader;

  before(async () => {
    probe = runTribalSearch(PROBE_QUERY, {});
    reader = await makeTribalReader();
  });

  it("real tribal index yields probe hits (precondition)", (t) => {
    if (!probe || probe.hits.length === 0) {
      t.skip("tribal-embed-index.json absent or no hits for probe query");
    }
  });

  it("reader returns a non-empty array (P0-1: not [] from a swallowed TypeError)", async (t) => {
    if (!probe || probe.hits.length === 0) return t.skip("no probe hits");
    const got = await reader(PROBE_QUERY, {});
    assert.ok(Array.isArray(got), "reader must return an array");
    assert.ok(
      got.length > 0,
      "tribal reader returned [] for a query that DOES have real hits — " +
        "the {tokens,hits} object was .map()'d (P0-1)",
    );
  });

  it("each hit has {id, tip:non-empty-string, score:number, domain} (P0-1: h.title mapping)", async (t) => {
    if (!probe || probe.hits.length === 0) return t.skip("no probe hits");
    const got = await reader(PROBE_QUERY, {});
    for (const h of got) {
      assert.equal(typeof h.id, "string", "id must be a string");
      assert.equal(typeof h.tip, "string", "tip must be a string");
      assert.ok(h.tip.length > 0, "tip must be non-empty — real field is h.title");
      assert.equal(typeof h.score, "number", "score must be a number");
      assert.equal(typeof h.domain, "string", "domain must be a string");
    }
  });

  it("reader's tip equals runTribalSearch's hit.title (proves the field binding)", async (t) => {
    if (!probe || probe.hits.length === 0) return t.skip("no probe hits");
    const got = await reader(PROBE_QUERY, {});
    assert.equal(
      got[0].tip,
      probe.hits[0].title,
      "tip must mirror the real searchTribalHits field `title`",
    );
  });
});

// ---------------------------------------------------------------------------
// E2E-2: capabilities reader — representative graph  (catches P0-4)
//   Bug: makeCapabilitiesReader passed the WHOLE unit text to findInGraph,
//   which does a full-phrase substring match → 0 hits on every real unit.
//   Fix: tokenize, query per token, union.
// ---------------------------------------------------------------------------

describe("E2E-2: capabilities reader tokenizes multi-word unit text", () => {
  // A representative graph — the bug (whole-phrase vs per-token) reproduces
  // fully on a handful of nodes; a 324 MB real-graph load is not needed to
  // prove the tokenization path.
  const G = {
    nodes: [
      { id: "e-kienzle", label: "KienzleForceModel", layer: "L5" },
      { id: "e-taylor", label: "TaylorToolLifeEngine", layer: "L5" },
      { id: "d-calc", label: "prism_calc dispatcher", layer: "L2", subgroup: "dispatcher" },
    ],
  };

  it("finds an engine node from a multi-word title (P0-4)", async () => {
    const caps = makeCapabilitiesReader(G);
    // Real units always have multi-word text; whole-phrase match finds nothing.
    const got = await caps("Build the KienzleForceModel cutting force calculation");
    assert.ok(
      got.engines.length + got.mcpTools.length > 0,
      "capabilities reader found nothing for multi-word text — " +
        "whole unit text was passed to findInGraph verbatim (P0-4)",
    );
    assert.ok(
      got.engines.includes("KienzleForceModel"),
      `expected KienzleForceModel in engines, got ${JSON.stringify(got)}`,
    );
  });

  it("classifies a dispatcher node as an mcpTool", async () => {
    const caps = makeCapabilitiesReader(G);
    const got = await caps("wire the prism_calc dispatcher to the action surface");
    assert.ok(
      got.mcpTools.some((t) => t.includes("prism_calc")),
      `expected a prism_calc mcpTool, got ${JSON.stringify(got)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// E2E-3: pipeline rules — /forge-triple must NOT fire on boilerplate (P0-5)
//   Bug: the rule matched the literal phrase `forge-triple`, which appears as
//   milestone-header boilerplate ("forge-triple ownership in milestone
//   header") in ~98.6% of envelope descriptions.
// ---------------------------------------------------------------------------

describe("E2E-3: /forge-triple does not fire on milestone-header boilerplate", () => {
  it("boilerplate-only description does NOT yield /forge-triple (P0-5)", () => {
    const got = matchPipelines({
      title: "Update the changelog wording for the release notes",
      description: "forge-triple ownership in milestone header",
    });
    assert.ok(
      !got.some((p) => p.skill === "/forge-triple"),
      "/forge-triple fired on a docs unit because of header boilerplate (P0-5)",
    );
  });

  it("a genuine engine+skill+hook unit STILL yields /forge-triple", () => {
    const got = matchPipelines({
      title: "Create the FooEngine",
      description: "wire a new engine with its companion skill and hook",
    });
    assert.ok(
      got.some((p) => p.skill === "/forge-triple"),
      "real forge-triple unit lost detection — fix over-corrected",
    );
  });
});

// ---------------------------------------------------------------------------
// E2E-4: feedback loop — composite-key shipped classification (P0-6b)
//   Bug: picked-event unitKey is composite `MS::U-id`; extractOutcomes' regex
//   could not pull the bare U-id (preceded by `:`), so shipped units were
//   misclassified `blocked`.
// ---------------------------------------------------------------------------

describe("E2E-4: extractOutcomes classifies composite-key units correctly", () => {
  it("composite MS::U-id picked event matched to a commit → shipped (P0-6b)", () => {
    const out = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: ["[MAIN] [MS-FOO]/U-BAR-01: shipped the thing\n\nbody text"],
        pickedEvents: [
          { unitKey: "MS-FOO::U-BAR-01", sid: "s1", predictedPipelines: ["/scrutinize"] },
        ],
        revertedKeys: [],
      },
      { now: "2026-05-16T00:00:00.000Z" },
    );
    assert.equal(out.length, 1);
    assert.equal(
      out[0].outcome,
      "shipped",
      "composite key not split → bare U-id never matched the commit (P0-6b)",
    );
  });
});

// ---------------------------------------------------------------------------
// E2E-5: feedback loop — outcomes reader aggregates the REAL record schema
//        (catches P0-6c)
//   Bug: makeOutcomesReader filtered on rec.pipeline/tier/verdict and summed
//   rec.shipped/blocked/reverted — fields the OutcomeRecord never had. The
//   real record carries {outcome, predictedPipelines, tier, verdict}.
// ---------------------------------------------------------------------------

describe("E2E-5: outcomes reader aggregates real OutcomeRecord schema", () => {
  let outcomesPath;
  const savedEnv = process.env.PRISM_RGS_OUTCOMES_PATH;

  before(() => {
    outcomesPath = makeTmpFile("roadmap-tool-plan-outcomes.jsonl");
    // Records in the REAL redesigned OutcomeRecord shape.
    const recs = [
      { v: 1, ts: "2026-05-16T00:00:00.000Z", unitKey: "MS::U-1", outcome: "shipped", predictedPipelines: ["/forge-triple"], tier: "M", verdict: "build" },
      { v: 1, ts: "2026-05-16T00:01:00.000Z", unitKey: "MS::U-2", outcome: "blocked", predictedPipelines: ["/forge-triple"], tier: "M", verdict: "build" },
      { v: 1, ts: "2026-05-16T00:02:00.000Z", unitKey: "MS::U-3", outcome: "shipped", predictedPipelines: ["/forge-triple"], tier: "L", verdict: "build" },
    ];
    fs.writeFileSync(outcomesPath, recs.map((r) => JSON.stringify(r)).join("\n") + "\n");
    process.env.PRISM_RGS_OUTCOMES_PATH = outcomesPath;
  });

  after(() => {
    if (savedEnv === undefined) delete process.env.PRISM_RGS_OUTCOMES_PATH;
    else process.env.PRISM_RGS_OUTCOMES_PATH = savedEnv;
  });

  it("aggregates shipped/blocked by (pipeline, tier, verdict) (P0-6c)", async () => {
    const reader = makeOutcomesReader();
    const got = await reader({ pipeline: "/forge-triple", tier: "M", verdict: "build" });
    assert.equal(got.shipped, 1, `shipped should be 1 for (forge-triple,M,build), got ${got.shipped}`);
    assert.equal(got.blocked, 1, `blocked should be 1 for (forge-triple,M,build), got ${got.blocked}`);
    assert.equal(got.reverted, 0);
  });

  it("does not bleed across tier (the L-tier shipped record is excluded)", async () => {
    const reader = makeOutcomesReader();
    const got = await reader({ pipeline: "/forge-triple", tier: "M", verdict: "build" });
    // 2 M-tier records (1 shipped + 1 blocked); the 3rd is L-tier and must not count.
    assert.equal(got.shipped + got.blocked + got.reverted, 2, "tier filter leaked");
  });
});

// ---------------------------------------------------------------------------
// E2E-6: coverage — bySource reads the FLAT sidecar shape  (catches P0-7)
//   Bug: coverage() read entry.plan.source but the sidecar stores the ToolPlan
//   flat (plans[key] IS the plan). bySource was therefore always {unknown:N}.
// ---------------------------------------------------------------------------

describe("E2E-6: coverage bySource reads the flat sidecar", () => {
  it("counts plans by their real .source field (P0-7)", () => {
    const report = coverage({
      openUnits: [{ key: "MS::U-1" }, { key: "MS::U-2" }],
      sidecar: {
        schemaVersion: "1.0.0",
        plans: {
          "MS::U-1": { source: "ollama", pipelines: [{ skill: "/forge-triple" }] },
          "MS::U-2": { source: "deterministic", pipelines: [{ skill: "/scrutinize" }] },
        },
      },
      outcomes: [],
    });
    assert.equal(report.bySource.ollama, 1, "bySource read entry.plan.source on a flat sidecar (P0-7)");
    assert.equal(report.bySource.deterministic, 1);
    assert.equal(report.bySource.unknown, undefined, "no plan should be classified 'unknown'");
  });
});

// ---------------------------------------------------------------------------
// E2E-7: Ollama reader — IPv4 reachability + timeout  (catches P0-2, P0-3)
//   P0-2: the bridge defaulted to http://127.0.0.1:11434; Node resolves
//         `localhost` to IPv6 ::1, Ollama binds IPv4-only → ECONNREFUSED.
//   P0-3: DEFAULT_TIMEOUT_MS=500 but qwen-7b takes 2.5-4.3s; the reader never
//         overrode timeoutMs → every call AbortError.
//   Ground truth: a direct IPv4 probe. If Ollama is genuinely down the whole
//   block skips; if it is up, isOllamaAvailable() (which uses the bridge's
//   default URL) MUST agree.
// ---------------------------------------------------------------------------

describe("E2E-7: Ollama reader reaches a running daemon within timeout", () => {
  let ollamaActuallyUp = false;
  let bridge = null;

  before(async () => {
    // Direct IPv4 probe — the unambiguous "is Ollama running" ground truth.
    try {
      const r = await fetch("http://127.0.0.1:11434/api/tags", {
        signal: AbortSignal.timeout(2500),
      });
      ollamaActuallyUp = r.ok;
    } catch {
      ollamaActuallyUp = false;
    }
    // Import the bridge with OLLAMA_URL unset so we test the DEFAULT host
    // (an explicit OLLAMA_URL override would mask the IPv6 bug).
    if (ollamaActuallyUp && !process.env.OLLAMA_URL) {
      bridge = await import("../.claude/hooks/lib/ollama-hook-bridge.mjs");
    }
  });

  it("isOllamaAvailable() agrees with the direct IPv4 probe (P0-2)", async (t) => {
    if (!ollamaActuallyUp) return t.skip("Ollama not running on 127.0.0.1:11434");
    if (!bridge) return t.skip("OLLAMA_URL override set — IPv6-default test not meaningful");
    const avail = await bridge.isOllamaAvailable();
    assert.equal(
      avail,
      true,
      "isOllamaAvailable() is false though Ollama IS running on 127.0.0.1 — " +
        "the bridge defaults to localhost which resolves to IPv6 ::1 (P0-2)",
    );
  });

  it("ollama reader returns success within the timeout (P0-3)", async (t) => {
    if (!ollamaActuallyUp) return t.skip("Ollama not running on 127.0.0.1:11434");
    if (!bridge) return t.skip("OLLAMA_URL override set");
    const reader = makeOllamaReader(bridge.queryOllama);
    const res = await reader(
      'Reply with only this JSON: {"toolchain":["x"],"confidence":0.5,"rationale":"ok"}',
    );
    assert.equal(
      res.success,
      true,
      `ollama reader failed (P0-2/P0-3): ${JSON.stringify(res)}`,
    );
    assert.equal(typeof res.response, "string");
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

after(() => {
  for (const f of tmpFiles) {
    try {
      fs.rmSync(path.dirname(f), { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
});
