import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commandToCandidateId,
  buildNudge,
  decideRoute,
  RTK_WRAPPABLE_BIN,
} from "../pre-tool-router-table-advise.mjs";

// ─────────────────────────────────────────────────────────────────────
// 1. commandToCandidateId — returns correct ID for each tool_name
// ─────────────────────────────────────────────────────────────────────
test("commandToCandidateId: Bash git log → rtk.git", () => {
  const id = commandToCandidateId("Bash", { command: "git log --oneline -5" });
  assert.equal(id, "rtk.git");
});

test("commandToCandidateId: Bash node script.mjs → rtk.node", () => {
  const id = commandToCandidateId("Bash", { command: "node H:/prism/scripts/foo.mjs" });
  assert.equal(id, "rtk.node");
});

test("commandToCandidateId: Bash gh pr view → rtk.gh", () => {
  const id = commandToCandidateId("Bash", { command: "gh pr view 42" });
  assert.equal(id, "rtk.gh");
});

test("commandToCandidateId: Bash vitest run → rtk.vitest", () => {
  const id = commandToCandidateId("Bash", { command: "vitest run src/foo.test.ts" });
  assert.equal(id, "rtk.vitest");
});

test("commandToCandidateId: Read on system-graph.json → route.read-digest", () => {
  const id = commandToCandidateId("Read", {
    file_path: "H:/prism/state/shared/system-viz/system-graph.json",
  });
  assert.equal(id, "route.read-digest");
});

test("commandToCandidateId: Read on ENGINE_DIGEST.md (windows path sep) → route.read-digest", () => {
  const id = commandToCandidateId("Read", {
    file_path: "H:\\prism\\mcp-server\\data\\docs\\ENGINE_DIGEST.md",
  });
  assert.equal(id, "route.read-digest");
});

test("commandToCandidateId: WebSearch with PRISM keyword → route.master-index", () => {
  const id = commandToCandidateId("WebSearch", {
    query: "where is PRISM duplicationGuard located",
  });
  assert.equal(id, "route.master-index");
});

test("commandToCandidateId: Grep short broad pattern → route.master-index", () => {
  const id = commandToCandidateId("Grep", {
    pattern: "router",
    path: "",
    output_mode: "content",
  });
  assert.equal(id, "route.master-index");
});

// ─────────────────────────────────────────────────────────────────────
// 2. Negative cases — null return when no plausible candidate
// ─────────────────────────────────────────────────────────────────────
test("commandToCandidateId: already-wrapped (rtk git) → null (no double-nudge)", () => {
  const id = commandToCandidateId("Bash", { command: "rtk git log" });
  assert.equal(id, null);
});

test("commandToCandidateId: already-wrapped (command node) → null", () => {
  const id = commandToCandidateId("Bash", { command: "command node script.mjs" });
  assert.equal(id, null);
});

test("commandToCandidateId: unknown Bash binary (random-bin) → null", () => {
  const id = commandToCandidateId("Bash", { command: "random-bin --help" });
  assert.equal(id, null);
});

test("commandToCandidateId: Read on unknown file → null", () => {
  const id = commandToCandidateId("Read", { file_path: "H:/prism/src/foo.ts" });
  assert.equal(id, null);
});

test("commandToCandidateId: Read with offset/limit window → null (windowed reads are fine)", () => {
  const id = commandToCandidateId("Read", {
    file_path: "H:/prism/state/shared/system-viz/system-graph.json",
    offset: 0,
    limit: 100,
  });
  assert.equal(id, null);
});

test("commandToCandidateId: WebSearch with external query → null", () => {
  const id = commandToCandidateId("WebSearch", {
    query: "Anthropic Claude API rate limits",
  });
  assert.equal(id, null);
});

test("commandToCandidateId: Grep with specific path → null", () => {
  const id = commandToCandidateId("Grep", {
    pattern: "token",
    path: "src/lib/auth.ts",
    output_mode: "content",
  });
  assert.equal(id, null);
});

test("commandToCandidateId: unknown tool_name → null", () => {
  const id = commandToCandidateId("TaskCreate", { subject: "x", description: "y" });
  assert.equal(id, null);
});

// ─────────────────────────────────────────────────────────────────────
// 3. Fail-soft on malformed input
// ─────────────────────────────────────────────────────────────────────
test("commandToCandidateId: null tool_name → null (no throw)", () => {
  assert.equal(commandToCandidateId(null, {}), null);
});

test("commandToCandidateId: null tool_input → null (no throw)", () => {
  assert.equal(commandToCandidateId("Bash", null), null);
});

test("commandToCandidateId: empty tool_input → null", () => {
  assert.equal(commandToCandidateId("Bash", {}), null);
});

test("commandToCandidateId: Bash with non-string command → null", () => {
  assert.equal(commandToCandidateId("Bash", { command: 42 }), null);
});

test("commandToCandidateId: RTK_WRAPPABLE_BIN exports a non-empty array", () => {
  assert.ok(Array.isArray(RTK_WRAPPABLE_BIN));
  assert.ok(RTK_WRAPPABLE_BIN.length >= 10);
  assert.ok(RTK_WRAPPABLE_BIN.includes("git"));
  assert.ok(RTK_WRAPPABLE_BIN.includes("node"));
});

// ─────────────────────────────────────────────────────────────────────
// 4. buildNudge — formats a route into a 1-line advisory
// ─────────────────────────────────────────────────────────────────────
test("buildNudge: rtk-wrap route renders with replacement command", () => {
  const msg = buildNudge(
    { id: "rtk.git", kind: "rtk-wrap", replacement: "rtk git log", savingsPct: 70 },
    "rtk.git",
  );
  assert.ok(msg.includes("rtk git log"));
  assert.ok(msg.includes("RTK wrap"));
  assert.ok(msg.includes("70%"));
});

test("buildNudge: mcp-route kind labelled correctly", () => {
  const msg = buildNudge(
    { kind: "mcp-route", replacement: "prism_session:master_index_query" },
    "route.master-index",
  );
  assert.ok(msg.includes("MCP dispatcher route"));
  assert.ok(msg.includes("prism_session:master_index_query"));
});

test("buildNudge: ollama-offload kind labelled correctly", () => {
  const msg = buildNudge(
    { kind: "ollama-offload", replacement: "/route-to-obsidian", reason: "huge wiki entry" },
    "route.ollama",
  );
  assert.ok(msg.includes("Ollama"));
  assert.ok(msg.includes("huge wiki entry"));
});

test("buildNudge: skill kind labelled correctly", () => {
  const msg = buildNudge(
    { kind: "skill", replacement: "/master-index router" },
    "route.master-index",
  );
  assert.ok(msg.includes("skill"));
  assert.ok(msg.includes("/master-index"));
});

test("buildNudge: missing replacement falls back to candidateId", () => {
  const msg = buildNudge({ kind: "rtk-wrap" }, "rtk.git");
  assert.ok(msg.includes("rtk.git"));
});

test("buildNudge: null route → empty string (no throw)", () => {
  assert.equal(buildNudge(null, "x"), "");
});

// ─────────────────────────────────────────────────────────────────────
// 5. decideRoute — emits nudge when route exists, passes when no route
// ─────────────────────────────────────────────────────────────────────
const mkLib = (routes) => ({
  lookupRoute: (id) => routes[id] || null,
});

test("decideRoute: emits nudge when actionable rtk-wrap route exists", () => {
  const lib = mkLib({
    "rtk.git": { id: "rtk.git", kind: "rtk-wrap", replacement: "rtk git log", savingsPct: 70 },
  });
  const d = decideRoute("Bash", { command: "git log -5" }, lib);
  assert.equal(d.nudge, true);
  assert.equal(d.reason, "route-found:rtk-wrap");
  assert.ok(d.msg.includes("rtk git log"));
  assert.equal(d.candidateId, "rtk.git");
});

test("decideRoute: emits nudge for mcp-route kind", () => {
  const lib = mkLib({
    "route.master-index": {
      kind: "mcp-route",
      replacement: "prism_session:master_index_query",
    },
  });
  const d = decideRoute("WebSearch", { query: "PRISM dispatcher count" }, lib);
  assert.equal(d.nudge, true);
  assert.ok(d.msg.includes("master_index_query"));
});

test("decideRoute: passes (no nudge) when route exists but kind is non-actionable advisory", () => {
  const lib = mkLib({
    "rtk.git": { kind: "advise-only", note: "experimental" },
  });
  const d = decideRoute("Bash", { command: "git log" }, lib);
  assert.equal(d.nudge, false);
  assert.ok(d.reason.startsWith("non-actionable-kind"));
});

test("decideRoute: passes when no route found for candidate ID", () => {
  const lib = mkLib({});
  const d = decideRoute("Bash", { command: "git log" }, lib);
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "no-route-for-candidate");
});

test("decideRoute: passes when no candidate ID derivable", () => {
  const lib = mkLib({ "rtk.git": { kind: "rtk-wrap", replacement: "rtk git" } });
  const d = decideRoute("Bash", { command: "rtk git log" }, lib); // already wrapped
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "no-candidate-id");
});

test("decideRoute: passes when routerLib is null (graceful when Agent 2 lib missing)", () => {
  const d = decideRoute("Bash", { command: "git log" }, null);
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "router-lib-unavailable");
});

test("decideRoute: passes when routerLib has no lookupRoute fn", () => {
  const d = decideRoute("Bash", { command: "git log" }, { foo: "bar" });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "router-lib-unavailable");
});

test("decideRoute: fail-soft when lookupRoute throws", () => {
  const lib = { lookupRoute: () => { throw new Error("boom"); } };
  const d = decideRoute("Bash", { command: "git log" }, lib);
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "lookup-threw");
  assert.equal(d.candidateId, "rtk.git");
});

test("decideRoute: tolerates malformed route (non-object) — no throw", () => {
  const lib = { lookupRoute: () => "not-an-object" };
  const d = decideRoute("Bash", { command: "git log" }, lib);
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "no-route-for-candidate");
});

test("decideRoute: tolerates route with missing kind → non-actionable", () => {
  const lib = mkLib({ "rtk.git": { replacement: "rtk git" } });
  const d = decideRoute("Bash", { command: "git log" }, lib);
  assert.equal(d.nudge, false);
  assert.ok(d.reason.startsWith("non-actionable-kind"));
});
