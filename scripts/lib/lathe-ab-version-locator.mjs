// Lathe A/B-version locator — implements U-LATHE-AB-VERSION-LOCATOR
// Design memo: reference_lathe_ab_version_locator_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
// Doctrine: B-versions are AI-generated PRISM v2.0.0 output — see feedback_jm_die_b_versions_are_ai_not_human_upgrade.
//
// Pure-functional helpers: parsePath, detectVersionTag, groupByPart, pairAB, classifyPairType.
// File-system scan is a thin CLI wrapper around these (see runner script).
// Both -A and -B explicit markers stripped during canonicalization (iter165).
// iter275: classifyPairType extracted from scan-jm-die-ab-pairs.mjs (iter257/iter270 inline logic).

// B-upgraded version-tag patterns (case-insensitive)
const B_PATTERNS = [
  /_REV\d+/i,
  /-B\b/i,
  /-NEW\b/i,
  /-UPDATED?\b/i,
  /_v[2-9]\d*/i,
  /_upgraded?\b/i
];

// A-original explicit-marker patterns (mirrors B set). Some shops mark BOTH sides:
// "11-10715-0-A.MIN" (original) + "11-10715-0-B.MIN" (upgrade). Without this,
// canonicalPartNum strips "-B" but leaves "-A" → pair fails to form.
const A_PATTERNS = [
  /-A\b/i,
  /_REV0\b/i,
  /_v1\b/i
];

// Folder-level upgrade indicators (path segment).
// PRISM_UPGRADED is the JM-Die canonical B-version folder (iter200 real-data finding).
const B_FOLDER_PATTERNS = [
  /^v[2-9]\d*$/i,
  /^upgraded?$/i,
  /^prism[_-]?upgraded?$/i,
  /^rev\d+$/i,
  /^new$/i
];

export function detectVersionTag(filename) {
  if (typeof filename !== "string" || filename.length === 0) return "A_original";
  for (const re of B_PATTERNS) {
    if (re.test(filename)) return "B_upgraded";
  }
  return "A_original";
}

function detectVersionFromFolders(pathParts) {
  // Walk path segments excluding the filename; if any matches a B-folder pattern, classify B.
  for (let i = 0; i < pathParts.length - 1; i++) {
    const seg = pathParts[i];
    for (const re of B_FOLDER_PATTERNS) {
      if (re.test(seg)) return "B_upgraded";
    }
  }
  return null;
}

function extractVersionSuffix(filename) {
  for (const re of B_PATTERNS) {
    const m = filename.match(re);
    if (m) return m[0];
  }
  return null;
}

function canonicalPartNum(filename) {
  // Strip extension + A-marker + B-suffix patterns to get the underlying part number.
  // Both A_PATTERNS and B_PATTERNS must be stripped so "PART-A" and "PART-B" share
  // the same canonical "PART" key for pairing.
  let name = filename.replace(/\.(MIN|PIM|NC)$/i, "");
  for (const re of A_PATTERNS) name = name.replace(re, "");
  for (const re of B_PATTERNS) name = name.replace(re, "");
  return name;
}

export function parsePath(fullPath) {
  if (typeof fullPath !== "string" || fullPath.length === 0) {
    return { parse_error: true, original: fullPath };
  }
  const norm = fullPath.replace(/\\/g, "/");
  const parts = norm.split("/").filter(Boolean);
  // Expect at least: JM DIE / CNC LATHE / <customer> / <part-num-dir> / <filename>
  if (parts.length < 4) {
    return { parse_error: true, original: fullPath };
  }
  const filename = parts[parts.length - 1];
  if (!/\.(MIN|PIM|NC)$/i.test(filename)) {
    return { parse_error: true, original: fullPath, reason: "unsupported extension" };
  }

  // Find "CNC LATHE" anchor (or fallback to position-based parsing)
  let customerIdx = -1;
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^CNC LATHE$/i.test(parts[i])) {
      customerIdx = i + 1;
      break;
    }
  }
  // Fallback: customer is the segment 2 before the filename (assumes <customer>/<part-dir>/<file>)
  if (customerIdx === -1) {
    customerIdx = Math.max(0, parts.length - 3);
  }

  // R12: if the segment at customerIdx IS the filename (file is at root under CNC LATHE/
  // with no customer subfolder), set customer to UNKNOWN — don't claim a part-name as a customer.
  let customer = parts[customerIdx] || "UNKNOWN";
  if (customerIdx === parts.length - 1) {
    customer = "UNKNOWN";
  }

  // Version detection: filename pattern wins; folder pattern is fallback
  const filenameTag = detectVersionTag(filename);
  const folderTag = detectVersionFromFolders(parts);
  const version_tag = filenameTag === "B_upgraded" ? "B_upgraded" : (folderTag || "A_original");
  // iter281: track whether B classification came from filename suffix (-B/_REV/etc) vs folder (PRISM_UPGRADED).
  // Used by pairAB to prefer canonical base-name B-files over human-revision variants inside PRISM_UPGRADED.
  // See [[reference_iter279_sfs_g80_anomaly_2026_05_27]] iter280 root-cause analysis.
  const filename_has_b_suffix = filenameTag === "B_upgraded";

  return {
    customer,
    part_num_canonical: canonicalPartNum(filename),
    version_tag,
    version_suffix: extractVersionSuffix(filename),
    filename_has_b_suffix,
    full_path: fullPath
  };
}

export function groupByPart(parsedRecords) {
  const groups = {};
  for (const rec of parsedRecords) {
    if (rec.parse_error) continue;
    const key = `${rec.customer}::${rec.part_num_canonical}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(rec);
  }
  return groups;
}

export function pairAB(groups, opts = {}) {
  const { includeUnpaired = false } = opts;
  const out = [];
  for (const [key, records] of Object.entries(groups)) {
    const aVersions = records.filter(r => r.version_tag === "A_original");
    const bVersions = records.filter(r => r.version_tag === "B_upgraded");

    if (aVersions.length === 0 && bVersions.length === 0) continue;

    if (aVersions.length === 0 && bVersions.length > 0) {
      if (includeUnpaired) {
        out.push({
          unpaired: true,
          unpaired_reason: "no_A_version",
          unpaired_part_num: records[0].part_num_canonical,
          customer: records[0].customer,
          records
        });
      }
      continue;
    }

    if (aVersions.length > 0 && bVersions.length === 0) {
      if (includeUnpaired) {
        out.push({
          unpaired: true,
          unpaired_reason: "no_B_version",
          unpaired_part_num: records[0].part_num_canonical,
          customer: records[0].customer,
          records
        });
      }
      continue;
    }

    // iter281: prefer base-name-matched B-files (no -B/_REV suffix in filename) over human-revision
    // variants when both coexist inside PRISM_UPGRADED. Canonical AI-generated outputs use the bare
    // <part>.nc filename; human revisions add -B/-REV suffixes. The locator should pick the AI output
    // for v2.0.0-pipeline analysis. See [[reference_iter279_sfs_g80_anomaly_2026_05_27]].
    const sortedBVersions = [...bVersions].sort((x, y) => {
      const xSuffix = x.filename_has_b_suffix ? 1 : 0;
      const ySuffix = y.filename_has_b_suffix ? 1 : 0;
      return xSuffix - ySuffix; // 0 (no suffix) sorts first
    });
    out.push({
      customer: records[0].customer,
      part_num: records[0].part_num_canonical,
      key,
      a: aVersions[0],
      b: sortedBVersions[0],
      a_count: aVersions.length,
      b_count: bVersions.length
    });
  }
  return out;
}

// iter275: pair-type classifier (3 classes: prism_upgraded / human_revision / empty_source).
// Extracted from scan-jm-die-ab-pairs.mjs inline logic (iter257 + iter270).
// Pure-ish: takes b_path string + optional a_text content. If a_text is provided
// and has fewer than `minLines` non-blank non-comment lines, classifies as empty_source.
// Otherwise classifies by whether b_path contains "PRISM_UPGRADED".
// See [[reference_ab_locator_over_pairing_human_revisions_2026_05_27]] iter269 update.
export function classifyPairType(bPath, aText = null, opts = {}) {
  const { minLines = 10 } = opts;
  if (typeof aText === "string") {
    const realCount = aText.split(/\r?\n/).filter(l => {
      const t = l.trim();
      return t && !t.startsWith("(");
    }).length;
    if (realCount < minLines) return "empty_source";
  }
  if (typeof bPath !== "string") return "human_revision";
  return bPath.includes("PRISM_UPGRADED") ? "prism_upgraded" : "human_revision";
}
