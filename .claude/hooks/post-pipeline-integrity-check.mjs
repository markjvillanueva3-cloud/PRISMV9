#!/usr/bin/env node
// tier: T4
/**
 * post-pipeline-integrity-check.mjs (CPP-MS5-U-CPP34)
 *
 * Captures the live context-pipeline transition chain for THIS session start
 * (compaction-survival → handoff → session-start-artifacts) and writes a
 * hash-chain + score snapshot to state/shared/PIPELINE_INTEGRITY.json.
 *
 * The goal of U-CPP34 is to make silent breakage visible: before this hook,
 * a 3-byte empty handoff file or a missing compaction-survival wouldn't
 * surface until a downstream hook produced garbage. Now every session boot
 * publishes a score — readers can grep for `"valid": false` and refuse to
 * trust the boot-block content.
 *
 * Invoked by: SessionStart (inline, via .claude/settings.json)
 * Output: state/shared/PIPELINE_INTEGRITY.json (overwrites each session)
 *
 * Keeps the hook logic thin — all chain math lives in the engine at
 * mcp-server/src/engines/ContextIntegrityEngine.ts (verifyChain()). This
 * hook just collects file contents and invokes a local copy of the pure
 * logic so .mjs runtime doesn't need to transpile TypeScript.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { inferAgentIdentity } from "../helpers/agent-identity.mjs";

const PRISM_ROOT = "H:\\prism";
const SURVIVAL_DIR = "H:\\prism\\.claude\\helpers";
const SURVIVAL_PER_INSTANCE_PREFIX = ".compaction-survival-";
const HANDOFFS_DIR = "H:\\prism\\state\\shared\\handoffs";
const SESSION_ARTIFACTS = "H:\\prism\\state\\shared\\SESSION_ARTIFACTS.json";
const OUTPUT_PATH = "H:\\prism\\state\\shared\\PIPELINE_INTEGRITY.json";

function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Mirror of ContextIntegrityEngine.verifyChain() — duplicated here so this
 * .mjs hook stays independent of the TypeScript build. Engine tests cover
 * the behavioural contract; if this mirror drifts, the integration test
 * (post-pipeline-integrity-check.integration.test.ts) will fail.
 */
function verifyChain(artifacts) {
  const links = [];
  let priorHash = "";
  let firstEmptyAt = null;
  for (let i = 0; i < artifacts.length; i++) {
    const a = artifacts[i];
    const contents = a.contents ?? "";
    const lengthBytes = contents.length;
    const empty = contents.trim().length === 0;
    if (empty && firstEmptyAt === null) firstEmptyAt = i;
    const eventHash = sha256Hex(priorHash + contents);
    links.push({
      stage: a.stage,
      path: a.path,
      eventHash,
      priorHash,
      lengthBytes,
      empty,
    });
    priorHash = eventHash;
  }
  const emptyCount = links.filter((l) => l.empty).length;
  const valid = emptyCount === 0 && links.length > 0;
  const score = Math.max(0, 100 - emptyCount * 10 - (valid ? 0 : 20));
  const summary = links.length === 0
    ? "chain empty (no artifacts supplied)"
    : valid
      ? `chain OK — ${links.length} links, all populated`
      : `chain BROKEN — ${emptyCount}/${links.length} artifact(s) empty (first at #${firstEmptyAt}: ${links[firstEmptyAt ?? 0].stage})`;
  return { valid, links, firstEmptyAt, score, summary };
}

async function readOrEmpty(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function findFreshestMatching(dir, prefix) {
  try {
    const entries = await fs.readdir(dir);
    const candidates = [];
    for (const name of entries) {
      if (!name.startsWith(prefix)) continue;
      const fp = path.join(dir, name);
      try {
        const st = await fs.stat(fp);
        candidates.push({ path: fp, mtime: st.mtimeMs });
      } catch {
        // skip unreadable
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.mtime - a.mtime);
    return candidates[0].path;
  } catch {
    return null;
  }
}

async function collectArtifacts() {
  const artifacts = [];

  // Stage 1: compaction-survival (per-instance, freshest wins)
  const survivalPath = (await findFreshestMatching(SURVIVAL_DIR, SURVIVAL_PER_INSTANCE_PREFIX))
    ?? path.join(SURVIVAL_DIR, ".compaction-survival.md");
  artifacts.push({
    stage: "compaction_survival",
    path: survivalPath,
    contents: await readOrEmpty(survivalPath),
  });

  // Stage 2: handoff (freshest per-session file)
  const handoffPath = await findFreshestMatching(HANDOFFS_DIR, "HANDOFF-")
    ?? path.join(HANDOFFS_DIR, "HANDOFF-none.md");
  artifacts.push({
    stage: "handoff",
    path: handoffPath,
    contents: await readOrEmpty(handoffPath),
  });

  // Stage 3: session artifacts JSON (Feature Cascade source)
  artifacts.push({
    stage: "session_artifacts",
    path: SESSION_ARTIFACTS,
    contents: await readOrEmpty(SESSION_ARTIFACTS),
  });

  return artifacts;
}

async function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp-${process.pid}`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, filePath);
}

async function main() {
  const artifacts = await collectArtifacts();
  const verification = verifyChain(artifacts);
  // CPP-MS5-U-CPP35: encode family/machine/instance so integrity snapshot
  // identifies the writing agent (Codex boundary rule can machine-read this).
  const identity = inferAgentIdentity({});
  const payload = {
    schemaVersion: 1,
    captured_at: new Date().toISOString(),
    pid: process.pid,
    family: identity.family,
    machine: identity.machine,
    instance: identity.instance,
    valid: verification.valid,
    score: verification.score,
    summary: verification.summary,
    firstEmptyAt: verification.firstEmptyAt,
    links: verification.links,
  };
  try {
    await atomicWrite(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  } catch (e) {
    // Hook must never break the boot — log to stderr, exit 0.
    process.stderr.write(`[post-pipeline-integrity-check] write failed: ${e?.message || e}\n`);
  }
  // Emit summary to stdout so SessionStart can surface it in the boot block.
  process.stdout.write(`[pipeline-integrity] ${verification.summary} (score=${verification.score})\n`);
}

main().catch((e) => {
  process.stderr.write(`[post-pipeline-integrity-check] fatal: ${e?.message || e}\n`);
  process.exit(0); // never block SessionStart
});
