// Tests for the array-membership-dispatch detection added to
// stop_on_unwired_assets.mjs (regression 2026-06-11). Verifies the gate no
// longer false-positives on `.includes()`-routing dispatchers WHILE still
// blocking a genuine orphan action. Run: node --test <thisfile>
//
// Intent (R9): each case encodes WHY a pattern is/ isn't a valid handler, so a
// future weakening of findUnhandledActions (e.g. marking every enum member as
// handled) makes the genuine-orphan case fail.

import { test } from "node:test";
import assert from "node:assert/strict";
import { findUnhandledActions } from "../stop_on_unwired_assets.mjs";

// ---------------------------------------------------------------------------
// Pattern 4 (NEW): array-membership dispatch -> handled, NOT flagged.
// ---------------------------------------------------------------------------
test("array-membership dispatch (plain .includes) marks all members handled", () => {
  const body = `
    const MACHINE_ACTIONS = ["machine_register", "machine_unregister", "machine_connect"] as const;
    const ACTIONS = [...MACHINE_ACTIONS] as const;
    if (MACHINE_ACTIONS.includes(action as ActionString as typeof MACHINE_ACTIONS[number])) {
      result = await getEngine("machineConnectivity")(action, params);
    }
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

test("array-membership dispatch (cast form) marks all members handled", () => {
  // The `(FOO as readonly string[]).includes(action)` cast form must also count.
  const body = `
    const MTCONNECT_ACTIONS = ["mtconnect_probe", "mtconnect_current", "mtconnect_alarms"] as const;
    } else if ((MTCONNECT_ACTIONS as readonly string[]).includes(action)) {
      const mtc = new MTConnectAdapterEngine();
    }
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

test("multiple dispatch arrays in one file are all recognized", () => {
  const body = `
    const MACHINE_ACTIONS = ["machine_register", "machine_ingest"] as const;
    const ADAPTIVE_ACTIONS = ["adaptive_chipload", "adaptive_chatter"] as const;
    const RTMI_ACTIONS = ["rtmi_spindle_monitor"] as const;
    if ((RTMI_ACTIONS as readonly string[]).includes(action)) { /* ... */ }
    else if (MACHINE_ACTIONS.includes(action as typeof MACHINE_ACTIONS[number])) { /* ... */ }
    else if (ADAPTIVE_ACTIONS.includes(action as typeof ADAPTIVE_ACTIONS[number])) { /* ... */ }
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

// ---------------------------------------------------------------------------
// TRUE POSITIVE preserved: genuine orphan is STILL flagged (no gate softening).
// ---------------------------------------------------------------------------
test("genuine orphan (no case, no .includes guard, no handler key) IS flagged", () => {
  const body = `
    const ORPHAN_ACTIONS = ["orphan_one", "orphan_two"] as const;
    const ACTIONS = [...ORPHAN_ACTIONS] as const;
    server.tool("x", "desc", { action: z.enum(ACTIONS) }, async ({ action }) => {
      return { content: [{ type: "text", text: action }] };
    });
  `;
  assert.deepEqual(findUnhandledActions(body).sort(), ["orphan_one", "orphan_two"]);
});

test("ADVERSARIAL: a COMMENTED `.includes` guard does NOT clear a genuine orphan", () => {
  // A comment mentioning FOO_ACTIONS.includes(...) must not count as a real
  // dispatch guard -- else a stray comment could hide a true orphan. Both the
  // line-comment and block-comment forms are stripped before analysis.
  const lineComment = `
    const ORPHAN_ACTIONS = ["orphan_one"] as const;
    // routing TODO: ORPHAN_ACTIONS.includes(action) -> wire to engine later
  `;
  assert.deepEqual(findUnhandledActions(lineComment), ["orphan_one"]);

  const blockComment = `
    const ORPHAN_ACTIONS = ["orphan_two"] as const;
    /* was: if (ORPHAN_ACTIONS.includes(action)) { engine(action); } */
  `;
  assert.deepEqual(findUnhandledActions(blockComment), ["orphan_two"]);
});

test("ADVERSARIAL: a COMMENTED `case` does NOT clear a genuine orphan", () => {
  const body = `
    const ORPHAN_ACTIONS = ["orphan_x"] as const;
    // case "orphan_x": result = engine(params); break;  (disabled)
  `;
  assert.deepEqual(findUnhandledActions(body), ["orphan_x"]);
});

test("declaring an array but never using it as a guard does NOT mark its members handled", () => {
  // The array exists but is never `.includes()`-checked -> members are orphans.
  const body = `
    const DEAD_ACTIONS = ["dead_a", "dead_b"] as const;
    const LIVE_ACTIONS = ["live_a"] as const;
    if (LIVE_ACTIONS.includes(action)) { /* live_a routed */ }
    // DEAD_ACTIONS is declared but never guarded or cased -> dead_a, dead_b orphan.
  `;
  assert.deepEqual(findUnhandledActions(body).sort(), ["dead_a", "dead_b"]);
});

// ---------------------------------------------------------------------------
// EXISTING patterns preserved (regression guard on patterns 1-3).
// ---------------------------------------------------------------------------
test("switch/case handlers (pattern 1) still recognized", () => {
  const body = `
    const ACTIONS = ["calc_force", "calc_power"] as const;
    switch (action) {
      case "calc_force": result = forceEngine(params); break;
      case "calc_power": result = powerEngine(params); break;
    }
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

test("object-lookup-table handlers (pattern 2) still recognized", () => {
  const body = `
    const ACTIONS = ["do_thing", "do_other"] as const;
    const HANDLERS = {
      do_thing: handleDoThing,
      do_other: async (p) => engine(p),
    };
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

test("mixed: array-dispatch members clean, a non-dispatched enum member flagged", () => {
  const body = `
    const ROUTED_ACTIONS = ["r_one", "r_two"] as const;
    const LONELY_ACTIONS = ["lonely"] as const;
    if (ROUTED_ACTIONS.includes(action)) { engine(action, params); }
    // 'lonely' has no case, no .includes, no handler.
  `;
  assert.deepEqual(findUnhandledActions(body), ["lonely"]);
});

// ---------------------------------------------------------------------------
// ADVERSARIAL (per-file scrutiny 2026-06-11): URL-aware comment strip.
// A `//` inside a URL string must NOT be treated as a line comment, else a
// `case` sharing the line gets eaten -> real handler hidden -> false orphan.
// ---------------------------------------------------------------------------
test("URL `//` on a case line does NOT eat the case (no false orphan)", () => {
  const body = `
    const ACTIONS = ["fetch_thing"] as const;
    switch (action) {
      case "fetch_thing": result = await fetch("http://localhost:5000/probe"); break;
    }
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

test("URL string BEFORE a case on the same line still preserves the case", () => {
  const body = `
    const ACTIONS = ["do_z"] as const;
    const base = "mqtt://broker:1883"; switch (a) { case "do_z": run(base); break; }
  `;
  assert.deepEqual(findUnhandledActions(body), []);
});

test("non-action `.includes(otherVar)` does NOT route members (guard must test action flow)", () => {
  // FOO_ACTIONS.includes is real here, so members route -- this asserts the
  // guard detection is literal `NAME.includes(` and a sibling array without one
  // stays flagged.
  const body = `
    const FOO_ACTIONS = ["foo_a"] as const;
    const BAR_ACTIONS = ["bar_b"] as const;
    if (FOO_ACTIONS.includes(action)) { engine(action); }
    const names = BAR_ACTIONS.map(x => x); names.includes("bar_b");
  `;
  // foo_a routed (guarded); bar_b NOT routed (its array is never .includes-guarded).
  assert.deepEqual(findUnhandledActions(body), ["bar_b"]);
});

// ---------------------------------------------------------------------------
// EDGE: empty input / no enums -> no crash, empty result.
// ---------------------------------------------------------------------------
test("file with no ACTIONS enum returns empty (no false positives)", () => {
  assert.deepEqual(findUnhandledActions("export function foo() { return 1; }"), []);
});

test("empty string returns empty", () => {
  assert.deepEqual(findUnhandledActions(""), []);
});
