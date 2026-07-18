#!/usr/bin/env node
/**
 * generate-hooks-atomic.mjs — emit EVERY hook in both hook trees as an
 * atomic L6 node parented to its rollup (core.hooks_cl or core.hooks_src).
 *
 * Trees:
 *   1. .claude/hooks/*.mjs           (claude-code lifecycle hooks)
 *   2. mcp-server/src/hooks/*.ts     (server-side enforcement hooks)
 *
 * Detected lifecycle event from filename and content scan:
 *   PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, Stop,
 *   PreCompact, SubagentStop, Notification.
 *
 * Output: state/shared/system-viz/hooks-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

// Stream-gate at 256MB to bypass V8 ERR_STRING_TOO_LONG on the 546MB graph.
// Matches scripts/lib/system-viz-graph.mjs, graphsage-train-pipeline.mjs, etc.
function loadGraph(p) {
  try {
    const sz = fs.statSync(p).size;
    return sz > 256 * 1024 * 1024
      ? readGraphStreaming(p)
      : JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    if (e && e.code === "ERR_STRING_TOO_LONG") return readGraphStreaming(p);
    throw e;
  }
}

const CLAUDE_HOOKS = path.join(ROOT, ".claude", "hooks");
const SRC_HOOKS    = path.join(ROOT, "mcp-server", "src", "hooks");

const LIFECYCLE_PATTERNS = [
  ["PreToolUse",        /\b(PreToolUse|pretool|pre[-_]?tool|before[-_]?tool)\b/i],
  ["PostToolUse",       /\b(PostToolUse|posttool|post[-_]?tool|after[-_]?tool)\b/i],
  ["UserPromptSubmit",  /\b(UserPromptSubmit|user[-_]?prompt|prompt[-_]?submit|inject)\b/i],
  ["SessionStart",      /\b(SessionStart|session[-_]?start|startup|init)\b/i],
  ["Stop",              /\b(Stop|on[-_]?stop|enforce|scrutin|complete)\b/i],
  ["PreCompact",        /\b(PreCompact|pre[-_]?compact|compact)\b/i],
  ["SubagentStop",      /\b(SubagentStop|subagent)\b/i],
  ["Notification",      /\b(Notification|notify|alert)\b/i],
];

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function detectLifecycle(name, headText) {
  const blob = name + " " + headText;
  for (const [event, re] of LIFECYCLE_PATTERNS) {
    if (re.test(blob)) return event;
  }
  return "Other";
}

function listHookFiles(dir, ext, scope) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith(ext))
    .map(e => ({
      scope,
      ext,
      name: e.name.replace(new RegExp(`\\${ext}$`), ""),
      basename: e.name,
      abs: path.join(dir, e.name),
    }));
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = loadGraph(GRAPH);
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const claudeHooks = listHookFiles(CLAUDE_HOOKS, ".mjs", "claude");
  const srcHooks    = listHookFiles(SRC_HOOKS, ".ts", "src").filter(h => !h.basename.endsWith(".test.ts"));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    claudeHooksScanned: claudeHooks.length,
    srcHooksScanned:    srcHooks.length,
    nodesEmitted:       0,
    parentMissing:      0,
    perEvent: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  function processHooks(hooks, parentId) {
    if (!existingIds.has(parentId)) { stats.parentMissing += hooks.length; return; }
    for (const h of hooks) {
      const slug = slugify(h.name);
      const id = `${parentId}.${slug}`;
      if (existingIds.has(id) || seenId.has(id)) continue;
      seenId.add(id);

      let sizeBytes = 0;
      let headText = "";
      try {
        sizeBytes = fs.statSync(h.abs).size;
        headText = fs.readFileSync(h.abs, "utf8").slice(0, 2000);
      } catch { /* noop */ }
      const event = detectLifecycle(h.name, headText);

      newNodes.push({
        id,
        layer: "L6",
        subgroup: `hook_${event.toLowerCase()}`,
        parent: parentId,
        label: h.name,
        status: sizeBytes < 300 ? "stub" : "built",
        color: h.scope === "claude" ? "#3b82f6" : "#a855f7",
        size: 0.30 + Math.min(0.20, Math.log10(1 + sizeBytes / 1024) * 0.08),
        tier: 0,
        ext: h.ext.slice(1),
        sizeBytes,
        file: h.scope === "claude"
          ? `.claude/hooks/${h.basename}`
          : `mcp-server/src/hooks/${h.basename}`,
        scope: h.scope,
        lifecycle: event,
      });
      stats.nodesEmitted++;
      stats.perEvent[event] = (stats.perEvent[event] || 0) + 1;
      pushEdge(parentId, id, "contains", "active", 0.18);
    }
  }

  processHooks(claudeHooks, "core.hooks_cl");
  processHooks(srcHooks,    "core.hooks_src");

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "hooks-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  claude hooks: ${result.stats.claudeHooksScanned}  src hooks: ${result.stats.srcHooksScanned}`);
  console.log(`  emitted:      ${result.stats.nodesEmitted}`);
  console.log(`  parent miss:  ${result.stats.parentMissing}`);
  console.log(`  per lifecycle:`);
  for (const [e, n] of Object.entries(result.stats.perEvent).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${e.padEnd(20)} ${n}`);
  }
}
