/**
 * cam-min-op-normalizer.mjs — normalize a JM Okuma .MIN program into an ordered op-family list
 * the offline-loop oracle (cam-offline-loop.mjs) can score generation against.
 *
 * Grounded in the real corpus structure (CAM-CORPUS-PROGRAMMING-NOTES.md + live .MIN reads): each
 * operation is a `NAT<nn>  (DESCRIPTIVE COMMENT)` block followed by a T-code + spindle + cut. The
 * operator's own parenthetical comment is the most reliable family signal ("OD RGH. TURN",
 * "CENTER DRILL", "CUTOFF"); T-code roster + Okuma cycle G-codes (G85/G87 LAP, G71/G72 thread,
 * G74 peck) are fallbacks. CONSERVATIVE: emits 'unknown' when no confident signal — it does NOT
 * guess a family (a fabricated family would poison the learning signal). Pure (no I/O).
 *
 * Family vocabulary = the 15 CAM-OP-TEMPLATE-MATRIX families.
 */

// Ordered comment-keyword rules — FIRST match wins, so more-specific patterns precede general
// ones (FACE GROOVE before GROOVE before FACE; CENTER/SPOT DRILL before DRILL; FIN before TURN).
const COMMENT_RULES = [
  [/\bcut\s*-?\s*off\b|\bcutoff\b|\bpart\s*off\b|\bparting\b/i, "parting_cutoff"],
  [/\bface\s*groove\b|\bfgroove\b/i, "face_grooving"],
  [/\bgroove\b|\bgrv\b/i, "grooving"],
  [/\bthread\b|\btap\b/i, "threading"], // tap is corpus-rare; single-point thread is the norm
  [/\b(center|cntr|ctr|spot)\s*drill\b/i, "drilling_centering"],
  [/\bdrill\b/i, "peck_drill"], // plain DRILL: deep-hole peck family (refined by G74 below)
  [/\bchamfer\b|\bch'?fr\b/i, "chamfer"],
  [/\b(id|bore|boring)\b.*\bfin/i, "bore_finish"],
  [/\b(id|bore|boring)\b/i, "ID_boring"],
  [/\b(od|profile)\b.*\bfin/i, "OD_finishing"],
  [/\bfin(ish)?\b.*\bturn\b|\bturn\b.*\bfin/i, "OD_finishing"],
  [/\b(od|profile)\b.*\b(rgh|rough)\b|\b(rgh|rough)\b.*\bturn\b/i, "OD_roughing"],
  [/\bprofile\b|\bcontour\b/i, "profile"],
  [/\bface\b/i, "facing"],
  [/\b(od|turn)\b/i, "OD_roughing"], // bare OD/TURN -> roughing (most common default)
];

// T-code roster (corpus-canonical, used only as a fallback hint when the comment is silent).
const TCODE_FAMILY = {
  "01": "OD_roughing", "12": "OD_roughing", "02": "OD_finishing",
  "03": "drilling_centering", "04": "drilling_centering",
  "05": "peck_drill", "06": "threading",
  "07": "ID_boring", "08": "ID_boring", "09": "ID_boring",
  "10": "face_grooving", "11": "parting_cutoff",
};

function classifyByComment(comment) {
  if (!comment) return null;
  for (const [re, fam] of COMMENT_RULES) if (re.test(comment)) return fam;
  return null;
}

function classifyBySignature(blockText, tcode) {
  // Okuma cycle G-codes (corpus dialect): strongest structural hints.
  if (/\bG7[12]\b/.test(blockText)) return "threading"; // G71/G72 = Okuma threading
  if (/\bG74\b/.test(blockText)) return "peck_drill";    // G74 = peck drill/groove
  // T-code roster fallback.
  if (tcode && TCODE_FAMILY[tcode]) return TCODE_FAMILY[tcode];
  // G85/G87 LAP without a comment -> a turning op; default to roughing (most common).
  if (/\bG8[57]\b/.test(blockText)) return "OD_roughing";
  return null;
}

/**
 * @param {string} text  raw .MIN program text
 * @returns {{ ops:Array<{family:string,nat:string,comment:string,tcode:(string|null),
 *            confidence:('comment'|'signature'),evidence:string}>,
 *            unknown:Array<{nat:string,comment:string,tcode:(string|null)}>,
 *            opCount:number, unknownCount:number }}
 */
export function normalizeMinToOps(text) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("normalizeMinToOps: a non-empty .MIN program string is required");
  }
  const lines = text.split(/\r?\n/);
  // Locate NAT operation-block starts (the corpus's universal per-op marker).
  const natIdx = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*NAT\d+/i.test(lines[i])) natIdx.push(i);
  }

  const ops = [];
  const unknown = [];
  for (let k = 0; k < natIdx.length; k++) {
    const start = natIdx[k];
    const end = k + 1 < natIdx.length ? natIdx[k + 1] : lines.length;
    const blockText = lines.slice(start, end).join("\n");
    const natLine = lines[start];
    const natMatch = natLine.match(/^\s*(NAT\d+)/i);
    const nat = natMatch ? natMatch[1].toUpperCase() : "NAT?";
    // comment may be on the NAT line or the next couple lines (parenthetical)
    const commentMatch = blockText.match(/\(([^)]*)\)/);
    const comment = commentMatch ? commentMatch[1].trim() : "";
    // T-code: Txxyyzz -> first pair is the turret station
    const tMatch = blockText.match(/\bT(\d{2})\d{0,4}\b/);
    const tcode = tMatch ? tMatch[1] : null;

    let family = classifyByComment(comment);
    let confidence = "comment";
    if (!family) {
      family = classifyBySignature(blockText, tcode);
      confidence = "signature";
    }
    // refine: a "DRILL" comment WITHOUT a G74 peck cycle is shallow centering, not peck
    if (family === "peck_drill" && confidence === "comment" && !/\bG74\b/.test(blockText) && /drill/i.test(comment)) {
      family = "drilling_centering";
    }

    if (family) {
      ops.push({ family, nat, comment, tcode, confidence, evidence: comment || `T${tcode || "?"}/${confidence}` });
    } else {
      unknown.push({ nat, comment, tcode });
    }
  }

  return { ops, unknown, opCount: ops.length, unknownCount: unknown.length };
}
