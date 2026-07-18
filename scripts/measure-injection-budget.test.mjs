/**
 * measure-injection-budget.test.mjs -- covers the --event extension (U-INDIA-INJECT-BUDGET-EVENT
 * 2026-06-12): injectorNames(settings, event) now reads the requested event's hook chain so the tool
 * can audit SessionStart/Stop, not only UserPromptSubmit (alpha's lever #5). R9: each case pins the
 * per-event hook extraction + the back-compat default.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { injectorNames } from "./measure-injection-budget.mjs";

const settings = {
  hooks: {
    UserPromptSubmit: [{ hooks: [{ command: '"node" .claude/hooks/alpha-inject.mjs' }, { command: 'node .claude/hooks/beta-inject.mjs' }] }],
    SessionStart: [{ hooks: [{ command: 'node .claude/hooks/gamma-start.mjs' }] }],
  },
};

test("injectorNames: defaults to UserPromptSubmit (back-compat)", () => {
  assert.deepEqual(injectorNames(settings), ["alpha-inject", "beta-inject"]);
});

test("injectorNames: --event SessionStart reads the SessionStart chain (the new capability)", () => {
  assert.deepEqual(injectorNames(settings, "SessionStart"), ["gamma-start"]);
});

test("injectorNames: unknown event -> empty (no throw)", () => {
  assert.deepEqual(injectorNames(settings, "Nonexistent"), []);
});

test("injectorNames: missing hooks tree -> empty, no throw", () => {
  assert.deepEqual(injectorNames({}, "UserPromptSubmit"), []);
  assert.deepEqual(injectorNames({ hooks: {} }, "SessionStart"), []);
});

test("injectorNames: only extracts .claude/hooks/*.mjs commands (ignores non-hook commands)", () => {
  const s = { hooks: { UserPromptSubmit: [{ hooks: [{ command: 'echo hi' }, { command: 'node .claude/hooks/x.mjs' }, { command: 'rtk git status' }] }] } };
  assert.deepEqual(injectorNames(s), ["x"]);
});
