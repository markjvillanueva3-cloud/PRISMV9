#!/usr/bin/env node
// tier: T3
// U-HRP05 wire -- soul-evolution Stop driver.
//
// Reads recently-written feedback_*.md memory files (correction signal proxy)
// and the slot's current soul. Calls proposeRefuseRuleCandidates; if novel
// rules found, writes a .draft.md companion the operator promotes. Advisory
// only; never mutates the live soul.
//
// 2026-06-10: de-duped onto scripts/lib/dream-signal.mjs (collectRecentCorrections
// + readSoulRefuseList were byte-identical inline copies, also used by the
// dream-queue producer) + wired into settings.json Stop (it had been built but
// never wired). COMPLEMENTARY to the dream-queue producer: this proposes
// refuse-rules by SEMANTIC NOVELTY (single occurrence, rerank<0.5 vs existing);
// the dream-queue proposes by REPETITION (>=2 same token) + skills from errors.
// Different gates catch different signals -- both advisory, operator-promote.
//
// Knobs:
//   PRISM_SOUL_EVOLVE_DISABLE=1   -- silent skip
//   PRISM_SOUL_EVOLVE_HORIZON=900 -- seconds-look-back for corrections

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  proposeRefuseRuleCandidates,
  renderSoulDraftMarkdown,
} from "../../scripts/lib/soul-evolution.mjs";
import {
  collectRecentCorrections,
  readSoulRefuseList,
} from "../../scripts/lib/dream-signal.mjs";

const PROJECT_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SOULS_DIR = join(PROJECT_ROOT, "state/shared/slot-souls");
const MEMORY_DIR = join(PROJECT_ROOT, "knowledge/memories/feedback");
const DEFAULT_HORIZON_SEC = 900;

function getSlot() {
  return process.env.PRISM_SLOT || process.env.SLOT || "unknown";
}

// Gather correction signal -> propose novel refuse-rules -> write the .draft.md
// companion. Injectable (soulsDir/memoryDir/rerank/now) for tests. Returns
// { proposed, draftPath?, slot } -- proposed is [] when there is nothing to draft.
function run(opts = {}) {
  const {
    soulsDir = SOULS_DIR,
    memoryDir = MEMORY_DIR,
    rerank = null,
    now = Date.now(),
  } = opts;
  const horizonSec = opts.horizonSec ?? (Number(process.env.PRISM_SOUL_EVOLVE_HORIZON) || DEFAULT_HORIZON_SEC);
  const slot = opts.slot || getSlot();
  if (slot === "unknown") return { proposed: [] };

  const corrections = collectRecentCorrections({ memoryDir, horizonMs: horizonSec * 1000, now });
  if (corrections.length === 0) return { proposed: [], slot };

  const refuseList = readSoulRefuseList({ soulsDir, slot });
  const { proposed: allProposed } = proposeRefuseRuleCandidates({
    currentRefuseList: refuseList,
    sessionCorrections: corrections,
    rerank,
  });
  if (allProposed.length === 0) return { proposed: [], slot };

  // Bound the draft: the Stop auto-feed touches many feedback-memory mtimes at
  // once, so without a cap a single Stop could draft hundreds of "novel" rules
  // against a small refuse_list (substring fallback rarely matches). A draft is
  // for operator review -- top-N is plenty. Knob: PRISM_SOUL_EVOLVE_MAX.
  const maxDraft = Math.max(1, Number(process.env.PRISM_SOUL_EVOLVE_MAX) || 25);
  const proposed = allProposed.slice(0, maxDraft);
  const truncated = allProposed.length - proposed.length;

  const draftPath = join(soulsDir, `${slot}.draft.md`);
  if (!existsSync(soulsDir)) mkdirSync(soulsDir, { recursive: true });
  const md = renderSoulDraftMarkdown(slot, proposed);
  try { writeFileSync(draftPath, md, "utf8"); } catch { /* non-blocking */ }
  return { proposed, totalProposed: allProposed.length, truncated, draftPath, slot };
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("stop-soul-evolution.mjs");
if (isDirect) {
  if (process.env.PRISM_SOUL_EVOLVE_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
  try {
    const r = run();
    if (r.proposed && r.proposed.length > 0) {
      const more = r.truncated > 0 ? ` (top ${r.proposed.length} of ${r.totalProposed}; ${r.truncated} more not drafted)` : "";
      const advisory =
        `Soul evolution -- ${r.proposed.length} novel refuse-rule(s) proposed for slot ${r.slot}${more}\n` +
        `  Draft: ${r.draftPath}\n` +
        `  Promote operator-reviewed rules into ${join(SOULS_DIR, r.slot + ".md")}.`;
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: { hookEventName: "Stop", additionalContext: advisory },
      }));
    } else {
      process.stdout.write(JSON.stringify({ continue: true }));
    }
  } catch {
    // R12 fail-soft: a self-reflection advisory must never block Stop.
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

export { run, getSlot };
