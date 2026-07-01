/**
 * Tests for cost-bridge-dispatch.mjs — consolidated cost-bridge router.
 * Real-value assertions: every rule's canonical action matches; multi-match; adversarial inputs.
 * Run: node --test .claude/hooks/cost-bridge-dispatch.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, extractAction, matchRules, buildAdvisory } from "./cost-bridge-dispatch.mjs";

test("RULES: 16 well-formed rules (event + RegExp + head)", () => {
  assert.equal(RULES.length, 16, "all 16 cost-bridge events consolidated");
  for (const r of RULES) {
    assert.ok(typeof r.event === "string" && r.event.length > 0, `event name: ${JSON.stringify(r)}`);
    assert.ok(r.re instanceof RegExp, `${r.event} has a RegExp gate`);
    assert.ok(typeof r.head === "string" && r.head.length > 10, `${r.event} has a headline`);
  }
  // unique event names
  assert.equal(new Set(RULES.map((r) => r.event)).size, 16, "no duplicate event names");
});

test("matchRules: each event's canonical action matches its own rule", () => {
  const canonical = {
    "cad-import": "step_import",
    "cam-strategy-select": "adaptive_select",
    "cam-tool-select": "cam_tool_select",
    "machine-rate": "labor_rate",
    "material-price": "material_price_update",
    "operator-override": "operator_override",
    "pdf-extract": "pdf_learn",
    "precommit": "quote_commit",
    "program-emit": "master_post_okuma",
    "quote-accept": "quote_accept",
    "reverse-cad": "gcode_reverse_cad",
    "runtime-predict": "gcode_runtime_predict",
    "shop-config-change": "machine_add",
    "spc-log": "spc_measurement",
    "tool-catalog": "tool_catalog_update",
    "tool-wear-log": "wear_measurement",
  };
  for (const [event, action] of Object.entries(canonical)) {
    const hits = matchRules(action).map((r) => r.event);
    assert.ok(hits.includes(event), `action "${action}" should match rule "${event}" (got ${JSON.stringify(hits)})`);
  }
});

test("matchRules: non-cost action is a no-op (empty)", () => {
  assert.deepEqual(matchRules("read_file"), []);
  assert.deepEqual(matchRules("git_status"), []);
  assert.deepEqual(matchRules("master_index_query"), []);
});

test("matchRules: multi-match — tool_life_log hits BOTH tool-catalog and tool-wear-log", () => {
  const hits = matchRules("tool_life_log").map((r) => r.event).sort();
  assert.deepEqual(hits, ["tool-catalog", "tool-wear-log"], "shared substring fans out to both rules");
});

test("matchRules: defensive on null/empty/non-string", () => {
  assert.deepEqual(matchRules(null), []);
  assert.deepEqual(matchRules(""), []);
  assert.deepEqual(matchRules(42), []);
  assert.deepEqual(matchRules(undefined), []);
});

test("extractAction: reads tool_input.action and params.action fallback; defensive", () => {
  assert.equal(extractAction({ tool_input: { action: "quote_accept" } }), "quote_accept");
  assert.equal(extractAction({ tool_input: { params: { action: "spc_log" } } }), "spc_log");
  assert.equal(extractAction({ tool_input: {} }), "");
  assert.equal(extractAction({}), "");
  assert.equal(extractAction(null), "");
  assert.equal(extractAction(42), "");
  assert.equal(extractAction({ tool_input: { action: 123 } }), "", "non-string action → empty");
});

test("buildAdvisory: lists each matched event + pointer; empty when none", () => {
  const matched = matchRules("quote_accept");
  const a = buildAdvisory(matched);
  assert.ok(a.includes("cost-bridge advisory"));
  assert.ok(a.includes("quote-accept"));
  assert.ok(a.includes("cost-bridge-on-<event>.mjs"), "points to the canonical full-detail hooks");
  assert.equal(buildAdvisory([]), "");
  assert.equal(buildAdvisory(null), "");
});

test("buildAdvisory: singular vs plural event count", () => {
  assert.ok(buildAdvisory(matchRules("quote_accept")).includes("1 cost-bearing event detected"));
  assert.ok(buildAdvisory(matchRules("tool_life_log")).includes("2 cost-bearing events detected"));
});

test("end-to-end: extractAction → matchRules → buildAdvisory on a real PostToolUse event shape", () => {
  const event = { tool_name: "mcp__prism_business", tool_input: { action: "quote_accept", params: {} } };
  const advisory = buildAdvisory(matchRules(extractAction(event)));
  assert.ok(advisory.includes("quote-accept") && advisory.includes("push to ERP"));
});
