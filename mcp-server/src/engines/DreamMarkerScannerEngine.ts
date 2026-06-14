/**
 * DreamMarkerScannerEngine — pure-core parser for offline `DREAM:` source markers.
 *
 * Adopted verbatim from Hermes Dreaming v0.1.0 (Tony Simons,
 * github.com/asimons81/hermes-dreaming) "offline-first" marker format:
 *
 *     DREAM: memory: <text>
 *     DREAM: user:   <text>
 *     DREAM: fact:   { "type": "preference", "key": "<key>", "value": "<value>" }
 *     DREAM: skill:  path=<rel-path> | <description>
 *
 * Pure-core: takes a single text source (handoff body, memory file content,
 * transcript tail, wiki page, anything) and emits an array of parsed
 * `DreamMarker` records.  No I/O — caller reads files.
 *
 * Output composes with `DreamArtifactBundleEngine` via the
 * `markersToProposals()` adapter on this class.
 *
 * Spec: state/shared/specs/HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md (U-DR07)
 *
 * @module engines/DreamMarkerScannerEngine
 */

import { z } from "zod";
import type { Proposal } from "./DreamArtifactBundleEngine.js";

export const MarkerKindSchema = z.enum(["memory", "user", "fact", "skill"]);
export type MarkerKind = z.infer<typeof MarkerKindSchema>;

/** One parsed `DREAM:` marker from the source. */
export const DreamMarkerSchema = z.object({
  kind: MarkerKindSchema,
  /** Body following `DREAM: <kind>:` — fact is the parsed JSON object; everything else is the trimmed string OR skill object. */
  body: z.unknown(),
  /** 1-based line number where the marker was found.  Useful for "source.jsonl" provenance. */
  line: z.number().int().min(1),
  /** Raw marker text (trimmed) — preserved for audit. */
  raw: z.string().min(1).max(2000),
}).strict();
export type DreamMarker = z.infer<typeof DreamMarkerSchema>;

export interface ScanResult {
  markers: DreamMarker[];
  malformed: { line: number; raw: string; reason: string }[];
  total_lines_scanned: number;
}

// The canonical marker prefix.  We require a colon after both DREAM and the kind.
// Tolerate any leading whitespace + optional markdown bullet prefix.
// Capture group 1 = kind (memory|user|fact|skill); group 2 = body.
const MARKER_RE = /^\s*(?:[-*]\s+)?DREAM:\s*(memory|user|fact|skill)\s*:\s*(.+?)\s*$/i;

// Skill body shape: `path=<rel-path>` half (capture 1 = path).
const SKILL_PATH_RE = /^path\s*=\s*(.+)$/i;

// For fact markers, the body must be valid JSON describing a typed key/value record.
const FactBodySchema = z.object({
  type: z.string().min(1).max(60),
  key: z.string().min(1).max(120),
  value: z.union([z.string().max(500), z.number(), z.boolean(), z.null()]),
}).strict();

export class DreamMarkerScannerEngine {
  /**
   * Scan a text source for `DREAM:` markers.  Newlines split lines; the parser
   * runs once per line.  Markers that match the prefix but fail body validation
   * land in `malformed[]` rather than throwing — the operator sees both buckets.
   *
   * @param source — raw text content
   * @returns ScanResult with markers, malformed, and total_lines_scanned
   */
  static scan(source: string): ScanResult {
    if (typeof source !== "string") {
      throw new TypeError("DreamMarkerScannerEngine.scan: source must be a string");
    }
    const lines = source.split(/\r?\n/);
    const markers: DreamMarker[] = [];
    const malformed: { line: number; raw: string; reason: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const line = lines[i];
      const m = line.match(MARKER_RE);
      if (!m) continue;

      const kindRaw = m[1].toLowerCase();
      const kindParse = MarkerKindSchema.safeParse(kindRaw);
      if (!kindParse.success) {
        malformed.push({ line: lineNo, raw: line, reason: `unknown kind "${kindRaw}"` });
        continue;
      }
      const kind = kindParse.data;
      const bodyText = m[2].trim();
      if (bodyText.length === 0) {
        malformed.push({ line: lineNo, raw: line, reason: "empty body" });
        continue;
      }

      let body: unknown = bodyText;
      if (kind === "fact") {
        try {
          const parsed = JSON.parse(bodyText) as unknown;
          const fact = FactBodySchema.safeParse(parsed);
          if (!fact.success) {
            malformed.push({
              line: lineNo,
              raw: line,
              reason: `fact schema: ${fact.error.issues.map((x) => `${x.path.join(".") || "<root>"}: ${x.message}`).join("; ")}`,
            });
            continue;
          }
          body = fact.data;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          malformed.push({ line: lineNo, raw: line, reason: `fact JSON parse: ${msg}` });
          continue;
        }
      } else if (kind === "skill") {
        const pipeIdx = bodyText.indexOf("|");
        if (pipeIdx < 0) {
          malformed.push({ line: lineNo, raw: line, reason: "skill body missing '|' separator (expected: path=<p> | <desc>)" });
          continue;
        }
        const left = bodyText.slice(0, pipeIdx).trim();
        const right = bodyText.slice(pipeIdx + 1).trim();
        const pathMatch = left.match(SKILL_PATH_RE);
        if (!pathMatch || pathMatch[1].length === 0 || right.length === 0) {
          malformed.push({ line: lineNo, raw: line, reason: "skill body must be `path=<rel-path> | <description>` with both parts non-empty" });
          continue;
        }
        body = { path: pathMatch[1].trim(), description: right };
      }

      markers.push(DreamMarkerSchema.parse({
        kind,
        body,
        line: lineNo,
        raw: line.trim().slice(0, 2000),
      }));
    }

    return { markers, malformed, total_lines_scanned: lines.length };
  }

  /**
   * Adapter — convert parsed markers into bundle Proposal records targeted at
   * the relevant artifact (slot soul for memory/user/fact; skill file for skill).
   *
   * @param markers — output of `scan().markers`
   * @param opts.slot_soul_path — where memory/user/fact markers land (e.g. state/shared/slot-souls/<slot>.md)
   * @param opts.skill_root — directory for skill proposals (e.g. .claude/commands)
   * @param opts.source_path — provenance source path included in the rationale
   * @returns Proposal[] suitable for `DreamArtifactBundleEngine.appendProposal()` or `createBundle({ proposals })`
   */
  static markersToProposals(
    markers: readonly DreamMarker[],
    opts: { slot_soul_path: string; skill_root: string; source_path: string }
  ): Proposal[] {
    const proposals: Proposal[] = [];
    for (const m of markers) {
      if (m.kind === "skill") {
        const skill = m.body as { path: string; description: string };
        proposals.push({
          proposal_id: `dream-skill-${skill.path.replace(/[^a-zA-Z0-9_-]+/g, "-")}-L${m.line}`,
          target_path: `${opts.skill_root}/${skill.path.replace(/^\/+/, "")}`,
          mutation_type: "write",
          risk_class: "skill",
          before_sha256: null,
          after_content: `# Skill: ${skill.path}\n\n${skill.description}\n`,
          provenance: `dream-marker scan source=${opts.source_path} line=${m.line}`,
          rationale: skill.description.slice(0, 1000),
        });
      } else if (m.kind === "fact") {
        const fact = m.body as { type: string; key: string; value: unknown };
        proposals.push({
          proposal_id: `dream-fact-${fact.type}-${fact.key}-L${m.line}`,
          target_path: opts.slot_soul_path,
          mutation_type: "append",
          risk_class: "memory",
          before_sha256: null,
          after_content: `+ fact: ${fact.type}.${fact.key} = ${JSON.stringify(fact.value)}`,
          provenance: `dream-marker scan source=${opts.source_path} line=${m.line}`,
          rationale: "",
        });
      } else {
        const text = m.body as string;
        proposals.push({
          proposal_id: `dream-${m.kind}-L${m.line}`,
          target_path: opts.slot_soul_path,
          mutation_type: "append",
          risk_class: "memory",
          before_sha256: null,
          after_content: `+ ${m.kind}: ${text}`,
          provenance: `dream-marker scan source=${opts.source_path} line=${m.line}`,
          rationale: text.slice(0, 1000),
        });
      }
    }
    return proposals;
  }
}

export const dreamMarkerScannerEngine = DreamMarkerScannerEngine;
