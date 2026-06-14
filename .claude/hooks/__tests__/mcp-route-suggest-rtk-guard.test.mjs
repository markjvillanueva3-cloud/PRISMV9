// .claude/hooks/__tests__/mcp-route-suggest-rtk-guard.test.mjs
// U-RTK-NUDGE-FALSE-POSITIVE (2026-06-09, slot:alpha): the verbose-Bash "use rtk" nudge
// must NOT fire on commands that are ALREADY rtk-prefixed (isVerboseBash strips `rtk ` to
// detect the verb, so an already-rtk'd verbose command used to re-trigger the nudge).
// These tests lock both the predicate AND the guard composition the nudge site uses.
import { test } from "node:test";
import assert from "node:assert/strict";

import { isVerboseBash, isAlreadyRtk } from "../mcp-route-suggest.mjs";

// The exact boolean the nudge site evaluates (mcp-route-suggest.mjs getRegexSuggestions):
//   if (toolName === "Bash" && isVerboseBash(cmd) && !isAlreadyRtk(cmd)) push(rtk nudge)
const shouldNudge = (cmd) => isVerboseBash(cmd) && !isAlreadyRtk(cmd);

test("isAlreadyRtk: detects a leading rtk verb (and only a real one)", () => {
  assert.equal(isAlreadyRtk("rtk cat foo.txt"), true);
  assert.equal(isAlreadyRtk("rtk git log -p"), true);
  assert.equal(isAlreadyRtk("RTK cat foo"), true, "case-insensitive");
  assert.equal(isAlreadyRtk("time rtk cat foo"), true, "strips a leading time wrapper");
  assert.equal(isAlreadyRtk("env FOO=1 rtk git log"), true, "strips a leading env wrapper");
  assert.equal(isAlreadyRtk("cat foo.txt"), false, "no rtk -> false");
  assert.equal(isAlreadyRtk("rtk"), false, "bare rtk with no verb -> false");
  assert.equal(isAlreadyRtk("rtkfoo cat"), false, "rtk as a substring of another word is NOT rtk");
  assert.equal(isAlreadyRtk(""), false);
  assert.equal(isAlreadyRtk(null), false);
  assert.equal(isAlreadyRtk(42), false);
});

test("GUARD: the rtk nudge SUPPRESSES on already-rtk'd verbose commands (the false-positive fix)", () => {
  // These used to (wrongly) fire the "use rtk" nudge -- now suppressed.
  assert.equal(shouldNudge("rtk cat foo.txt"), false);
  assert.equal(shouldNudge("rtk git log -p"), false);
  assert.equal(shouldNudge("rtk git log --all"), false);
});

test("GUARD: the rtk nudge STILL FIRES on un-rtk'd verbose commands (no regression)", () => {
  assert.equal(shouldNudge("cat foo.txt"), true);
  assert.equal(shouldNudge("git log -p"), true);
  assert.equal(shouldNudge("git log --all"), true);
});

test("GUARD: non-verbose commands never nudge (rtk-guard is irrelevant there)", () => {
  assert.equal(shouldNudge("npm run build"), false);
  assert.equal(shouldNudge("node scripts/foo.mjs"), false);
  assert.equal(shouldNudge("rtk npm run build"), false, "rtk'd non-verbose: still no nudge");
});
