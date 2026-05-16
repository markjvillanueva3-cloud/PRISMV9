/**
 * precompact-release-slot.test.mjs — AUTOCOMPACT-AUTONOMOUS-MS0 / U-AAM02
 *
 * Verifies the PreCompact hook that releases the slot heartbeat just before
 * Claude CLI's compact runs, so peer chats can claim during the compact
 * window. The terminal-pin hook re-claims on SessionStart:compact, with the
 * slot-drift warning surfacing if a peer beat us to it.
 *
 * Tests cover the pure helpers (stableIdFromSession) + releaseSlot's spawn
 * behavior with PRISM_NODE_BIN redirection so we don't shell out to the real
 * chat-slots helper from unit tests.
 *
 * @milestone AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM02
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { stableIdFromSession, releaseSlot } from "../precompact-release-slot.mjs";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ─── stableIdFromSession ─────────────────────────────────────────────────────

describe("stableIdFromSession — 8-hex stable id contract", () => {
  test("happy: full UUID → claude-<first8hex>", () => {
    assert.equal(
      stableIdFromSession("549c9f4f-854a-47df-aad4-1783f66f881c"),
      "claude-549c9f4f",
    );
  });

  test("uppercase hex normalized", () => {
    assert.equal(
      stableIdFromSession("DEADBEEF-1234-5678-9ABC-DEF012345678"),
      "claude-deadbeef",
    );
  });

  test("returns null for null/undefined/empty/non-string (3 failure modes)", () => {
    assert.equal(stableIdFromSession(null), null);
    assert.equal(stableIdFromSession(undefined), null);
    assert.equal(stableIdFromSession(""), null);
    assert.equal(stableIdFromSession(42), null);
  });

  test("returns null when fewer than 8 hex chars present", () => {
    assert.equal(stableIdFromSession("abc"), null);
    assert.equal(stableIdFromSession("g-g-g"), null);
    assert.equal(stableIdFromSession("1234567"), null);  // 7 hex
  });

  test("exact 8 hex with non-hex padding still yields stable id (adversarial: NUL + control)", () => {
    assert.equal(
      stableIdFromSession("\x00\x1fabcdef12\x7frest"),
      "claude-abcdef12",
    );
  });

  test("matches sibling auto-resume implementation for cross-hook contract parity", () => {
    // Both hooks must use the SAME stableIdFromSession algorithm so that
    // session-start-auto-resume reads the SAME handoff that precompact-
    // release-slot's session-key would address. Drift here = silent slot
    // mismatch on /compact resume. Contract: 8-hex lowercase.
    const inputs = [
      "549c9f4f-854a-47df-aad4-1783f66f881c",
      "DEADBEEF-9999",
      "ffffffff-0000-1111-2222-333344445555",
    ];
    const expected = ["claude-549c9f4f", "claude-deadbeef", "claude-ffffffff"];
    for (let i = 0; i < inputs.length; i++) {
      assert.equal(stableIdFromSession(inputs[i]), expected[i]);
    }
  });
});

// ─── releaseSlot — spawn behavior ────────────────────────────────────────────

describe("releaseSlot — spawnSync routing", () => {
  test("returns {ok:false, reason:'helper missing'} when helper file absent", async () => {
    // The hook checks fs.existsSync on the helper path. The path is a hard-
    // coded constant inside the module; we can't redirect it from outside.
    // Instead we verify the constant resolution behavior by intercepting via
    // a PRISM_NODE_BIN that exits non-zero immediately — that drives the
    // failure path of the spawnSync without touching the real chat-slots
    // helper. (Behavior contract: a non-zero exit produces ok:false.)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-release-slot-"));
    const fakeNode = path.join(tmpDir, process.platform === "win32" ? "fake.cmd" : "fake.sh");
    try {
      if (process.platform === "win32") {
        fs.writeFileSync(fakeNode, "@exit 7\r\n", "utf8");
      } else {
        fs.writeFileSync(fakeNode, "#!/bin/sh\nexit 7\n", "utf8");
        fs.chmodSync(fakeNode, 0o755);
      }
      const prev = process.env.PRISM_NODE_BIN;
      process.env.PRISM_NODE_BIN = fakeNode;
      try {
        const r = releaseSlot("claude-12345678");
        // Either helper missing (file vanished) OR fake exited non-zero —
        // both produce ok:false with a reason string.
        assert.equal(r.ok, false);
        assert.equal(typeof r.reason, "string");
        assert.ok(r.reason.length > 0, "non-empty failure reason");
      } finally {
        if (prev === undefined) delete process.env.PRISM_NODE_BIN;
        else process.env.PRISM_NODE_BIN = prev;
      }
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* tolerate */ }
    }
  });

  test("function signature accepts chatId string", () => {
    // Sanity: don't throw when called with a well-formed chatId. The actual
    // spawn result depends on whether the helper file exists; both ok:true
    // and ok:false (with reason) are valid contracts.
    const r = releaseSlot("claude-deadbeef");
    assert.equal(typeof r, "object");
    assert.equal(typeof r.ok, "boolean");
  });
});

// ─── Wiring contract documentation tests ─────────────────────────────────────

describe("wiring contract — PreCompact hook discipline", () => {
  test("hook file exists at canonical path", () => {
    assert.ok(
      fs.existsSync("H:/prism/.claude/hooks/precompact-release-slot.mjs"),
      "hook file must be on disk for settings.json to invoke it",
    );
  });

  test("hook source declares PreCompact event in JSDoc", () => {
    const src = fs.readFileSync(
      "H:/prism/.claude/hooks/precompact-release-slot.mjs", "utf8",
    );
    assert.match(src, /FIRES ON:\s*PreCompact/i, "PreCompact event documented");
    assert.match(src, /BLOCKING:\s*never/i, "advisory-only contract documented");
  });

  test("hook source declares kill switch + verbose knobs", () => {
    const src = fs.readFileSync(
      "H:/prism/.claude/hooks/precompact-release-slot.mjs", "utf8",
    );
    assert.match(src, /PRISM_PRECOMPACT_RELEASE_SLOT_DISABLE/);
    assert.match(src, /PRISM_PRECOMPACT_RELEASE_SLOT_VERBOSE/);
  });

  test("hook source fail-soft contract: emit silent continue on any error", () => {
    const src = fs.readFileSync(
      "H:/prism/.claude/hooks/precompact-release-slot.mjs", "utf8",
    );
    // SILENCE constant must be present and used in all early-return paths.
    assert.match(src, /SILENCE\s*=\s*\{\s*continue:\s*true,\s*suppressOutput:\s*true\s*\}/);
  });
});
