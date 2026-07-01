#!/usr/bin/env node
// Test every SessionStart hook with a minimal payload and report failures.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const settings = JSON.parse(readFileSync("H:/.claude/settings.json", "utf8"));
const starts = settings.hooks?.SessionStart?.[0]?.hooks ?? [];
const prompts = settings.hooks?.UserPromptSubmit?.[0]?.hooks ?? [];
const NODE = "H:/Tools/nodejs/node.exe";

const payloads = {
  SessionStart: { hook_event_name: "SessionStart", session_id: "test-session-00000000", source: "startup", cwd: "H:/prism-session-efficiency", transcript_path: "" },
  UserPromptSubmit: { hook_event_name: "UserPromptSubmit", session_id: "test-session-00000000", prompt: "test", cwd: "H:/prism-session-efficiency", transcript_path: "" },
};

function parseCmd(cmd) {
  // Extract env prefix (KEY=VAL) and path to script
  const envMatch = cmd.match(/^(?:([A-Z_]+=\S+)\s+)*/);
  const env = {};
  const envPrefix = envMatch ? envMatch[0] : "";
  envPrefix.split(/\s+/).filter(Boolean).forEach(kv => { const [k,v] = kv.split("="); if (k) env[k]=v; });
  const rest = cmd.slice(envPrefix.length);
  const m = rest.match(/"[^"]+"\s+(\S+(?:\s+[^"]*?)?)$/);
  const script = m ? m[1].trim() : rest.trim().split(/\s+/).slice(1).join(" ");
  return { env, script };
}

function runHook(hook, payload, eventName) {
  const { env, script } = parseCmd(hook.command);
  // Flags can appear after script path
  const parts = script.split(/\s+/);
  const scriptPath = parts[0];
  const scriptArgs = parts.slice(1);
  const start = Date.now();
  const res = spawnSync(NODE, [scriptPath, ...scriptArgs], { windowsHide: true,
    input: JSON.stringify(payload),
    timeout: hook.timeout || 5000,
    env: { ...process.env, ...env, HOOK_EVENT: env.HOOK_EVENT || eventName },
    encoding: "utf8",
  });
  return { ms: Date.now() - start, code: res.status, signal: res.signal, stderr: (res.stderr||"").slice(0, 800), stdout_len: (res.stdout||"").length, stdout_preview: (res.stdout||"").slice(0, 200) };
}

const results = [];
for (const h of starts) {
  const name = h.command.split("/").pop().replace(/["\s].*$/, "");
  const r = runHook(h, payloads.SessionStart, "SessionStart");
  if (r.code !== 0 || r.signal) results.push({ event: "SessionStart", name, ...r });
}
for (const h of prompts) {
  const name = h.command.split("/").pop().replace(/["\s].*$/, "");
  const r = runHook(h, payloads.UserPromptSubmit, "UserPromptSubmit");
  if (r.code !== 0 || r.signal) results.push({ event: "UserPromptSubmit", name, ...r });
}

if (results.length === 0) {
  console.log("All SessionStart + UserPromptSubmit hooks exit 0.");
} else {
  console.log(`Failing hooks: ${results.length}`);
  for (const r of results) {
    console.log(`\n[${r.event}] ${r.name} — exit=${r.code} signal=${r.signal||"-"} ms=${r.ms}`);
    if (r.stderr) console.log("  stderr:", r.stderr.replace(/\n/g, "\\n").slice(0, 400));
  }
}
