// scripts/lib/octopus-record-lib.test.mjs — U-HOC02 tests (pure, hermetic).

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  KIND_OCTOPUS,
  SCHEMA_VERSION,
  appendOctopusEntry,
  buildOctopusEntry,
  computeVoiceStats,
  readOctopusLedger,
  recordOctopusRun,
  redactExemplars,
} from "./octopus-record-lib.mjs";

function makeLedger() {
  const dir = join(tmpdir(), `oc-rec-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return { dir, ledgerPath: join(dir, "octopus-runs.jsonl") };
}

test("buildOctopusEntry happy-path produces v1 schema record", () => {
  const e = buildOctopusEntry({
    prompt: "Is the Kienzle kc1.1 for steel 1800 MPa?",
    voices: [
      { id: "voice-a", verdict: "yes", score: 0.9 },
      { id: "voice-b", verdict: "yes", score: 0.85 },
      { id: "voice-c", verdict: "no", dissent: "should be looked up from constants.ts" },
      { id: "voice-d", verdict: "yes", score: 0.8 },
      { id: "voice-e", verdict: "yes", score: 0.95 },
    ],
    consensus: { verdict: "yes", confidence: 0.85 },
    slot: "bravo",
    chatId: "claude-test",
    at: "2026-05-23T20:00:00.000Z",
  });
  assert.equal(e.schemaVersion, SCHEMA_VERSION);
  assert.equal(e.kind, KIND_OCTOPUS);
  assert.equal(e.signature, "octopus:yes=4|no=1");
  assert.equal(e.callCount, 5);
  assert.equal(e.outcome, "pending");
  assert.equal(e.voices[2].dissent, "should be looked up from constants.ts");
  assert.equal(e.consensus.verdict, "yes");
  assert.equal(e.semanticSummary, "Is the Kienzle kc1.1 for steel 1800 MPa?");
  assert.equal(e.eligible, true);
});

test("buildOctopusEntry throws on empty prompt", () => {
  assert.throws(
    () => buildOctopusEntry({ prompt: "", voices: [{ id: "a", verdict: "x" }] }),
    /prompt required/,
  );
});

test("buildOctopusEntry throws on empty voices", () => {
  assert.throws(
    () => buildOctopusEntry({ prompt: "p", voices: [] }),
    /voices\[\] required/,
  );
});

test("buildOctopusEntry truncates oversized prompt + dissent (boundary)", () => {
  const big = "x".repeat(10000);
  const e = buildOctopusEntry({
    prompt: big,
    voices: [{ id: "a", verdict: "x", dissent: "y".repeat(2000) }],
  });
  assert.equal(e.prompt.length, 4096);
  assert.equal(e.semanticSummary.length, 256);
  assert.equal(e.voices[0].dissent.length, 512);
});

test("buildOctopusEntry handles adversarial NaN score + missing verdict", () => {
  const e = buildOctopusEntry({
    prompt: "p",
    voices: [
      { id: "a" /* no verdict */, score: NaN },
      { id: "b", score: Infinity },
    ],
  });
  assert.equal(e.voices[0].score, null);
  assert.equal(e.voices[0].verdict, "unknown");
  // Infinity is technically a finite-Number false → null
  assert.equal(e.voices[1].score, null);
  assert.equal(e.signature, "octopus:unknown=2");
});

test("appendOctopusEntry creates ledger + appends; readOctopusLedger round-trips", () => {
  const { dir, ledgerPath } = makeLedger();
  try {
    const a = buildOctopusEntry({ prompt: "p1", voices: [{ id: "a", verdict: "yes" }] });
    const b = buildOctopusEntry({ prompt: "p2", voices: [{ id: "a", verdict: "no" }] });
    appendOctopusEntry(a, { ledgerPath });
    appendOctopusEntry(b, { ledgerPath });
    assert.ok(existsSync(ledgerPath));
    const back = readOctopusLedger({ ledgerPath });
    assert.equal(back.length, 2);
    assert.equal(back[0].prompt, "p1");
    assert.equal(back[1].prompt, "p2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readOctopusLedger skips malformed lines (R12 fail-soft on corrupt ledger)", () => {
  const { dir, ledgerPath } = makeLedger();
  try {
    const valid = buildOctopusEntry({ prompt: "p", voices: [{ id: "a", verdict: "x" }] });
    appendOctopusEntry(valid, { ledgerPath });
    // Inject a malformed line
    const corrupt = readFileSync(ledgerPath, "utf8") + "{not-json-broken\n";
    writeFileSync(ledgerPath, corrupt, "utf8");
    const back = readOctopusLedger({ ledgerPath });
    assert.equal(back.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readOctopusLedger returns [] on missing file", () => {
  const { dir, ledgerPath } = makeLedger();
  try {
    assert.deepEqual(readOctopusLedger({ ledgerPath }), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("recordOctopusRun convenience build+append in one call", () => {
  const { dir, ledgerPath } = makeLedger();
  try {
    const { entry, ledger } = recordOctopusRun(
      { prompt: "round-trip", voices: [{ id: "a", verdict: "y" }, { id: "b", verdict: "y" }] },
      { ledgerPath },
    );
    assert.equal(entry.kind, KIND_OCTOPUS);
    assert.equal(ledger, ledgerPath);
    const back = readOctopusLedger({ ledgerPath });
    assert.equal(back.length, 1);
    assert.equal(back[0].prompt, "round-trip");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeVoiceStats — variability across 3 spanning voice-behaviour patterns (U-HOC04 input)", () => {
  // Pattern A: always-aligns (voice-aligned)
  // Pattern B: always-dissents (voice-rebel)
  // Pattern C: 50/50 mix (voice-mixed)
  const entries = [];
  for (let i = 0; i < 4; i++) {
    entries.push(buildOctopusEntry({
      prompt: `p${i}`,
      voices: [
        { id: "voice-aligned", verdict: "yes" },
        { id: "voice-rebel", verdict: "no" },
        { id: "voice-mixed", verdict: i % 2 === 0 ? "yes" : "no" },
      ],
      consensus: { verdict: "yes", confidence: 0.7 },
    }));
  }
  const stats = computeVoiceStats(entries);
  assert.equal(stats.get("voice-aligned").alignedCount, 4);
  assert.equal(stats.get("voice-aligned").dissentCount, 0);
  assert.equal(stats.get("voice-aligned").dissentRate, 0);
  assert.equal(stats.get("voice-rebel").dissentCount, 4);
  assert.equal(stats.get("voice-rebel").dissentRate, 1);
  assert.equal(stats.get("voice-mixed").dissentCount, 2);
  assert.equal(stats.get("voice-mixed").alignedCount, 2);
  assert.equal(stats.get("voice-mixed").dissentRate, 0.5);
});

test("computeVoiceStats ignores non-octopus entries (forward-compat)", () => {
  const mixed = [
    buildOctopusEntry({ prompt: "p", voices: [{ id: "a", verdict: "y" }], consensus: { verdict: "y" } }),
    { kind: "other-stream", voices: [{ id: "ghost", verdict: "x" }] },
  ];
  const stats = computeVoiceStats(mixed);
  assert.equal(stats.size, 1);
  assert.ok(stats.get("a"));
  assert.equal(stats.has("ghost"), false);
});

test("computeVoiceStats normalizes per-model ollama ids to ONE vendor bucket (HOC04 vendor-level)", () => {
  // The ledger tags ollama voices `ollama:<model>` (U-OCTOPUS-VOICE-ID-DIAG) for
  // diagnosability, but HOC04 weight tuning is vendor-keyed (octopus-setup.mjs):
  // the two distinct local models MUST aggregate into one "ollama" bucket here,
  // never split per-model (which would emit un-mappable per-model proposals).
  const entries = [
    buildOctopusEntry({ prompt: "p1", voices: [
      { id: "ollama:qwen2.5-coder:32b", verdict: "y" },
      { id: "ollama:gpt-oss:20b", verdict: "y" },
      { id: "google", verdict: "y" },
    ], consensus: { verdict: "y" } }),
    buildOctopusEntry({ prompt: "p2", voices: [
      { id: "ollama:qwen2.5-coder:32b", verdict: "n" },
      { id: "ollama:gpt-oss:20b", verdict: "y" },
    ], consensus: { verdict: "y" } }),
  ];
  const stats = computeVoiceStats(entries);
  // Both ollama models collapse into ONE vendor bucket: 2 voices x 2 entries = 4 runs.
  assert.ok(stats.has("ollama"));
  assert.equal(stats.get("ollama").totalRuns, 4);
  // No per-model bucket leaks into the weight-tuning aggregation.
  assert.equal(stats.has("ollama:qwen2.5-coder:32b"), false);
  assert.equal(stats.has("ollama:gpt-oss:20b"), false);
  // Single-model vendors stay bare + separate (back-compat).
  assert.ok(stats.has("google"));
  assert.equal(stats.get("google").totalRuns, 1);
});

test("psnExemplars + routerDecision are preserved when present (HOC01 → HOC02 wire)", () => {
  const e = buildOctopusEntry({
    prompt: "p",
    voices: [{ id: "a", verdict: "y" }],
    psnExemplars: { tribal: ["t1"], skills: ["s1"] },
    routerDecision: "route:octopus",
  });
  assert.deepEqual(e.psnExemplars, { tribal: ["t1"], skills: ["s1"] });
  assert.equal(e.routerDecision, "route:octopus");
});

// -- FIX 1(c): defensive redaction of psnExemplars before persistence -----

test("redactExemplars: masks secret-shaped strings, preserves structure (legs/hits/score)", () => {
  const exemplars = {
    legs: [
      {
        name: "tribal",
        hits: [
          { text: "normal note about milling", score: 0.4 },
          { text: "leak Bearer abc.def.ghi and api_key=zzz9secret", score: 0.9 },
        ],
      },
    ],
    errors: [],
  };
  const out = redactExemplars(exemplars);
  // Structure preserved.
  assert.equal(out.legs[0].name, "tribal");
  assert.equal(out.legs[0].hits[1].score, 0.9);
  assert.deepEqual(out.errors, []);
  // Secrets masked.
  const blob = JSON.stringify(out);
  assert.ok(!blob.includes("abc.def.ghi"), "bearer leaked through exemplars");
  assert.ok(!blob.includes("zzz9secret"), "api_key value leaked through exemplars");
  assert.match(out.legs[0].hits[1].text, /Bearer \[redacted\]/);
  // Clean text untouched.
  assert.equal(out.legs[0].hits[0].text, "normal note about milling");
});

test("buildOctopusEntry redacts secrets in psnExemplars before they hit the ledger", () => {
  const e = buildOctopusEntry({
    prompt: "p",
    voices: [{ id: "a", verdict: "y" }],
    psnExemplars: { legs: [{ name: "wiki", hits: [{ text: "key AIza" + "C".repeat(35), score: 1 }] }] },
  });
  const blob = JSON.stringify(e.psnExemplars);
  assert.ok(!blob.includes("AIza" + "C".repeat(35)), "google key leaked into ledger entry");
  assert.match(e.psnExemplars.legs[0].hits[0].text, /\[redacted-google-key\]/);
});

// -- FIX B (P5 data-leak): write-time redaction of ALL secret-bearing fields ---
//
// A proven leak: a secret embedded in `prompt` / `consensus.verdict` survived
// verbatim into the shared-branch ledger (and thence into the NOT-gitignored
// WEEKLY-*.md). Assert NONE of the embedded secrets appear ANYWHERE in the
// built entry — across prompt, semanticSummary, voices[], and consensus.

test("buildOctopusEntry redacts secrets embedded in prompt + consensus.verdict (P5 data-leak)", () => {
  const SK = "sk-ABCD1234secretkeyvalue99";
  const GHP = "ghp_SECRETTOKEN1234567890";
  const e = buildOctopusEntry({
    prompt: `please rotate ${SK} for me`,
    voices: [
      { id: "anthropic", verdict: "agree" },
      // a secret can also ride in a voice's free-text dissent
      { id: "google", verdict: "disagree", dissent: `saw ${SK} in the corpus` },
    ],
    consensus: {
      verdict: `do NOT log ${GHP}`,
      confidence: 0.8,
      dissent_items: [`token ${GHP} is exposed`],
    },
  });

  const blob = JSON.stringify(e);
  // The raw secrets must NOT appear ANYWHERE in the persisted entry.
  assert.ok(!blob.includes(SK), "sk- key leaked into the ledger entry");
  assert.ok(!blob.includes(GHP), "ghp_ token leaked into the ledger entry");

  // And the specific fields carry the redaction marker (positive proof the
  // value was masked, not merely absent because the field was dropped).
  assert.match(e.prompt, /\[redacted-openai-key\]/, "prompt masked");
  assert.match(e.semanticSummary, /\[redacted-openai-key\]/, "semanticSummary masked");
  assert.match(e.voices[1].dissent, /\[redacted-openai-key\]/, "voice dissent masked");
  assert.match(e.consensus.verdict, /\[redacted-github-token\]/, "consensus.verdict masked");
  assert.match(e.consensus.dissent_items[0], /\[redacted-github-token\]/, "consensus.dissent_items masked");

  // Non-secret content around the secret is preserved (redaction is surgical).
  assert.ok(e.prompt.includes("please rotate"), "surrounding prompt text preserved");
  assert.ok(e.consensus.verdict.includes("do NOT log"), "surrounding verdict text preserved");
});

test("buildOctopusEntry redaction is fail-soft on clean input (no false redaction, no throw)", () => {
  const e = buildOctopusEntry({
    prompt: "what is the Kienzle kc1.1 for steel?",
    voices: [{ id: "a", verdict: "yes", dissent: "no concerns" }],
    consensus: { verdict: "1800 MPa per ISO P group", confidence: 0.9 },
  });
  // Clean strings pass through untouched (redactSecrets only masks secret shapes).
  assert.equal(e.prompt, "what is the Kienzle kc1.1 for steel?");
  assert.equal(e.consensus.verdict, "1800 MPa per ISO P group");
  assert.equal(e.voices[0].dissent, "no concerns");
  assert.ok(!JSON.stringify(e).includes("[redacted"), "no spurious redaction markers on clean input");
});

// -- FIX 2: lock-free O_APPEND ledger (lost-update race elimination) -------

test("appendOctopusEntry: two sequential appends both survive (read back 2 lines)", () => {
  const { dir, ledgerPath } = makeLedger();
  try {
    const a = buildOctopusEntry({ prompt: "race-1", voices: [{ id: "a", verdict: "y" }] });
    const b = buildOctopusEntry({ prompt: "race-2", voices: [{ id: "a", verdict: "n" }] });
    appendOctopusEntry(a, { ledgerPath });
    appendOctopusEntry(b, { ledgerPath });
    const back = readOctopusLedger({ ledgerPath });
    assert.equal(back.length, 2, "both appends must survive (no lost-update)");
    assert.deepEqual(back.map((e) => e.prompt).sort(), ["race-1", "race-2"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendOctopusEntry: N back-to-back appends all survive, one JSON line each", () => {
  const { dir, ledgerPath } = makeLedger();
  try {
    const N = 20;
    for (let i = 0; i < N; i++) {
      appendOctopusEntry(
        buildOctopusEntry({ prompt: `entry-${i}`, voices: [{ id: "v", verdict: "y" }] }),
        { ledgerPath },
      );
    }
    const raw = readFileSync(ledgerPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    assert.equal(lines.length, N, "every append must produce exactly one line");
    // Each line is independently valid JSON (no torn/merged lines).
    for (const l of lines) assert.doesNotThrow(() => JSON.parse(l));
    const back = readOctopusLedger({ ledgerPath });
    assert.equal(back.length, N);
    assert.deepEqual(back.map((e) => e.prompt), Array.from({ length: N }, (_, i) => `entry-${i}`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendOctopusEntry: write error is fail-soft (never throws to the octopus run)", () => {
  // Point at a path whose parent is a FILE (mkdir of the 'dir' will fail), and
  // confirm appendOctopusEntry swallows the error + invokes onError.
  const { dir, ledgerPath } = makeLedger();
  try {
    const fileAsParent = join(dir, "iam-a-file");
    writeFileSync(fileAsParent, "x");
    const badPath = join(fileAsParent, "nested", "octopus-runs.jsonl"); // parent is a file
    let captured = null;
    const entry = buildOctopusEntry({ prompt: "p", voices: [{ id: "a", verdict: "y" }] });
    // Must not throw.
    const ret = appendOctopusEntry(entry, { ledgerPath: badPath, onError: (e) => { captured = e; } });
    assert.equal(ret, badPath, "returns the path even on failure (best-effort telemetry)");
    assert.ok(captured instanceof Error, "onError invoked with the failure cause");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
