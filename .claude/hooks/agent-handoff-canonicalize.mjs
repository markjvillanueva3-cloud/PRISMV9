#!/usr/bin/env node
/**
 * agent-handoff-canonicalize.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05 (slot:sierra)
 *
 * UserPromptSubmit ADVISORY (non-destructive): detect canonical graph node-ids
 * already present in the prompt and remind the agent to reference them VERBATIM
 * for cross-agent coordination -- the SpatialAddressBookEngine "shared address
 * space" insight: a node-id mention beats a paraphrase (coordination collapses
 * from O(N^2) paraphrase reconciliation to O(1) id lookup).
 *
 * Deliberately CHEAP + SAFE (vs the spec's literal "rewrite handoff text"):
 *   - regex-only, NEVER loads the 65MB find-cache (a per-prompt load would be a
 *     latency leak); the heavy paraphrase->id resolution lives in the engine /
 *     prism_session:spatial_resolve for deliberate calls.
 *   - NON-destructive: injects additionalContext, never rewrites the user's prompt
 *     (rewriting an arbitrary prompt is the dangerous failure mode).
 *   - fail-soft: emits "{}" on any error; dedup + capped.
 *
 * Disable: PRISM_HANDOFF_CANONICALIZE_DISABLE=1 . Cap: PRISM_HANDOFF_CANONICALIZE_K (default 12).
 */
import { readFileSync } from "node:fs";

const DISABLE = process.env.PRISM_HANDOFF_CANONICALIZE_DISABLE === "1";
const MAX = Math.max(1, parseInt(process.env.PRISM_HANDOFF_CANONICALIZE_K || "12", 10) || 12); // guard NaN/non-numeric env
// Distinctive canonical prefixes (mirrors the node-card-prefetch whitelist; EXCLUDES
// the noisy fs/test/git/core/script namespaces that would false-positive on prose).
const ID_RE = /\b(?:eng|disp|ghost|formula|wiki|skill|tribal-tip|ms-envelope|memory_[a-z0-9]+)\.[A-Za-z0-9_.:-]+/g;

function emit(o) {
  process.stdout.write(JSON.stringify(o));
}

let raw = "";
try { raw = readFileSync(0, "utf8"); } catch { raw = ""; }
let prompt = "";
try { prompt = JSON.parse(raw || "{}").prompt || ""; } catch { prompt = ""; }

if (DISABLE || !prompt) {
  emit({});
} else {
  const ids = [];
  const seen = new Set();
  let m;
  while ((m = ID_RE.exec(prompt)) !== null) {
    const id = m[0];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX) break;
    }
  }
  if (ids.length === 0) {
    emit({});
  } else {
    const ctx =
      "Canonical node-ids detected (SpatialAddressBook / GRAPH-AS-LLM-CONTEXT): " +
      ids.map((i) => "`" + i + "`").join(", ") +
      ". Reference these VERBATIM when coordinating with peer agents -- a node-id is a shared " +
      "address, a paraphrase drifts. Resolve an unknown alias via prism_session:spatial_resolve.";
    emit({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx } });
  }
}
