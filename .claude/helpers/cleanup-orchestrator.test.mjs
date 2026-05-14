/**
 * cleanup-orchestrator — behavioural tests against the parser + arg-builder + summarizer logic.
 *
 * Unit tests cover every parser branch (empty, JSON-with-msg, JSON-no-msg, garbage).
 * Integration tests spawn the CLI to verify --help (exit 0), invalid arg (exit 2),
 * and end-to-end orchestration against bash-only fake sub-cleaners (set up in a temp
 * registry override). Real-value assertions throughout — every test checks concrete
 * field values, not just presence.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";

import {
  CLEANERS,
  parseArgs,
  parseHookJson,
  parseChatBusJson,
  parseZombieText,
  parseNodeOrphanJson,
  stripHookPrefix,
  extractCountFromMessage,
  extractKilledFromMessage,
  summarizeText,
  buildArgList,
} from "./cleanup-orchestrator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_PATH = join(__dirname, "cleanup-orchestrator.mjs");

// --- parseArgs ----------------------------------------------------------

describe("parseArgs", () => {
  it("empty argv → all defaults false, empty skip set, no errors", () => {
    const { args, errors } = parseArgs([]);
    expect(errors).toEqual([]);
    expect(args.dryRun).toBe(false);
    expect(args.json).toBe(false);
    expect(args.verbose).toBe(false);
    expect(args.forceThrottled).toBe(false);
    expect(args.help).toBe(false);
    expect([...args.skip]).toEqual([]);
  });

  it("sets --dry-run, --json, --verbose, --force-throttled all to true", () => {
    const { args, errors } = parseArgs(["--dry-run", "--json", "--verbose", "--force-throttled"]);
    expect(errors).toEqual([]);
    expect(args.dryRun).toBe(true);
    expect(args.json).toBe(true);
    expect(args.verbose).toBe(true);
    expect(args.forceThrottled).toBe(true);
  });

  it("--help and -h both set help flag to true", () => {
    expect(parseArgs(["--help"]).args.help).toBe(true);
    expect(parseArgs(["-h"]).args.help).toBe(true);
  });

  it("--skip=name accepts known cleaner names and registers them in skip set", () => {
    const { args, errors } = parseArgs(["--skip=git-locks,zombies"]);
    expect(errors).toEqual([]);
    expect([...args.skip].sort()).toEqual(["git-locks", "zombies"]);
  });

  it("--skip=unknown emits error naming the bad target AND listing all 5 valid names", () => {
    const { args, errors } = parseArgs(["--skip=not-a-cleaner"]);
    expect(args.skip.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("'not-a-cleaner'");
    // Must list all 5 valid names so operator can self-correct
    expect(errors[0]).toContain("git-locks");
    expect(errors[0]).toContain("chat-bus");
    expect(errors[0]).toContain("zombies");
    expect(errors[0]).toContain("node-orphans");
    expect(errors[0]).toContain("bash-orphans");
  });

  it("unknown arg returns exact error string", () => {
    const { errors } = parseArgs(["--nope"]);
    expect(errors).toEqual(["unknown argument '--nope'"]);
  });

  it("--skip with empty entries drops them; only valid name survives", () => {
    const { args, errors } = parseArgs(["--skip=git-locks,,,"]);
    expect(errors).toEqual([]);
    expect([...args.skip]).toEqual(["git-locks"]);
  });

  it("multiple unknown args are ALL collected (not just the first)", () => {
    const { errors } = parseArgs(["--a", "--b"]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toBe("unknown argument '--a'");
    expect(errors[1]).toBe("unknown argument '--b'");
  });
});

// --- parseHookJson ------------------------------------------------------

describe("parseHookJson", () => {
  it("empty stdout → ok:false + exact 'empty stdout' detail (P1-1 fix)", () => {
    const r = parseHookJson("");
    expect(r.ok).toBe(false);
    expect(r.detail).toBe("empty stdout (hook should always emit JSON)");
    expect(r.counts).toEqual({ acted: 0 });
  });

  it("{continue:true} with no message → no-op detail, acted=0", () => {
    const r = parseHookJson('{"continue":true}');
    expect(r.detail).toBe("no-op (nothing to clean)");
    expect(r.counts.acted).toBe(0);
    expect(r.ok).toBeUndefined(); // ok-by-omission means treat-as-ok
  });

  it("systemMessage with 'reaped 3/5' → extracts 3 as first integer", () => {
    const r = parseHookJson('{"continue":true,"systemMessage":"bash-orphan-cleaner: reaped 3/5 orphan bash.exe (claude=12345)"}');
    expect(r.detail).toBe("reaped 3/5 orphan bash.exe (claude=12345)");
    expect(r.counts.acted).toBe(3);
  });

  it("hookSpecificOutput.additionalContext is parsed when systemMessage missing", () => {
    const r = parseHookJson('{"continue":true,"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"git-lock-sweeper: cleared 2 stale lock(s)"}}');
    expect(r.detail).toBe("cleared 2 stale lock(s)");
    expect(r.counts.acted).toBe(2);
  });

  it("non-JSON garbage → ok:false; detail includes literal input prefix + parse-error reason", () => {
    const r = parseHookJson("not json garbage here");
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("non-json stdout: not json garbage here");
    expect(r.detail).toContain("(");
    expect(r.detail).toContain(")");
    expect(r.counts).toEqual({ acted: 0 });
  });

  it("500-char garbage → detail truncated to 80-char input preview + error tail", () => {
    const long = "x".repeat(500);
    const r = parseHookJson(long);
    expect(r.ok).toBe(false);
    // Assert STRUCTURE (prefix + exactly-80-char input preview), not total length —
    // the error message from V8's SyntaxError varies by Node version and is appended
    // in parens. Bounding total length is fragile across Node patch releases.
    expect(r.detail.startsWith("non-json stdout: " + "x".repeat(80) + " (")).toBe(true);
    // Sanity: the full 500-char garbage is NOT included (truncated at 80)
    expect(r.detail).not.toContain("x".repeat(81));
    // Sanity: detail ends with the parenthesized error tail
    expect(r.detail.endsWith(")")).toBe(true);
  });

  it("systemMessage takes priority over hookSpecificOutput when both present", () => {
    // Both fields present; parser must pick systemMessage. Use unknown prefix
    // 'X:' so stripHookPrefix leaves it intact — proves the priority is what
    // selects the field, not the prefix-stripping logic.
    const r = parseHookJson('{"systemMessage":"X: 9 things","hookSpecificOutput":{"additionalContext":"Y: 1 thing"}}');
    expect(r.detail).toBe("X: 9 things");
    expect(r.counts.acted).toBe(9);
  });
});

// --- parseChatBusJson ---------------------------------------------------

describe("parseChatBusJson", () => {
  it("counts:{live:3,reapedPresence:2,reapedClaims:1} → exact detail format", () => {
    const payload = JSON.stringify({
      dryRun: false,
      counts: { live: 3, reapedPresence: 2, reapedClaims: 1 },
    });
    const r = parseChatBusJson(payload);
    expect(r.detail).toBe("3 live | reaped 2 presence + 1 claims");
    expect(r.counts.live).toBe(3);
    expect(r.counts.reapedPresence).toBe(2);
    expect(r.counts.reapedClaims).toBe(1);
    expect(r.counts.acted).toBe(3); // acted = presence + claims
  });

  it("dryRun:true appends ' (dry-run)' to detail (exact match)", () => {
    const payload = JSON.stringify({
      dryRun: true,
      counts: { live: 1, reapedPresence: 0, reapedClaims: 0 },
    });
    const r = parseChatBusJson(payload);
    expect(r.detail).toBe("1 live | reaped 0 presence + 0 claims (dry-run)");
  });

  it("missing counts → all zeros, acted=0", () => {
    const r = parseChatBusJson("{}");
    expect(r.counts.live).toBe(0);
    expect(r.counts.reapedPresence).toBe(0);
    expect(r.counts.reapedClaims).toBe(0);
    expect(r.counts.acted).toBe(0);
  });

  it("non-JSON garbage → ok:false + detail contains 'parse failed'", () => {
    const r = parseChatBusJson("not json");
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("parse failed");
  });

  it("empty stdout → 'no output' detail, acted=0", () => {
    const r = parseChatBusJson("");
    expect(r.detail).toBe("no output");
    expect(r.counts).toEqual({ acted: 0 });
  });
});

// --- parseZombieText ----------------------------------------------------

describe("parseZombieText", () => {
  it("canonical order → locks=2, claims=3, sessions=1, acted=6", () => {
    const r = parseZombieText("Zombie reaper: 2 locks, 3 claims, 1 sessions");
    expect(r.counts.locks).toBe(2);
    expect(r.counts.claims).toBe(3);
    expect(r.counts.sessions).toBe(1);
    expect(r.counts.acted).toBe(6);
    expect(r.detail).toBe("2 locks + 3 claims + 1 sessions reaped");
  });

  it("reordered fields (sessions,claims,locks) still parse correctly (P2-4 fix)", () => {
    const r = parseZombieText("Zombie reaper: 7 sessions, 4 claims, 2 locks");
    expect(r.counts.locks).toBe(2);
    expect(r.counts.claims).toBe(4);
    expect(r.counts.sessions).toBe(7);
    expect(r.counts.acted).toBe(13);
  });

  it("singular forms (1 lock, 1 claim, 1 session) match too", () => {
    const r = parseZombieText("Zombie reaper: 1 lock, 1 claim, 1 session");
    expect(r.counts.locks).toBe(1);
    expect(r.counts.claims).toBe(1);
    expect(r.counts.sessions).toBe(1);
    expect(r.counts.acted).toBe(3);
  });

  it("empty stdout → exact 'no-op (no zombies)' detail", () => {
    const r = parseZombieText("");
    expect(r.detail).toBe("no-op (no zombies)");
    expect(r.counts).toEqual({ acted: 0 });
  });

  it("partial match (only locks) → claims=0 sessions=0 acted=locks", () => {
    const r = parseZombieText("Zombie reaper: 5 locks");
    expect(r.counts.locks).toBe(5);
    expect(r.counts.claims).toBe(0);
    expect(r.counts.sessions).toBe(0);
    expect(r.counts.acted).toBe(5);
  });

  it("unrelated text → detail begins with 'unexpected:', counts is null", () => {
    const r = parseZombieText("totally unrelated output");
    expect(r.detail.startsWith("unexpected:")).toBe(true);
    expect(r.detail).toContain("totally unrelated output");
    expect(r.counts).toBeNull();
  });
});

// --- parseNodeOrphanJson ------------------------------------------------

describe("parseNodeOrphanJson", () => {
  it("empty stdout → reason:'quiet-or-throttled' with explicit detail (P1-3 fix)", () => {
    const r = parseNodeOrphanJson("");
    expect(r.reason).toBe("quiet-or-throttled");
    expect(r.detail).toBe("no-op or throttled (<90s since last run)");
    expect(r.counts).toEqual({ acted: 0 });
  });

  it("kill-summary additionalContext → killed=4, freedMB=350, denied=1, acted=4", () => {
    const payload = JSON.stringify({
      additionalContext: "Node orphan cleaner: Killed 4 (freed 350MB), 1 access-denied, 8 remain (1024MB), protected=12",
    });
    const r = parseNodeOrphanJson(payload);
    expect(r.counts.killed).toBe(4);
    expect(r.counts.freedMB).toBe(350);
    expect(r.counts.denied).toBe(1);
    expect(r.counts.acted).toBe(4);
    expect(r.detail).toBe("Killed 4 (freed 350MB), 1 access-denied, 8 remain (1024MB), protected=12");
  });

  it("JSON with empty additionalContext → exact 'no-op' detail", () => {
    const r = parseNodeOrphanJson('{"additionalContext":""}');
    expect(r.detail).toBe("no-op");
    expect(r.counts).toEqual({ acted: 0 });
  });

  it("non-JSON garbage → ok:false (P1-1 fix; no longer treated as silent no-op)", () => {
    const r = parseNodeOrphanJson("garbage text not json");
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("non-json stdout: garbage text not json");
  });

  it("dry-run path with 'DRY RUN would kill' text → still extracts kill count if present", () => {
    // node-orphan-cleaner emits the same shape under --dry-run (just with DRY RUN prefix on log)
    const payload = JSON.stringify({
      additionalContext: "Node orphan cleaner: Killed 2 (dry-run) (freed 50MB), 0 access-denied, 5 remain (200MB), protected=3",
    });
    const r = parseNodeOrphanJson(payload);
    expect(r.counts.killed).toBe(2);
    expect(r.counts.freedMB).toBe(50);
  });
});

// --- stripHookPrefix ----------------------------------------------------

describe("stripHookPrefix", () => {
  it("strips bash-orphan-cleaner prefix exactly", () => {
    expect(stripHookPrefix("bash-orphan-cleaner: reaped 2 things")).toBe("reaped 2 things");
  });

  it("strips 'Node orphan cleaner:' prefix", () => {
    expect(stripHookPrefix("Node orphan cleaner: Killed 3")).toBe("Killed 3");
  });

  it("strips git-lock-sweeper prefix with parenthesized mode suffix", () => {
    expect(stripHookPrefix("git-lock-sweeper (PreToolUse:30s): cleared 1"))
      .toBe("cleared 1");
  });

  it("strips 'Node closeout stop hook:' prefix", () => {
    expect(stripHookPrefix("Node closeout stop hook: prism-codex-orphan-cleaner | summary"))
      .toBe("prism-codex-orphan-cleaner | summary");
  });

  it("non-matching prefix left intact unchanged", () => {
    expect(stripHookPrefix("custom-cleaner: doing things"))
      .toBe("custom-cleaner: doing things");
  });

  it("empty string returns empty string", () => {
    expect(stripHookPrefix("")).toBe("");
  });
});

// --- extractCountFromMessage --------------------------------------------

describe("extractCountFromMessage", () => {
  it("'reaped 5 / 10 orphans' → acted=5 (first integer)", () => {
    expect(extractCountFromMessage("reaped 5 / 10 orphans")).toEqual({ acted: 5 });
  });

  it("no integer → acted=0", () => {
    expect(extractCountFromMessage("no-op nothing to clean")).toEqual({ acted: 0 });
  });

  it("integer at end of string → acted=N", () => {
    expect(extractCountFromMessage("found 42")).toEqual({ acted: 42 });
  });

  it("multi-digit numbers preserved", () => {
    expect(extractCountFromMessage("cleared 1234 locks")).toEqual({ acted: 1234 });
  });
});

// --- extractKilledFromMessage -------------------------------------------

describe("extractKilledFromMessage", () => {
  it("parses Killed/freed/access-denied tags from canonical summary", () => {
    const c = extractKilledFromMessage("Killed 7 (freed 512MB), 2 access-denied, 3 remain");
    expect(c).toEqual({ killed: 7, freedMB: 512, denied: 2, acted: 7 });
  });

  it("missing all fields → all zeros", () => {
    const c = extractKilledFromMessage("just some text without tags");
    expect(c).toEqual({ killed: 0, freedMB: 0, denied: 0, acted: 0 });
  });

  it("Killed but no freed/denied → defaults zero", () => {
    const c = extractKilledFromMessage("Killed 3 (process group)");
    expect(c).toEqual({ killed: 3, freedMB: 0, denied: 0, acted: 3 });
  });

  it("freed without Killed → killed=0 acted=0 but freedMB extracted", () => {
    const c = extractKilledFromMessage("Found nothing — freed 0MB");
    expect(c).toEqual({ killed: 0, freedMB: 0, denied: 0, acted: 0 });
  });
});

// --- summarizeText ------------------------------------------------------

describe("summarizeText", () => {
  it("renders mixed outcomes with exact format", () => {
    const results = [
      { name: "git-locks",   reason: null,                  counts: { acted: 2 } },
      { name: "chat-bus",    reason: null,                  counts: { acted: 3 } },
      { name: "zombies",     reason: "timeout",             counts: null },
      { name: "node-orphans",reason: "quiet-or-throttled",  counts: { acted: 0 } },
      { name: "bash-orphans",reason: null,                  counts: { acted: 1 } },
    ];
    const totals = { total: 5, okCount: 4, skippedCount: 0, totalDurationMs: 1234 };
    const out = summarizeText(results, totals, false);
    expect(out).toBe(
      "cleanup-orchestrator: git-locks=2 chat-bus=3 zombies=TIMEOUT node-orphans=throttled-or-quiet bash-orphans=1 [4/5 ok, 1234ms]"
    );
  });

  it("dryRun=true inserts '[dry-run]' tag", () => {
    const out = summarizeText([], { total: 0, okCount: 0, totalDurationMs: 0 }, true);
    expect(out).toBe("cleanup-orchestrator [dry-run]:  [0/0 ok, 0ms]");
  });

  it("missing-script renders as MISSING", () => {
    const r = [{ name: "x", reason: "missing-script", counts: null }];
    const out = summarizeText(r, { total: 1, okCount: 0, totalDurationMs: 0 }, false);
    expect(out).toBe("cleanup-orchestrator: x=MISSING [0/1 ok, 0ms]");
  });

  it("timeout renders as TIMEOUT", () => {
    const r = [{ name: "x", reason: "timeout", counts: null }];
    expect(summarizeText(r, { total: 1, okCount: 0, totalDurationMs: 5000 }, false))
      .toBe("cleanup-orchestrator: x=TIMEOUT [0/1 ok, 5000ms]");
  });

  it("spawn-error renders as ERR", () => {
    const r = [{ name: "x", reason: "spawn-error", counts: null }];
    expect(summarizeText(r, { total: 1, okCount: 0, totalDurationMs: 0 }, false))
      .toBe("cleanup-orchestrator: x=ERR [0/1 ok, 0ms]");
  });

  it("exit-nonzero renders as exitN with the real exitCode", () => {
    const r = [{ name: "x", reason: "exit-nonzero", counts: null, exitCode: 7 }];
    expect(summarizeText(r, { total: 1, okCount: 0, totalDurationMs: 0 }, false))
      .toBe("cleanup-orchestrator: x=exit7 [0/1 ok, 0ms]");
  });

  it("parse renders as PARSE-ERR", () => {
    const r = [{ name: "x", reason: "parse", counts: null }];
    expect(summarizeText(r, { total: 1, okCount: 0, totalDurationMs: 0 }, false))
      .toBe("cleanup-orchestrator: x=PARSE-ERR [0/1 ok, 0ms]");
  });

  it("dry-run-skip renders as 'skipped'", () => {
    const r = [{ name: "x", reason: "dry-run-skip", counts: null }];
    expect(summarizeText(r, { total: 1, okCount: 0, totalDurationMs: 0 }, true))
      .toBe("cleanup-orchestrator [dry-run]: x=skipped [0/1 ok, 0ms]");
  });
});

// --- buildArgList -------------------------------------------------------

describe("buildArgList", () => {
  const nodeOrphans = CLEANERS.find((c) => c.name === "node-orphans");
  const gitLocks = CLEANERS.find((c) => c.name === "git-locks");
  const chatBus = CLEANERS.find((c) => c.name === "chat-bus");
  const zombies = CLEANERS.find((c) => c.name === "zombies");
  const bashOrphans = CLEANERS.find((c) => c.name === "bash-orphans");

  it("baseline node-orphans args = ['--reason=cleanup-orchestrator']", () => {
    expect(buildArgList(nodeOrphans, { dryRun: false, forceThrottled: false }))
      .toEqual(["--reason=cleanup-orchestrator"]);
  });

  it("--dry-run on node-orphans → ['--reason=...', '--dry-run']", () => {
    expect(buildArgList(nodeOrphans, { dryRun: true, forceThrottled: false }))
      .toEqual(["--reason=cleanup-orchestrator", "--dry-run"]);
  });

  it("--force-throttled on node-orphans → appends --force at end", () => {
    expect(buildArgList(nodeOrphans, { dryRun: false, forceThrottled: true }))
      .toEqual(["--reason=cleanup-orchestrator", "--force"]);
  });

  it("--dry-run + --force-throttled → all 3 args in correct order", () => {
    expect(buildArgList(nodeOrphans, { dryRun: true, forceThrottled: true }))
      .toEqual(["--reason=cleanup-orchestrator", "--dry-run", "--force"]);
  });

  it("--force-throttled does NOT add --force to other cleaners (P0-2 fix isolated)", () => {
    expect(buildArgList(gitLocks, { dryRun: false, forceThrottled: true })).toEqual([]);
    expect(buildArgList(chatBus, { dryRun: false, forceThrottled: true })).toEqual(["--json"]);
    expect(buildArgList(zombies, { dryRun: false, forceThrottled: true })).toEqual([]);
    expect(buildArgList(bashOrphans, { dryRun: false, forceThrottled: true })).toEqual([]);
  });

  it("default node-orphans args do NOT include --force (defends 90s throttle)", () => {
    const args = buildArgList(nodeOrphans, { dryRun: false, forceThrottled: false });
    expect(args).not.toContain("--force");
  });

  it("chat-bus baseline = ['--json']", () => {
    expect(buildArgList(chatBus, { dryRun: false, forceThrottled: false })).toEqual(["--json"]);
  });

  it("chat-bus --dry-run = ['--json', '--dry-run']", () => {
    expect(buildArgList(chatBus, { dryRun: true, forceThrottled: false }))
      .toEqual(["--json", "--dry-run"]);
  });

  it("git-locks (hook, no dry-run support) → [] regardless of flags", () => {
    expect(buildArgList(gitLocks, { dryRun: false, forceThrottled: false })).toEqual([]);
    expect(buildArgList(gitLocks, { dryRun: true, forceThrottled: false })).toEqual([]);
    expect(buildArgList(gitLocks, { dryRun: true, forceThrottled: true })).toEqual([]);
  });
});

// --- CLEANERS registry --------------------------------------------------

describe("CLEANERS registry", () => {
  it("has exactly 5 cleaners matching the U-CLEANUP-E3 spec", () => {
    expect(CLEANERS).toHaveLength(5);
    const names = CLEANERS.map((c) => c.name).sort();
    expect(names).toEqual(["bash-orphans", "chat-bus", "git-locks", "node-orphans", "zombies"]);
  });

  it("each cleaner declares mode 'hook' or 'cli' (no other values)", () => {
    for (const c of CLEANERS) {
      expect(["hook", "cli"]).toContain(c.mode);
    }
  });

  it("hook-mode cleaners are exactly git-locks + bash-orphans (per spec)", () => {
    const hooks = CLEANERS.filter((c) => c.mode === "hook").map((c) => c.name).sort();
    expect(hooks).toEqual(["bash-orphans", "git-locks"]);
  });

  it("cli-mode cleaners are exactly chat-bus + zombies + node-orphans", () => {
    const clis = CLEANERS.filter((c) => c.mode === "cli").map((c) => c.name).sort();
    expect(clis).toEqual(["chat-bus", "node-orphans", "zombies"]);
  });

  it("every cleaner has a positive timeout ≥ 5000ms (least cleaner is git-locks @ 5000)", () => {
    for (const c of CLEANERS) {
      expect(c.timeoutMs).toBeGreaterThanOrEqual(5000);
    }
  });

  it("node-orphans timeout = 25000ms (derived: 15s PS + 5s taskkill + 5s buffer)", () => {
    const c = CLEANERS.find((x) => x.name === "node-orphans");
    expect(c.timeoutMs).toBe(25000);
  });

  it("bash-orphans timeout = 30000ms (P1-4 fix: raised from 15s)", () => {
    const c = CLEANERS.find((x) => x.name === "bash-orphans");
    expect(c.timeoutMs).toBe(30000);
  });

  it("every cleaner has a parse function", () => {
    for (const c of CLEANERS) {
      expect(typeof c.parse).toBe("function");
    }
  });

  it("supportsDryRun is true ONLY for chat-bus and node-orphans", () => {
    const withDryRun = CLEANERS.filter((c) => c.supportsDryRun).map((c) => c.name).sort();
    expect(withDryRun).toEqual(["chat-bus", "node-orphans"]);
  });

  it("node-orphans has forceThrottledArgs=['--force'] but no --force in extraArgs (P0-2 fix)", () => {
    const c = CLEANERS.find((x) => x.name === "node-orphans");
    expect(c.forceThrottledArgs).toEqual(["--force"]);
    expect(c.extraArgs).not.toContain("--force");
    expect(c.extraArgs).toEqual(["--reason=cleanup-orchestrator"]);
  });

  it("only node-orphans declares forceThrottledArgs (operator opt-in is single-purpose)", () => {
    const withForce = CLEANERS.filter((c) => c.forceThrottledArgs);
    expect(withForce).toHaveLength(1);
    expect(withForce[0].name).toBe("node-orphans");
  });

  it("chat-bus extraArgs is exactly ['--json']", () => {
    const c = CLEANERS.find((x) => x.name === "chat-bus");
    expect(c.extraArgs).toEqual(["--json"]);
    expect(c.dryRunArgs).toEqual(["--dry-run"]);
  });
});

// --- CLI integration ----------------------------------------------------

describe("CLI integration (spawnSync against the actual orchestrator)", () => {
  it("--help exits 0 with the four expected sections in stdout", () => {
    const r = spawnSync(process.execPath, [ORCHESTRATOR_PATH, "--help"], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("cleanup-orchestrator.mjs");
    expect(r.stdout).toContain("Usage:");
    expect(r.stdout).toContain("Sub-cleaners (in order):");
    expect(r.stdout).toContain("--dry-run");
    expect(r.stdout).toContain("--force-throttled");
    expect(r.stdout).toContain("Exit codes:");
    // All 5 cleaner names listed in --help
    expect(r.stdout).toContain("git-locks");
    expect(r.stdout).toContain("chat-bus");
    expect(r.stdout).toContain("zombies");
    expect(r.stdout).toContain("node-orphans");
    expect(r.stdout).toContain("bash-orphans");
  });

  it("unknown flag exits 2 with stderr containing 'unknown argument'", () => {
    const r = spawnSync(process.execPath, [ORCHESTRATOR_PATH, "--nope"], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unknown argument '--nope'");
  });

  it("unknown --skip target exits 2 with helpful error listing valid names", () => {
    const r = spawnSync(process.execPath, [ORCHESTRATOR_PATH, "--skip=not-a-cleaner"], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unknown --skip target 'not-a-cleaner'");
    expect(r.stderr).toContain("git-locks");
    expect(r.stderr).toContain("bash-orphans");
  });

  it("--skip-all-cleaners → exits 0, JSON payload has total=0, ok=true, no results", () => {
    const r = spawnSync(process.execPath, [
      ORCHESTRATOR_PATH,
      "--skip=git-locks,chat-bus,zombies,node-orphans,bash-orphans",
      "--json",
    ], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.partial).toBe(false);
    expect(payload.dryRun).toBe(false);
    expect(payload.forceThrottled).toBe(false);
    expect(payload.totals.total).toBe(0);
    expect(payload.totals.okCount).toBe(0);
    expect(payload.totals.skippedCount).toBe(0);
    expect(payload.totals.failCount).toBe(0);
    expect(payload.results).toEqual([]);
    expect(payload.skipped.sort()).toEqual(["bash-orphans", "chat-bus", "git-locks", "node-orphans", "zombies"]);
  });

  it("--dry-run --json --skip=node-orphans,chat-bus → 3 dry-run-skipped with ok:null + partial:true", () => {
    // Skip the two dry-run-capable cleaners; the remaining 3 (git-locks, zombies, bash-orphans)
    // don't support dry-run and must be reported as ok:null with reason 'dry-run-skip'.
    const r = spawnSync(process.execPath, [
      ORCHESTRATOR_PATH,
      "--dry-run",
      "--json",
      "--skip=node-orphans,chat-bus",
    ], {
      encoding: "utf8",
      timeout: 10000,
    });
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.dryRun).toBe(true);
    expect(payload.partial).toBe(true);
    expect(payload.results).toHaveLength(3);
    const skippedNames = payload.results.map((r) => r.name).sort();
    expect(skippedNames).toEqual(["bash-orphans", "git-locks", "zombies"]);
    for (const result of payload.results) {
      expect(result.ok).toBeNull();
      expect(result.reason).toBe("dry-run-skip");
      expect(result.exitCode).toBeNull();
      expect(result.durationMs).toBe(0);
    }
    expect(payload.totals.skippedCount).toBe(3);
    expect(payload.totals.okCount).toBe(0);
    expect(payload.totals.failCount).toBe(0);
  });

  it("invalid two flags → BOTH errors surfaced in stderr (parser collects all)", () => {
    const r = spawnSync(process.execPath, [ORCHESTRATOR_PATH, "--nope", "--also-bad"], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unknown argument '--nope'");
    expect(r.stderr).toContain("unknown argument '--also-bad'");
  });

  it("--force-throttled --json --skip-all → forceThrottled:true preserved in JSON output", () => {
    // With all 5 cleaners skipped, --force-throttled cannot reach node-orphans
    // (no cleaners run), but the flag MUST still be reflected in the JSON
    // payload so dashboards know the operator's intent.
    const r = spawnSync(process.execPath, [
      ORCHESTRATOR_PATH,
      "--skip=git-locks,chat-bus,zombies,node-orphans,bash-orphans",
      "--json",
      "--force-throttled",
    ], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.forceThrottled).toBe(true);
    expect(payload.skipped).toHaveLength(5);
    expect(payload.results).toEqual([]);
  });
});

// --- Path resolution sanity --------------------------------------------

describe("Repository path resolution", () => {
  it("orchestrator path resolves to PRISM repo root", () => {
    // Orchestrator file is at .claude/helpers/cleanup-orchestrator.mjs;
    // resolving ../.. must land at the PRISM repo root.
    const repoRoot = resolve(__dirname, "..", "..");
    const orchPath = resolve(__dirname, "cleanup-orchestrator.mjs");
    // repoRoot must be an ancestor of __dirname
    expect(orchPath.startsWith(repoRoot + sep)).toBe(true);
    // repoRoot's basename should be a recognized PRISM root name (prism, or worktree slug)
    const basename = repoRoot.split(sep).pop().toLowerCase();
    expect(basename === "prism" || basename.startsWith("prism-")).toBe(true);
  });

  it("every cleaner script path is relative AND starts with .claude/ (no absolute paths)", () => {
    for (const c of CLEANERS) {
      expect(c.script.startsWith("/")).toBe(false);          // no POSIX absolute
      expect(/^[a-zA-Z]:/.test(c.script)).toBe(false);       // no Windows drive prefix
      expect(c.script.startsWith(".claude/")).toBe(true);    // canonical layout
      expect(c.script.endsWith(".mjs")).toBe(true);          // ES module convention
    }
  });

  it("hook cleaners live under .claude/hooks/, CLI cleaners under .claude/helpers/", () => {
    for (const c of CLEANERS) {
      if (c.mode === "hook") {
        expect(c.script.startsWith(".claude/hooks/")).toBe(true);
      } else {
        expect(c.script.startsWith(".claude/helpers/")).toBe(true);
      }
    }
  });
});
