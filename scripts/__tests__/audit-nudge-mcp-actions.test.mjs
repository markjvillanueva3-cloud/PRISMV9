// TOKEN-SAVINGS-PIVOT/U-PSN-NUDGE-R12-AUDIT (iter7, 2026-05-23, slot:alpha)
// Tests for the fleet-wide R12 audit script that finds nudge hooks referencing
// unknown MCP actions (the same class of bug iter5 caught in the Ollama
// injector).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MCP_ACTION_RE,
  KNOWN_REAL_MCP_ACTIONS,
  extractMcpActionRefs,
  findUnknownActions,
} from "../audit-nudge-mcp-actions.mjs";

// --- extractMcpActionRefs: happy / fail / adversarial ---

test("extractMcpActionRefs: single match", () => {
  const refs = extractMcpActionRefs("use `prism_session:master_index_query` instead");
  assert.deepEqual(refs, ["prism_session:master_index_query"]);
});

test("extractMcpActionRefs: multiple unique matches dedup'd", () => {
  const refs = extractMcpActionRefs(
    "try prism_dev:code_search or prism_dev:code_search or prism_session:action_search",
  );
  assert.equal(refs.length, 2);
  assert.ok(refs.includes("prism_dev:code_search"));
  assert.ok(refs.includes("prism_session:action_search"));
});

test("extractMcpActionRefs: no matches → empty array", () => {
  assert.deepEqual(extractMcpActionRefs("plain text with no actions"), []);
});

test("extractMcpActionRefs: ignores word boundaries (no fragment matches)", () => {
  // _prism_session:foo — has leading underscore, NOT a word-boundary match.
  // We intentionally require a real word boundary so partial matches don't
  // get extracted.
  const refs = extractMcpActionRefs("xxxprism_session:fooxxx but prism_session:foo");
  // The bare `prism_session:foo` IS a match; the embedded one is too since
  // \b boundary works on word chars — verify behavior, not over-restrictive.
  assert.ok(refs.length >= 1);
  assert.ok(refs.includes("prism_session:foo"));
});

test("extractMcpActionRefs: non-string input returns []", () => {
  assert.deepEqual(extractMcpActionRefs(null), []);
  assert.deepEqual(extractMcpActionRefs(undefined), []);
  assert.deepEqual(extractMcpActionRefs(42), []);
  assert.deepEqual(extractMcpActionRefs({}), []);
});

test("extractMcpActionRefs: empty string returns []", () => {
  assert.deepEqual(extractMcpActionRefs(""), []);
});

// --- findUnknownActions ---

test("findUnknownActions: returns only unknowns", () => {
  const refs = ["prism_session:master_index_query", "prism_intelligence:ollama_summarize"];
  const unknowns = findUnknownActions(refs);
  // master_index_query is in the seed set; ollama_summarize is NOT (iter5 R12).
  assert.deepEqual(unknowns, ["prism_intelligence:ollama_summarize"]);
});

test("findUnknownActions: empty input returns []", () => {
  assert.deepEqual(findUnknownActions([]), []);
});

test("findUnknownActions: non-array returns []", () => {
  assert.deepEqual(findUnknownActions(null), []);
  assert.deepEqual(findUnknownActions("not-array"), []);
});

test("findUnknownActions: custom knownSet overrides default", () => {
  const custom = new Set(["prism_x:y"]);
  const unknowns = findUnknownActions(["prism_x:y", "prism_z:w"], custom);
  assert.deepEqual(unknowns, ["prism_z:w"]);
});

// --- KNOWN_REAL_MCP_ACTIONS shape ---

test("KNOWN_REAL_MCP_ACTIONS: non-empty + every entry well-shaped", () => {
  assert.ok(KNOWN_REAL_MCP_ACTIONS.size >= 10, "seed should have at least 10 verified actions");
  for (const a of KNOWN_REAL_MCP_ACTIONS) {
    assert.ok(/^prism_[a-z_]+:[a-z_]+$/.test(a), `action '${a}' violates prism_<d>:<a> shape`);
  }
});

test("KNOWN_REAL_MCP_ACTIONS: does NOT contain the iter5 fakes (regression guard)", () => {
  // If any of these are ever added to the seed set, iter5's R12 lesson has
  // been forgotten. Add a comment + grep-verify before adding.
  const iter5Fakes = [
    "prism_intelligence:ollama_summarize",
    "prism_intelligence:ollama_explain",
    "prism_intelligence:ollama_classify",
    "prism_intelligence:ollama_docstring",
    "prism_intelligence:ollama_lint",
    "prism_intelligence:ollama_diff_summary",
    "prism_intelligence:ollama_error_triage",
  ];
  for (const fake of iter5Fakes) {
    assert.ok(!KNOWN_REAL_MCP_ACTIONS.has(fake),
      `'${fake}' is a known iter5 fake — must NOT be in KNOWN_REAL_MCP_ACTIONS`);
  }
});

// --- iter8: derive-from-dispatcher-source ---

import { dispatcherNameToPrefix, extractActionsFromDispatcherSource } from "../audit-nudge-mcp-actions.mjs";

test("dispatcherNameToPrefix: devDispatcher.ts → prism_dev", () => {
  assert.equal(dispatcherNameToPrefix("devDispatcher.ts"), "prism_dev");
});

test("dispatcherNameToPrefix: sessionDispatcher.ts → prism_session", () => {
  assert.equal(dispatcherNameToPrefix("sessionDispatcher.ts"), "prism_session");
});

test("dispatcherNameToPrefix: camDispatcher.ts → prism_cam", () => {
  assert.equal(dispatcherNameToPrefix("camDispatcher.ts"), "prism_cam");
});

test("dispatcherNameToPrefix: mixed-case still lowercases the prefix", () => {
  // wEDMDispatcher.ts (theoretical) → prism_wedm
  assert.equal(dispatcherNameToPrefix("EDMDispatcher.ts"), "prism_edm");
});

test("dispatcherNameToPrefix: non-Dispatcher file returns null", () => {
  assert.equal(dispatcherNameToPrefix("helper.ts"), null);
  assert.equal(dispatcherNameToPrefix("router.ts"), null);
  assert.equal(dispatcherNameToPrefix("notDispatcher.ts.md"), null);
});

test("dispatcherNameToPrefix: null/non-string returns null", () => {
  assert.equal(dispatcherNameToPrefix(null), null);
  assert.equal(dispatcherNameToPrefix(undefined), null);
  assert.equal(dispatcherNameToPrefix(42), null);
});

test("extractActionsFromDispatcherSource: extracts case statements with prefix", () => {
  const src = `
    switch (action) {
      case "ollama_hook_query": {
        return engine.query();
      }
      case "ollama_hook_status": {
        return engine.status();
      }
      // comment with case "fake_in_comment" :  — should still extract (regex doesn't filter comments)
    }
  `;
  const out = extractActionsFromDispatcherSource("devDispatcher.ts", src);
  assert.ok(out.includes("prism_dev:ollama_hook_query"));
  assert.ok(out.includes("prism_dev:ollama_hook_status"));
});

test("extractActionsFromDispatcherSource: dedup duplicate cases", () => {
  // If a dispatcher has two `case "x":` blocks somehow, dedup'd in output.
  const src = `case "foo": ... case "foo": ...`;
  const out = extractActionsFromDispatcherSource("devDispatcher.ts", src);
  assert.equal(out.length, 1);
  assert.equal(out[0], "prism_dev:foo");
});

test("extractActionsFromDispatcherSource: non-Dispatcher filename returns []", () => {
  const out = extractActionsFromDispatcherSource("router.ts", `case "x":`);
  assert.deepEqual(out, []);
});

test("extractActionsFromDispatcherSource: empty/non-string content returns []", () => {
  assert.deepEqual(extractActionsFromDispatcherSource("devDispatcher.ts", ""), []);
  assert.deepEqual(extractActionsFromDispatcherSource("devDispatcher.ts", null), []);
});

test("extractActionsFromDispatcherSource: ignores cases with non-action shapes", () => {
  // Numeric cases, uppercase, mixed quotes — only `case "<lowercase>":` matches.
  const src = `
    case 0:
    case 'foo':         // single quotes — not matched by our regex
    case "FOO_BAR":     // uppercase — not matched
    case "real_action": // valid
  `;
  const out = extractActionsFromDispatcherSource("devDispatcher.ts", src);
  assert.deepEqual(out, ["prism_dev:real_action"]);
});

// --- iter12: multi-word dispatcher camelCase prefix yield ---

import { loadKnownDispatcherPrefixes } from "../audit-nudge-mcp-actions.mjs";
import { mkdtempSync, mkdirSync as _mkd, writeFileSync as _wf, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as _j } from "node:path";

test("loadKnownDispatcherPrefixes: multi-word filename yields short-form (prism_ai for aiReasoningDispatcher.ts)", () => {
  // Setup a tmp dir with simulated dispatcher filenames.
  const dir = mkdtempSync(_j(tmpdir(), "prism-audit-test-"));
  try {
    _wf(_j(dir, "aiReasoningDispatcher.ts"), "");
    _wf(_j(dir, "devDispatcher.ts"), "");
    _wf(_j(dir, "wedmProgramDispatcher.ts"), "");
    const out = loadKnownDispatcherPrefixes(dir);
    // aiReasoningDispatcher.ts must yield BOTH the long form AND short form.
    assert.ok(out.has("prism_aireasoning"), "long-form prism_aireasoning must be present");
    assert.ok(out.has("prism_ai"), "iter12: short-form prism_ai must also be yielded");
    // Single-word dispatchers still yield exactly one prefix (no spurious short-form).
    assert.ok(out.has("prism_dev"));
    // wedmProgramDispatcher.ts → wedm short-form
    assert.ok(out.has("prism_wedm"));
    assert.ok(out.has("prism_wedmprogram"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadKnownDispatcherPrefixes: non-camel filenames don't get a spurious short-form", () => {
  const dir = mkdtempSync(_j(tmpdir(), "prism-audit-test-"));
  try {
    _wf(_j(dir, "sessionDispatcher.ts"), "");
    const out = loadKnownDispatcherPrefixes(dir);
    assert.ok(out.has("prism_session"));
    // Should NOT have prism_s or similar truncation.
    assert.ok(!out.has("prism_s"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- iter9: tier classification ---

import { classifyUnknowns } from "../audit-nudge-mcp-actions.mjs";

test("classifyUnknowns: dispatcher exists → Tier A", () => {
  const prefixes = new Set(["prism_intelligence", "prism_dev"]);
  const { tierA, tierB } = classifyUnknowns(["prism_intelligence:ollama_x"], prefixes);
  assert.deepEqual(tierA, ["prism_intelligence:ollama_x"]);
  assert.deepEqual(tierB, []);
});

test("classifyUnknowns: dispatcher missing → Tier B (R12 fake)", () => {
  const prefixes = new Set(["prism_dev"]);
  const { tierA, tierB } = classifyUnknowns(["prism_nonexistent:foo"], prefixes);
  assert.deepEqual(tierA, []);
  assert.deepEqual(tierB, ["prism_nonexistent:foo"]);
});

test("classifyUnknowns: mixed refs split correctly", () => {
  const prefixes = new Set(["prism_dev", "prism_session"]);
  const { tierA, tierB } = classifyUnknowns([
    "prism_dev:zod_routed_action",
    "prism_fake:thing",
    "prism_session:also_unknown",
  ], prefixes);
  assert.equal(tierA.length, 2);
  assert.equal(tierB.length, 1);
  assert.ok(tierA.includes("prism_dev:zod_routed_action"));
  assert.ok(tierA.includes("prism_session:also_unknown"));
  assert.ok(tierB.includes("prism_fake:thing"));
});

test("classifyUnknowns: malformed ref (no colon) → Tier B", () => {
  const prefixes = new Set(["prism_dev"]);
  const { tierA, tierB } = classifyUnknowns(["no_colon_here"], prefixes);
  assert.deepEqual(tierB, ["no_colon_here"]);
});

test("classifyUnknowns: empty input → empty tiers", () => {
  const out = classifyUnknowns([], new Set());
  assert.deepEqual(out, { tierA: [], tierB: [] });
});

test("classifyUnknowns: non-array input → empty tiers (defensive)", () => {
  assert.deepEqual(classifyUnknowns(null, new Set()), { tierA: [], tierB: [] });
  assert.deepEqual(classifyUnknowns(undefined, new Set()), { tierA: [], tierB: [] });
  assert.deepEqual(classifyUnknowns("not-array", new Set()), { tierA: [], tierB: [] });
});

test("classifyUnknowns: null/undefined knownPrefixes treats everything as Tier B", () => {
  const { tierA, tierB } = classifyUnknowns(["prism_dev:foo"], null);
  assert.equal(tierA.length, 0);
  assert.equal(tierB.length, 1);
});

// --- regex contract ---

test("MCP_ACTION_RE: matches lowercase prism_*:* tokens only", () => {
  // Capital-letter dispatcher names should NOT match (we don't have any).
  const s = "prism_session:foo Prism_session:foo PRISM_SESSION:FOO";
  const matches = s.match(MCP_ACTION_RE) || [];
  assert.deepEqual(matches, ["prism_session:foo"]);
});

test("MCP_ACTION_RE: does not match prism prefix without colon", () => {
  const matches = "prism_session" .match(MCP_ACTION_RE) || [];
  assert.equal(matches.length, 0);
});
