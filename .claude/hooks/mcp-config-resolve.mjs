#!/usr/bin/env node
// tier: T4
/**
 * mcp-config-resolve.mjs — Regenerate ~/.claude/.mcp.json with PC-specific node.exe path.
 *
 * Runs on SessionStart. Reads H:\.claude-shared\.mcp.template.json (shared template with
 * {{NODE_EXE}} placeholder), resolves node.exe via `where node` on this PC, and writes
 * the resolved config to ~/.claude/.mcp.json.
 *
 * Why not junction .mcp.json? node.exe paths differ between PCs:
 *   - Work PC: C:\Program Files\nodejs\node.exe
 *   - Home PC: possibly different location
 *   - Portable: H:\Tools\node\node.exe (if added later)
 * Template + resolve gives cross-PC portability with zero hardcoding.
 *
 * If template doesn't exist, bootstrap from current ~/.claude/.mcp.json (one-time migration).
 *
 * continueOnError: true (non-blocking) — MCP is optional infrastructure.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const TEMPLATE = "H:\\.claude-shared\\.mcp.template.json";
const TARGET = join(homedir(), ".claude", ".mcp.json");
const PORTABLE_NODE_FALLBACK = "H:\\Tools\\node\\node.exe";

function resolveNode() {
  if (existsSync(PORTABLE_NODE_FALLBACK)) return PORTABLE_NODE_FALLBACK;
  const r = spawnSync("where", ["node"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const lines = (r.stdout || "").split(/\r?\n/).filter(Boolean);
  const exe = lines.find(l => /node\.exe$/i.test(l));
  return exe || null;
}

function bootstrap() {
  // One-time: if template doesn't exist, create it from current .mcp.json with node path replaced.
  if (existsSync(TEMPLATE)) return;
  if (!existsSync(TARGET)) return;
  try {
    const current = JSON.parse(readFileSync(TARGET, "utf8"));
    const walk = (obj) => {
      if (Array.isArray(obj)) return obj.map(walk);
      if (obj && typeof obj === "object") {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          if (k === "command" && typeof v === "string" && /node(\.exe)?$/i.test(v)) {
            out[k] = "{{NODE_EXE}}";
          } else {
            out[k] = walk(v);
          }
        }
        return out;
      }
      return obj;
    };
    mkdirSync(dirname(TEMPLATE), { recursive: true });
    writeFileSync(TEMPLATE, JSON.stringify(walk(current), null, 2) + "\n");
    process.stdout.write(`  [bootstrap] wrote template from current .mcp.json → ${TEMPLATE}\n`);
  } catch (e) {
    process.stderr.write(`  mcp-config-resolve bootstrap failed: ${e.message}\n`);
  }
}

function main() {
  bootstrap();

  if (!existsSync(TEMPLATE)) {
    process.stdout.write(`  [skip] ${TEMPLATE} not found — nothing to resolve\n`);
    return;
  }
  const node = resolveNode();
  if (!node) {
    process.stderr.write(`  ✗ MCP config: could not resolve node.exe on this PC (tried PATH + ${PORTABLE_NODE_FALLBACK})\n`);
    return; // Non-blocking.
  }

  let tpl;
  try { tpl = readFileSync(TEMPLATE, "utf8"); }
  catch (e) { process.stderr.write(`  MCP template read failed: ${e.message}\n`); return; }

  const resolved = tpl.replace(/\{\{NODE_EXE\}\}/g, node.replace(/\\/g, "\\\\"));

  // Only write if changed, to avoid triggering file-watcher churn.
  const existing = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : "";
  if (existing === resolved) {
    process.stdout.write(`  ✓ MCP config already resolved (node → ${node})\n`);
    return;
  }
  try {
    mkdirSync(dirname(TARGET), { recursive: true });
    writeFileSync(TARGET, resolved);
    process.stdout.write(`  ✓ MCP config resolved (node → ${node})\n`);
  } catch (e) {
    process.stderr.write(`  MCP config write failed: ${e.message}\n`);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
