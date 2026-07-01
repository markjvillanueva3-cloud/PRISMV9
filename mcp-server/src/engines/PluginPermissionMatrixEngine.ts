/**
 * PluginPermissionMatrixEngine — HCAP16 plugin × capability authorization matrix.
 *
 * Pure-core: maps plugin_id × capability → permission verdict (grant /
 * deny / require-approval).  Composes with U-HCAP01 PluginRegistry +
 * U-HAGI02 UnifiedControlPlane: the matrix is the lookup table the
 * control plane consults to approve a plugin invocation.
 *
 * @module engines/PluginPermissionMatrixEngine
 */

import { z } from "zod";

export const PermissionVerdictSchema = z.enum(["grant", "deny", "require-approval"]);
export type PermissionVerdict = z.infer<typeof PermissionVerdictSchema>;

export const MatrixEntrySchema = z.object({
  plugin_id: z.string().min(1).max(120),
  capability: z.string().min(1).max(120),
  verdict: PermissionVerdictSchema,
  reason: z.string().max(500).optional(),
});
export type MatrixEntry = z.infer<typeof MatrixEntrySchema>;

export interface PermissionMatrixState {
  entries: Map<string, MatrixEntry>;
  default_verdict: PermissionVerdict;
}

const HARD_MATRIX_CEILING = 5_000;

function keyOf(plugin_id: string, capability: string): string {
  return `${plugin_id}:::${capability}`;
}

export class PluginPermissionMatrixEngine {
  static validateEntry(e: unknown): MatrixEntry { return MatrixEntrySchema.parse(e); }

  static empty(default_verdict: PermissionVerdict = "deny"): PermissionMatrixState {
    PermissionVerdictSchema.parse(default_verdict);
    return { entries: new Map(), default_verdict };
  }

  /** Set a (plugin_id, capability) verdict — replaces if exists. */
  static set(state: PermissionMatrixState, entry: MatrixEntry): PermissionMatrixState {
    MatrixEntrySchema.parse(entry);
    if (state.entries.size >= HARD_MATRIX_CEILING && !state.entries.has(keyOf(entry.plugin_id, entry.capability))) {
      throw new Error(`PluginPermissionMatrix.set: ceiling ${HARD_MATRIX_CEILING} reached`);
    }
    const next = new Map(state.entries);
    next.set(keyOf(entry.plugin_id, entry.capability), entry);
    return { ...state, entries: next };
  }

  /** Look up the verdict for (plugin_id, capability); falls back to default_verdict. */
  static lookup(state: PermissionMatrixState, plugin_id: string, capability: string): MatrixEntry {
    const hit = state.entries.get(keyOf(plugin_id, capability));
    if (hit) return hit;
    return {
      plugin_id, capability,
      verdict: state.default_verdict,
      reason: "default policy (no matrix entry)",
    };
  }

  /** Remove a (plugin_id, capability) entry; throws if missing. */
  static remove(state: PermissionMatrixState, plugin_id: string, capability: string): PermissionMatrixState {
    const k = keyOf(plugin_id, capability);
    if (!state.entries.has(k)) {
      throw new Error(`PluginPermissionMatrix.remove: entry not found for ${plugin_id}/${capability}`);
    }
    const next = new Map(state.entries);
    next.delete(k);
    return { ...state, entries: next };
  }

  /** Filter entries by verdict (operator audit surface). */
  static filterByVerdict(state: PermissionMatrixState, verdict: PermissionVerdict): MatrixEntry[] {
    PermissionVerdictSchema.parse(verdict);
    return [...state.entries.values()].filter((e) => e.verdict === verdict);
  }

  /** Aggregate counts per verdict. */
  static stats(state: PermissionMatrixState): { grant: number; deny: number; require_approval: number; total: number } {
    const all = [...state.entries.values()];
    return {
      grant: all.filter((e) => e.verdict === "grant").length,
      deny: all.filter((e) => e.verdict === "deny").length,
      require_approval: all.filter((e) => e.verdict === "require-approval").length,
      total: all.length,
    };
  }

  static renderState(state: PermissionMatrixState): string {
    const s = PluginPermissionMatrixEngine.stats(state);
    return `[PERM-MATRIX] default=${state.default_verdict} total=${s.total} grant=${s.grant} deny=${s.deny} approval=${s.require_approval}`;
  }
}

export const pluginPermissionMatrixEngine = PluginPermissionMatrixEngine;
