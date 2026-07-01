// scripts/lib/slot-context-livebrain-integration.test.mjs
//
// Integration test for the U-FLEET-P2-LIVEBRAIN-SLOTCTX wiring in
// .claude/hooks/slot-context-bundle-inject.mjs. Spawns the hook as a subprocess
// (the real UserPromptSubmit protocol: JSON envelope on stdin, JSON on stdout)
// against a throwaway local mock of the :3100 /mcp bridge, so the LIVE path is
// exercised end-to-end with NO dependency on a running PRISM server.
//
// Lives in scripts/lib/ (not under .claude/hooks/, which is a harness-exec
// hard-write zone) but drives the real hook by absolute path.
//
// Run: node --test H:/prism/scripts/lib/slot-context-livebrain-integration.test.mjs
//
// Coverage:
//   gate OFF (default)     — slot bundle present, NO "live brain" line
//   gate ON + bridge UP    — "live brain" line injected from mock vault hits
//   gate ON + bridge DOWN  — fail-soft: bundle still emitted, no line, exit 0
//   gate ON + unbound sid  — continue:true, no crash

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const HOOK = "H:/prism/.claude/hooks/slot-context-bundle-inject.mjs";
const SLOTS = "H:/prism/state/shared/chat-slots.json";

// resolveSlot() matches sessionId.startsWith(chatId without "claude-"). Find a
// real bound slot so the hook reaches the live-brain block (it only runs after a
// slot resolves AND surfaces are non-empty). If none bound, the bound-session
// assertions self-skip (env-dependent, not a logic failure).
function aBoundSessionId() {
  try {
    const d = JSON.parse(fs.readFileSync(SLOTS, "utf8"));
    for (const s of Object.values(d.slots || {})) {
      if (s && typeof s.chatId === "string" && s.chatId.startsWith("claude-")) {
        return s.chatId.replace(/^claude-/, "");
      }
    }
  } catch { /* fall through */ }
  return null;
}

function runHook(envelope, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.on("close", (code) => resolve({ code, out }));
    child.stdin.write(JSON.stringify(envelope));
    child.stdin.end();
  });
}

function parseOut(out) {
  try { return JSON.parse(out.trim()); } catch { return null; }
}

// Mock :3100 answering /mcp with a canned obsidian_search envelope.
function startMockBridge(dataArr) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        if (req.url === "/mcp") {
          const env = {
            jsonrpc: "2.0", id: "live-brain",
            result: { content: [{ type: "text", text: JSON.stringify({ success: true, result: { ok: true, data: dataArr } }) }] },
          };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(env));
        } else {
          res.writeHead(200); res.end("ok");
        }
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

test("gate OFF (default): slot bundle present, NO live-brain line", async () => {
  const sid = aBoundSessionId();
  if (!sid) { console.log("(no bound slot — skipping bound assertions)"); return; }
  const { code, out } = await runHook({ session_id: sid, prompt: "feeds and speeds" }, { PRISM_OBSIDIAN_LIVE: "0" });
  assert.equal(code, 0);
  const j = parseOut(out);
  assert.ok(j, "valid JSON output");
  assert.equal(j.continue, true);
  const ctxText = j.hookSpecificOutput?.additionalContext || "";
  assert.ok(!/live brain/i.test(ctxText), "gate off must NOT inject a live-brain line");
});

test("gate ON + bridge UP: live-brain line injected from mock vault hits", async () => {
  const sid = aBoundSessionId();
  if (!sid) { console.log("(no bound slot — skipping)"); return; }
  const { server, port } = await startMockBridge([{ filename: "knowledge/wiki/active-note.md", score: 0.88 }]);
  try {
    const { code, out } = await runHook(
      { session_id: sid, prompt: "what am I working on" },
      { PRISM_OBSIDIAN_LIVE: "1", MCP_HTTP_URL: `http://127.0.0.1:${port}/mcp` },
    );
    assert.equal(code, 0);
    const j = parseOut(out);
    assert.ok(j && j.continue === true);
    const ctxText = j.hookSpecificOutput?.additionalContext || "";
    if (ctxText) {
      assert.ok(/live brain/i.test(ctxText), "gate on + bridge up must inject a live-brain line");
      assert.ok(/active-note\.md/.test(ctxText), "the mock vault filename must surface");
    }
  } finally {
    server.close();
  }
});

test("gate ON + bridge DOWN: fail-soft, bundle still emitted, no line, exit 0", async () => {
  const sid = aBoundSessionId();
  if (!sid) { console.log("(no bound slot — skipping)"); return; }
  const { code, out } = await runHook(
    { session_id: sid, prompt: "anything" },
    { PRISM_OBSIDIAN_LIVE: "1", MCP_HTTP_URL: "http://127.0.0.1:1/mcp", PRISM_LIVE_BRAIN_TIMEOUT_MS: "800" },
  );
  assert.equal(code, 0, "must exit 0 even when the bridge is down");
  const j = parseOut(out);
  assert.ok(j && j.continue === true, "must still continue");
  const ctxText = j.hookSpecificOutput?.additionalContext || "";
  assert.ok(!/live brain/i.test(ctxText), "bridge down must NOT inject a live-brain line");
});

test("gate ON + unbound session: continue:true, no crash", async () => {
  const { code, out } = await runHook(
    { session_id: "zzz-no-such-session-zzz", prompt: "x" },
    { PRISM_OBSIDIAN_LIVE: "1" },
  );
  assert.equal(code, 0);
  const j = parseOut(out);
  assert.deepEqual(j, { continue: true });
});
