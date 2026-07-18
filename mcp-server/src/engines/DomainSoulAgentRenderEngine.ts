/**
 * DomainSoulAgentRenderEngine -- DOMAIN-SOUL-AGENTS / U1.
 *
 * Pure-core: composes a slot SOUL (persona + domain_filter + refuse_list) with its
 * galaxy's knowledge pointers into a spawnable Claude subagent definition
 * (`.claude/agents/<slot>-<domain>.md`). The operator directive (2026-06-30):
 * "make each chat slot domain an agent soul" -- turn the 26 domain souls into
 * dispatchable `subagent_type`s so any (now multi-domain) chat can spawn a full
 * domain expert for ANY task touching that domain's data (build / review / audit).
 *
 * Mirrors the proven `scripts/lib/galaxy-soul-render.mjs` render pattern, but emits
 * the AGENT frontmatter shape (`name`/`description`/`tools`/`maxTurns`/`model`) the
 * Agent tool consumes -- plus carried-through `slot`/`domain`/`domain_filter`/
 * `hermes_capable` keys the auto-trigger + hybrid-lane selector read.
 *
 * Pure: no I/O. The generator (`scripts/generate-domain-soul-agents.mjs`) reads the
 * soul + galaxy files from disk and calls `renderAgent`. Filesystem stays out of here
 * so the rendering is unit-testable with literal inputs (R9).
 *
 * @module engines/DomainSoulAgentRenderEngine
 */

// WIRE-EXEMPT: build-time renderer consumed by scripts/generate-domain-soul-agents.mts (the "single
// source of truth" generator that emits the .claude/agents/<slot>-<domain>.md fleet under tsx). By
// design it has NO runtime dispatcher consumer -- rendering an agent file is an offline generation
// step, not a request path. The runtime "route a task to the right domain-soul agent" need is served
// separately by prism_session:domain_soul_agent_route (SoulFrontmatterReaderEngine + HybridAgentDispatchEngine).

import { z } from "zod";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

/** Default tool grant for a domain-soul agent. Full build/work tools per operator
 *  ("any task ... whether reviewing, auditing or building"). */
export const DEFAULT_AGENT_TOOLS = ["Read", "Grep", "Glob", "Bash", "Write", "Edit"] as const;

/** Default turn budget -- a domain build/review agent needs more than a one-shot reviewer. */
export const DEFAULT_AGENT_MAX_TURNS = 30;

/** Hard cap on the rendered body so a runaway galaxy-meta blob can't bloat the agent file. */
export const MAX_RENDERED_BYTES = 24_000;

/** Galaxy-knowledge metadata the agent body points at. All optional -- a slotless or
 *  thin galaxy renders a valid (smaller) agent. */
export const GalaxyMetaSchema = z.object({
  /** Canonical domain name for this slot, e.g. "quoting", "erp", "cad". */
  domain: z.string().min(1).max(60),
  /** One-line identity headline (first line of the galaxy CLAUDE.md / SOUL.md). */
  identity: z.string().max(400).optional(),
  /** Galaxy doctrine/knowledge file paths the agent should consult (CLAUDE/MEMORY/PATHS/TOOLBELT). */
  knowledgePaths: z.array(z.string().min(1).max(200)).max(12).optional(),
  /** Optional model override for this agent (else inherit the spawning chat's model). */
  model: z.string().min(1).max(60).optional(),
});
export type GalaxyMeta = z.infer<typeof GalaxyMetaSchema>;

export interface RenderResult {
  ok: boolean;
  /** `<slot>-<domain>` -- the subagent_type name. */
  name: string;
  /** The full `.md` file contents (frontmatter + body). */
  content: string;
  errors: string[];
}

/** YAML-escape a scalar that may carry colons/quotes (descriptions do). Keeps the
 *  flat slot-soul YAML dialect (no multiline) the readers expect. */
function yamlScalar(s: string): string {
  const v = String(s ?? "").replace(/\r?\n/g, " ").trim();
  // Quote when the value contains a YAML-significant char.
  if (/[:#"'\[\]{}|>&*!?,]/.test(v)) return `"${v.replace(/"/g, '\\"')}"`;
  return v;
}

export class DomainSoulAgentRenderEngine {
  /**
   * Render a domain-soul agent definition from a slot soul + galaxy meta.
   *
   * - Missing/invalid soul -> `ok:false` with errors (never throws on caller data).
   * - Invalid galaxy meta -> `ok:false`.
   * - Oversize render -> truncates body to MAX_RENDERED_BYTES and flags a warning in errors,
   *   but still returns `ok:true` (a too-long galaxy blob must not block the whole fleet).
   */
  static renderAgent(soul: SlotSoul | null | undefined, meta: GalaxyMeta): RenderResult {
    const errors: string[] = [];
    if (!soul || typeof soul !== "object" || !soul.slot) {
      return { ok: false, name: "", content: "", errors: ["soul with a slot is required"] };
    }
    const parsedMeta = GalaxyMetaSchema.safeParse(meta);
    if (!parsedMeta.success) {
      return {
        ok: false,
        name: "",
        content: "",
        errors: [`invalid galaxy meta: ${parsedMeta.error.issues.map((i) => i.message).join("; ")}`],
      };
    }
    const m = parsedMeta.data;
    const slot = soul.slot.toLowerCase().trim();
    const domain = m.domain.toLowerCase().trim();
    const name = `${slot}-${domain}`;
    const identity = (m.identity || soul.role || `${domain} specialist`).replace(/\r?\n/g, " ").trim();

    // ---- frontmatter -------------------------------------------------------
    const desc =
      `Domain expert for ${domain} (slot ${slot}). Spawn for ANY task touching ${domain} ` +
      `data - build, review, or audit. ${identity}. Carries the ${slot} soul's persona + refuse-list ` +
      `+ ${domain} domain knowledge.`;
    const fm: string[] = [
      "---",
      `name: ${name}`,
      `description: ${yamlScalar(desc)}`,
      `tools: ${DEFAULT_AGENT_TOOLS.join(", ")}`,
      `maxTurns: ${DEFAULT_AGENT_MAX_TURNS}`,
    ];
    if (m.model) fm.push(`model: ${m.model}`);
    // Carried-through keys (read by the auto-trigger + hybrid-lane selector). Not
    // standard agent fields, but harmless extra frontmatter the loader ignores.
    fm.push(`slot: ${slot}`);
    fm.push(`domain: ${domain}`);
    if (soul.domain_filter) fm.push(`domain_filter: ${yamlScalar(soul.domain_filter)}`);
    if (soul.preferred_subagent_type) fm.push(`review_subagent_type: ${soul.preferred_subagent_type}`);
    fm.push(`hermes_capable: true`);
    fm.push(`generated_by: scripts/generate-domain-soul-agents.mjs`);
    fm.push("---");

    // ---- body --------------------------------------------------------------
    const lines: string[] = [];
    lines.push(`# ${name} -- ${domain} domain expert (slot ${slot})`);
    lines.push("");
    lines.push(
      `You are the **${domain}** domain expert for the PRISM manufacturing-intelligence platform, ` +
        `carrying the **${slot}** slot's soul. You are spawned whenever a task touches ${domain} data -- ` +
        `to **build**, **review**, or **audit** it. ${identity}.`
    );
    lines.push("");

    lines.push(`## Voice & focus`);
    lines.push(`- Voice: **${soul.voice || "precise"}**. Tone: **${soul.tone || "direct"}**.`);
    if (soul.escalation_path) lines.push(`- Escalation: ${soul.escalation_path}.`);
    lines.push(
      `- Obsess over the ${domain} cost/correctness stack in honest units; report results with their ` +
        `confidence + evidence (file:line), never a bare claim (R12).`
    );
    lines.push("");

    // Refuse-list -- the domain guardrails, VERBATIM. These are hard refusals.
    const refuses = Array.isArray(soul.refuse_list) ? soul.refuse_list.filter(Boolean) : [];
    if (refuses.length) {
      lines.push(`## Refuse-list (HARD -- never do these, even if asked)`);
      for (const r of refuses) lines.push(`- ${r}`);
      lines.push("");
    }

    // Domain knowledge pointers -- where this expert reads its doctrine.
    lines.push(`## Domain knowledge (read before deep work)`);
    const kp = Array.isArray(m.knowledgePaths) ? m.knowledgePaths.filter(Boolean) : [];
    if (kp.length) {
      for (const p of kp) lines.push(`- \`${p}\``);
    } else {
      lines.push(`- \`mcp-server/src/engines/${domain}/\` -- galaxy doctrine (CLAUDE.md / MEMORY.md if present)`);
    }
    lines.push(`- Universal rails: \`H:/prism/CLAUDE.md\` (R1-R16, scrutiny 3-of-3, no-stub, units-first).`);
    lines.push("");

    // Multi-domain access (operator 2026-06-30) -- this agent is dispatchable from any chat.
    lines.push(`## Codebase access`);
    lines.push(
      `- **Full multi-domain access**: lead ${domain} work, but you may read/reason across the whole codebase. ` +
        `Worktree/lane isolation (which git tree commits land on) is unchanged.`
    );
    lines.push("");

    lines.push(`## Operating rules`);
    lines.push(`1. Cite \`file:line\` for every claim of existence/absence -- verify with Read/Grep, never fabricate (R12).`);
    lines.push(`2. No stubs, no placeholder returns, no \`.skip\`-ped or weakened tests. Real reference-value / algebraic-invariant tests only (R9).`);
    lines.push(`3. Import constants from canonical sources (e.g. \`src/physics/constants.ts\`); never inline shop-rate / margin / physics constants.`);
    lines.push(`4. Your final message IS the return value -- return the concrete result (data / verdict / diff), not a human-facing summary.`);
    lines.push("");
    lines.push(
      `_Auto-generated by \`scripts/generate-domain-soul-agents.mjs\` from \`state/shared/slot-souls/${slot}.md\` + the ${domain} galaxy doctrine. Re-run to refresh; edit the SOUL, not this file._`
    );

    let content = fm.join("\n") + "\n\n" + lines.join("\n") + "\n";
    if (content.length > MAX_RENDERED_BYTES) {
      content = content.slice(0, MAX_RENDERED_BYTES - 1) + "\n";
      errors.push(`rendered body exceeded ${MAX_RENDERED_BYTES} bytes; truncated`);
    }

    return { ok: true, name, content, errors };
  }
}

export const domainSoulAgentRenderEngine = new DomainSoulAgentRenderEngine();
