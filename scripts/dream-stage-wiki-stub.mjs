#!/usr/bin/env node
/**
 * dream-stage-wiki-stub.mjs — stage a Hermes-Dreaming receipt bundle that
 * PROPOSES a new wiki entry for a freshly-shipped unit.
 *
 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO07 (slot:bravo 2026-05-26). Companion
 * to .claude/hooks/stop-wiki-stub-stager.mjs. The Stop hook detects a fresh
 * U-<ID> commit and spawns this runner; this runner writes a STAGED bundle
 * proposing knowledge/wiki/code-tribal/learnings/<slug>.md. Operator
 * reviews via /dream-review before any apply — never auto-writes the wiki.
 *
 * Strategy:
 *   1. Parse --unit + --commit-subject CLI args
 *   2. Read recent commit body for context via spawnSync (no shell)
 *   3. Build proposal { mutation_type:write, risk_class:wiki, target_path:... }
 *   4. Build 1 source { source_type:commit, locator:<sha> }
 *   5. Write 4 files under state/shared/dream-artifacts/wiki-<slug>-<ts>/
 *   6. No mutation. The wiki stays clean until operator approves.
 *
 * Usage:  node scripts/dream-stage-wiki-stub.mjs --unit U-MWO07 --commit-subject "[MAIN] ..."
 * Exit:   0 ok · 1 missing args · 2 runtime error
 *
 * @module scripts/dream-stage-wiki-stub
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const BUNDLE_SCHEMA_VERSION = "1.0.0";
export const ARTIFACTS_ROOT = path.join(ROOT, "state", "shared", "dream-artifacts");
export const DEFAULT_GIT_TIMEOUT_MS = 4000;

/** Pure: unit-id → kebab-slug (mirror of stop hook). */
export function unitSlug(unitId) {
  return String(unitId).toLowerCase().replace(/^u-/, "").replace(/[^a-z0-9-]/g, "-");
}

/** Pure: parse --foo value pairs from argv. */
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && i + 1 < argv.length) {
      out[a.slice(2)] = argv[++i];
    }
  }
  return out;
}

/** Pure: build the wiki-page stub content (will land in after_content of the proposal). */
export function buildWikiStub({ unitId, commitSubject, commitSha, commitBody }) {
  const slug = unitSlug(unitId);
  return [
    "---",
    `name: ${slug}`,
    `description: Wiki stub auto-staged for ${unitId}`,
    `unit: ${unitId}`,
    `commit: ${commitSha || "(unknown)"}`,
    `staged_by: stop-wiki-stub-stager (U-MWO07)`,
    `staged_at: ${new Date().toISOString()}`,
    "---",
    "",
    `# ${unitId}`,
    "",
    `**Status:** AUTO-STAGED STUB — operator must revise via /dream-review before merge.`,
    "",
    `## Commit subject`,
    "",
    `\`${commitSubject || "(unknown)"}\``,
    "",
    `## What shipped`,
    "",
    commitBody ? commitBody.split("\n").slice(0, 10).join("\n") : "_(empty — fill in from commit body)_",
    "",
    `## Why it matters`,
    "",
    "_(operator: 1-2 sentences on the gap closed or the lesson)_",
    "",
    `## How to invoke`,
    "",
    "_(operator: command-line / dispatcher-action / hook-trigger as appropriate)_",
    "",
  ].join("\n");
}

/** Pure: render REPORT.md skeleton. */
export function renderReport({ artifact_id, created_at, created_by, unitId, slug, commitSha }) {
  return [
    `# Dream Artifact Bundle — ${artifact_id}`,
    "",
    `- **Status**: staged`,
    `- **Created**: ${created_at}`,
    `- **Created by**: ${created_by}`,
    `- **Schema**: ${BUNDLE_SCHEMA_VERSION}`,
    "",
    `## Source summary`,
    "",
    `wiki-stub auto-stager for ${unitId} (commit ${commitSha || "(unknown)"})`,
    "",
    `## Proposals (1)`,
    `Proposes new wiki entry at \`knowledge/wiki/code-tribal/learnings/${slug}.md\``,
    "",
    `## Sources (1)`,
    `Latest commit on cad-fusion-live-ms0 for ${unitId}`,
    "",
    "_Review the stub body in proposals.jsonl after_content. Operator MUST revise before apply._",
    "",
    `_Approve via_ \`/dream-review ${artifact_id}\``,
    "",
  ].join("\n");
}

/** Pure: synthesize artifact id. */
export function artifactId(slug, now = Date.now()) {
  const ts = new Date(now).toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomBytes(3).toString("hex");
  return `wiki-${slug}-${ts}-${rand}`;
}

/** Pure: assemble the 4-file bundle. */
export function buildBundle({ unitId, commitSubject, commitSha, commitBody, now = Date.now }) {
  const slug = unitSlug(unitId);
  const id = artifactId(slug, now());
  const created_at = new Date(now()).toISOString();
  const stubContent = buildWikiStub({ unitId, commitSubject, commitSha, commitBody });
  const proposal = {
    proposal_id: `wiki-add-${slug}`,
    target_path: `knowledge/wiki/code-tribal/learnings/${slug}.md`,
    mutation_type: "write",
    risk_class: "wiki",
    before_sha256: null,
    after_content: stubContent,
    provenance: `auto-staged from commit ${commitSha || "(unknown)"} (${unitId})`,
    rationale: "wiki entry missing for shipped unit; stop-wiki-stub-stager (U-MWO07) proposes one",
  };
  const source = {
    source_id: `commit-${commitSha || "unknown"}`,
    source_type: "commit",
    locator: commitSha || "HEAD",
    sha256: null,
    bytes: Buffer.byteLength(commitSubject || "", "utf8"),
  };
  const manifest = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    artifact_id: id,
    status: "staged",
    created_at,
    created_by: "stop-wiki-stub-stager",
    parent_trace: null,
    source_summary: `wiki-stub auto-stager for ${unitId}`,
    proposal_count: 1,
    source_count: 1,
  };
  const report = renderReport({ artifact_id: id, created_at, created_by: "stop-wiki-stub-stager", unitId, slug, commitSha });
  return {
    artifact_id: id,
    files: {
      "manifest.json": JSON.stringify(manifest, null, 2),
      "REPORT.md": report,
      "sources.jsonl": JSON.stringify(source) + "\n",
      "proposals.jsonl": JSON.stringify(proposal) + "\n",
    },
  };
}

/** I/O: fetch most recent commit sha + body via spawnSync (no shell). */
export function fetchCommitInfo({ runner = spawnSync, timeoutMs = DEFAULT_GIT_TIMEOUT_MS } = {}) {
  try {
    const sha = runner("git", ["-C", "H:/prism", "rev-parse", "HEAD"], { encoding: "utf8", timeout: timeoutMs });
    const body = runner("git", ["-C", "H:/prism", "log", "-1", "--format=%B"], { encoding: "utf8", timeout: timeoutMs });
    return {
      sha: sha.error ? null : (sha.stdout || "").trim().slice(0, 12),
      body: body.error ? "" : (body.stdout || "").trim(),
    };
  } catch { return { sha: null, body: "" }; }
}

/** I/O wrapper. */
export function run({ argv = process.argv.slice(2), fsImpl = fs, artifactsRoot = ARTIFACTS_ROOT, now = Date.now, fetcher = fetchCommitInfo } = {}) {
  const args = parseArgs(argv);
  const unitId = args.unit;
  if (!unitId) return { ok: false, reason: "missing --unit" };
  const commitSubject = args["commit-subject"] || "";
  const { sha, body } = fetcher();
  const bundle = buildBundle({ unitId, commitSubject, commitSha: sha, commitBody: body, now });
  const dir = path.join(artifactsRoot, bundle.artifact_id);
  try {
    fsImpl.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(bundle.files)) {
      fsImpl.writeFileSync(path.join(dir, name), content);
    }
  } catch (e) {
    return { ok: false, reason: "write-failed", error: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true, artifact_id: bundle.artifact_id, bundleDir: dir, unitId, commitSha: sha };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("dream-stage-wiki-stub.mjs")) {
  try {
    const result = run();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    process.stderr.write(`dream-stage-wiki-stub: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
