import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shouldForceReclaim, peerBlocksForceReclaim } from "../session-start-terminal-pin.mjs";

const HOOK = "H:/prism/.claude/hooks/session-start-terminal-pin.mjs";

// ---- DECISION-level oracle (the fix's logic = composition of two pure gates) ----
// The bug was that this decision was NEVER REACHED on a null windowId; these
// assertions pin the decision the fallback branch now applies.
test("shouldForceReclaim: compact + known prior slot => reclaim eligible", () => {
  assert.equal(shouldForceReclaim("compact", "bravo"), true);
  assert.equal(shouldForceReclaim("clear", "bravo"), true);
});
test("shouldForceReclaim: non-compact or no prior slot => NOT eligible", () => {
  assert.equal(shouldForceReclaim("startup", "bravo"), false);
  assert.equal(shouldForceReclaim("resume", "bravo"), false);
  assert.equal(shouldForceReclaim("compact", null), false);
  assert.equal(shouldForceReclaim("compact", ""), false);
});
test("peerBlocksForceReclaim: free slot => reclaim OK (no block)", () => {
  assert.equal(peerBlocksForceReclaim("bravo", "me", { slots: { bravo: null } }), false);
});
test("peerBlocksForceReclaim: live operator-bound peer => BLOCK (never evict)", () => {
  const now = 1000000000;
  const state = { slots: { bravo: { chatId: "claude-peer1234", activity: "checkin", lastHeartbeat: new Date(now).toISOString() } } };
  assert.equal(peerBlocksForceReclaim("bravo", "claude-me000000", state, now + 1000), true);
});
test("peerBlocksForceReclaim: crashed peer (stale heartbeat) => reclaim OK", () => {
  const now = 1000000000;
  const stale = new Date(now - 20 * 60 * 1000).toISOString(); // 20min > CRASH_TTL 10min
  const state = { slots: { bravo: { chatId: "claude-dead0000", activity: "checkin", lastHeartbeat: stale } } };
  assert.equal(peerBlocksForceReclaim("bravo", "claude-me000000", state, now), false);
});
test("composed decision: null-window fallback reclaims a free slot, blocks on a live peer", () => {
  const free = { slots: { bravo: null } };
  const held = { slots: { bravo: { chatId: "claude-peer1234", activity: "checkin", lastHeartbeat: new Date(Date.now()).toISOString() } } };
  const decide = (src, slot, state, me) => shouldForceReclaim(src, slot) && !peerBlocksForceReclaim(slot, me, state);
  assert.equal(decide("compact", "bravo", free, "claude-me000000"), true);   // reclaim
  assert.equal(decide("compact", "bravo", held, "claude-me000000"), false);  // safety: no evict
  assert.equal(decide("startup", "bravo", free, "claude-me000000"), false);  // not on startup
});

// ---- SUBPROCESS smoke: the null-windowId fallback branch runs without crashing ----
// Safe (no state mutation): a fake chatId with no handoff + empty cache dir =>
// no prior slot => SILENCE. Forces windowId=null via the documented knob.
function run(stdin, extraEnv) {
  return execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdin),
    env: { ...process.env, PRISM_TERMINAL_WINDOW_ID_DISABLE: "1", ...extraEnv },
    encoding: "utf8",
  });
}
test("subprocess: null windowId + compact + no prior slot => clean SILENCE (no crash)", () => {
  const dir = mkdtempSync(join(tmpdir(), "tpcache-"));
  try {
    const out = run({ session_id: "abcdef01-1111-2222-3333-444444444444", source: "compact" }, { PRISM_SLOT_CACHE_DIR: dir });
    const j = JSON.parse(out);
    assert.equal(j.continue, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("subprocess: null windowId + startup (non-compact) => clean SILENCE", () => {
  const dir = mkdtempSync(join(tmpdir(), "tpcache-"));
  try {
    const out = run({ session_id: "abcdef02-1111-2222-3333-444444444444", source: "startup" }, { PRISM_SLOT_CACHE_DIR: dir });
    const j = JSON.parse(out);
    assert.equal(j.continue, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
