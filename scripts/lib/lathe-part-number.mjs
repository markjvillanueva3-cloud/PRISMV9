/**
 * lathe-part-number.mjs -- parse JM Die program filenames into {partNumber, revision}.
 *
 * The JOIN KEY for Rung C of the lathe closed-loop test: to score a generated
 * program against "the existing JM program for this part", we must pair a
 * generated output to its source .MIN/.nc by part number across revisions. Also
 * groups the A/B upgrade corpus by part.
 *
 * Observed JM conventions (real samples from JM DIE/CNC LATHE + OKUMA):
 *   A9099735-B.MIN     -> part A9099735, rev B
 *   A9102203.MIN       -> part A9102203, no rev
 *   11-10715-0-A.nc    -> part 11-10715-0, rev A
 *   A-11-10583-0.nc    -> part A-11-10583-0, no rev (leading token is part of the id)
 *
 * Rule: a trailing "-<single A-Z letter>" is the revision; everything before it
 * (or the whole stem if there is none) is the part number. Conservative on
 * purpose -- a wrong split silently mis-pairs programs, so we only strip a rev
 * when the trailing token is unambiguously a single letter.
 */
export function parsePartNumber(fileName) {
  if (!fileName) return { partNumber: null, revision: null };
  let base = String(fileName).split(/[\\/]/).pop();      // drop any directory
  base = base.replace(/\.[A-Za-z0-9]+$/, "").trim();      // drop a single trailing extension
  if (!base) return { partNumber: null, revision: null };
  const up = base.toUpperCase();
  const m = up.match(/^(.*[0-9A-Z])-([A-Z])$/);           // "<part>-<REV letter>"
  if (m) return { partNumber: m[1], revision: m[2] };
  return { partNumber: up, revision: null };
}

/** Group program file paths by part number (revision-agnostic). Returns Map<part, paths[]>. */
export function groupByPart(paths) {
  const groups = new Map();
  for (const p of paths || []) {
    const { partNumber } = parsePartNumber(p);
    if (!partNumber) continue;
    if (!groups.has(partNumber)) groups.set(partNumber, []);
    groups.get(partNumber).push(p);
  }
  return groups;
}
