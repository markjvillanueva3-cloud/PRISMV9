// scripts/measure-subagent-injection.test.mjs
// Tests for the per-subagent (Task/Agent-spawn) injection ceiling instrument.
// Run directly: `node scripts/measure-subagent-injection.test.mjs` (node:test auto-runs on exit).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSpawnMatcher,
  emitsAdditionalContext,
  enumerateSpawnInjectors,
  buildSpawnPayload,
  parseAdditionalContextBytes,
  summarizeSpawnInjection,
  SUBAGENT_BUDGET_BYTES,
} from "./measure-subagent-injection.mjs";

// --- isSpawnMatcher: only EXPLICIT Task/Agent/Workflow matchers count ---
test("isSpawnMatcher: explicit Task/Agent matchers are spawn matchers", () => {
  assert.equal(isSpawnMatcher("^Task$"), true);
  assert.equal(isSpawnMatcher("Agent"), true);
  assert.equal(isSpawnMatcher("Bash|Agent|Task|Workflow"), true);
  assert.equal(isSpawnMatcher("Workflow"), true);
});
test("isSpawnMatcher: catch-all + unrelated matchers are NOT spawn matchers (safety: never probe .* janitors)", () => {
  assert.equal(isSpawnMatcher(".*"), false);
  assert.equal(isSpawnMatcher("*"), false);
  assert.equal(isSpawnMatcher(""), false);
  assert.equal(isSpawnMatcher("Edit|Write"), false);
  assert.equal(isSpawnMatcher("^mcp__prism.*"), false);
  assert.equal(isSpawnMatcher(null), false);
  assert.equal(isSpawnMatcher(undefined), false);
});

// --- emitsAdditionalContext ---
test("emitsAdditionalContext: true only when source writes additionalContext", () => {
  assert.equal(emitsAdditionalContext('out({ hookSpecificOutput: { additionalContext: x } })'), true);
  assert.equal(emitsAdditionalContext('return { continue: true }'), false);
  assert.equal(emitsAdditionalContext('emit systemMessage only'), false);
  assert.equal(emitsAdditionalContext(null), false);
  assert.equal(emitsAdditionalContext(123), false);
});

// --- enumerateSpawnInjectors: matcher-filtered, context-gated, deduped ---
test("enumerateSpawnInjectors: keeps spawn-matched context-emitters, drops .* and non-emitters", () => {
  const settings = {
    hooks: {
      PreToolUse: [
        { matcher: "^Task$", hooks: [{ command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/agent-rules-inject.mjs"' }] },
        { matcher: "Agent", hooks: [{ command: 'node .claude/hooks/ai-system-router-inject.mjs' }] },
        // .* catch-all hosting a destructive guard -> MUST be excluded
        { matcher: ".*", hooks: [{ command: 'node .claude/hooks/node-process-janitor.mjs' }] },
        // spawn-matched but a pure gate (no additionalContext) -> excluded
        { matcher: "^Task$", hooks: [{ command: 'node .claude/hooks/subagent-model-enforce.mjs' }] },
        // unrelated tool matcher -> excluded
        { matcher: "Edit|Write", hooks: [{ command: 'node .claude/hooks/file-claim-guard.mjs' }] },
      ],
    },
  };
  const sources = {
    "agent-rules-inject": 'console.log(JSON.stringify({ hookSpecificOutput: { additionalContext: rules } }))',
    "ai-system-router-inject": 'emit({ additionalContext: hint })',
    "node-process-janitor": 'killOrphans()', // no additionalContext anyway, but matcher already excludes it
    "subagent-model-enforce": 'return deny()', // fixture: a non-emitting gate -> excluded by the context filter. (NB: the LIVE hook emits additionalContext in warn-mode, so it IS probed in production -- benign/read-only; this fixture only exercises the exclusion path.)
    "file-claim-guard": 'additionalContext here too', // emits, but Edit|Write matcher excludes it
  };
  const readSource = (p) => {
    const key = p.split(/[\\/]/).pop().replace(/\.mjs$/, "");
    return sources[key] ?? null;
  };
  const got = enumerateSpawnInjectors(settings, readSource).map((r) => r.key);
  assert.deepEqual(got.sort(), ["agent-rules-inject", "ai-system-router-inject"]);
});
test("enumerateSpawnInjectors: unreadable source is INCLUDED (fail-loud -- can't prove it emits nothing)", () => {
  const settings = { hooks: { PreToolUse: [{ matcher: "^Task$", hooks: [{ command: 'node .claude/hooks/mystery.mjs' }] }] } };
  const rows = enumerateSpawnInjectors(settings, () => null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, "mystery");
  assert.equal(rows[0].sourceMissing, true);
});
test("enumerateSpawnInjectors: dedups a hook reachable under two spawn matchers", () => {
  const settings = {
    hooks: {
      PreToolUse: [
        { matcher: "^Task$", hooks: [{ command: 'node .claude/hooks/subagent-model-enforce.mjs' }] },
        { matcher: "Agent", hooks: [{ command: 'node .claude/hooks/subagent-model-enforce.mjs' }] },
      ],
    },
  };
  const rows = enumerateSpawnInjectors(settings, () => 'additionalContext x');
  assert.equal(rows.length, 1);
});

// --- buildSpawnPayload ---
test("buildSpawnPayload: real Task/Agent tool_input shape; session_id only when provided", () => {
  const p = buildSpawnPayload({ toolName: "Task", subagentType: "reviewer", description: "d", prompt: "P" });
  assert.equal(p.tool_name, "Task");
  assert.equal(p.toolName, "Task");
  assert.equal(p.tool_input.subagent_type, "reviewer");
  assert.equal(p.tool_input.description, "d");
  assert.equal(p.tool_input.prompt, "P");
  assert.equal("session_id" in p, false);
  const p2 = buildSpawnPayload({ toolName: "Agent", sessionId: "s1" });
  assert.equal(p2.session_id, "s1");
});

// --- parseAdditionalContextBytes: counts additionalContext ONLY, never systemMessage ---
test("parseAdditionalContextBytes: counts additionalContext utf8 bytes", () => {
  const r = parseAdditionalContextBytes(JSON.stringify({ hookSpecificOutput: { additionalContext: "hello" } }));
  assert.equal(r.ok, true);
  assert.equal(r.bytes, 5);
});
test("parseAdditionalContextBytes: systemMessage is NOT counted (subagent-invisible)", () => {
  const r = parseAdditionalContextBytes(JSON.stringify({ continue: false, systemMessage: "blocked: bad model tier xxxxxxxxxx" }));
  assert.equal(r.ok, true);
  assert.equal(r.bytes, 0);
});
test("parseAdditionalContextBytes: continue-only -> 0; invalid JSON -> ok:false", () => {
  assert.equal(parseAdditionalContextBytes(JSON.stringify({ continue: true })).bytes, 0);
  const bad = parseAdditionalContextBytes("not json{");
  assert.equal(bad.ok, false);
  assert.equal(bad.bytes, 0);
});
test("parseAdditionalContextBytes: multibyte counted by utf8 bytes not chars", () => {
  // "✓" (check mark) is 3 utf8 bytes -> proves byte-count, not char-count
  const r = parseAdditionalContextBytes(JSON.stringify({ hookSpecificOutput: { additionalContext: "✓" } }));
  assert.equal(r.bytes, 3);
});

// --- summarizeSpawnInjection ---
test("summarizeSpawnInjection: ceiling = sum of per-injector max; overCap flag", () => {
  const rows = [
    { key: "a", matcher: "^Task$", byTool: { Task: 3500, Agent: 0 }, maxBytes: 3500, ok: true },
    { key: "b", matcher: "Agent", byTool: { Task: 0, Agent: 1200 }, maxBytes: 1200, ok: true },
    { key: "c", matcher: "Agent", byTool: { Task: 0, Agent: 0 }, maxBytes: 0, ok: true },
  ];
  const s = summarizeSpawnInjection(rows, { capBytes: SUBAGENT_BUDGET_BYTES });
  assert.equal(s.ceilingBytes, 4700);
  assert.equal(s.overCap, false); // 4700 < 8192
  assert.equal(s.emittingCount, 2);
  assert.equal(s.top[0].key, "a"); // sorted desc
});
test("summarizeSpawnInjection: overCap true when ceiling exceeds cap", () => {
  const rows = [{ key: "huge", matcher: "^Task$", byTool: { Task: 9000, Agent: 9000 }, maxBytes: 9000, ok: true }];
  const s = summarizeSpawnInjection(rows, { capBytes: 8192 });
  assert.equal(s.overCap, true);
  assert.equal(s.overByBytes, 808);
});
test("summarizeSpawnInjection: name-gated injector flagged (Task<->Agent rename signal)", () => {
  const rows = [
    { key: "task-only", matcher: "^Task$", byTool: { Task: 3500, Agent: 0 }, maxBytes: 3500, ok: true }, // gated
    { key: "both", matcher: "Agent", byTool: { Task: 800, Agent: 800 }, maxBytes: 800, ok: true }, // not gated
  ];
  const s = summarizeSpawnInjection(rows, {});
  assert.equal(s.nameGated.length, 1);
  assert.equal(s.nameGated[0].key, "task-only");
});
test("summarizeSpawnInjection: failed probes counted, not summed", () => {
  const rows = [
    { key: "ok1", matcher: "Agent", byTool: { Task: 100, Agent: 100 }, maxBytes: 100, ok: true },
    { key: "fail1", matcher: "^Task$", byTool: {}, maxBytes: null, ok: false },
  ];
  const s = summarizeSpawnInjection(rows, {});
  assert.equal(s.failedCount, 1);
  assert.equal(s.ceilingBytes, 100);
});
