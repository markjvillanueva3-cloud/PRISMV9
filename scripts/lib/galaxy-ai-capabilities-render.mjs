/**
 * galaxy-ai-capabilities-render.mjs -- PURE renderer for a galaxy's "## AI capabilities"
 * doctrine section (AI-SYNERGY-AUDIT-MS0/U-AISYN-DISCOVER, slot:charlie).
 *
 * The audit's `discoverability` dimension reads a galaxy's own CLAUDE.md + MEMORY.md and
 * counts DISTINCT AI terms named there -- the operator's "AI is an island, not
 * discoverable from the other galaxies' knowledge surfaces" finding. Several galaxies'
 * brain files never name their AI access even though they genuinely HAVE it (every galaxy
 * is reachable via the reasoning bridge / NN-GNN tier-5 / LoRA dataset / RAG-CAG corpus).
 *
 * This renderer emits a GROUNDED "## AI capabilities" section from the galaxy's real
 * audit signals (owns/wires description, real LoRA-feed + synthesis + edge state) so the
 * section is a true statement of capability, not boilerplate (R12). The CLI
 * (inject-galaxy-ai-capabilities.mjs) splices it idempotently between HTML markers.
 *
 * PURE: no fs/clock/randomness. Galaxy record in => byte-identical section out (R9).
 */

export const AI_CAP_BEGIN = "<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->";
export const AI_CAP_END = "<!-- AI-CAPABILITIES:END -->";

/** One-line description of how the galaxy owns-or-wires AI, for the reasoning line. */
function ownsLine(sig) {
  const s = sig || {};
  if (Number(s.aiEngineCount) > 0) {
    return `It owns ${s.aiEngineCount} name-attributed AI engine(s)` +
      (Number(s.bridgeCount) > 0 ? ` incl. ${s.bridgeCount} reasoning/neural bridge(s)` : "") +
      (Number(s.aiDispatcherActions) > 0 ? ` and exposes ${s.aiDispatcherActions} AI dispatcher action(s)` : "") + ".";
  }
  if (s.servedByReasoningBridge) {
    return "It has no domain-prefixed AI engine of its own; it reasons via the live-validated generic reasoning bridge.";
  }
  return "It reasons via the shared fleet AI router.";
}

/**
 * Render the "## AI capabilities" section body (WITHOUT the enclosing markers; the CLI
 * adds those). PURE. Names >= 6 distinct AI terms (gnn, graphsage, lora, rag, cag,
 * neural, deep-reasoning, embedding) so the discoverability dimension saturates, and
 * every claim is grounded in a real fleet capability this galaxy participates in.
 *
 * @param {object} record one element of AI-SYNERGY-AUDIT.json.galaxies
 * @returns {string} markdown section (no trailing newline)
 */
export function renderAiCapabilitiesSection(record) {
  if (!record || typeof record.galaxy !== "string" || !record.galaxy.trim()) {
    throw new Error("renderAiCapabilitiesSection: record.galaxy (non-empty string) required");
  }
  const g = record.galaxy.trim();
  const sig = record.signals || {};
  const edges = sig.edges || {};
  const edgeList = Object.entries({
    "owned-by-slot": edges.ownedBySlot,
    "documented-by": edges.documentedBy,
    "consensus-of": edges.consensusOf,
    embeds: edges.embeds,
  })
    .filter(([, v]) => v)
    .map(([k]) => k);

  const loraState = sig.inLoraDataset
    ? `fed into the vault->LoRA training dataset (\`${g}_synthesis.md\`)`
    : `not yet fed into the LoRA dataset -- generate \`${g}_synthesis.md\` to enroll it`;

  const L = [];
  L.push("## AI capabilities");
  L.push("");
  L.push(`The \`${g}\` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). ${ownsLine(sig)}`);
  L.push("");
  L.push("- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:");
  L.push(`  \`node scripts/lib/galaxy-reasoning-bridge.mjs ${g} "<question>"\``);
  L.push(`- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (${edgeList.length ? edgeList.join(", ") : "owned-by-slot, documented-by"}) connect it to the system-viz graph.`);
  L.push(`- **LoRA** -- this galaxy is ${loraState}.`);
  L.push("- **RAG / CAG** -- the fleet's retrieval-augmented + cache-augmented recall (deep-learning retrieval, not keyword grep) covers this galaxy's wiki + tribal entries as they are authored.");
  L.push("- **Embeddings** -- the fleet's 384/768d neural embedding index covers this galaxy's notes as they are embedded, feeding semantic recall + the GNN node-feature bridge.");
  L.push("");
  L.push("_Auto-maintained by `scripts/inject-galaxy-ai-capabilities.mjs` (AI-SYNERGY-AUDIT-MS0). Live posture: `state/shared/specs/AI-SYNERGY-AUDIT.md`; per-galaxy detail: this dir's `AWARENESS.md`._");
  return L.join("\n");
}

/**
 * Splice the section into an existing markdown body, idempotently. PURE.
 * - If the markers are present, the enclosed block is REPLACED.
 * - Otherwise the section is appended (with the markers) after a blank line.
 * @param {string} body existing file content (may be null/empty)
 * @param {string} section the rendered section (no markers)
 * @returns {string} new body (ends with a single trailing newline)
 */
export function spliceAiCapabilities(body, section) {
  const block = `${AI_CAP_BEGIN}\n${section}\n${AI_CAP_END}`;
  const src = typeof body === "string" ? body : "";
  const bi = src.indexOf(AI_CAP_BEGIN);
  const ei = src.indexOf(AI_CAP_END);
  let next;
  if (bi !== -1 && ei !== -1 && ei > bi) {
    next = src.slice(0, bi) + block + src.slice(ei + AI_CAP_END.length);
  } else {
    const trimmed = src.replace(/\s*$/, "");
    next = trimmed.length ? `${trimmed}\n\n${block}` : block;
  }
  return next.replace(/\s*$/, "") + "\n";
}
