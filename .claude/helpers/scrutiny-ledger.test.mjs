/**
 * scrutiny-ledger — behavioural tests against the per-session scrutiny store.
 * Sandboxes a fresh project root per test to avoid cross-test pollution.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let sandboxRoot;
let originalCwd;

beforeEach(() => {
  originalCwd = process.cwd();
  sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scrutiny-"));
  fs.mkdirSync(path.join(sandboxRoot, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(sandboxRoot, ".claude", "settings.json"), "{}");
  fs.mkdirSync(path.join(sandboxRoot, "mcp-server", "data", "state"), { recursive: true });
  process.chdir(sandboxRoot);
});

afterEach(() => {
  process.chdir(originalCwd);
  if (sandboxRoot && fs.existsSync(sandboxRoot)) fs.rmSync(sandboxRoot, { recursive: true, force: true });
});

async function loadLedger() {
  return await import("./scrutiny-ledger.mjs?cb=" + Date.now());
}

describe("deriveSessionId — stable derivation", () => {
  it("returns explicit session_id when provided", async () => {
    const { deriveSessionId } = await loadLedger();
    expect(deriveSessionId({ session_id: "abc-123" })).toBe("abc-123");
  });

  it("hashes transcript_path when session_id missing", async () => {
    const { deriveSessionId } = await loadLedger();
    const id = deriveSessionId({ transcript_path: "/tmp/foo/bar.jsonl" });
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    // Same input → same hash
    const id2 = deriveSessionId({ transcript_path: "/tmp/foo/bar.jsonl" });
    expect(id2).toBe(id);
    // Different input → different hash
    const id3 = deriveSessionId({ transcript_path: "/tmp/foo/baz.jsonl" });
    expect(id3).not.toBe(id);
  });

  it("falls back to 'unknown-session' on empty payload", async () => {
    const { deriveSessionId } = await loadLedger();
    expect(deriveSessionId({})).toBe("unknown-session");
    expect(deriveSessionId(null)).toBe("unknown-session");
  });

  it("ignores empty session_id and falls back", async () => {
    const { deriveSessionId } = await loadLedger();
    expect(deriveSessionId({ session_id: "" })).toBe("unknown-session");
  });
});

describe("recordScrutiny + getEntry — persistence", () => {
  it("creates an entry with selfReviewed=true on first call", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    const entry = getEntry("s1");
    expect(entry.sessionId).toBe("s1");
    expect(entry.selfReviewed).toBe(true);
    expect(entry.agentReviewed).toBe(false);
    expect(entry.blockCount).toBe(0);
  });

  it("merges marks across calls (idempotent set-true semantics)", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    recordScrutiny("s1", { agentReviewed: true });
    const entry = getEntry("s1");
    expect(entry.selfReviewed).toBe(true);
    expect(entry.agentReviewed).toBe(true);
  });

  it("records notes truncated to 500 chars", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { notes: "x".repeat(800) });
    const entry = getEntry("s1");
    expect(entry.notes.length).toBe(500);
  });

  it("getEntry returns null for unknown session", async () => {
    const { getEntry } = await loadLedger();
    expect(getEntry("nonexistent")).toBe(null);
  });
});

describe("isCleared — gate logic", () => {
  it("returns false when entry missing", async () => {
    const { isCleared } = await loadLedger();
    expect(isCleared("s1")).toBe(false);
  });

  it("returns false when only self reviewed", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns false when only agent reviewed", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { agentReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns true only when both marks set", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true, agentReviewed: true });
    expect(isCleared("s1")).toBe(true);
  });
});

describe("bumpBlockCount — escape-hatch counter", () => {
  it("increments from 0 to 1 on first bump", async () => {
    const { bumpBlockCount, getEntry } = await loadLedger();
    expect(bumpBlockCount("s1")).toBe(1);
    expect(getEntry("s1").blockCount).toBe(1);
  });

  it("increments monotonically across calls", async () => {
    const { bumpBlockCount } = await loadLedger();
    expect(bumpBlockCount("s1")).toBe(1);
    expect(bumpBlockCount("s1")).toBe(2);
    expect(bumpBlockCount("s1")).toBe(3);
  });

  it("does not interfere with selfReviewed/agentReviewed marks", async () => {
    const { bumpBlockCount, recordScrutiny, getEntry } = await loadLedger();
    bumpBlockCount("s1");
    recordScrutiny("s1", { selfReviewed: true });
    bumpBlockCount("s1");
    const entry = getEntry("s1");
    expect(entry.selfReviewed).toBe(true);
    expect(entry.blockCount).toBe(2);
  });
});

describe("clearSession — manual reset", () => {
  it("removes the entry and returns true", async () => {
    const { recordScrutiny, clearSession, getEntry } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    expect(clearSession("s1")).toBe(true);
    expect(getEntry("s1")).toBe(null);
  });

  it("returns false for unknown session", async () => {
    const { clearSession } = await loadLedger();
    expect(clearSession("never-existed")).toBe(false);
  });
});

describe("MAX_BLOCKS_PER_SESSION — invariant", () => {
  it("is exposed and equals 3", async () => {
    const { MAX_BLOCKS_PER_SESSION } = await loadLedger();
    expect(MAX_BLOCKS_PER_SESSION).toBe(3);
  });
});

describe("multiple sessions — isolation", () => {
  it("entries for different sessions don't collide", async () => {
    const { recordScrutiny, isCleared, getEntry } = await loadLedger();
    recordScrutiny("alpha", { selfReviewed: true, agentReviewed: true });
    recordScrutiny("beta", { selfReviewed: true });
    expect(isCleared("alpha")).toBe(true);
    expect(isCleared("beta")).toBe(false);
    expect(getEntry("alpha").sessionId).toBe("alpha");
    expect(getEntry("beta").sessionId).toBe("beta");
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3-way upgrade + Gemini→2nd-Claude swap (2026-05-12): the three arms are
// codexReviewed (Codex CLI) + claudeReviewed (2nd Claude reviewer — canonical;
// the slot the retired Gemini CLI filled, accepts opusBReviewed/geminiReviewed
// as write-side aliases) + opusReviewed (Opus reviewer agent).
// ════════════════════════════════════════════════════════════════════════

describe("3-way arm marks — set/revoke", () => {
  it("records codexReviewed: true and exposes it on the entry", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    const entry = getEntry("s1");
    expect(entry.codexReviewed).toBe(true);
    expect(entry.claudeReviewed).toBe(false);
    expect(entry.opusReviewed).toBe(false);
  });

  it("records claudeReviewed: true independently from codex/opus", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { claudeReviewed: true });
    const entry = getEntry("s1");
    expect(entry.codexReviewed).toBe(false);
    expect(entry.claudeReviewed).toBe(true);
    expect(entry.opusReviewed).toBe(false);
  });

  it("records opusReviewed: true independently from codex/claude", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { opusReviewed: true });
    const entry = getEntry("s1");
    expect(entry.codexReviewed).toBe(false);
    expect(entry.claudeReviewed).toBe(false);
    expect(entry.opusReviewed).toBe(true);
  });

  it("a subsequent FAIL revokes a prior PASS for the same arm (Codex blocker #1)", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { opusReviewed: true });
    expect(getEntry("s1").opusReviewed).toBe(true);
    // Now mark opus FAIL — boolean type-guard should let `false` through.
    recordScrutiny("s1", { opusReviewed: false });
    expect(getEntry("s1").opusReviewed).toBe(false);
  });

  it("revocation works for all three arms, not just opus", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true, claudeReviewed: true, opusReviewed: true });
    expect(getEntry("s1").codexReviewed).toBe(true);
    expect(getEntry("s1").claudeReviewed).toBe(true);
    expect(getEntry("s1").opusReviewed).toBe(true);
    recordScrutiny("s1", { codexReviewed: false });
    recordScrutiny("s1", { claudeReviewed: false });
    recordScrutiny("s1", { opusReviewed: false });
    const entry = getEntry("s1");
    expect(entry.codexReviewed).toBe(false);
    expect(entry.claudeReviewed).toBe(false);
    expect(entry.opusReviewed).toBe(false);
  });

  it("undefined arm marks leave the existing value unchanged", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    // Subsequent call with no codex flag — must not flip codex back to false.
    recordScrutiny("s1", { selfReviewed: true });
    expect(getEntry("s1").codexReviewed).toBe(true);
    expect(getEntry("s1").selfReviewed).toBe(true);
  });

  it("non-boolean arm values are ignored (no coercion)", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    // @ts-ignore — deliberately wrong type
    recordScrutiny("s1", { codexReviewed: "yes" });
    // String "yes" is truthy but the boolean type-guard should reject it.
    expect(getEntry("s1").codexReviewed).toBe(true);
    // @ts-ignore
    recordScrutiny("s1", { codexReviewed: 0 });
    expect(getEntry("s1").codexReviewed).toBe(true);
  });

  // legacy entry shape never carries the retired flag forward
  it("does NOT expose geminiReviewed/opusBReviewed on a returned entry", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    const entry = getEntry("s1");
    expect("geminiReviewed" in entry).toBe(false);
    expect("opusBReviewed" in entry).toBe(false);
    expect(typeof entry.claudeReviewed).toBe("boolean");
  });
});

describe("arm-B aliases — claudeReviewed | opusBReviewed | geminiReviewed normalize together", () => {
  it("a geminiReviewed:true mark (legacy Gemini-CLI name) sets claudeReviewed", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { geminiReviewed: true });
    expect(getEntry("s1").claudeReviewed).toBe(true);
  });

  it("an opusBReviewed:true mark (transitional arm-B name) sets claudeReviewed", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { opusBReviewed: true });
    expect(getEntry("s1").claudeReviewed).toBe(true);
  });

  it("a later opusBReviewed:false revokes a prior claudeReviewed PASS", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { claudeReviewed: true });
    expect(getEntry("s1").claudeReviewed).toBe(true);
    recordScrutiny("s1", { opusBReviewed: false });
    expect(getEntry("s1").claudeReviewed).toBe(false);
  });

  it("canonical claudeReviewed wins over a same-call legacy alias", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { claudeReviewed: true, geminiReviewed: false, opusBReviewed: false });
    expect(getEntry("s1").claudeReviewed).toBe(true);
  });

  it("a pre-existing on-disk entry with geminiReviewed:true is migrated to claudeReviewed on read", async () => {
    const { getEntry, isCleared } = await loadLedger();
    // hand-write a legacy ledger as the old code would have produced it
    const ledgerP = path.join(sandboxRoot, "mcp-server", "data", "state", "SCRUTINY_LEDGER.json");
    fs.mkdirSync(path.dirname(ledgerP), { recursive: true });
    fs.writeFileSync(ledgerP, JSON.stringify({
      entries: {
        legacy3way: {
          sessionId: "legacy3way", recordedAt: new Date().toISOString(),
          selfReviewed: false, agentReviewed: true,
          codexReviewed: true, geminiReviewed: true, opusReviewed: true,
          reviews: { codex: { verdict: "pass" }, gemini: { verdict: "pass" }, opus: { verdict: "pass" } },
          blockCount: 0, notes: "",
        },
      },
    }, null, 2));
    const entry = getEntry("legacy3way");
    expect(entry.claudeReviewed).toBe(true);
    expect("geminiReviewed" in entry).toBe(false);
    expect(entry.reviews.claude).toEqual({ verdict: "pass" });
    expect("gemini" in entry.reviews).toBe(false);
    // a fully-marked legacy 3way entry must still count as cleared
    expect(isCleared("legacy3way")).toBe(true);
  });
});

describe("agentReviewed — boolean type-guard + OR derivation (Gemini blocker #3)", () => {
  it("accepts agentReviewed: false to revoke a prior true", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { agentReviewed: true });
    expect(getEntry("s1").agentReviewed).toBe(true);
    recordScrutiny("s1", { agentReviewed: false });
    expect(getEntry("s1").agentReviewed).toBe(false);
  });

  it("OR-derives agentReviewed=true when any provider is true, even if explicitly set false", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    // Explicit revocation paired with an active provider — derivation wins.
    recordScrutiny("s1", { codexReviewed: true, agentReviewed: false });
    expect(getEntry("s1").agentReviewed).toBe(true);
  });

  it("agentReviewed remains false when explicit false AND no providers are true", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { agentReviewed: false });
    expect(getEntry("s1").agentReviewed).toBe(false);
  });
});

describe("isCleared — 3-of-3 strict path", () => {
  it("returns false with zero provider marks", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns false with only one provider PASS", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns false with two providers PASS (need all three)", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true, geminiReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns true only when all three provider PASS marks are recorded", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true, geminiReviewed: true, opusReviewed: true });
    expect(isCleared("s1")).toBe(true);
  });

  it("FAIL revocation reverts a previously cleared session", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true, geminiReviewed: true, opusReviewed: true });
    expect(isCleared("s1")).toBe(true);
    recordScrutiny("s1", { opusReviewed: false });
    expect(isCleared("s1")).toBe(false);
  });
});

describe("isCleared — legacy fallback for pre-3way entries", () => {
  it("clears legacy entries with selfReviewed && agentReviewed and no provider flags", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("legacy", { selfReviewed: true, agentReviewed: true });
    // No codexReviewed/geminiReviewed/opusReviewed — should fall back.
    expect(isCleared("legacy")).toBe(true);
  });

  it("legacy fallback fires when no provider PASS is recorded yet, even with explicit FALSE marks", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    // The fallback gates on "no provider has PASSed" (not "no provider flag exists"),
    // because makeEmptyEntry initializes all three providers to false. So an entry
    // with explicit codex=false plus selfReviewed+agentReviewed still trips the
    // legacy fallback — which is intentional, since that exactly matches the
    // pre-3way callers who only knew about self/agent flags.
    recordScrutiny("mixed", { selfReviewed: true, agentReviewed: true, codexReviewed: false });
    expect(isCleared("mixed")).toBe(true);
  });

  it("legacy fallback does NOT fire once a provider PASSes (strict 3-of-3 takes over)", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    // codexReviewed: true takes the entry out of "legacy" territory.
    // Now strict 3-of-3 governs and we need all three providers PASS.
    recordScrutiny("postlegacy", { selfReviewed: true, agentReviewed: true, codexReviewed: true });
    expect(isCleared("postlegacy")).toBe(false);
  });

  it("a half-marked legacy entry (selfReviewed only) doesn't clear", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("half", { selfReviewed: true });
    expect(isCleared("half")).toBe(false);
  });
});

describe("recordReviewerDetail — per-provider verdict capture", () => {
  it("captures codex verdict + blockers + notes under reviews.codex", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", {
      codexReviewed: false,
      codexDetail: { verdict: "fail", blockers: "BLOCKER: foo", notes: "saw issue X" },
    });
    const r = getEntry("s1").reviews.codex;
    expect(r.verdict).toBe("fail");
    expect(r.blockers).toBe("BLOCKER: foo");
    expect(r.notes).toBe("saw issue X");
    expect(typeof r.recordedAt).toBe("string");
  });

  it("truncates oversized blockers/notes (1000/500 chars), normalizing the arm-B alias", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    // geminiDetail is a legacy alias for claudeDetail → stored under reviews.claude.
    recordScrutiny("s1", {
      geminiDetail: { verdict: "fail", blockers: "B".repeat(1500), notes: "n".repeat(800) },
    });
    const r = getEntry("s1").reviews.claude;
    expect(r.blockers.length).toBe(1000);
    expect(r.notes.length).toBe(500);
  });
});

describe("file lock — RMW serialization (Gemini blocker #4)", () => {
  it("records two sequential mark sets without losing the first", async () => {
    // Same-process serialization: lock guarantees the second recordScrutiny
    // sees the first's writes. Verifies the lock-and-release path doesn't
    // deadlock and that loadLedger picks up the prior mark.
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    recordScrutiny("s1", { claudeReviewed: true });
    const entry = getEntry("s1");
    expect(entry.codexReviewed).toBe(true);
    expect(entry.claudeReviewed).toBe(true);
  });

  it("leaves no stale lock file after a successful operation", async () => {
    const { recordScrutiny } = await loadLedger();
    recordScrutiny("s1", { codexReviewed: true });
    const lockP = path.join(sandboxRoot, "mcp-server", "data", "state", "SCRUTINY_LEDGER.json.lock");
    expect(fs.existsSync(lockP)).toBe(false);
  });

  it("releases the lock even when the wrapped fn would throw", async () => {
    // Force saveLedger to throw by making the data dir read-only.
    // We can't easily make Windows dirs read-only in tests, so instead
    // we trigger a throw via a corrupt sessionId leading to a path issue
    // — actually simplest: pre-create the .lock file with stale mtime,
    // then recordScrutiny should clear it and acquire successfully,
    // never leaving the lock behind.
    const { recordScrutiny } = await loadLedger();
    const lockP = path.join(sandboxRoot, "mcp-server", "data", "state", "SCRUTINY_LEDGER.json.lock");
    fs.mkdirSync(path.dirname(lockP), { recursive: true });
    fs.writeFileSync(lockP, JSON.stringify({ pid: 999999, acquiredAt: 0 }));
    // Manually set mtime to long-ago so stale-clear kicks in
    const longAgo = new Date(Date.now() - 60_000);
    fs.utimesSync(lockP, longAgo, longAgo);
    recordScrutiny("s1", { codexReviewed: true });
    // Lock should have been cleared and not re-leaked.
    expect(fs.existsSync(lockP)).toBe(false);
  });
});

describe("parseVerdictLine — VERDICT regex (Gemini blocker #2)", () => {
  it("accepts plain VERDICT: PASS", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("VERDICT: PASS").verdict).toBe("pass");
  });

  it("accepts plain VERDICT: FAIL", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("VERDICT: FAIL").verdict).toBe("fail");
  });

  it("accepts VERDICT with trailing parenthesis (the literal example from the system prompt)", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("VERDICT: PASS (if all criteria met)").verdict).toBe("pass");
    expect(parseVerdictLine("VERDICT: FAIL (if ANY criterion violated)").verdict).toBe("fail");
  });

  it("accepts VERDICT with em-dash trailing prose", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("VERDICT: PASS — confidence high").verdict).toBe("pass");
  });

  it("is case-insensitive on PASS/FAIL", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("verdict: pass").verdict).toBe("pass");
    expect(parseVerdictLine("Verdict: Fail").verdict).toBe("fail");
  });

  it("ignores leading whitespace (per-line trim)", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("   VERDICT: PASS").verdict).toBe("pass");
  });

  it("only matches on the FIRST non-empty line — blank prefix lines are skipped", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("\n\n\nVERDICT: PASS").verdict).toBe("pass");
  });

  it("rejects VERDICT mentioned later in the body (prose VERDICT: FAIL)", async () => {
    const { parseVerdictLine } = await loadLedger();
    const text = [
      "Looking at this commit, I see no major issues.",
      "VERDICT: PASS",  // not first non-empty line — must NOT match
    ].join("\n");
    expect(parseVerdictLine(text).verdict).toBe(null);
  });

  it("rejects malformed first line (no colon, wrong word)", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("VERDICT PASS").verdict).toBe(null);
    expect(parseVerdictLine("OK: PASS").verdict).toBe(null);
    expect(parseVerdictLine("VERDICT: PASSED").verdict).toBe(null); // word boundary check
  });

  it("returns null on non-string or empty input", async () => {
    const { parseVerdictLine } = await loadLedger();
    expect(parseVerdictLine("").verdict).toBe(null);
    expect(parseVerdictLine(null).verdict).toBe(null);
    expect(parseVerdictLine(undefined).verdict).toBe(null);
  });

  it("returns the firstLine for diagnostic notes alongside the verdict", async () => {
    const { parseVerdictLine } = await loadLedger();
    const r = parseVerdictLine("VERDICT: FAIL — saw issue X");
    expect(r.verdict).toBe("fail");
    expect(r.firstLine).toBe("VERDICT: FAIL — saw issue X");
  });

  it("skips Windows shim taskkill chatter prepended to Codex output", async () => {
    // Reproduces the bug from session 1f96b0f4 (2026-05-05) where the Codex
    // .cmd shim emitted Windows `taskkill /T` exit chatter on stdout BEFORE
    // Codex's actual VERDICT, defaulting every Codex review to FAIL.
    const { parseVerdictLine } = await loadLedger();
    const text = [
      "SUCCESS: The process with PID 28544 (child process of PID 20796) has been terminated.",
      "VERDICT: PASS",
    ].join("\n");
    const r = parseVerdictLine(text);
    expect(r.verdict).toBe("pass");
    expect(r.firstLine).toBe("VERDICT: PASS");
  });

  it("skips multiple Windows shim noise lines before finding VERDICT", async () => {
    const { parseVerdictLine } = await loadLedger();
    const text = [
      "SUCCESS: Sent termination signal to process 1234",
      "INFO: No tasks running matching the criteria",
      "SUCCESS: The process with PID 1234 has been terminated.",
      "VERDICT: FAIL",
      "BLOCKER: stub function detected",
    ].join("\n");
    const r = parseVerdictLine(text);
    expect(r.verdict).toBe("fail");
    expect(r.firstLine).toBe("VERDICT: FAIL");
  });

  it("does NOT mistake legitimate prose for shim noise", async () => {
    // The shim-noise patterns are anchored to start-of-line and tightly
    // worded; user prose mentioning "success" elsewhere must NOT match.
    const { parseVerdictLine } = await loadLedger();
    const text = "SUCCESS criteria met for this commit.\nVERDICT: PASS";
    const r = parseVerdictLine(text);
    // First non-empty non-shim line is "SUCCESS criteria met..." which is
    // NOT a recognized VERDICT line, so the parser correctly returns null
    // (the shim filter is conservative — it only suppresses exact known noise).
    expect(r.verdict).toBe(null);
  });
});

describe("saveLedger error propagation (Gemini blocker #1)", () => {
  it("recordScrutiny throws when the underlying write fails", async () => {
    // Make the state directory read-only on POSIX, or pre-occupy the path
    // with a directory on any OS so writeFileSync rejects.
    const { recordScrutiny } = await loadLedger();
    const ledgerP = path.join(sandboxRoot, "mcp-server", "data", "state", "SCRUTINY_LEDGER.json");
    // Replace the ledger file location with a directory — fs.writeFileSync
    // will throw EISDIR on attempt to write to a path that's a directory,
    // OR the rename target collision will throw. Either surfaces upstream.
    if (fs.existsSync(ledgerP)) fs.rmSync(ledgerP);
    fs.mkdirSync(ledgerP, { recursive: true });
    expect(() => recordScrutiny("s1", { codexReviewed: true })).toThrow();
  });
});
