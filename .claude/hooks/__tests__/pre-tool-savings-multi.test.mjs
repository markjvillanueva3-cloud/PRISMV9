import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGrep, classifyGlob, classifyWrite, classifyBashGit, classifyBashNode, classifyRead, classifyWebSearch } from "../pre-tool-savings-multi.mjs";

// === Grep ===
test("classifyGrep: short pattern + broad path + content mode → nudge", () => {
  const r = classifyGrep({ pattern: "token", path: "", output_mode: "content" });
  assert.equal(r.nudge, true);
  assert.ok(r.msg.includes("master-index"));
});
test("classifyGrep: files_with_matches output_mode → no nudge (cheap)", () => {
  const r = classifyGrep({ pattern: "token", path: "", output_mode: "files_with_matches" });
  assert.equal(r.nudge, false);
});
test("classifyGrep: count output_mode → no nudge", () => {
  const r = classifyGrep({ pattern: "token", path: "", output_mode: "count" });
  assert.equal(r.nudge, false);
});
test("classifyGrep: specific path → no nudge", () => {
  const r = classifyGrep({ pattern: "token", path: "src/lib/auth.ts", output_mode: "content" });
  assert.equal(r.nudge, false);
});
test("classifyGrep: 3+ identifier tokens → no nudge (specific-enough)", () => {
  // 3 tokens (handleAuthRequest, validateUserSession, extractClaims) — caller knows what they want
  const r = classifyGrep({ pattern: "handleAuthRequest|validateUserSession|extractClaims", path: "", output_mode: "content" });
  assert.equal(r.nudge, false);
});
test("classifyGrep: empty pattern → no nudge", () => {
  assert.equal(classifyGrep({}).nudge, false);
});

// === U-PTSM03: grep multiline detector (head_limit detector dropped — overlapped with specific-token cases) ===
test("classifyGrep: multiline + broad path → nudge", () => {
  const r = classifyGrep({ pattern: "handleAuthRequest|validateUserSession|extractClaims", path: "", output_mode: "files_with_matches", multiline: true });
  assert.equal(r.nudge, true);
  assert.equal(r.reason, "grep-multiline-broad-path");
});
test("classifyGrep: multiline + specific path → no nudge", () => {
  const r = classifyGrep({ pattern: "handleAuthRequest|validateUserSession|extractClaims", path: "src/lib/auth.ts", output_mode: "files_with_matches", multiline: true });
  assert.equal(r.nudge, false);
});
test("classifyGrep: multiline omitted/false → no multiline nudge", () => {
  const r = classifyGrep({ pattern: "handleAuthRequest|validateUserSession|extractClaims", path: "", output_mode: "files_with_matches" });
  assert.equal(r.nudge, false);
});

// === U-PTSM04: Read tool detector — known-large-path digest routing ===
test("classifyRead: known-huge system-graph.json without window → nudge", () => {
  const r = classifyRead({ file_path: "H:/prism/state/shared/system-viz/system-graph.json" });
  assert.equal(r.nudge, true);
  assert.ok(r.reason.startsWith("read-prefer-digest"));
  assert.ok(r.msg.includes("master_index_query"));
});
test("classifyRead: PRISM-INVENTORY-LATEST.md without window → nudge", () => {
  const r = classifyRead({ file_path: "H:/prism/PRISM-INVENTORY-LATEST.md" });
  assert.equal(r.nudge, true);
  assert.ok(r.msg.includes("inventory_compact") || r.msg.includes("offset"));
});
test("classifyRead: known-huge file WITH offset+limit → no nudge", () => {
  const r = classifyRead({ file_path: "H:/prism/state/shared/system-viz/system-graph.json", offset: 0, limit: 100 });
  assert.equal(r.nudge, false);
});
test("classifyRead: known-huge file WITH limit only → no nudge", () => {
  const r = classifyRead({ file_path: "H:/prism/state/shared/AGENT_CHAT.jsonl", limit: 50 });
  assert.equal(r.nudge, false);
});
test("classifyRead: small specific file path → no nudge", () => {
  const r = classifyRead({ file_path: "H:/prism/src/lib/auth.ts" });
  assert.equal(r.nudge, false);
});
test("classifyRead: missing file_path → no nudge", () => {
  assert.equal(classifyRead({}).nudge, false);
});
test("classifyRead: Windows backslash path normalizes → still matches", () => {
  const r = classifyRead({ file_path: "H:\\prism\\state\\shared\\system-viz\\system-graph.json" });
  assert.equal(r.nudge, true);
});

// === U-PTSM05: WebSearch detector — PRISM-internal queries → master-index ===
test("classifyWebSearch: query mentions PRISM → nudge to master-index", () => {
  const r = classifyWebSearch({ query: "PRISM engine wiring patterns" });
  assert.equal(r.nudge, true);
  assert.ok(r.msg.includes("master_index_query") || r.msg.includes("wiki-query"));
});
test("classifyWebSearch: query mentions MCP dispatcher → nudge", () => {
  const r = classifyWebSearch({ query: "MCP dispatcher action best practice" });
  assert.equal(r.nudge, true);
});
test("classifyWebSearch: query mentions Kienzle (PRISM physics term) → nudge", () => {
  const r = classifyWebSearch({ query: "Kienzle force model" });
  assert.equal(r.nudge, true);
});
test("classifyWebSearch: external query (Node.js docs) → no nudge", () => {
  const r = classifyWebSearch({ query: "Node.js stream backpressure" });
  assert.equal(r.nudge, false);
});
test("classifyWebSearch: empty query → no nudge", () => {
  assert.equal(classifyWebSearch({}).nudge, false);
});

// === Glob ===
test("classifyGlob: bare **/* → nudge", () => {
  const r = classifyGlob({ pattern: "**/*" });
  assert.equal(r.nudge, true);
  assert.ok(r.msg.includes("master-index") || r.msg.includes("Tighten"));
});
test("classifyGlob: **/*.ts → nudge (overly broad single-ext)", () => {
  const r = classifyGlob({ pattern: "**/*.ts" });
  assert.equal(r.nudge, true);
});
test("classifyGlob: scoped pattern → no nudge", () => {
  const r = classifyGlob({ pattern: "src/lib/**/*.ts" });
  assert.equal(r.nudge, false);
});
test("classifyGlob: empty pattern → no nudge", () => {
  assert.equal(classifyGlob({}).nudge, false);
});

// === Write ===
test("classifyWrite: 50KB+ content → nudge", () => {
  const r = classifyWrite({ content: "x".repeat(51 * 1024) });
  assert.equal(r.nudge, true);
  assert.ok(r.msg.includes("Large Write"));
});
test("classifyWrite: small content → no nudge", () => {
  const r = classifyWrite({ content: "hello" });
  assert.equal(r.nudge, false);
});
test("classifyWrite: missing content → no nudge", () => {
  assert.equal(classifyWrite({}).nudge, false);
});

// === BashGit ===
test("classifyBashGit: 'git log' without --stat → nudge", () => {
  const r = classifyBashGit({ command: "git log" });
  assert.equal(r.nudge, true);
  assert.ok(r.msg.includes("--stat") || r.msg.includes("--oneline"));
});
test("classifyBashGit: 'git log --stat' → no nudge (already scoped)", () => {
  const r = classifyBashGit({ command: "git log --stat" });
  assert.equal(r.nudge, false);
});
test("classifyBashGit: 'rtk git diff' → still nudges (rtk doesn't substitute for --stat scope)", () => {
  const r = classifyBashGit({ command: "rtk git diff" });
  assert.equal(r.nudge, true);
});
test("classifyBashGit: 'git status' → no nudge (not one of log/diff/show/blame)", () => {
  const r = classifyBashGit({ command: "git status" });
  assert.equal(r.nudge, false);
});
test("classifyBashGit: empty command → no nudge", () => {
  assert.equal(classifyBashGit({}).nudge, false);
});

// === U-PTSM02: git commit -a / -am peer-misattribution detector ===
test("classifyBashGit: 'git commit -am msg' → nudge (peer-misattribution risk)", () => {
  const r = classifyBashGit({ command: "git commit -am 'fix'" });
  assert.equal(r.nudge, true);
  assert.ok(r.reason.includes("misattribution"));
  assert.ok(r.msg.includes("PEER-FILE MISATTRIBUTION"));
});
test("classifyBashGit: 'git commit -a' → nudge", () => {
  const r = classifyBashGit({ command: "git commit -a" });
  assert.equal(r.nudge, true);
  assert.ok(r.reason.includes("misattribution"));
});
test("classifyBashGit: 'rtk git commit -am msg' → nudge (rtk wrap still flagged)", () => {
  const r = classifyBashGit({ command: "rtk git commit -am 'fix'" });
  assert.equal(r.nudge, true);
});
test("classifyBashGit: 'git commit -m msg' (no -a) → no nudge", () => {
  const r = classifyBashGit({ command: "git commit -m 'fix'" });
  assert.equal(r.nudge, false);
});

// === U-PTSM02: git push --force without --dry-run detector ===
test("classifyBashGit: 'git push --force' (no dry-run) → nudge", () => {
  const r = classifyBashGit({ command: "git push --force origin main" });
  assert.equal(r.nudge, true);
  assert.ok(r.reason.includes("force-push"));
});
test("classifyBashGit: 'git push --force-with-lease' (no dry-run) → nudge", () => {
  const r = classifyBashGit({ command: "git push --force-with-lease origin main" });
  assert.equal(r.nudge, true);
});
test("classifyBashGit: 'git push --force --dry-run' → no nudge (dry-run present)", () => {
  const r = classifyBashGit({ command: "git push --force --dry-run origin main" });
  assert.equal(r.nudge, false);
});
test("classifyBashGit: 'git push origin main' (no force) → no nudge", () => {
  const r = classifyBashGit({ command: "git push origin main" });
  assert.equal(r.nudge, false);
});

// === U-PTSM06: BashNode detector — top RTK miss (~9.6k tokens/session) ===
test("classifyBashNode: 'node script.mjs' → nudge", () => {
  const r = classifyBashNode({ command: "node script.mjs" });
  assert.equal(r.nudge, true);
  assert.ok(r.reason.includes("node-no-rtk-wrap"));
  assert.ok(r.msg.includes("rtk node") || r.msg.includes("command node"));
});
test("classifyBashNode: 'rtk node script.mjs' → no nudge (already wrapped)", () => {
  const r = classifyBashNode({ command: "rtk node script.mjs" });
  assert.equal(r.nudge, false);
});
test("classifyBashNode: 'command node script.mjs' → no nudge (already wrapped)", () => {
  const r = classifyBashNode({ command: "command node script.mjs" });
  assert.equal(r.nudge, false);
});
test("classifyBashNode: 'node --version' → no nudge (cheap version probe)", () => {
  const r = classifyBashNode({ command: "node --version" });
  assert.equal(r.nudge, false);
});
test("classifyBashNode: 'node -v' → no nudge (cheap version probe)", () => {
  const r = classifyBashNode({ command: "node -v" });
  assert.equal(r.nudge, false);
});
test("classifyBashNode: 'git status' → no nudge (not a node command)", () => {
  const r = classifyBashNode({ command: "git status" });
  assert.equal(r.nudge, false);
});
test("classifyBashNode: 'node.exe script.mjs' → nudge (windows binary)", () => {
  const r = classifyBashNode({ command: "node.exe script.mjs" });
  assert.equal(r.nudge, true);
  assert.ok(r.reason.includes("node-no-rtk-wrap"));
});
test("classifyBashNode: empty/non-string command → no nudge", () => {
  assert.equal(classifyBashNode({}).nudge, false);
  assert.equal(classifyBashNode({ command: null }).nudge, false);
  assert.equal(classifyBashNode({ command: 42 }).nudge, false);
});
test("classifyBashNode: 'nodemon script.mjs' → no nudge (not a 'node ' invocation)", () => {
  const r = classifyBashNode({ command: "nodemon script.mjs" });
  assert.equal(r.nudge, false);
});
