#!/usr/bin/env node
// add-galaxy-critic-keepworking-stanza.mjs
// W5 (AUTO-COMPACTION-MODEL-HANDOFF backlog, 2026-06-11, slot:alpha): clone the two
// X-article patterns into EVERY galaxy CLAUDE.md as a POINTER stanza (R15 apply-to-all):
//   (1) darkzodchi "Stop Claude From Agreeing With Everything" -> critic discipline /
//       anti-sycophancy (honesty rules + a critic agent).
//   (2) Hamza Khalid "Stop Prompting, build systems" + operator R6 -> keep working until
//       autocompact, then author your OWN handoff (not the stub).
// Pointer-only: cites the global doctrine (CLAUDE.md HONESTY RULES + R6 + 3-of-3 SCRUTINY
// GATE + fact-checker) -- never duplicates it (engines/CLAUDE.md rule: "pointers only").
// Idempotent: skip any file already carrying the sentinel. Single source -> all galaxies.
// Usage: node scripts/add-galaxy-critic-keepworking-stanza.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENGINES = path.join(ROOT, "mcp-server", "src", "engines");
const SENTINEL = "<!-- CRITIC-KEEPWORKING-STANZA -->";
const DRY = process.argv.includes("--dry");

const STANZA =
  "\n" + SENTINEL + "\n" +
  "## Critic + keep-working contract (pointer -- global doctrine, do NOT duplicate)\n\n" +
  "- **Critic discipline (global CLAUDE.md HONESTY RULES + R12):** never just agree with a " +
  "proposal -- argue it, surface failure modes, cite file:line evidence. \"I don't know\" beats a " +
  "confident guess; verify a symbol before claiming it exists. The 3-of-3 SCRUTINY GATE + " +
  "`.claude/agents/fact-checker.md` are the structural critics -- run them, never skip.\n" +
  "- **Keep working until autocompact (global R6):** context growth is NOT a stop signal. Never " +
  "park, wait for /compact, or abandon a unit mid-build because context is large -- native " +
  "autocompact at 95% handles the reset and the PreCompact hook directs you to author your OWN " +
  "optimal handoff (`per-agent-handoff.mjs write --source live-chat`, not the stub). A SPIRAL " +
  "(repeating failure / degrading output) is the real stop signal. See " +
  "[[feedback_context_growth_not_a_stop_signal]].\n";

let added = 0, skipped = 0, missing = 0;
const dirs = fs.readdirSync(ENGINES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("."))  // exclude .claude config dir (not a galaxy)
  .map((d) => d.name)
  .sort();

for (const g of dirs) {
  const cp = path.join(ENGINES, g, "CLAUDE.md");
  if (!fs.existsSync(cp)) { missing++; continue; }
  const cur = fs.readFileSync(cp, "utf8");
  if (cur.includes(SENTINEL)) { skipped++; continue; }
  if (DRY) { process.stdout.write("  [dry] would add -> " + g + "\n"); added++; continue; }
  fs.writeFileSync(cp, cur.replace(/\s*$/, "\n") + STANZA);
  process.stdout.write("  added -> " + g + "\n");
  added++;
}
process.stdout.write((DRY ? "[dry] " : "") + "added=" + added + " skipped=" + skipped + " missing=" + missing + "\n");
