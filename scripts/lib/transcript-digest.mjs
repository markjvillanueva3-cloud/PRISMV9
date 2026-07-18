#!/usr/bin/env node
// transcript-digest.mjs — compact, bounded digest of a Claude Code session
// transcript (.jsonl) for cheap re-reading of RAW session history.
//
// A raw transcript is mostly tool_result bulk (a 122MB file ≈ tens of millions
// of tokens). This streams the file line-by-line (bounded memory — never loads
// the whole file as one string, dodging V8's 512MiB string cap) and emits ONLY
// the conversation spine: human turns, assistant text/thinking, and tool_use
// names+1-line args. tool_result bodies (the bulk) are dropped. Output is hard-
// capped (default 120KB) head+tail so even the largest session fits a reader's
// context window.
//
// CLI: node scripts/lib/transcript-digest.mjs <path.jsonl> [--budget BYTES]
//      [--text N] [--think N] [--tool N] [--full]
//   --budget  total output byte cap (default 120000). --full disables the cap.
//   --text/--think/--tool  per-field char truncation (default 700/180/140).
//
// R12: fails loud if the file is missing/unreadable; reports parse-error count.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createInterface } from "node:readline";

function parseArgs(argv) {
  const a = { path: null, budget: 120000, text: 700, think: 180, tool: 140, full: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--budget") a.budget = parseInt(argv[++i], 10);
    else if (t === "--text") a.text = parseInt(argv[++i], 10);
    else if (t === "--think") a.think = parseInt(argv[++i], 10);
    else if (t === "--tool") a.tool = parseInt(argv[++i], 10);
    else if (t === "--full") a.full = true;
    else if (!t.startsWith("--") && !a.path) a.path = t;
  }
  return a;
}

const oneLine = (s, n) =>
  String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

function compactToolInput(input, n) {
  if (input == null) return "";
  try {
    if (typeof input === "string") return oneLine(input, n);
    // surface the most identifying fields without dumping a whole payload
    const keys = ["command", "description", "file_path", "pattern", "query", "prompt", "subagent_type", "url", "action"];
    const picked = [];
    for (const k of keys) if (input[k] != null) picked.push(`${k}=${oneLine(input[k], 60)}`);
    if (picked.length) return oneLine(picked.join(" "), n);
    return oneLine(JSON.stringify(input), n);
  } catch {
    return "";
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.path) {
    console.error("usage: transcript-digest.mjs <path.jsonl> [--budget N] [--full]");
    process.exit(2);
  }
  if (!existsSync(args.path)) {
    console.error(`FATAL: transcript not found: ${args.path}`); // R12 fail-loud
    process.exit(1);
  }
  const sizeMB = (statSync(args.path).size / 1048576).toFixed(1);

  const out = [];
  let total = 0, msgs = 0, parseErr = 0, idx = 0;
  let tsMin = null, tsMax = null;
  const push = (line) => { out.push(line); total += line.length + 1; };

  const rl = createInterface({ input: createReadStream(args.path, "utf8"), crlfDelay: Infinity });

  rl.on("line", (raw) => {
    if (!raw.trim()) return;
    let o;
    try { o = JSON.parse(raw); } catch { parseErr++; return; }
    if (o.timestamp) { if (!tsMin || o.timestamp < tsMin) tsMin = o.timestamp; if (!tsMax || o.timestamp > tsMax) tsMax = o.timestamp; }
    if ((o.type !== "user" && o.type !== "assistant") || !o.message) return;
    idx++;
    const role = o.type;
    const c = o.message.content;

    if (role === "user") {
      let txt = "";
      if (typeof c === "string") txt = c;
      else if (Array.isArray(c)) {
        // keep text blocks; drop tool_result bodies (the bulk)
        txt = c.filter((b) => b.type === "text").map((b) => b.text || "").join(" ");
        if (!txt && c.some((b) => b.type === "tool_result")) return; // pure tool_result turn → skip
      }
      // drop injected machinery / hook noise — keep genuine prompts + which slash cmd ran
      const t = txt.trimStart();
      if (t.startsWith("<system-reminder") || t.startsWith("<local-command-caveat") || t.startsWith("<local-command-stdout")) return;
      const cmd = txt.match(/<command-name>([^<]+)<\/command-name>/);
      if (cmd) { msgs++; push(`#${idx} [USER /cmd] ${oneLine(cmd[1], 60)}`); return; }
      if (txt.startsWith("<command-")) return;
      if (!t) return;
      msgs++; push(`#${idx} [USER] ${oneLine(txt, args.text)}`);
      return;
    }

    // assistant
    if (Array.isArray(c)) {
      for (const b of c) {
        if (b.type === "text" && b.text?.trim()) { msgs++; push(`#${idx} [A] ${oneLine(b.text, args.text)}`); }
        else if (b.type === "thinking" && b.thinking?.trim()) { push(`#${idx} (think) ${oneLine(b.thinking, args.think)}`); }
        else if (b.type === "tool_use") { push(`#${idx}   → ${b.name}: ${compactToolInput(b.input, args.tool)}`); }
      }
    } else if (typeof c === "string" && c.trim()) {
      msgs++; push(`#${idx} [A] ${oneLine(c, args.text)}`);
    }
  });

  rl.on("close", () => {
    let body;
    if (args.full || total <= args.budget) {
      body = out.join("\n");
    } else {
      // keep head 60% + tail 40% within budget so the session's conclusion survives
      const headBudget = Math.floor(args.budget * 0.6);
      const tailBudget = args.budget - headBudget;
      const head = [], tail = [];
      let hb = 0; for (const l of out) { if (hb + l.length > headBudget) break; head.push(l); hb += l.length + 1; }
      let tb = 0; for (let i = out.length - 1; i >= 0; i--) { const l = out[i]; if (tb + l.length > tailBudget) break; tail.unshift(l); tb += l.length + 1; }
      const elided = out.length - head.length - tail.length;
      body = head.join("\n") + `\n\n... [${elided} middle messages elided — head+tail kept within ${args.budget}B budget] ...\n\n` + tail.join("\n");
    }
    const header = [
      `### TRANSCRIPT DIGEST: ${args.path}`,
      `size=${sizeMB}MB  spine_messages=${msgs}  emitted_lines=${out.length}  parse_errors=${parseErr}`,
      `time_range: ${tsMin || "?"} → ${tsMax || "?"}`,
      args.full || total <= args.budget ? `(full spine — ${total}B)` : `(capped at ${args.budget}B of ${total}B spine)`,
      "",
    ].join("\n");
    process.stdout.write(header + body + "\n");
  });

  rl.on("error", (e) => { console.error(`FATAL read error: ${e.message}`); process.exit(1); });
}

main();
