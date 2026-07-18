// Tests for the string/template-AWARE comment stripper `stripCodeComments`
// (root-cause fix 2026-07-01, slot:golf) backing findUnhandledActions. The prior
// single-regex strip treated a bare block-comment-open inside a STRING LITERAL as
// a real comment and ran to the next comment-close, SWALLOWING real `case "x":`
// handlers -> false UNHANDLED -> the Stop gate BLOCKED any session editing that
// dispatcher (live: sessionDispatcher.ts:2906, [bravo->golf] chat-bus report).
// Run: node --test <thisfile>
//
// Intent (R9): each case encodes WHY the strip must (a) NOT treat comment-tokens
// inside strings as comments, and (b) STILL remove genuine comments -- so a future
// weakening (e.g. reverting to the greedy regex, or blanking all strings and
// losing the ACTIONS members) makes a case fail.

import { test } from "node:test";
import assert from "node:assert/strict";
import { stripCodeComments, findUnhandledActions } from "../stop_on_unwired_assets.mjs";

// ---------------------------------------------------------------------------
// stripCodeComments unit behaviour.
// ---------------------------------------------------------------------------
test("stripCodeComments: a block-comment-open inside a string is preserved, not stripped", () => {
  // The `/*` here is string content; nothing after it up to a later `*/` may vanish.
  const src = 'const s = "a /* b"; const KEEP = 1; const t = "c */ d"; const AFTER = 2;';
  const out = stripCodeComments(src);
  assert.match(out, /KEEP = 1/);
  assert.match(out, /AFTER = 2/);
  assert.match(out, /a \/\* b/); // string content intact
});

test("stripCodeComments: a real block comment IS blanked", () => {
  const out = stripCodeComments("keepA /* case \"gone\": */ keepB");
  assert.match(out, /keepA/);
  assert.match(out, /keepB/);
  assert.doesNotMatch(out, /gone/);
});

test("stripCodeComments: a real line comment IS blanked but a // inside a string survives", () => {
  const out = stripCodeComments('const url = "http://x/y"; keepC // case "gone": return;\nkeepD');
  assert.match(out, /http:\/\/x\/y/); // URL // inside string preserved
  assert.match(out, /keepC/);
  assert.match(out, /keepD/);
  assert.doesNotMatch(out, /gone/); // trailing line comment removed
});

test("stripCodeComments: template literal content is preserved verbatim", () => {
  const out = stripCodeComments("const t = `x /* y */ ${z} //w`; const KEEP = 3;");
  assert.match(out, /KEEP = 3/);
  assert.match(out, /x \/\* y \*\/ \$\{z\} \/\/w/); // whole template intact
});

test("stripCodeComments: ACTIONS string members survive (gate must still see them)", () => {
  const out = stripCodeComments('const FOO_ACTIONS = ["alpha", "beta"] as const;');
  assert.match(out, /"alpha"/);
  assert.match(out, /"beta"/);
});

test("stripCodeComments: empty / non-string input is safe", () => {
  assert.equal(stripCodeComments(""), "");
  assert.equal(stripCodeComments(undefined), "");
  assert.equal(stripCodeComments(null), "");
});

// ---------------------------------------------------------------------------
// findUnhandledActions integration -- the actual gate behaviour.
// ---------------------------------------------------------------------------
test("findUnhandledActions: a /*-in-string in one case does NOT swallow later handlers (bravo repro)", () => {
  const body = `
    const FOO_ACTIONS = ["alpha", "beta", "gamma"] as const;
    switch (action) {
      case "alpha": return doA();
      case "cleanup": {
        // DESTRUCTIVE cleanup_stale with confirm:true refuses to operate outside /* the safe root */ boundary
        return doCleanup();
      }
      case "beta": return doB();
      case "gamma": return doG();
    }`;
  // beta + gamma follow the /*-bearing string; the old strip reported them UNHANDLED.
  assert.deepEqual(findUnhandledActions(body), []);
});

test("findUnhandledActions: a genuinely commented-out handler is STILL reported unhandled (gate not softened)", () => {
  const body = `
    const BAR_ACTIONS = ["x", "y"] as const;
    switch (a) {
      case "x": return 1;
      /* case "y": return 2; */
    }`;
  // "y" has only a commented-out handler -> it IS a genuine orphan and must be flagged.
  assert.deepEqual(findUnhandledActions(body), ["y"]);
});
