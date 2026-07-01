/**
 * partial-milestone-drift.mjs — detect in-progress milestone + pending unit with on-disk engine.
 *
 * THIRD silent-drift class (after `silent-close-out-drift.mjs`'s envelope-complete-but-shipped-0
 * and `audit-close-out-candidates.mjs`'s envelope-pending-but-files-exist):
 *   envelope.status = "in_progress"
 *   + unit.status = "pending"
 *   + unit.title contains `XxxEngine` naming convention
 *   + `mcp-server/src/engines/<XxxEngine>.ts` exists (non-trivial size)
 *
 * Discovered 2026-05-23 by charlie /loop iter3 when closing out
 * WEDM-NEXT-MS0/U-WN06+U-WN08 (commit bd6931867b). The 2 closed units fit
 * this pattern exactly — neither `audit-close-out-candidates.mjs`'s
 * deliverable-string resolver nor the silent-close-out-drift detector
 * caught them because the units carry no path strings, only the title.
 *
 * Pure module — fs is injected. Test via direct call with synthetic envelopes.
 *
 * Author: charlie slot (claude-451f7328) /loop iter5, 2026-05-23.
 * Doctrine: feedback_auto_close_out + feedback_silent_close_out_drift.
 */

const PENDING_STATUSES = new Set([
  "pending", "in_progress", "in-progress", "wip", "planned", "active",
]);

const ENGINE_NAME_REGEX = /([A-Z][A-Za-z0-9_]+Engine)\b/g;

/** Treat anything but the obviously-finished envelope as "open". */
function isOpenEnvelope(env) {
  const s = String(env?.status || "").toLowerCase();
  return s !== "complete" && s !== "completed" && s !== "shipped" && s !== "done";
}

/**
 * Pull unit-detail records across the three observed shapes:
 *   - env.units[] = [{id,status,title,...}]                 (legacy flat)
 *   - env.phases[].units[] = [{id,status,...}]              (nested-object)
 *   - env.unit_list[] = [{id,status,title,...}] + env.phases[].units[] = ["U-ID",...] (split shape)
 * WEDM-NEXT-MS0 is the split-shape exemplar.
 */
function collectUnits(env) {
  const out = [];
  if (Array.isArray(env?.unit_list)) {
    for (const u of env.unit_list) if (u && typeof u === "object") out.push(u);
  }
  if (Array.isArray(env?.units) && env.units.length > 0 && typeof env.units[0] === "object") {
    for (const u of env.units) if (u && typeof u === "object") out.push(u);
  }
  if (Array.isArray(env?.phases)) {
    for (const p of env.phases) {
      if (Array.isArray(p?.units) && p.units.length > 0 && typeof p.units[0] === "object") {
        for (const u of p.units) if (u && typeof u === "object") out.push(u);
      }
      if (Array.isArray(p?.unit_list)) {
        for (const u of p.unit_list) if (u && typeof u === "object") out.push(u);
      }
    }
  }
  return out;
}

/**
 * Find partial-milestone-drift cases.
 *
 * @param {object} args
 * @param {Array<object>} args.envelopes  Loaded milestone envelopes.
 * @param {(engName:string) => { exists: boolean, sizeBytes: number } | null} args.engineProbe
 *        Caller-injected: given an EngineName, returns { exists, sizeBytes } or null.
 *        Lets tests stub the disk.
 * @param {object} [args.options]
 * @param {number} [args.options.minEngineBytes=1024]  Skip stubs (e.g. 200B).
 * @returns {{ candidates: Array<{ms_id:string, unit_id:string, unit_title:string, engine:string, engine_bytes:number}>, scanned:{milestones:number,units:number,engineMatches:number} }}
 */
export function findPartialMilestoneDrift({ envelopes, engineProbe, options = {} }) {
  const minEngineBytes = options.minEngineBytes ?? 1024;
  let unitsScanned = 0;
  let engineMatches = 0;
  let openMilestones = 0;
  const candidates = [];

  for (const env of envelopes || []) {
    if (!env || typeof env !== "object") continue;
    if (!isOpenEnvelope(env)) continue;
    openMilestones++;
    const units = collectUnits(env);
    for (const u of units) {
      unitsScanned++;
      const status = String(u?.status || "").toLowerCase();
      if (!PENDING_STATUSES.has(status)) continue;
      const title = String(u?.title || "");
      const matches = [...title.matchAll(ENGINE_NAME_REGEX)];
      for (const m of matches) {
        const engName = m[1];
        engineMatches++;
        const probe = engineProbe(engName);
        if (!probe || !probe.exists) continue;
        if (probe.sizeBytes < minEngineBytes) continue;
        candidates.push({
          ms_id: String(env.id || env.title || "?"),
          unit_id: String(u.id || u.unit_id || "?"),
          unit_title: title,
          engine: engName,
          engine_bytes: probe.sizeBytes,
        });
        break;
      }
    }
  }

  return {
    candidates,
    scanned: { milestones: openMilestones, units: unitsScanned, engineMatches },
  };
}

/** Render the markdown section for the parent audit report. */
export function renderMarkdown(candidates) {
  if (!candidates || candidates.length === 0) {
    return "_No partial-milestone-drift candidates._\n";
  }
  const rows = candidates.map(c =>
    `| ${c.ms_id} | ${c.unit_id} | ${c.engine} | ${c.engine_bytes} B | ${c.unit_title.replace(/\|/g, "\\|").slice(0, 80)} |`
  );
  return [
    "| Milestone | Unit | Engine | Size | Title |",
    "|-----------|------|--------|-----:|-------|",
    ...rows,
    "",
  ].join("\n");
}
