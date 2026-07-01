/**
 * galaxy-soul-render.mjs -- pure renderer for per-galaxy SOUL.md
 * (AI-SYNERGY-AUDIT-MS0/U-AISYN-SOULS, slot:charlie).
 *
 * The operator /goal asks for "souls.md of each galaxy" synergized with the AI
 * systems. Recon found souls were SLOT-keyed (26), never GALAXY-keyed -- 0 of the
 * galaxy dirs carried a soul. This module renders a galaxy SOUL.md by SYNTHESIZING
 * real data (no stub): the galaxy's owner-slot voice/role/refuses (from the slot
 * soul), its CLAUDE.md/MEMORY.md identity headline, and its live AI-synergy posture
 * (score/band/gaps/next from AI-SYNERGY-AUDIT.json). The soul is thus the per-galaxy
 * surface where identity + AI-synergy meet -- exactly the goal's "souls.md ...
 * synergized with ... prism awareness of each galaxy".
 *
 * PURE: takes a fully-gathered descriptor, returns a markdown string. The I/O
 * (parsing slot souls, reading CLAUDE/MEMORY, loading the audit) lives in the
 * generator `scripts/generate-galaxy-souls.mjs`.
 */

export const SOUL_SCHEMA_VERSION = "1.2.0"; // 1.2.0: + codebase_access:full + multi_domain (op 2026-06-30 multi-domain policy); 1.1.0: + domain_filter, domain refuses, specialist body

// AI-Stack block -- SINGLE SOURCE OF TRUTH for the per-galaxy "AI Stack (synergized)" section.
// Consumed by BOTH renderGalaxySoul (emitted on every regen) AND scripts/soul-ai-synergy-stamp.mjs
// (the lighter "stamp without a full regen" path). One builder + one marker => the two writers can
// never drift (R7), and the tolerant `hasAiStackBlock` recognizes the legacy dated marker too so
// neither path double-stamps a soul that already carries the block in either form.
export const AI_SYNERGY_STACK_MARKER = "<!-- AI-SYNERGY-STACK -->";

/** Build the galaxy-templated AI-Stack block as an array of markdown lines. PURE. */
export function buildAiStackBlock(galaxy) {
  const g = String(galaxy || "").trim();
  return [
    AI_SYNERGY_STACK_MARKER,
    "## AI Stack (synergized -- fleet-wide)",
    "This galaxy reasons over its OWN doctrine (this SOUL.md + CLAUDE.md + MEMORY.md + AWARENESS.md + " +
      `the \`${g}_synthesis.md\` Obsidian vault brain) through the **galaxy-reasoning-bridge** (PSN leg #10):`,
    `\`node scripts/lib/galaxy-reasoning-bridge.mjs ${g} "<question>"\` -- $0, local Ollama.`,
    "",
    "Active stack: **hybrid RAG** (sparse + nomic-embed dense rerank, ON by default; opt-out " +
      "`PRISM_GALAXY_RAG_DENSE=0`), **CAG** answer-cache (content-invalidated), and **LoRA** self-improvement " +
      "emit (`PRISM_GALAXY_BRIDGE_LORA_EMIT=1` -> the fleet training corpus `state/shared/lora/fleet-lora-combined.jsonl`).",
    "Cross-substrate: this soul + its synthesis brain feed the GNN node-features + the LoRA dataset. " +
      "Clone-not-fork: identical across all 34 galaxy souls (R15 apply-to-all).",
  ];
}

/** True if text already carries an AI-Stack block in EITHER the canonical or the legacy dated marker form. */
export function hasAiStackBlock(text) {
  return typeof text === "string" && /<!--\s*AI-SYNERGY-STACK(:[^>]*)?\s*-->/.test(text);
}

function esc(s) {
  return typeof s === "string" ? s.replace(/\r?\n/g, " ").trim() : "";
}

/** First meaningful line of a markdown doc (skips frontmatter, blank lines, bare headings). */
export function firstHeadline(md, fallback = "") {
  if (typeof md !== "string" || !md) return fallback;
  let body = md;
  // strip a leading YAML frontmatter block
  const fm = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) body = body.slice(fm[0].length);
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const h = line.replace(/^#+\s*/, "").trim();
      if (h) return h; // a heading with text is a fine headline
      continue;
    }
    if (line.startsWith(">") || line.startsWith("---") || line.startsWith("<!--")) continue;
    return line.replace(/^[-*]\s*/, "").trim();
  }
  return fallback;
}

/**
 * Render a galaxy SOUL.md. PURE.
 * @param {object} d descriptor:
 *   galaxy          {string}  REQUIRED galaxy name
 *   slot            {string?} owner slot (null if slotless infra galaxy)
 *   role            {string?} owner slot role
 *   voice           {string?} owner slot voice
 *   tone            {string?} owner slot tone
 *   refuseList      {string[]?} owner slot refuse_list
 *   claudeHeadline  {string?} identity line from CLAUDE.md
 *   memoryHeadline  {string?} description line from MEMORY.md
 *   posture         {object?} { score, band, rank, total, gaps:[str], topRec, subScores }
 *   generatedAt     {string?} ISO timestamp to stamp (else "generated")
 */
export function renderGalaxySoul(d) {
  if (!d || typeof d.galaxy !== "string" || !d.galaxy.trim()) {
    throw new Error("renderGalaxySoul: descriptor.galaxy (non-empty string) required");
  }
  const galaxy = d.galaxy.trim();
  const slot = d.slot || null;
  const role = esc(d.role) || (slot ? `${slot}-owned` : "fleet-shared infra galaxy");
  const voice = esc(d.voice);
  const tone = esc(d.tone);
  const slotRefuses = Array.isArray(d.refuseList) ? d.refuseList.filter(Boolean) : [];
  // Domain-specific enrichment (generate-galaxy-soul-enrichment.mjs, local-GPU): the missing
  // domain identity for slotless infra galaxies that the quality audit graded weak.
  const domainRefuses = Array.isArray(d.domainRefuses) ? d.domainRefuses.filter(Boolean) : [];
  const domainFilter = esc(d.domainFilter);
  const specialistBody = esc(d.specialistBody);
  // Union of refuses (domain first -- they are the galaxy-specific ones), deduped.
  const refuses = [...new Set([...domainRefuses, ...slotRefuses])];
  const p = d.posture || null;
  const identity = esc(d.claudeHeadline) || esc(d.memoryHeadline) || `${galaxy} galaxy`;
  const stamp = d.generatedAt || "generated";

  const fm = [
    "---",
    `galaxy: ${galaxy}`,
    `slot: ${slot || "(none)"}`,
    `role: ${role}`,
    voice ? `voice: ${voice}` : null,
    tone ? `tone: ${tone}` : null,
    domainFilter ? `domain_filter: ${domainFilter}` : null,
    `codebase_access: full`,
    `multi_domain: true`,
    p ? `ai_synergy_score: ${p.score}` : null,
    p ? `ai_synergy_band: ${p.band}` : null,
    `schemaVersion: ${SOUL_SCHEMA_VERSION}`,
    `generated_by: scripts/generate-galaxy-souls.mjs`,
    `generated_at: ${stamp}`,
    "---",
  ].filter((x) => x != null);

  const lines = [...fm, ""];
  lines.push(`# ${galaxy} -- galaxy soul`);
  lines.push("");
  if (slot) {
    const vt = [voice, tone].filter(Boolean).join(", ");
    lines.push(`> Owner slot: **${slot}** (${role}).${vt ? ` Voice: ${vt}.` : ""}`);
  } else {
    lines.push(`> Slotless infra galaxy -- no dedicated chat; fleet-shared.`);
  }
  lines.push("");
  lines.push(`**Identity:** ${identity}`);
  lines.push("");

  // Domain-specialist body (what THIS galaxy obsesses over) -- the domain-grounded identity
  // the quality audit found missing in slotless infra souls.
  if (specialistBody) {
    lines.push(`## What this specialist does`);
    lines.push(specialistBody);
    lines.push("");
  }

  // AI-synergy posture -- the synergy surface (souls <-> AI audit).
  lines.push("## AI-synergy posture");
  if (p) {
    const rank = p.rank && p.total ? ` | fleet rank ${p.rank}/${p.total}` : "";
    lines.push(`- score **${p.score}** (${p.band})${rank}`);
    if (p.subScores) {
      const s = p.subScores;
      const dv = (k) => (s[k] == null ? "n/a" : s[k]);
      lines.push(
        `- dims: discoverability ${dv("discoverability")} / ownsOrWiresAi ${dv("ownsOrWiresAi")} / ` +
          `vaultSynergy ${dv("vaultSynergy")} / crossSubstrate ${dv("crossSubstrate")} / awarenessSurface ${dv("awarenessSurface")}`
      );
    }
    if (Array.isArray(p.gaps) && p.gaps.length) lines.push(`- gaps: ${p.gaps.join(", ")}`);
    if (p.topRec) lines.push(`- next: ${esc(p.topRec)}`);
  } else {
    lines.push("- not yet measured (run `node scripts/audit-ai-synergy.mjs`)");
  }
  lines.push("");

  // Multi-domain codebase access (operator directive 2026-06-30: "all chats can access
  // multiple domains ... full access to the codebase"). Every soul now declares full
  // codebase access; domain_filter above is a PREFERENCE (lead your specialty first), not
  // a wall. Worktree/lane isolation guards are unchanged -- they gate git tree, not domain.
  lines.push("## Codebase access");
  lines.push(
    `- **Full multi-domain access** (operator directive 2026-06-30). This slot may read, ` +
      `reason over, and work in ANY domain across the whole codebase -- not only ${galaxy}.`
  );
  lines.push(
    `- **Prefer own domain first:** lead ${galaxy} work by default (the \`domain_filter\` is a ` +
      `focus hint). Take cross-domain work when it serves the operator's goal or when the own ` +
      `queue is dry (never idle).`
  );
  lines.push(
    "- **Coordinate** cross-domain work via chat-bus + `[MAIN-FORCE]` commits on the shared trunk " +
      "so a peer slot does not double-build the same artifact. Worktree/lane guards (git tree) are unchanged."
  );
  lines.push("");

  if (refuses.length) {
    // Domain refuses are the galaxy-specific ones; slot refuses are inherited. Label by source.
    const heading = domainRefuses.length
      ? slotRefuses.length
        ? "## Refuses (domain-specific + inherited from owner slot)"
        : "## Refuses (domain-specific)"
      : "## Refuses (inherited from owner slot)";
    lines.push(heading);
    for (const r of refuses) lines.push(`- ${r}`);
    lines.push("");
  }

  lines.push("## Substrate links");
  lines.push(`- doctrine: [CLAUDE.md](CLAUDE.md) | brain: [MEMORY.md](MEMORY.md) | paths: [PATHS.md](PATHS.md) | tools: [TOOLBELT.md](TOOLBELT.md)`);
  lines.push("- AI-synergy audit: `state/shared/specs/AI-SYNERGY-AUDIT.md` (wiki `[[ai-synergy-audit-ms0]]`)");
  lines.push("");

  // AI Stack (synergized) -- the DURABLE per-galaxy AI-synergy section, from the single-source
  // builder shared with scripts/soul-ai-synergy-stamp.mjs. Folded INTO the renderer so a soul regen
  // can never STRIP it (it originated as a manual render-orphaned block hand-appended to all 34 souls
  // on 2026-06-11; the next regen would have deleted it fleet-wide). R7: one writer-of-record now.
  lines.push(...buildAiStackBlock(galaxy));
  lines.push("");

  lines.push(
    "_Auto-generated by `scripts/generate-galaxy-souls.mjs` (AI-SYNERGY-AUDIT-MS0). " +
      "Synthesized from the owner slot soul + galaxy CLAUDE/MEMORY + the live AI-synergy audit; re-run to refresh._"
  );
  return lines.join("\n");
}
