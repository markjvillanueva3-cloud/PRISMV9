#!/usr/bin/env node
// tier: T3
/**
 * inbox-capture-sharpen.mjs — PostToolUse hook
 *
 * OBSIDIAN-AUTOMATE-MS3/U-INBOX-CAPTURE-SHARPEN
 *
 * Fires after Write/Edit on knowledge/memories/inbox/*.md. Reads the
 * just-written file body, runs CaptureSharpenEngine.assess() to score the
 * note across length-fit / structure / specificity / independence, and
 * appends a fenced metadata comment block at the bottom.
 *
 * Important: does NOT rewrite the user's authored content. The fence
 * preserves authorship — the user can read the score and decide whether
 * to revise. Re-firing on the same file replaces the previous block (so
 * the metadata stays accurate after edits) without disturbing prose.
 *
 * Marker that delimits our managed block:
 *   <!-- capture-sharpen:begin v1 --> ... <!-- capture-sharpen:end -->
 *
 * Fail-safe: continueOnError. NEVER blocks the tool call. Disable with
 * PRISM_INBOX_SHARPEN=0.
 *
 * Skip files: anything matching brief-YYYY-*, perf-report-YYYY-*,
 * resources-* (those are machine-generated and exempt from sharpen).
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-INBOX-CAPTURE-SHARPEN
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, statSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";
const INBOX_RE = /[\\/]knowledge[\\/]memories[\\/]inbox[\\/][^\\/]+\.md$/i;
const EXEMPT_RE = /^(brief|perf-report|resources|archive)-/i;
const MARKER_BEGIN = "<!-- capture-sharpen:begin v1 -->";
const MARKER_END = "<!-- capture-sharpen:end -->";
const MAX_BODY_FOR_ASSESS = 2000;

function tele(decision, extra) {
  try {
    appendFileSync(
      TELEMETRY,
      JSON.stringify({ ts: new Date().toISOString(), hook: "inbox-capture-sharpen", decision, ...extra }) + "\n",
      "utf8",
    );
  } catch { /* never block on telemetry */ }
}

function readStdinSafe() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function extractFilePath(payload) {
  return (
    payload?.tool_input?.file_path
    ?? payload?.toolInput?.file_path
    ?? payload?.tool_input?.filePath
    ?? payload?.toolInput?.filePath
    ?? payload?.file_path
    ?? null
  );
}

function extractToolName(payload) {
  return payload?.tool_name ?? payload?.toolName ?? payload?.tool ?? "";
}

/** Strip frontmatter and existing capture-sharpen block before assess. */
function stripBoilerplate(body) {
  let text = body;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end > 0) text = text.slice(end + 4);
  }
  const begin = text.indexOf(MARKER_BEGIN);
  if (begin >= 0) text = text.slice(0, begin);
  return text.trim();
}

/** Replace existing capture-sharpen block, or append a new one. */
function spliceBlock(body, block) {
  const begin = body.indexOf(MARKER_BEGIN);
  const end = body.indexOf(MARKER_END);
  if (begin >= 0 && end > begin) {
    const tail = body.slice(end + MARKER_END.length);
    return body.slice(0, begin) + block + tail;
  }
  const sep = body.endsWith("\n") ? "\n" : "\n\n";
  return body + sep + block + "\n";
}

function renderBlock(assessment) {
  const c = assessment.components;
  const tags = assessment.proposedTags.map((t) => `#${t}`).join(" ");
  const flagLines = assessment.flags.length === 0
    ? ["- (no flags raised)"]
    : assessment.flags.map((f) => `- **${f.kind}**: ${f.reason}`);
  return [
    MARKER_BEGIN,
    "<!--",
    `score: ${assessment.score.toFixed(2)} (${assessment.passed ? "PASS" : "REVISE"})`,
    `classification: ${assessment.classifiedAs}`,
    `target_subfolder: ${assessment.targetSubfolder}`,
    `components: lengthFit=${c.lengthFit.toFixed(2)} structure=${c.structure.toFixed(2)} specificity=${c.specificity.toFixed(2)} independence=${c.independence.toFixed(2)}`,
    `proposed_tags: ${tags}`,
    "flags:",
    ...flagLines,
    "-->",
    MARKER_END,
  ].join("\n");
}

async function loadEngine() {
  // Prefer dist (production); fall back to src via tsx (dev).
  const distEngine = "H:/prism/mcp-server/dist/engines/CaptureSharpenEngine.js";
  if (existsSync(distEngine)) {
    return import(pathToFileURL(distEngine).href);
  }
  try {
    const tsx = await import("tsx/esm/api");
    return tsx.tsImport(
      "H:/prism/mcp-server/src/engines/CaptureSharpenEngine.ts",
      pathToFileURL(import.meta.url).href,
    );
  } catch {
    return null;
  }
}

export async function processInboxFile(filePath, opts = {}) {
  if (!INBOX_RE.test(filePath)) {
    return { decision: "skip-not-inbox", filePath };
  }
  const base = basename(filePath);
  if (EXEMPT_RE.test(base)) {
    return { decision: "skip-exempt", filePath };
  }
  if (!existsSync(filePath)) {
    return { decision: "skip-missing", filePath };
  }
  let body;
  try { body = readFileSync(filePath, "utf8"); }
  catch (err) { return { decision: "read-failed", filePath, error: err?.message ?? String(err) }; }

  const stripped = stripBoilerplate(body).slice(0, MAX_BODY_FOR_ASSESS);
  if (stripped.length < 10) {
    return { decision: "skip-too-short", filePath, length: stripped.length };
  }

  const engine = opts.engine ?? (await loadEngine())?.captureSharpenEngine;
  if (!engine || typeof engine.assess !== "function") {
    return { decision: "engine-unavailable", filePath };
  }

  const assessment = engine.assess(stripped, opts.assessOptions ?? {});
  const block = renderBlock(assessment);
  const next = spliceBlock(body, block);
  if (next === body) {
    return { decision: "noop-block-identical", filePath, score: assessment.score };
  }
  if (opts.dryRun) {
    return { decision: "dry-run", filePath, score: assessment.score, next };
  }
  try { writeFileSync(filePath, next, "utf8"); }
  catch (err) { return { decision: "write-failed", filePath, error: err?.message ?? String(err) }; }
  return { decision: "applied", filePath, score: assessment.score, classifiedAs: assessment.classifiedAs };
}

async function main() {
  if (process.env.PRISM_INBOX_SHARPEN === "0") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const raw = readStdinSafe();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { /* keep empty */ }

  const tool = extractToolName(payload);
  if (!/^(Write|Edit|MultiEdit)$/i.test(tool)) {
    tele("skip-not-edit-tool", { tool });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = extractFilePath(payload);
  if (!filePath) {
    tele("skip-no-path", {});
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const abs = resolve(filePath);
  const result = await processInboxFile(abs);
  tele(result.decision, { filePath: abs, score: result.score, classifiedAs: result.classifiedAs });
  process.stdout.write(JSON.stringify({ continue: true }));
}

const isCli = (() => {
  try {
    const argv1 = resolve(process.argv[1] ?? "");
    return argv1 === resolve(import.meta.url.replace(/^file:\/{0,3}/, ""));
  } catch { return false; }
})();

if (isCli) {
  main().catch((err) => {
    tele("error", { error: err?.message ?? String(err) });
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  });
}

export { renderBlock, stripBoilerplate, spliceBlock, MARKER_BEGIN, MARKER_END };
