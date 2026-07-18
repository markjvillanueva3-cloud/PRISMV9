// scripts/lib/dream-signal.mjs
//
// HSE06 wire -- signal-gathering for the DreamLoopProposalEngine "dream loop".
// Pure, injectable helpers that turn fleet state into the engine's inputs:
//   - collectRecentCorrections : recent feedback_*.md `description:` lines (correction proxy)
//   - readSoulRefuseList       : slot soul frontmatter refuse_list
//   - aggregateErrorPatterns   : ERROR_LEARN_LEDGER.jsonl -> [{pattern,count}]  (the dream-queue's UNIQUE dimension)
//   - buildProposalRequest     : clamp inputs to the engine's Zod schema (else propose() THROWS)
//   - buildDreamDoc            : map engine output -> the {batch:{...}} doc stop-dream-queue-surface.mjs reads
//   - hasProposals            : true when a batch is worth persisting
//
// The corrections + refuse-list readers are the SAME proxy stop-soul-evolution.mjs
// uses (recent feedback memories' description: line; slot soul refuse_list). They
// are extracted here so the dream producer has a single tested source. FOLLOW-UP
// (logical-order, R13): de-dup stop-soul-evolution.mjs onto these helpers once this
// lib is proven -- it currently keeps its own byte-identical inline copies.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Recent feedback memories' `description:` line == the correction-signal proxy.
// memoryDir: dir of feedback_*.md  ;  horizonMs: look-back window  ;  now: injectable clock.
export function collectRecentCorrections({ memoryDir, horizonMs, now = Date.now() }) {
  if (!memoryDir || !existsSync(memoryDir)) return [];
  const out = [];
  let entries;
  try { entries = readdirSync(memoryDir, { withFileTypes: true }); }
  catch { return []; }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const path = join(memoryDir, e.name);
    try {
      const st = statSync(path);
      if (now - st.mtimeMs > horizonMs) continue;
      const raw = readFileSync(path, "utf8");
      const m = raw.match(/^description:\s*(.+)$/m);
      if (m) out.push({ text: m[1].trim(), source: e.name });
    } catch { /* skip unreadable */ }
  }
  return out;
}

// Slot soul frontmatter refuse_list -> string[]. Mirrors stop-soul-evolution's regex.
export function readSoulRefuseList({ soulsDir, slot }) {
  if (!soulsDir || !slot) return [];
  const path = join(soulsDir, `${slot}.md`);
  if (!existsSync(path)) return [];
  let raw;
  try { raw = readFileSync(path, "utf8"); } catch { return []; }
  const m = raw.match(/^refuse_list:\s*\n((?:\s*-\s*.+\n)+)/m);
  if (!m) return [];
  return m[1].split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

// Enumerate slot names that have a live soul (state/shared/slot-souls/<slot>.md),
// excluding README and *.draft.md companions. Used by the fleet-wide dream sweep
// so EVERY galaxy gets dream proposals (R15 apply-to-all-galaxies).
export function enumerateSoulSlots({ soulsDir }) {
  if (!soulsDir || !existsSync(soulsDir)) return [];
  let files;
  try { files = readdirSync(soulsDir); } catch { return []; }
  const out = [];
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    if (f === "README.md") continue;
    if (f.endsWith(".draft.md")) continue;
    out.push(f.slice(0, -3));
  }
  return out.sort();
}

// Aggregate the error-learn ledger (JSONL, newest-last) into [{pattern,count}].
// Pattern key = trigger || error_class (the human-named recurring signal). minCount
// drops one-offs early; the engine only graduates a skill at count >= minRep*2 anyway.
// Result is sorted desc by count and capped to `limit` (engine schema max 200).
export function aggregateErrorPatterns({ ledgerPath, minCount = 1, limit = 200 }) {
  if (!ledgerPath || !existsSync(ledgerPath)) return [];
  let raw;
  try { raw = readFileSync(ledgerPath, "utf8"); } catch { return []; }
  const counts = new Map();
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let e;
    try { e = JSON.parse(t); } catch { continue; }
    const trig = typeof e?.trigger === "string" ? e.trigger.trim() : "";
    const cls = typeof e?.error_class === "string" ? e.error_class.trim() : "";
    const pattern = trig || cls;
    if (!pattern) continue;
    counts.set(pattern, (counts.get(pattern) || 0) + 1);
  }
  const out = [];
  for (const [pattern, count] of counts.entries()) {
    if (count < minCount) continue;
    out.push({ pattern: pattern.slice(0, 200), count: Math.min(count, 10_000) });
  }
  out.sort((a, b) => b.count - a.count);
  return out.slice(0, limit);
}

// Clamp gathered signals to DreamProposalRequestSchema bounds so propose() never
// throws on real-world inputs (long memory filenames > 60 chars, > 200 corrections,
// etc.). Returns a request object ready for DreamLoopProposalEngine.propose().
export function buildProposalRequest({ slot, corrections, errorPatterns, refuseList, minRepetitions }) {
  const req = {
    slot: String(slot || "unknown").slice(0, 60),
    current_refuse_list: (Array.isArray(refuseList) ? refuseList : [])
      .slice(0, 40)
      .map((r) => String(r).slice(0, 200)),
    corrections: (Array.isArray(corrections) ? corrections : [])
      .slice(0, 200)
      .map((c) => {
        const text = String(c?.text ?? "").slice(0, 500);
        const entry = { text, source: String(c?.source ?? "unknown").slice(0, 60) || "unknown" };
        if (c?.at) entry.at = String(c.at).slice(0, 40);
        return entry;
      })
      .filter((c) => c.text.length >= 1),
    error_patterns: (Array.isArray(errorPatterns) ? errorPatterns : [])
      .slice(0, 200)
      .map((e) => ({
        pattern: String(e?.pattern ?? "").slice(0, 200),
        count: Math.max(1, Math.min(10_000, Math.round(Number(e?.count) || 1))),
      }))
      .filter((e) => e.pattern.length >= 1),
  };
  if (minRepetitions != null && Number.isFinite(Number(minRepetitions))) {
    req.min_repetitions = Math.max(1, Math.min(20, Math.round(Number(minRepetitions))));
  }
  return req;
}

// Map a DreamLoopProposalEngine.propose() result into the on-disk doc the surface
// hook (stop-dream-queue-surface.mjs) reads: it only inspects
// batch.refuse_rules[].{rule,observed_count} and batch.skills[].{name,observed_count}.
export function buildDreamDoc({ batch, date, now }) {
  return {
    slot: batch?.slot ?? "unknown",
    date,
    generatedAt: now || new Date().toISOString(),
    schemaVersion: "1.0.0",
    batch: {
      refuse_rules: batch?.refuse_rules ?? [],
      skills: batch?.skills ?? [],
      filtered_correction_count: batch?.filtered_correction_count ?? 0,
    },
  };
}

// A batch is worth persisting only if it proposed at least one rule or skill.
export function hasProposals(batch) {
  return (batch?.refuse_rules?.length || 0) > 0 || (batch?.skills?.length || 0) > 0;
}
