// slot-bind-enforce.test.mjs — node:test suite for the deterministic
// NATO-wrapper slot-claim hook (U-SLOT-BIND-ENFORCE, 2026-05-18).
//
// Verifies the pure decision core (decideSlotBind), the injectable
// chat-slots wrappers (findBoundSlot / performClaim), and the SLOT_NAMES
// drift-guard against the canonical chat-slots.mjs export. Real-value
// assertions + adversarial inputs + a fail-on-revert guard for the P0
// case-fold bug both scrutiny reviewers flagged.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

import {
  SLOT_NAMES,
  decideSlotBind,
  findBoundSlot,
  performClaim,
} from "../../../.claude/hooks/slot-bind-enforce.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHAT_SLOTS = resolve(__dirname, "..", "..", "..", ".claude", "helpers", "chat-slots.mjs");

const ALL_SLOTS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike"];
const VERBS = ["checkin", "startup", "precompact", "handoff"];

// ─── SLOT_NAMES drift-guard (R9 — both reviewers required this to ship) ───

test("SLOT_NAMES byte-matches chat-slots.mjs canonical export", () => {
  const src = readFileSync(CHAT_SLOTS, "utf-8");
  const m = src.match(/export const SLOT_NAMES\s*=\s*(\[[^\]]*\])/);
  assert.ok(m, "could not locate `export const SLOT_NAMES` in chat-slots.mjs");
  const canonical = JSON.parse(m[1].replace(/'/g, '"'));
  assert.deepEqual(SLOT_NAMES, canonical,
    "slot-bind-enforce SLOT_NAMES drifted from chat-slots.mjs — KEEP-IN-SYNC violated");
  assert.deepEqual(SLOT_NAMES, ALL_SLOTS, "hard-pinned 13-slot fleet changed unexpectedly");
});

// ─── decideSlotBind: suffixed form, all 13 slots × 4 verbs ───

test("decideSlotBind detects /<verb>-<nato> for every slot and verb", () => {
  for (const verb of VERBS) {
    for (const slot of ALL_SLOTS) {
      const d = decideSlotBind({ prompt: `/${verb}-${slot} do work`, sessionId: "abcd1234-ffff" });
      assert.equal(d.shouldClaim, true, `${verb}-${slot} should bind`);
      assert.equal(d.slot, slot);
      assert.equal(d.chatId, "claude-abcd1234");
      assert.equal(d.command, `${verb}-${slot}`);
      assert.equal(d.reason, "slot-locked-command");
    }
  }
});

test("decideSlotBind detects /<verb> --preferSlot <nato> (space and = forms)", () => {
  const a = decideSlotBind({ prompt: "/checkin --preferSlot mike --force", sessionId: "11112222-x" });
  assert.equal(a.shouldClaim, true);
  assert.equal(a.slot, "mike");
  assert.equal(a.chatId, "claude-11112222");
  const b = decideSlotBind({ prompt: "/startup --preferSlot=juliett", sessionId: "33334444-y" });
  assert.equal(b.shouldClaim, true);
  assert.equal(b.slot, "juliett");
});

test("decideSlotBind matches a command mid-sentence (documented intent)", () => {
  const d = decideSlotBind({ prompt: "please run /checkin-hotel then build", sessionId: "deadbeef-z" });
  assert.equal(d.shouldClaim, true);
  assert.equal(d.slot, "hotel");
});

// ─── P0 fail-on-revert: chatId must NOT be case-folded ───

test("P0 GUARD: chatId byte-matches sessionId.slice(0,8) WITHOUT lowercasing", () => {
  // Both scrutiny reviewers flagged a `.toLowerCase()` that diverged from
  // chat-state-isolator.mjs / precompact-handoff.mjs (which do NOT lowercase).
  // If a future edit re-adds .toLowerCase(), this fails loudly.
  const d = decideSlotBind({ prompt: "/checkin-hotel", sessionId: "2D30AB0C-upper" });
  assert.equal(d.chatId, "claude-2D30AB0C",
    "chatId was case-folded — re-creates the cross-chat-id divergence bug");
});

// ─── decideSlotBind: rejection / fail-safe paths ───

test("decideSlotBind rejects non-NATO suffix without falling through to a slot", () => {
  const d = decideSlotBind({ prompt: "/checkin-zzz now", sessionId: "aaaa1111-q" });
  assert.equal(d.shouldClaim, false);
  assert.equal(d.slot, undefined);
  assert.match(d.reason, /^non-nato-suffix:zzz$/);
});

test("decideSlotBind: no slot-locked command → no bind", () => {
  for (const p of ["build everything in logical order /goal", "/dedup check", "checkin without slash", "/pick-unit"]) {
    const d = decideSlotBind({ prompt: p, sessionId: "bbbb2222-w" });
    assert.equal(d.shouldClaim, false, `"${p}" must not bind`);
  }
});

test("FAIL-SAFE: slot-locked command + no usable session_id → never guesses", () => {
  for (const sid of [undefined, null, "", "short", "1234567", 12345, {}, NaN]) {
    const d = decideSlotBind({ prompt: "/checkin-hotel", sessionId: sid });
    assert.equal(d.shouldClaim, false, `sid=${JSON.stringify(sid)} must NOT claim`);
    assert.equal(d.slot, "hotel", "slot still surfaced for the advisory");
    assert.equal(d.reason, "no-session-id");
    assert.equal(d.chatId, undefined, "must NOT synthesize a chatId");
  }
});

// ─── decideSlotBind: adversarial inputs ───

test("decideSlotBind: adversarial prompt inputs do not throw / mis-bind", () => {
  for (const p of [undefined, null, "", 12345, {}, [], "/".repeat(50000),
    "/checkin-" + "a".repeat(10000), "no command here at all"]) {
    const d = decideSlotBind({ prompt: p, sessionId: "ffff0000-k" });
    assert.equal(typeof d, "object");
    assert.equal(d.shouldClaim, false, `adversarial ${JSON.stringify(String(p).slice(0, 20))}`);
  }
});

test("decideSlotBind: long non-matching prompt resolves fast (no ReDoS)", () => {
  const t0 = Date.now();
  const d = decideSlotBind({ prompt: "/checkin-" + "x".repeat(200000) + " ", sessionId: "abcd1234-l" });
  assert.equal(d.shouldClaim, false); // 'xxxx...' is not a NATO slot
  // Generous ceiling: a linear regex on 200k chars is sub-ms; catastrophic
  // backtracking is exponential (would blow far past 5s). The wide margin
  // absorbs GC / 13-chat-fleet CI contention without false-failing (P3-1).
  const REDOS_CEILING_MS = 5000;
  assert.ok(Date.now() - t0 < REDOS_CEILING_MS, "regex slow — possible catastrophic backtracking");
});

test("decideSlotBind: custom slotNames list is honored", () => {
  const d = decideSlotBind({ prompt: "/checkin-zulu", sessionId: "abcd1234-m", slotNames: ["zulu"] });
  assert.equal(d.shouldClaim, true);
  assert.equal(d.slot, "zulu");
});

// ─── findBoundSlot (hermetic, injected runner) ───

test("findBoundSlot returns the slot when chatId is bound there", () => {
  const runner = () => ({ status: 0, stdout: JSON.stringify({ slot: "hotel", state: { chatId: "claude-2d30710b" } }) });
  assert.equal(findBoundSlot("claude-2d30710b", { runner }), "hotel");
});

test("findBoundSlot returns null when chatId mismatches the bound state", () => {
  const runner = () => ({ status: 0, stdout: JSON.stringify({ slot: "hotel", state: { chatId: "claude-OTHER" } }) });
  assert.equal(findBoundSlot("claude-2d30710b", { runner }), null);
});

test("findBoundSlot returns null on empty / garbage / throwing runner", () => {
  assert.equal(findBoundSlot("claude-x", { runner: () => ({ status: 1, stdout: "" }) }), null);
  assert.equal(findBoundSlot("claude-x", { runner: () => ({ status: 0, stdout: "not json" }) }), null);
  assert.equal(findBoundSlot("claude-x", { runner: () => { throw new Error("boom"); } }), null);
});

test("findBoundSlot tolerates a stderr log line prepended to the JSON", () => {
  const runner = () => ({ status: 0, stdout: "[warn] something\n{\"slot\":\"mike\",\"state\":{\"chatId\":\"claude-zz\"}}" });
  assert.equal(findBoundSlot("claude-zz", { runner }), "mike");
});

// ─── performClaim (hermetic, injected runner) ───

test("performClaim issues reclaim then claim with the exact chat-slots contract", () => {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    if (args[0] === "reclaim") return { status: 0, stdout: "{}" };
    return { status: 0, stdout: JSON.stringify({ ok: true, claim: { slot: "hotel", chatId: "claude-2d30710b" } }) };
  };
  const r = performClaim("claude-2d30710b", "hotel", { runner, branch: "cad-fusion-live-ms0" });
  assert.equal(r.ok, true);
  assert.equal(r.failKind, "none");
  assert.deepEqual(calls[0], ["reclaim"]);
  const claim = calls[1];
  // Exact contract — a wrong flag name/value = silent no-bind (the bug class).
  assert.deepEqual(claim, [
    "claim", "--chatId", "claude-2d30710b", "--branch", "cad-fusion-live-ms0",
    "--topic", "hotel-work", "--activity", "slot-bind-enforce",
    "--preferSlot", "hotel", "--force", "true", "--confirmRecent", "true",
  ]);
});

test("performClaim noReclaim skips the reclaim sweep", () => {
  const calls = [];
  const runner = (args) => { calls.push(args[0]); return { status: 0, stdout: "{}" }; };
  performClaim("claude-x", "mike", { runner, noReclaim: true });
  assert.ok(!calls.includes("reclaim"));
  assert.ok(calls.includes("claim"));
});

test("performClaim classifies failure modes honestly (R12)", () => {
  // non-zero exit
  let r = performClaim("c", "hotel", { runner: () => ({ status: 1, stdout: "{\"ok\":false}" }), noReclaim: true });
  assert.equal(r.ok, false);
  assert.equal(r.failKind, "nonzero");
  // timeout / signal
  r = performClaim("c", "hotel", { runner: () => ({ status: null, signal: "SIGTERM", stdout: "" }), noReclaim: true });
  assert.equal(r.ok, false);
  assert.equal(r.failKind, "timeout-or-signal");
  assert.match(r.detail, /SIGTERM/);
  // spawn error
  r = performClaim("c", "hotel", { runner: () => ({ status: null, error: new Error("ENOENT node") }), noReclaim: true });
  assert.equal(r.ok, false);
  assert.equal(r.failKind, "spawn-error");
  assert.match(r.detail, /ENOENT/);
});

test("performClaim surfaces previousOwner from parsed claim output", () => {
  const runner = (args) => args[0] === "reclaim"
    ? { status: 0, stdout: "{}" }
    : { status: 0, stdout: JSON.stringify({ ok: true, previousOwner: { chatId: "claude-old", topic: "hotel-work" } }) };
  const r = performClaim("claude-new", "hotel", { runner });
  assert.equal(r.ok, true);
  assert.deepEqual(r.parsed.previousOwner, { chatId: "claude-old", topic: "hotel-work" });
});

test("performClaim tolerates pretty-printed JSON and a stderr prefix", () => {
  const pretty = JSON.stringify({ ok: true, claim: { slot: "lima" } }, null, 2);
  let r = performClaim("c", "lima", { runner: () => ({ status: 0, stdout: pretty }), noReclaim: true });
  assert.equal(r.parsed.claim.slot, "lima");
  r = performClaim("c", "lima", { runner: () => ({ status: 0, stdout: "log: starting\n" + pretty }), noReclaim: true });
  assert.equal(r.parsed.claim.slot, "lima");
});

// ─── decideSlotBind: P2-4 adversarial gaps both reviewers flagged ───

test("decideSlotBind: uppercase verb still binds (regex is /i, normalized)", () => {
  const d = decideSlotBind({ prompt: "/CHECKIN-HOTEL go", sessionId: "abcd1234-u" });
  assert.equal(d.shouldClaim, true);
  assert.equal(d.slot, "hotel");
  assert.equal(d.command, "checkin-hotel");
});

test("decideSlotBind: --preferSlot with a non-NATO value does not bind", () => {
  const d = decideSlotBind({ prompt: "/checkin --preferSlot zzz --force", sessionId: "abcd1234-v" });
  assert.equal(d.shouldClaim, false);
  assert.equal(d.reason, "no-slot-command");
});

test("decideSlotBind: sessionId exactly 8 chars is accepted (inclusive bound)", () => {
  const d = decideSlotBind({ prompt: "/checkin-hotel", sessionId: "abcd1234" });
  assert.equal(d.shouldClaim, true);
  assert.equal(d.chatId, "claude-abcd1234");
});

test("decideSlotBind: multiple slot commands → deterministic first-match wins", () => {
  const d = decideSlotBind({ prompt: "/checkin-hotel then /handoff-mike", sessionId: "abcd1234-w" });
  assert.equal(d.slot, "hotel", "first match must win deterministically");
});

test("decideSlotBind: empty slotNames array falls back to canonical 13", () => {
  const d = decideSlotBind({ prompt: "/checkin-hotel", sessionId: "abcd1234-e", slotNames: [] });
  assert.equal(d.shouldClaim, true);
  assert.equal(d.slot, "hotel");
});

// ─── main() subprocess integration (the P1 regression oracle) ───
//
// Both scrutiny reviewers correctly flagged that the two P1 fixes
// (idempotent fast-path + catch/fail no-fallthrough-to-✅) live in main()
// and had NO test. These spawn the real hook with stdin JSON, pointing the
// PRISM_SLOT_BIND_ENFORCE_CHAT_SLOTS seam at a hermetic fake so the live
// fleet chat-slots.json is NEVER touched (no peer eviction during `npm test`).

const HOOK = resolve(__dirname, "..", "..", "..", ".claude", "hooks", "slot-bind-enforce.mjs");

function withFakeChatSlots(fn) {
  const dir = mkdtempSync(join(tmpdir(), "sbe-"));
  const fakePath = join(dir, "fake-chat-slots.mjs");
  const logPath = join(dir, "calls.log");
  // Fake mirrors the REAL chat-slots producer contract:
  //   find  → {slot, state:{chatId}}        claim → {ok, claim:{...}, previousOwner?}
  writeFileSync(fakePath, `
import fs from "node:fs";
const a = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(a) + "\\n");
const mode = process.env.FAKE_MODE || "";
if (a[0] === "find") {
  if (mode === "bound") process.stdout.write(JSON.stringify({ slot: process.env.FAKE_SLOT, state: { chatId: process.env.FAKE_CHATID } }));
  else process.stdout.write(JSON.stringify({ error: "not bound" }));
  process.exit(0);
}
if (a[0] === "reclaim") { process.stdout.write("{}"); process.exit(0); }
if (a[0] === "claim") {
  if (mode === "claim-fail") { process.stdout.write(JSON.stringify({ ok: false })); process.exit(1); }
  const out = { ok: true, claim: { slot: a[a.indexOf("--preferSlot")+1], chatId: a[a.indexOf("--chatId")+1] } };
  if (mode === "claim-evict") out.previousOwner = { chatId: "claude-oldpeer", topic: "hotel-work" };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}
process.exit(0);
`);
  try { return fn({ fakePath, logPath, dir }); }
  finally { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
}

function runHook(stdinObj, env, fakePath) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj),
    encoding: "utf-8",
    timeout: 15000,
    env: { ...process.env, PRISM_SLOT_BIND_ENFORCE_CHAT_SLOTS: fakePath, ...env },
  });
}

test("main(): idempotent fast-path — already bound ⇒ suppressOutput, NO claim/reclaim", () => {
  withFakeChatSlots(({ fakePath, logPath }) => {
    const r = runHook(
      { prompt: "/checkin-hotel /loop x", session_id: "abcd1234-aa" },
      { FAKE_MODE: "bound", FAKE_SLOT: "hotel", FAKE_CHATID: "claude-abcd1234" },
      fakePath,
    );
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true, "must suppress when already bound");
    const log = existsSync(logPath) ? readFileSync(logPath, "utf-8") : "";
    assert.match(log, /\["find","--chatId","claude-abcd1234"\]/);
    assert.doesNotMatch(log, /"claim"/, "fast-path must NOT call claim (no evict-thrash)");
    assert.doesNotMatch(log, /"reclaim"/, "fast-path must NOT call reclaim");
  });
});

test("main(): not bound ⇒ reclaim+claim, success ✅ message with derived chatId", () => {
  withFakeChatSlots(({ fakePath, logPath }) => {
    const r = runHook(
      { prompt: "/checkin-hotel", session_id: "abcd1234-bb" },
      { FAKE_MODE: "unbound" },
      fakePath,
    );
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.continue, true);
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /✅ slot-bind-enforce: slot `hotel` deterministically bound to `claude-abcd1234`/);
    const log = readFileSync(logPath, "utf-8");
    assert.match(log, /"reclaim"/);
    assert.match(log, /"claim".*"--preferSlot","hotel".*"--force","true"/);
  });
});

test("main(): claim FAILS ⇒ honest failure advisory, NEVER a ✅ success line (R12)", () => {
  withFakeChatSlots(({ fakePath }) => {
    const r = runHook(
      { prompt: "/checkin-hotel", session_id: "abcd1234-cc" },
      { FAKE_MODE: "claim-fail" },
      fakePath,
    );
    const out = JSON.parse(r.stdout.trim());
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /did NOT succeed \(nonzero/);
    assert.doesNotMatch(ctx, /✅/, "must NOT report success after a failed claim");
  });
});

test("main(): spawn-error (bad CHAT_SLOTS path) ⇒ honest spawn-error advisory, no ✅", () => {
  const r = runHook(
    { prompt: "/checkin-hotel", session_id: "abcd1234-dd" },
    {},
    join(tmpdir(), "does-not-exist-sbe.mjs"),
  );
  const out = JSON.parse(r.stdout.trim());
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.match(ctx, /did NOT succeed \((spawn-error|nonzero|timeout-or-signal)/);
  assert.doesNotMatch(ctx, /✅/);
});

test("main(): slot-locked command WITHOUT session_id ⇒ no-session-id advisory, no claim", () => {
  withFakeChatSlots(({ fakePath, logPath }) => {
    const r = runHook({ prompt: "/checkin-hotel" }, {}, fakePath);
    const out = JSON.parse(r.stdout.trim());
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /no harness session_id on stdin/);
    assert.match(ctx, /LIVE `\*\*Chat Isolation:\*\*` line/);
    assert.ok(!existsSync(logPath), "must not invoke chat-slots without an authoritative id");
  });
});

test("main(): previousOwner eviction is surfaced in the success message", () => {
  withFakeChatSlots(({ fakePath }) => {
    const r = runHook(
      { prompt: "/checkin-hotel", session_id: "abcd1234-ee" },
      { FAKE_MODE: "claim-evict" },
      fakePath,
    );
    const ctx = JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext;
    assert.match(ctx, /✅/);
    assert.match(ctx, /Evicted previous owner.*claude-oldpeer/);
  });
});

test("main(): DISABLE knob ⇒ suppressOutput, zero chat-slots calls", () => {
  withFakeChatSlots(({ fakePath, logPath }) => {
    const r = runHook(
      { prompt: "/checkin-hotel", session_id: "abcd1234-ff" },
      { PRISM_SLOT_BIND_ENFORCE_DISABLE: "1" },
      fakePath,
    );
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.suppressOutput, true);
    assert.ok(!existsSync(logPath), "disabled hook must be an inert no-op");
  });
});

test("main(): non-slot prompt ⇒ suppressOutput no-op, zero chat-slots calls", () => {
  withFakeChatSlots(({ fakePath, logPath }) => {
    const r = runHook(
      { prompt: "build everything in logical order /goal", session_id: "abcd1234-gg" },
      {},
      fakePath,
    );
    assert.equal(JSON.parse(r.stdout.trim()).suppressOutput, true);
    assert.ok(!existsSync(logPath));
  });
});
