// Tests for the MISC-TASKS Ollama recall arm. ask() is STUBBED -> deterministic, no live model.
// R12: the load-bearing property is NEVER-FALSE-CLOSE on garbage/ambiguous/errored responses.
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseVerdict,
  buildPrompt,
  gatherEvidence,
  classifyViaOllama,
  buildBasenamePathIndex,
} from "./verify-misc-tasks-ollama.mjs";
import { ROOT } from "./verify-misc-tasks-open.mjs";

// --- parseVerdict ---
test("parseVerdict: clean JSON -> status + reason", () => {
  assert.deepEqual(parseVerdict(`{"status":"closed","reason":"hook already wired"}`), { status: "closed", reason: "hook already wired" });
  assert.equal(parseVerdict(`{"status":"open"}`).status, "open");
  assert.equal(parseVerdict(`prefix {"status":"unknown","reason":"x"} suffix`).status, "unknown");
});

test("parseVerdict: keyword fallback only on UNAMBIGUOUS signal", () => {
  assert.equal(parseVerdict("The task is already done and closed.").status, "closed");
  assert.equal(parseVerdict("This still needs doing, it is open.").status, "open");
});

test("parseVerdict: ADVERSARIAL -- ambiguous/garbage/empty NEVER closes", () => {
  assert.equal(parseVerdict("it is both open and closed honestly").status, "unknown", "open+closed -> unknown, never false-close");
  assert.equal(parseVerdict("blah blah no verdict").status, "unknown");
  assert.equal(parseVerdict(`{"status":"closed"}{"status":"open"}`).status, "closed", "first JSON match wins (deterministic)");
});

test("parseVerdict: empty/null/non-string -> unknown", () => {
  assert.equal(parseVerdict("").status, "unknown");
  assert.equal(parseVerdict(null).status, "unknown");
  assert.equal(parseVerdict(42).status, "unknown");
});

// --- buildPrompt ---
test("buildPrompt: includes title, evidence, and the strict JSON instruction", () => {
  const p = buildPrompt({ title: "Wire foo.mjs", evidence: "foo.mjs unwired" }, "foo.mjs EXISTS, head:\n...");
  assert.match(p, /Wire foo\.mjs/);
  assert.match(p, /foo\.mjs EXISTS/);
  assert.match(p, /"status":"open\|closed\|unknown"/);
});

// --- gatherEvidence ---
test("gatherEvidence: present asset -> head; absent -> ABSENT marker; no asset -> empty", () => {
  const item = { title: "Fix present.mjs and gone.mjs", evidence: "" };
  const pathIndex = new Map([["present.mjs", "/abs/present.mjs"]]);
  const readFileSafe = (p) => (p === "/abs/present.mjs" ? "line1\nline2" : "");
  const ev = gatherEvidence(item, { pathIndex, readFileSafe });
  assert.match(ev, /present\.mjs EXISTS/);
  assert.match(ev, /line1/);
  assert.match(ev, /gone\.mjs: ABSENT/);
  assert.equal(gatherEvidence({ title: "narrative no files", evidence: "" }, { pathIndex, readFileSafe }), "");
});

// --- classifyViaOllama ---
const PI = new Map([["x.mjs", "/abs/x.mjs"]]);
const READ = () => "current file body shows the fix is present";

test("classifyViaOllama: ask says closed -> closed (recall boost)", async () => {
  const r = await classifyViaOllama({ misc_id: "M1", title: "Wire x.mjs", evidence: "x.mjs unwired" }, { pathIndex: PI, readFileSafe: READ, ask: async () => `{"status":"closed","reason":"present"}` });
  assert.equal(r.status, "closed");
  assert.ok(r.evidence.length > 0);
});

test("classifyViaOllama: ADVERSARIAL -- garbage response NEVER false-closes", async () => {
  const r = await classifyViaOllama({ misc_id: "M2", title: "Wire x.mjs", evidence: "" }, { pathIndex: PI, readFileSafe: READ, ask: async () => "lol idk maybe" });
  assert.equal(r.status, "unknown", "garbage -> unknown, never closed");
});

test("classifyViaOllama: ask throws -> unknown (fail-soft, never false-close)", async () => {
  const r = await classifyViaOllama({ misc_id: "M3", title: "Wire x.mjs", evidence: "" }, { pathIndex: PI, readFileSafe: READ, ask: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(r.status, "unknown");
  assert.equal(r.reason, "ask-error");
});

test("classifyViaOllama: no resolvable asset -> unknown, ask NEVER called", async () => {
  let called = false;
  const r = await classifyViaOllama({ misc_id: "M4", title: "narrative task", evidence: "no files here" }, { pathIndex: PI, readFileSafe: READ, ask: async () => { called = true; return `{"status":"closed"}`; } });
  assert.equal(r.status, "unknown");
  assert.equal(r.reason, "no resolvable asset");
  assert.equal(called, false, "no evidence -> skip the model call (cost + never-false-close)");
});

test("classifyViaOllama: ask says open -> open", async () => {
  const r = await classifyViaOllama({ misc_id: "M5", title: "Wire x.mjs", evidence: "" }, { pathIndex: PI, readFileSafe: READ, ask: async () => `{"status":"open","reason":"not wired yet"}` });
  assert.equal(r.status, "open");
});

// --- buildBasenamePathIndex ---
test("buildBasenamePathIndex: resolves a real repo file to a path", () => {
  const idx = buildBasenamePathIndex(ROOT);
  const p = idx.get("verify-misc-tasks-ollama.mjs");
  assert.ok(p && p.includes("verify-misc-tasks-ollama.mjs"), "the arm itself resolves to a path under scripts/");
});
