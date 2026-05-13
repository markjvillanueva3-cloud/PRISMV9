#!/usr/bin/env node
// tier: T3
/**
 * npm-output-condenser.mjs — PostToolUse Bash hook.
 *
 * Detects npm command output and emits a CONDENSED summary as
 * additionalContext. npm install/audit/run produce a lot of progress
 * noise that doesn't help Claude reason about what happened.
 *
 * Detection: Bash command starts with `npm ` (after optional `rtk `).
 *
 * Per-subcommand condensing:
 *   npm install/i/ci   → packages added/removed/changed counts + audit summary
 *   npm audit          → vulnerability summary by severity
 *   npm run            → if WARN/ERR present, surface them; else success line
 *   npm test           → defer to vitest condenser (no inject here)
 *   default            → line count + first/last 3 lines
 *
 * Surfaces ALL npm WARN and npm ERR! lines verbatim regardless of
 * subcommand — those are actionable.
 *
 * No-op cases (pass-through):
 *   - Not a Bash tool
 *   - Not an npm command
 *   - Output already small (< 600 chars)
 *
 * @hook PostToolUse:Bash
 */

import * as fs from "node:fs";

const SMALL_THRESHOLD = 600;
const MAX_WARN_LINES_SURFACED = 8;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function condenseInstall(out) {
  const added = (out.match(/added\s+(\d+)\s+package/) || [])[1];
  const removed = (out.match(/removed\s+(\d+)\s+package/) || [])[1];
  const changed = (out.match(/changed\s+(\d+)\s+package/) || [])[1];
  const audited = (out.match(/audited\s+(\d+)\s+package/) || [])[1];
  const vuln = (out.match(/(\d+)\s+vulnerabilit/) || [])[1];
  const fundingMatch = out.match(/(\d+)\s+packages? are looking for funding/);
  const parts = [];
  if (added) parts.push(`+${added}`);
  if (removed) parts.push(`-${removed}`);
  if (changed) parts.push(`~${changed}`);
  if (audited) parts.push(`audited:${audited}`);
  if (vuln) parts.push(`vuln:${vuln}`);
  if (fundingMatch) parts.push(`funding:${fundingMatch[1]}`);
  return parts.length > 0 ? `npm install: ${parts.join(", ")}` : null;
}

function condenseAudit(out) {
  const sev = ["critical", "high", "moderate", "low", "info"];
  const counts = sev.map((s) => {
    const m = out.match(new RegExp(`(\\d+)\\s+${s}`, "i"));
    return m ? `${s}:${m[1]}` : null;
  }).filter(Boolean);
  if (counts.length === 0) return null;
  return `npm audit: ${counts.join(", ")}`;
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin || stdin.tool_name !== "Bash") return passthrough();

  const cmd = stdin.tool_input?.command ?? "";
  const stripped = cmd.replace(/^(rtk\s+)?/, "").trim();
  const m = stripped.match(/^npm\s+(\S+)/);
  if (!m) return passthrough();
  const sub = m[1];

  const out = stdin.tool_response?.output
    ?? stdin.tool_response?.stdout
    ?? stdin.tool_response?.content
    ?? "";
  if (typeof out !== "string" || out.length < SMALL_THRESHOLD) return passthrough();

  // Always surface WARN/ERR lines verbatim
  const warnLines = out.split("\n")
    .filter((l) => /^npm\s+(WARN|ERR!)/.test(l))
    .slice(0, MAX_WARN_LINES_SURFACED);

  let summary;
  if (sub === "install" || sub === "i" || sub === "ci") {
    summary = condenseInstall(out);
  } else if (sub === "audit") {
    summary = condenseAudit(out);
  } else {
    // Generic
    const lines = out.split("\n");
    summary = `npm ${sub}: ${lines.length} lines output.`;
  }

  if (!summary && warnLines.length === 0) return passthrough();

  const blocks = [];
  if (summary) blocks.push(summary);
  if (warnLines.length > 0) blocks.push("Warnings/errors:\n" + warnLines.join("\n"));

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: blocks.join("\n"),
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
