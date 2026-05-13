// tier: T4
// Tests for .claude/hooks/task-created-claim-guard.mjs (U-HKA09).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/task-created-claim-guard.test.mjs
//
// Intent: a TaskCreate whose subject fuzzy-matches a fresh task by ANOTHER chat is
// denied (with a coordinate-or-force message); your own re-creation is allowed; stale
// claims (>TTL) don't block; short subjects need an exact match; --force escapes.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  normalizeSubject,
  tokensOf,
  similarity,
  isForced,
  findDuplicate,
  decideClaim,
  ledgerPath,
  readLedger,
  runGuard,
} from "../task-created-claim-guard.mjs";

const MIN = 60_000;
let TMP, LEDGER;
beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tccg-test-")); LEDGER = path.join(TMP, "claims.jsonl"); });
afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });
const envFor = (o = {}) => ({ PRISM_TASK_CLAIM_LEDGER: LEDGER, ...o });
function seed(rows) { fs.writeFileSync(LEDGER, rows.map((r) => JSON.stringify(r)).join("\n") + "\n"); }

describe("normalizeSubject / tokensOf / similarity", () => {
  it("normalize lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeSubject("Wire the `FooEngine` into prism_calc!")).toBe("wire the fooengine into prism calc");
    expect(normalizeSubject("  Multiple   spaces\tand\ntabs ")).toBe("multiple spaces and tabs");
    expect(normalizeSubject("")).toBe("");
    expect(normalizeSubject(null)).toBe("");
  });
  it("tokensOf drops stopwords + 1-char tokens", () => {
    expect(tokensOf("Wire the X engine into the dispatcher")).toEqual(["wire", "engine", "dispatcher"]);
    expect(tokensOf("Run the build")).toEqual(["run", "build"]);
    expect(tokensOf("a to of")).toEqual([]); // all stopwords
  });
  it("similarity: exact-normalized ⇒ 1; paraphrase high; unrelated low; empty ⇒ 0", () => {
    expect(similarity("Wire FooEngine into prism_calc", "wire   fooengine   into   prism calc")).toBe(1);
    expect(similarity("Wire the FooEngine into the prism_calc dispatcher", "Wire FooEngine to prism_calc dispatcher")).toBeGreaterThan(0.7);
    expect(similarity("Run the build", "Fix the lint errors")).toBe(0); // zero token overlap
    expect(similarity("", "anything")).toBe(0);
  });
});

describe("isForced — escape hatches", () => {
  it("PRISM_TASK_CLAIM_GUARD=0", () => expect(isForced({ subject: "x" }, { PRISM_TASK_CLAIM_GUARD: "0" })).toBe(true));
  it("metadata.force / forceClaim / force_create / allowDuplicate", () => {
    expect(isForced({ subject: "x", metadata: { force: true } }, {})).toBe(true);
    expect(isForced({ subject: "x", metadata: { allowDuplicate: 1 } }, {})).toBe(true);
    expect(isForced({ subject: "x", metadata: { other: true } }, {})).toBe(false);
  });
  it("[force] / (force) in the subject — but not the word 'enforce'", () => {
    expect(isForced({ subject: "Wire FooEngine [force]" }, {})).toBe(true);
    expect(isForced({ subject: "(force) redo the thing" }, {})).toBe(true);
    expect(isForced({ subject: "enforce the rule" }, {})).toBe(false);
  });
  it("no hatch → false", () => expect(isForced({ subject: "ordinary task" }, {})).toBe(false));
});

describe("findDuplicate", () => {
  const now = 100 * MIN;
  const ttlMs = 30 * MIN;
  it("flags a fresh fuzzy match by a different session, returning that entry + a score", () => {
    const entries = [{ subject: "Wire the FooEngine into the prism_calc dispatcher", session: "bravo", at: now - 5 * MIN }];
    const { match, score } = findDuplicate("Wire FooEngine to prism_calc dispatcher", entries, { session: "alpha", now, ttlMs });
    expect(match.session).toBe("bravo");
    expect(score).toBeGreaterThan(0.7);
  });
  it("ignores your OWN claim", () => {
    const entries = [{ subject: "Wire FooEngine into prism_calc", session: "alpha", at: now - 1 * MIN }];
    expect(findDuplicate("Wire FooEngine into prism_calc", entries, { session: "alpha", now, ttlMs }).match).toBeNull();
  });
  it("ignores stale claims (older than TTL)", () => {
    const entries = [{ subject: "Wire FooEngine into prism_calc", session: "bravo", at: now - 40 * MIN }];
    expect(findDuplicate("Wire FooEngine into prism_calc", entries, { session: "alpha", now, ttlMs }).match).toBeNull();
  });
  it("a SHORT subject needs an EXACT normalized match, not a fuzzy one", () => {
    const entries = [{ subject: "fix build", session: "bravo", at: now - 1 * MIN }];
    expect(findDuplicate("fix tests", entries, { session: "alpha", now, ttlMs }).match).toBeNull(); // 1-token overlap but not equal
    const exact = findDuplicate("Fix the build!", entries, { session: "alpha", now, ttlMs });       // normalizes to "fix build"
    expect(exact.match.subject).toBe("fix build");
    expect(exact.score).toBe(1);
  });
  it("the fuzzy threshold is honoured", () => {
    const entries = [{ subject: "wire the foo engine into prism calc and add tests", session: "bravo", at: now - 1 * MIN }];
    expect(findDuplicate("wire the bar engine into prism cam", entries, { session: "alpha", now, ttlMs }).match).toBeNull();          // ~50% overlap < 0.72
    expect(findDuplicate("wire the bar engine into prism cam", entries, { session: "alpha", now, ttlMs, threshold: 0.2 }).match.session).toBe("bravo");
  });
});

describe("decideClaim", () => {
  const now = 100 * MIN;
  it("no entries → allow + append", () => {
    expect(decideClaim({ subject: "Wire FooEngine", session: "alpha", entries: [], now })).toMatchObject({ action: "allow", append: true });
  });
  it("fresh dup by another chat → deny, no append, message says coordinate-or-force + names the other chat", () => {
    const d = decideClaim({ subject: "Wire the FooEngine into prism_calc dispatcher", session: "alpha", entries: [{ subject: "Wire FooEngine to prism_calc dispatcher", session: "bravo", at: now - 3 * MIN }], now });
    expect(d.action).toBe("deny");
    expect(d.append).toBe(false);
    expect(d.dup.session).toBe("bravo");
    expect(d.reason).toMatch(/bravo/);
    expect(d.reason.toLowerCase()).toMatch(/duplicate/);
    expect(d.reason.toLowerCase()).toMatch(/coordinate/);
    expect(d.reason.toLowerCase()).toMatch(/force/);
  });
  it("forced → allow + append, even with a dup present", () => {
    const d = decideClaim({ subject: "Wire FooEngine into prism_calc", session: "alpha", entries: [{ subject: "Wire FooEngine into prism_calc", session: "bravo", at: now - 1 * MIN }], now, forced: true });
    expect(d).toMatchObject({ action: "allow", append: true });
  });
  it("empty subject → allow, no append", () => {
    expect(decideClaim({ subject: "   ", session: "alpha", entries: [], now })).toMatchObject({ action: "allow", append: false });
  });
});

describe("readLedger / ledgerPath", () => {
  it("ledgerPath honours the env override", () => expect(ledgerPath(envFor(), TMP)).toBe(LEDGER));
  it("readLedger keeps only fresh, well-formed entries (drops malformed + stale lines)", () => {
    const now = 100 * MIN;
    seed([
      { subject: "fresh-a", session: "x", at: now - 1 * MIN },
      { subject: "stale-b", session: "x", at: now - 99 * MIN },
      { subject: "stale-c", session: "y", at: now - 100 * MIN },
      { subject: "fresh-d", session: "z", at: now - 2 * MIN },
      { /* no subject */ session: "q", at: now - 1 * MIN },
    ]);
    fs.appendFileSync(LEDGER, "garbage line\n{not json\n");
    const { entries } = readLedger(LEDGER, now, 30 * MIN);
    expect(entries.map((e) => e.subject).sort()).toEqual(["fresh-a", "fresh-d"]);
  });
  it("missing ledger → empty, no throw", () => {
    expect(readLedger(path.join(TMP, "nope.jsonl"), Date.now(), MIN)).toEqual({ entries: [], pruneDue: false });
  });
});

describe("runGuard — end to end (real ledger file in a temp dir)", () => {
  it("first creation of a subject → allow, ledger gets exactly one entry tagged with this session", () => {
    const r = runGuard({ stdin: { tool_name: "TaskCreate", tool_input: { subject: "Wire the FooEngine into prism_calc" }, session_id: "alpha" }, env: envFor(), now: 100 * MIN, root: TMP });
    expect(r.action).toBe("allow");
    const { entries } = readLedger(LEDGER, 100 * MIN, 30 * MIN);
    expect(entries.length).toBe(1);
    expect(entries[0].session).toBe("alpha");
    expect(entries[0].at).toBe(100 * MIN);
  });
  it("a DIFFERENT chat creating a near-identical subject shortly after → deny, and the denied creation is NOT appended", () => {
    const env = envFor();
    runGuard({ stdin: { tool_name: "TaskCreate", tool_input: { subject: "Wire the FooEngine into the prism_calc dispatcher" }, session_id: "alpha" }, env, now: 100 * MIN, root: TMP });
    const r = runGuard({ stdin: { tool_name: "TaskCreate", tool_input: { subject: "Wire FooEngine to prism_calc dispatcher" }, session_id: "bravo" }, env, now: 101 * MIN, root: TMP });
    expect(r.action).toBe("deny");
    expect(r.dup.session).toBe("alpha");
    expect(readLedger(LEDGER, 101 * MIN, 30 * MIN).entries.length).toBe(1);
  });
  it("the SAME chat re-creating its own task → allow", () => {
    const env = envFor();
    runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "alpha" }, env, now: 100 * MIN, root: TMP });
    expect(runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "alpha" }, env, now: 102 * MIN, root: TMP }).action).toBe("allow");
  });
  it("after the TTL elapses, the old claim no longer blocks", () => {
    const env = envFor();
    runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "alpha" }, env, now: 100 * MIN, root: TMP });
    expect(runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "bravo" }, env, now: 100 * MIN + 31 * MIN, root: TMP }).action).toBe("allow");
  });
  it("force escape via metadata.force overrides the dup", () => {
    const env = envFor();
    runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "alpha" }, env, now: 100 * MIN, root: TMP });
    expect(runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc", metadata: { force: true } }, session_id: "bravo" }, env, now: 101 * MIN, root: TMP }).action).toBe("allow");
  });
  it("PRISM_TASK_CLAIM_GUARD=0 disables (everything allowed)", () => {
    const env = envFor({ PRISM_TASK_CLAIM_GUARD: "0" });
    runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "alpha" }, env, now: 100 * MIN, root: TMP });
    expect(runGuard({ stdin: { tool_input: { subject: "Wire FooEngine into prism_calc" }, session_id: "bravo" }, env, now: 101 * MIN, root: TMP }).action).toBe("allow");
  });
  it("no subject / garbled stdin → allow, never throws", () => {
    expect(runGuard({ stdin: { tool_input: {} }, env: envFor(), now: 1e6, root: TMP }).action).toBe("allow");
    expect(() => runGuard({ stdin: null, env: envFor(), now: 1e6, root: TMP })).not.toThrow();
    expect(runGuard({ stdin: null, env: envFor(), now: 1e6, root: TMP }).action).toBe("allow");
    expect(runGuard({ stdin: { tool_input: { subject: 123 } }, env: envFor(), now: 1e6, root: TMP }).action).toBe("allow");
  });
  it("variability: distinct subjects don't collide, near-dups do (3 spanning cases)", () => {
    const env = envFor();
    runGuard({ stdin: { tool_input: { subject: "Wire the FooEngine into prism_calc" }, session_id: "alpha" }, env, now: 100 * MIN, root: TMP });
    expect(runGuard({ stdin: { tool_input: { subject: "Fix the failing lint rules in the dispatcher" }, session_id: "bravo" }, env, now: 100 * MIN, root: TMP }).action).toBe("allow");   // distinct
    expect(runGuard({ stdin: { tool_input: { subject: "Wire FooEngine to the prism_calc dispatcher" }, session_id: "charlie" }, env, now: 100 * MIN, root: TMP }).action).toBe("deny");  // near-dup of #1
    expect(runGuard({ stdin: { tool_input: { subject: "Fix failing lint rules in dispatcher" }, session_id: "delta" }, env, now: 100 * MIN, root: TMP }).action).toBe("deny");           // near-dup of #2
  });
});
