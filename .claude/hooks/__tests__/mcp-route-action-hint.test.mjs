// TOKEN-SAVINGS-PIVOT/U-PSN-ACTION-HINT (iter22-followup, 2026-05-23, slot:alpha)
// Tests for the per-classifier action-hint inline-suggestion added to
// mcp-route-suggest.mjs. Closes the iter22 advisory gap where nudges said
// "prefer the MCP action it names" without actually naming one.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  _PREFERRED_ACTION_FOR_CLASSIFIER,
  formatActionHint,
  appendActionHints,
} from "../mcp-route-suggest.mjs";

// Cross-check against mcp-route-takeup.mjs — every action we hint MUST be in
// the take-up map so taking the hinted route gets credited. Imported as data,
// not invoked.
import { extractMcpAction, _ACTION_TO_CLASSIFIERS } from "../mcp-route-takeup.mjs";

// U-PSN-TAKEUP-MAP-EXPORT (iter6, 2026-05-23, slot:alpha): derive the credited-
// actions set from the canonical takeup map at test time. Previously a frozen
// inline duplicate that would silently drift when takeup grew new mappings
// (e.g. iter20's /U-WEBSEARCH-KB-ROUTE added prism_knowledge:* but iter1's
// hardcoded set was already shipped). Single source of truth now.
const TAKEUP_CREDITED_ACTIONS = new Set(Object.keys(_ACTION_TO_CLASSIFIERS));

// --- formatActionHint: happy-path, ≥3 spanning classifiers (variability floor) ---

test("formatActionHint: isBroadGrep → master_index_query", () => {
  const h = formatActionHint("isBroadGrep");
  assert.ok(h.includes("prism_session:master_index_query"));
  assert.ok(h.startsWith("→ Take this route now:"));
});

test("formatActionHint: isVerboseBash → action_search", () => {
  const h = formatActionHint("isVerboseBash");
  assert.ok(h.includes("prism_session:action_search"));
});

test("formatActionHint: isLargeRead → dispatcher_map_compact", () => {
  const h = formatActionHint("isLargeRead");
  assert.ok(h.includes("prism_session:dispatcher_map_compact"));
});

test("formatActionHint: isLargeWrite → prism_dev:file_write", () => {
  const h = formatActionHint("isLargeWrite");
  assert.ok(h.includes("prism_dev:file_write"));
});

test("formatActionHint: isBroadGlob → master_index_query", () => {
  const h = formatActionHint("isBroadGlob");
  assert.ok(h.includes("prism_session:master_index_query"));
});

test("formatActionHint: isBroadWebSearch → prism_knowledge:search", () => {
  const h = formatActionHint("isBroadWebSearch");
  assert.ok(h.includes("prism_knowledge:search"));
});

// THIS is the iter22 gap-closure: the doctrineSurface classifier fires ~35% of
// all nudges, and its body never named an action. Hint must surface one now.
test("formatActionHint: doctrineSurface (top-2 firer) → dispatcher_map_compact", () => {
  const h = formatActionHint("doctrineSurface");
  assert.ok(h !== null, "doctrineSurface MUST yield a hint — it's the top-fire classifier");
  assert.ok(h.includes("prism_session:dispatcher_map_compact"));
});

test("formatActionHint: backendAuditChain → prism_dev:code_search", () => {
  const h = formatActionHint("backendAuditChain");
  assert.ok(h.includes("prism_dev:code_search"));
});

// --- formatActionHint: failure modes (≥3 per build-enforce floor) ---

test("formatActionHint: unknown classifier returns null (no false hint)", () => {
  assert.equal(formatActionHint("notARealClassifier"), null);
});

test("formatActionHint: null/undefined/non-string inputs return null", () => {
  assert.equal(formatActionHint(null), null);
  assert.equal(formatActionHint(undefined), null);
  assert.equal(formatActionHint(42), null);
  assert.equal(formatActionHint({}), null);
  assert.equal(formatActionHint([]), null);
});

test("formatActionHint: ollama classifier deliberately has no hint", () => {
  // Ollama messages already inline `dispatcher:action` in the body — adding
  // a second hint would be redundant noise.
  assert.equal(formatActionHint("ollama"), null);
});

// --- appendActionHints: adversarial inputs (≥2 per build-enforce floor) ---

test("appendActionHints: empty array passes through", () => {
  assert.deepEqual(appendActionHints([]), []);
});

test("appendActionHints: non-array passes through unchanged", () => {
  assert.equal(appendActionHints(null), null);
  assert.equal(appendActionHints(undefined), undefined);
  assert.equal(appendActionHints("not-an-array"), "not-an-array");
});

test("appendActionHints: skips non-string entries (defensive)", () => {
  const input = [null, 42, undefined, { msg: "x" }];
  const out = appendActionHints(input);
  // Non-string entries should pass through unchanged (no crash).
  assert.equal(out.length, 4);
});

// --- appendActionHints: classifier-substring routing through real nudge text ---

test("appendActionHints: broad-Grep nudge is companion-covered -> hint suppressed by default (U-P1-U01)", () => {
  // STALE-TEST FIX (2026-06-18, slot:alpha): isBroadGrep is companion-covered by
  // pre-grep-graph-inject, so U-P1-U01 (2026-05-25, combo-efficiency) suppresses
  // the redundant "Take this route" hint BY DEFAULT. This iter22 test (2026-05-23)
  // predated U-P1-U01 and still asserted the hint -> pre-existing failure
  // (surfaced 2026-06-18 during takeup-script-credit work; unrelated to it).
  const msg = "TOKEN-SAVE -- broad Grep (output_mode='content', no glob/type, prism scope) returns full match lines. Cheaper: `prism_session:master_index_query` or `prism_dev:code_search`.";
  const out = appendActionHints([msg]);
  assert.equal(out.length, 1);
  assert.ok(out[0].includes(msg), "original message preserved");
  assert.ok(!out[0].includes("Take this route now"), "companion-covered hint suppressed by default (U-P1-U01)");
  // The append MECHANISM still works when redundant-suppression is disabled.
  const prev = process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
  process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT = "0";
  try {
    const out2 = appendActionHints([msg]);
    assert.ok(out2[0].includes("Take this route now"), "hint appended when suppression off");
    assert.ok(out2[0].includes("`prism_session:master_index_query`"));
  } finally {
    if (prev === undefined) delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    else process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT = prev;
  }
});

test("appendActionHints: real doctrineSurface nudge gains a concrete action (iter22 gap)", () => {
  const msg = "Doctrine/command surface: verify the command bridge and MCP directive before teaching a new manual workflow.";
  const out = appendActionHints([msg]);
  assert.ok(out[0].includes("Doctrine/command surface"));
  assert.ok(out[0].includes("`prism_session:dispatcher_map_compact`"),
    "iter22 said 'prefer the MCP action it names' — doctrineSurface MUST now name one");
});

test("appendActionHints: real backendAuditChain nudge gains code_search", () => {
  const msg = "Backend audit: after meaningful edits use npx tsx run-dev-audit-chain --edited-file <path> or the equivalent prism_dev chain (test_smoke -> auto_wiring_analyze -> schema_gap_scan -> quality_dashboard -> build_guard_chain).";
  const out = appendActionHints([msg]);
  assert.ok(out[0].includes("`prism_dev:code_search`"));
});

test("appendActionHints: Ollama-prefixed message (🤖 Suggested route:) is NOT augmented", () => {
  // Ollama messages already inline `dispatcher:action` in the body. Adding a
  // second hint would be redundant + risks contradicting Ollama's pick.
  const msg = "🤖 Suggested route: prism_dev:test_smoke — verifies build status";
  const out = appendActionHints([msg]);
  assert.equal(out[0], msg);
  assert.ok(!out[0].includes("→ Take this route now:"));
});

test("appendActionHints: message with no classifier match passes through", () => {
  const msg = "Some arbitrary text not matching any classifier substring.";
  const out = appendActionHints([msg]);
  assert.equal(out[0], msg);
});

// --- PSN-synergy cross-check: every hinted action is credited by mcp-route-takeup ---

test("U-PSN-TAKEUP-MAP-EXPORT: TAKEUP_CREDITED_ACTIONS derived non-empty + well-shaped (canonical source)", () => {
  // If this fails the export-from-canonical chain is broken — either
  // mcp-route-takeup dropped the export or the map shape changed.
  assert.ok(TAKEUP_CREDITED_ACTIONS.size > 0, "derived TAKEUP_CREDITED_ACTIONS must not be empty");
  for (const action of TAKEUP_CREDITED_ACTIONS) {
    assert.ok(/^prism_[a-z_]+:[a-z_]+$/.test(action),
      `action '${action}' violates the prism_<dispatcher>:<action> shape contract`);
  }
});

test("PSN synergy: every action in _PREFERRED_ACTION_FOR_CLASSIFIER is credited by mcp-route-takeup", () => {
  // If we hint an action that takeup doesn't credit, the operator takes the
  // route, the take-rate doesn't move, and the iter22 advisory keeps saying
  // "nudges unactioned" — defeating the whole point. This guard prevents that
  // class of regression at build time.
  for (const [classifier, action] of Object.entries(_PREFERRED_ACTION_FOR_CLASSIFIER)) {
    assert.ok(
      TAKEUP_CREDITED_ACTIONS.has(action),
      `classifier '${classifier}' hints '${action}' which is NOT in mcp-route-takeup._ACTION_TO_CLASSIFIERS — operator taking the route would not be credited`,
    );
  }
});

test("PSN synergy: extractMcpAction (takeup) recognizes the hinted action shape", () => {
  // Round-trip check — when the model takes the hinted route, the take-up hook
  // must extract the action key from the tool call. mcp__prism_safe__prism_session
  // with action='master_index_query' → 'prism_session:master_index_query'.
  const extracted = extractMcpAction("mcp__prism_safe__prism_session", { action: "master_index_query" });
  assert.equal(extracted, "prism_session:master_index_query");
  assert.equal(
    _PREFERRED_ACTION_FOR_CLASSIFIER.isBroadGrep,
    extracted,
    "the hinted action key MUST equal what takeup extracts so credit flows",
  );
});

// --- map shape sanity ---

test("_PREFERRED_ACTION_FOR_CLASSIFIER: all entries are non-empty strings", () => {
  for (const [c, a] of Object.entries(_PREFERRED_ACTION_FOR_CLASSIFIER)) {
    assert.equal(typeof c, "string");
    assert.equal(typeof a, "string");
    assert.ok(c.length > 0 && a.length > 0);
    assert.ok(a.includes(":"), `action '${a}' should be dispatcher:action shaped`);
  }
});

test("_PREFERRED_ACTION_FOR_CLASSIFIER: omits 'ollama' deliberately", () => {
  // The ollama branch already names its own route inline; we must NOT double-hint.
  assert.equal(_PREFERRED_ACTION_FOR_CLASSIFIER.ollama, undefined);
});
