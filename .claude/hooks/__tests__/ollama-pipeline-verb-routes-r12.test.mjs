// TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX (iter5, 2026-05-23, slot:alpha)
// Build-time regression guard for the iter4 R12 violation: VERB_ROUTES surfaced
// fake `prism_intelligence:ollama_*` MCP actions (none exist in any PRISM
// dispatcher — verified by grep against mcp-server/src/tools/dispatchers/).
//
// This test asserts every route string in VERB_ROUTES references ONLY real
// dispatcher:action surfaces. If a future iter adds a new verb-route, it must
// either use a known-real action key from KNOWN_REAL_MCP_ACTIONS, or update
// that set with a new verified action (caller must verify before adding).

import { test } from "node:test";
import assert from "node:assert/strict";
import { _VERB_ROUTES_FOR_TESTS } from "../ollama-pipeline-injector.mjs";

// Real MCP actions that route to OllamaHookBridgeEngine or equivalent local-
// LLM surfaces. Verified by grep against the dispatcher source files (not
// trusted from memory). If a new route is added, the verifying grep MUST be
// re-run and the action added here BEFORE the route ships.
const KNOWN_REAL_MCP_ACTIONS = new Set([
  "prism_dev:ollama_hook_query",     // devDispatcher.ts:8108 — OllamaHookBridgeEngine.query
  "prism_dev:ollama_hook_status",    // devDispatcher.ts:8127 — OllamaHookBridgeEngine.status
]);

// MCP-action regex — captures `prism_<dispatcher>:<action>` tokens in any
// surrounding text. Must NOT match function arg literals like
// `hookType:\"code_explain\"`.
const MCP_ACTION_RE = /\bprism_[a-z_]+:[a-z_]+/g;

// Fake namespaces that iter4 leaked. If ANY of these appear in a route, the
// iter4 R12 regression has come back.
const FAKE_NAMESPACES_FROM_ITER4 = [
  "prism_intelligence:ollama_summarize",
  "prism_intelligence:ollama_explain",
  "prism_intelligence:ollama_classify",
  "prism_intelligence:ollama_docstring",
  "prism_intelligence:ollama_lint",
  "prism_intelligence:ollama_diff_summary",
  "prism_intelligence:ollama_error_triage",
];

// --- core R12 regression guard ---

test("VERB_ROUTES: no fake `prism_intelligence:ollama_*` actions (iter4 R12 fix)", () => {
  // The iter4 ship surfaced these action names as if they were real MCP
  // actions. None of them exist. This test would have caught iter4 at build
  // time. It is now wired so the regression cannot return silently.
  for (const [verb, routes] of Object.entries(_VERB_ROUTES_FOR_TESTS)) {
    for (const route of routes) {
      for (const fake of FAKE_NAMESPACES_FROM_ITER4) {
        assert.ok(
          !route.includes(fake),
          `verb '${verb}' route surfaces FAKE action '${fake}' — that namespace doesn't exist in PRISM. Route text:\n  ${route}`,
        );
      }
    }
  }
});

test("VERB_ROUTES: every prism_*:* token references a KNOWN-REAL MCP action", () => {
  // Any dispatcher:action token that escapes this set MUST be added to
  // KNOWN_REAL_MCP_ACTIONS only AFTER grep-verification against the
  // dispatcher source. No trust-from-memory.
  for (const [verb, routes] of Object.entries(_VERB_ROUTES_FOR_TESTS)) {
    for (const route of routes) {
      const matches = route.match(MCP_ACTION_RE) || [];
      for (const m of matches) {
        assert.ok(
          KNOWN_REAL_MCP_ACTIONS.has(m),
          `verb '${verb}' references MCP action '${m}' which is NOT in KNOWN_REAL_MCP_ACTIONS. Either fix the route or grep-verify the action exists and add it to KNOWN_REAL_MCP_ACTIONS in this test. Route:\n  ${route}`,
        );
      }
    }
  }
});

// --- coverage floor: every iter-4 verb has at least one route with a real action ---

test("VERB_ROUTES: every verb has at least one route mentioning a real MCP action", () => {
  // If a verb's routes mention no real MCP action, the operator gets
  // suggestions like "use Ollama" without a concrete callable surface.
  // R12: don't ship vague.
  for (const verb of Object.keys(_VERB_ROUTES_FOR_TESTS)) {
    const routes = _VERB_ROUTES_FOR_TESTS[verb];
    const hasRealAction = routes.some((route) => {
      const matches = route.match(MCP_ACTION_RE) || [];
      return matches.some((m) => KNOWN_REAL_MCP_ACTIONS.has(m));
    });
    assert.ok(hasRealAction,
      `verb '${verb}' has NO route mentioning a real MCP action. Add one or remove the verb-trigger.`);
  }
});

// --- variability floor: cover all 7 verbs (spanning configs) ---

test("VERB_ROUTES: all 7 iter4 verb keys present", () => {
  // If a future refactor accidentally drops a verb, the verb-trigger fires
  // but VERB_ROUTES[matched] returns undefined → empty routes block → useless
  // banner. Catch that.
  const expected = [
    "verb-summarize",
    "verb-explain",
    "verb-classify",
    "verb-docstring",
    "verb-lint",
    "verb-diff-summary",
    "verb-error-triage",
  ];
  for (const v of expected) {
    assert.ok(_VERB_ROUTES_FOR_TESTS[v], `verb '${v}' missing from VERB_ROUTES`);
    assert.ok(Array.isArray(_VERB_ROUTES_FOR_TESTS[v]));
    assert.ok(_VERB_ROUTES_FOR_TESTS[v].length > 0,
      `verb '${v}' has empty route list`);
  }
});

// --- adversarial: empty/malformed routes don't sneak in ---

test("VERB_ROUTES: no empty-string or whitespace-only routes", () => {
  for (const [verb, routes] of Object.entries(_VERB_ROUTES_FOR_TESTS)) {
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      assert.equal(typeof r, "string");
      assert.ok(r.trim().length > 10,
        `verb '${verb}' route ${i} is empty/too-short: ${JSON.stringify(r)}`);
    }
  }
});

test("VERB_ROUTES: frozen (defensive — can't be mutated by callers)", () => {
  assert.equal(Object.isFrozen(_VERB_ROUTES_FOR_TESTS), true);
});
