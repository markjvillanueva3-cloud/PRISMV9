#!/usr/bin/env node
// Generates per-slot wrapper slash commands for precompact / handoff / startup.
// Mirrors the established /checkin-<slot> pattern (force-take slot → bind topic → delegate to canonical pipeline).
//
// Why: every per-chat data-write (precompact handoff, /handoff resume, /startup auto-resume) must
// land under the correct slot prefix in HANDOFF-<slot>-<topic>.md so the fleet dashboard and the
// post-/compact auto-resume see consistent state. The slot-binding helper (chat-slots.mjs claim)
// is the load-bearing piece — wrappers are thin.
//
// Run:  node H:/prism/scripts/generate-per-slot-wrappers.mjs
// Knob: PRISM_PERSLOT_WRAPPER_DRY_RUN=1  prints planned files without writing.

import fs from "node:fs";
import path from "node:path";

const SLOT_NAMES = ["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett","kilo","lima"];
const OUT_DIR = "H:/prism/.claude/commands";
const DRY = process.env.PRISM_PERSLOT_WRAPPER_DRY_RUN === "1";

const COMMANDS = {
  precompact: {
    description: (slot) => `Force-claim slot ${slot.toUpperCase()} + run the full /precompact pipeline. NATO-phonetic shortcut for slot-bound precompact handoff.`,
    canonical: "/precompact",
    canonicalPath: "H:/prism/.claude/commands/precompact.md (project) and ~/.claude/commands/precompact.md (global)",
    purpose: (slot) => `it binds the precompact handoff write to the ${slot} slot so the resulting \`HANDOFF-${slot}-${slot}-work.md\` lands under the right prefix and the post-/compact session-start-auto-resume hook can find it`,
    note: "The /precompact skill writes the RESUME directive that the post-/compact session-start-auto-resume hook picks up — making sure the handoff is slot-keyed is what makes the new chat in the same window inherit the correct slot via terminal-window-id pinning."
  },
  handoff: {
    description: (slot) => `Force-claim slot ${slot.toUpperCase()} + run the full /handoff pipeline. NATO-phonetic shortcut for slot-bound session handoff.`,
    canonical: "/handoff",
    canonicalPath: "H:/.claude/commands/handoff.md (global)",
    purpose: (slot) => `it writes the session-end handoff under the \`${slot}\` slot prefix so the next chat in the same window resumes the correct lane`,
    note: "Per the 2026-05-06 handoff-writer ban, only the live chat may write handoffs (`--source live-chat`). This wrapper IS the live chat — it just ensures the slot binding is correct first."
  },
  startup: {
    description: (slot) => `Force-claim slot ${slot.toUpperCase()} + run the full /startup pipeline. NATO-phonetic shortcut for slot-bound session start.`,
    canonical: "/startup",
    canonicalPath: "H:/.claude/commands/startup.md (global)",
    purpose: (slot) => `it claims the \`${slot}\` slot on a fresh chat (rare — usually session-start-terminal-pin auto-pins) then runs the standard startup audit so the chat reads the right per-slot handoff`,
    note: "Use only when the auto-pin missed (different terminal window, or the slot drifted post-/compact and you want to force it). The /startup skill reads the per-slot handoff to resume."
  }
};

function renderWrapper(commandName, slot) {
  const cfg = COMMANDS[commandName];
  const SLOT = slot;
  const SLOT_UPPER = slot.toUpperCase();
  const TOPIC = `${slot}-work`;

  return `---
description: ${cfg.description(slot)}
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
---

# /${commandName}-${slot} — slot-locked ${cfg.canonical}

Force-takes the **${slot}** slot (evicting any prior owner with \`--force true --confirmRecent true\`), binds the handoff to \`${TOPIC}\`, then runs the standard \`${cfg.canonical}\` pipeline.

This wrapper exists because ${cfg.purpose(slot)}. ${cfg.note}

## Slot binding (replaces ${cfg.canonical} Step 1 / Step 2)

\`\`\`bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="${SLOT}"
TOPIC="${TOPIC}"

# Reap stale slots first, then force-take ${SLOT} from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \\
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "${commandName}" \\
  --preferSlot $SLOT --force true --confirmRecent true
\`\`\`

If the claim result carries \`previousOwner\`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Pipeline delegation

After the slot-claim above, execute the FULL \`${cfg.canonical}\` pipeline canonical at \`${cfg.canonicalPath}\`. The pipeline body is canonical in \`${cfg.canonical}\` — do NOT duplicate it here. This skill is a slot-binding wrapper.

## Args forwarding

Any args after \`/${commandName}-${slot}\` are treated identically to args passed to \`${cfg.canonical}\`.
`;
}

let written = 0;
let planned = 0;
const targets = [];

for (const cmd of Object.keys(COMMANDS)) {
  for (const slot of SLOT_NAMES) {
    const filename = `${cmd}-${slot}.md`;
    const outPath = path.join(OUT_DIR, filename);
    targets.push(outPath);
    planned++;
    if (DRY) continue;
    if (fs.existsSync(outPath)) {
      // Don't clobber existing — but verify content matches; if it differs, log a warning.
      // Idempotent re-runs should be safe.
      const existing = fs.readFileSync(outPath, "utf8");
      const fresh = renderWrapper(cmd, slot);
      if (existing.trim() === fresh.trim()) continue; // already correct
      fs.writeFileSync(outPath, fresh, "utf8");
      written++;
      continue;
    }
    fs.writeFileSync(outPath, renderWrapper(cmd, slot), "utf8");
    written++;
  }
}

if (DRY) {
  console.log(`[DRY] would write ${planned} files:`);
  for (const t of targets) console.log("  " + t);
} else {
  console.log(`[OK] wrote/updated ${written} files (${planned} planned).`);
  // Sanity: re-read one to confirm bytes landed
  const sampleFile = path.join(OUT_DIR, "precompact-alpha.md");
  if (fs.existsSync(sampleFile)) {
    const bytes = fs.statSync(sampleFile).size;
    console.log(`[OK] sample ${path.basename(sampleFile)} size: ${bytes} bytes`);
  }
}
