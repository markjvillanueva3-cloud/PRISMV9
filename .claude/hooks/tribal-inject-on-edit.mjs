#!/usr/bin/env node
// tier: T1
/**
 * tribal-inject-on-edit.mjs — L4 of TRIBAL × AI
 *
 * PreToolUse hook. When the assistant is about to edit a file under
 * src/engines/, src/tools/dispatchers/, src/algorithms/,
 * .claude/scripts/, or .claude/hooks/, query L2 (tribal-rerank) with
 * the file basename + first 200 chars of the file's current content,
 * and surface the top-3 tribal entries as `additionalContext`.
 *
 * Hard caps:
 *   - 200-token output cap (≈800 chars). Truncates titles and snippets.
 *   - 4-second wall-clock budget (Ollama embed + cosine + io). On
 *     timeout the hook silently returns {continue:true} — never blocks.
 *   - On any error returns {continue:true} — this is a learning hook,
 *     not a safety hook.
 *
 * Configuration (env):
 *   PRISM_TRIBAL_INJECT=0      disable entirely
 *   PRISM_TRIBAL_INJECT_K=3    number of hits to surface (default 3)
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const L2 = `${PRISM}/.claude/scripts/tribal-rerank.mjs`;
const TARGET_RX = /[\\/](?:src[\\/](?:engines|tools[\\/]dispatchers|algorithms)|\.claude[\\/](?:scripts|hooks))[\\/]/i;
const MAX_CHARS = 800; // ≈200 tokens
const QUERY_BODY_CHARS = 200;
const TIMEOUT_MS = 4000;

function passthrough() {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

if (process.env.PRISM_TRIBAL_INJECT === "0") passthrough();

let payload = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => { payload += c; });
process.stdin.on("end", () => {
  let parsed;
  try { parsed = JSON.parse(payload); } catch { return passthrough(); }

  const tool = parsed.tool_name || parsed.toolName || "";
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) return passthrough();

  const fp = parsed.tool_input?.file_path
          || parsed.tool_input?.filePath
          || parsed.tool_input?.path
          || "";
  if (!fp) return passthrough();
  const norm = fp.replace(/\\/g, "/");
  if (!TARGET_RX.test(norm)) return passthrough();

  // Build query: basename + first N chars of current file (if exists)
  const base = path.basename(fp).replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  let body = "";
  try {
    if (fs.existsSync(fp) && fs.statSync(fp).size < 200_000) {
      body = fs.readFileSync(fp, "utf8")
        .replace(/\s+/g, " ")
        .slice(0, QUERY_BODY_CHARS);
    }
  } catch { /* ignore */ }
  const query = `${base} ${body}`.slice(0, 400);
  if (query.length < 8) return passthrough();

  // Domain inference from path
  let domain = null;
  if (/wedm|edm/i.test(norm)) domain = "wedm";
  else if (/lathe|turning/i.test(norm)) domain = "lathe";
  else if (/mill/i.test(norm)) domain = "mill";
  else if (/cad/i.test(norm)) domain = "cad";
  else if (/cam/i.test(norm)) domain = "cam";

  const k = Number(process.env.PRISM_TRIBAL_INJECT_K) || 3;
  const args = [L2, "--query", query, "--k", String(k), "--json", "--caller", "inject-on-edit"];
  if (domain) args.push("--domain", domain);

  const r = spawnSync(process.execPath, args, {
    encoding: "utf8", timeout: TIMEOUT_MS,
  });
  if (r.status !== 0 || !r.stdout) return passthrough();

  let result;
  try { result = JSON.parse(r.stdout); } catch { return passthrough(); }
  if (!result?.ok || !Array.isArray(result.hits) || result.hits.length === 0) {
    return passthrough();
  }

  // Build compact additionalContext under MAX_CHARS budget
  const lines = [`Tribal hits for ${path.basename(fp)}${domain ? ` [${domain}]` : ""}:`];
  let used = lines[0].length + 1;
  for (const h of result.hits) {
    const title = (h.title || h.id).slice(0, 80);
    const snippet = (h.snippet || "").replace(/\s+/g, " ").slice(0, 100);
    const line = `• [${h.score.toFixed(3)} ${h.domain}] ${title} — ${snippet}`;
    if (used + line.length + 1 > MAX_CHARS) break;
    lines.push(line);
    used += line.length + 1;
  }
  if (lines.length === 1) return passthrough();

  process.stdout.write(JSON.stringify({
    continue: true,
    additionalContext: lines.join("\n"),
  }));
});
