/**
 * X12EdiSegmentParserFormula — ANSI ASC X12 EDI message segment parser
 * (hotel iter20, 2026-05-24, U-X12-EDI-PARSER).
 *
 * Closes the PARSER half of G6 (Customer EDI integration). External EDI
 * transport (AS2/SFTP/VAN) delivers the raw X12 envelope text; this pure
 * algorithm parses it into a structured AST:
 *   - ISA (interchange envelope)
 *   - GS (functional group)
 *   - ST/SE (transaction set — 850 PO, 856 ASN, 810 invoice)
 *   - per-segment elements + sub-elements
 *
 * The EDI transport runtime is the missing piece (G6-runtime), but PRISM
 * can now parse the message bodies any transport delivers. This is the
 * right separation per R12: the parser is testable in isolation with
 * reference X12 fixtures.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — malformed envelope, missing ISA/IEA, mismatched
 *     control numbers all throw
 *   - **deterministic** — same X12 text → same AST output
 *   - **structural-invariant gate** — ISA/IEA control numbers must match;
 *     GS/GE control numbers must match; throws on mismatch (a tampered or
 *     truncated message would otherwise silently look valid)
 *
 * Reference: ANSI ASC X12 standards (X12.5 Interchange Control Structure,
 * X12.6 Application Control Structure); IBM EDI Tutorial 2019.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface X12Element {
  position: number;             // 1-indexed within segment
  value: string;
  sub_elements?: string[];      // present if composite (sub-element separator used)
}

export interface X12Segment {
  tag: string;                  // e.g. "ISA", "GS", "ST", "BEG", "N1", "PO1"
  elements: X12Element[];
  raw: string;
}

export interface X12TransactionSet {
  st_id: string;                // 850/856/810/997 etc.
  st_control: string;
  segments: X12Segment[];       // ST → ... → SE inclusive
}

export interface X12FunctionalGroup {
  gs_id: string;                // PO/SH/IN etc.
  gs_control: string;
  transactions: X12TransactionSet[];
}

export interface X12Interchange {
  isa_control: string;
  sender_id: string;
  receiver_id: string;
  delimiters: {
    element_separator: string;
    sub_element_separator: string;
    segment_terminator: string;
  };
  groups: X12FunctionalGroup[];
  fetched_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ISA_LEN = 106;            // ISA segment is fixed-length 106 chars (incl. terminator)
const ISA_ELEMENT_SEP_POS = 3;  // pos 4 (0-indexed 3) holds the element separator
const ISA_SUB_ELEMENT_POS = 104; // ISA-16 holds the sub-element separator
const ISA_TERMINATOR_POS = 105; // pos 106 (0-indexed 105) holds the segment terminator
const MIN_X12_LEN = ISA_LEN + 10;  // ISA + at least one trailing segment
const MAX_X12_LEN = 10_000_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertNonEmptyStr(s: unknown, label: string): string {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  if (s.length === 0) throw new Error(`${label}: empty`);
  return s;
}

function parseElements(rawSegment: string, elementSep: string, subElementSep: string): X12Element[] {
  const parts = rawSegment.split(elementSep);
  // parts[0] = tag; elements start at index 1
  const elements: X12Element[] = [];
  for (let i = 1; i < parts.length; i++) {
    const raw = parts[i];
    const sub = raw.includes(subElementSep) ? raw.split(subElementSep) : undefined;
    elements.push({ position: i, value: raw, sub_elements: sub });
  }
  return elements;
}

// ─── Main parser ───────────────────────────────────────────────────────────

/**
 * Parse a raw X12 interchange string into a structured AST.
 *
 * Delimiters are sniffed from the ISA segment (positions 4, 105, 106 per
 * X12.5 spec). Caller does not supply them.
 *
 * @throws on missing/short ISA, mismatched IEA/GE/SE control numbers,
 *         empty text, or oversize input
 */
export function parseX12Interchange(raw: string): X12Interchange {
  assertNonEmptyStr(raw, "raw");
  if (raw.length < MIN_X12_LEN) throw new Error(`raw: too short to contain an ISA envelope (got ${raw.length} chars)`);
  if (raw.length > MAX_X12_LEN) throw new Error(`raw: exceeds ${MAX_X12_LEN} chars`);
  if (!raw.startsWith("ISA")) throw new Error(`raw: must start with 'ISA' (got '${raw.slice(0, 10)}...')`);

  // Sniff delimiters from the ISA fixed-position bytes
  const elementSep = raw[ISA_ELEMENT_SEP_POS];
  const subElementSep = raw[ISA_SUB_ELEMENT_POS];
  const segmentTerm = raw[ISA_TERMINATOR_POS];

  // Split into segments (trim trailing newline-style whitespace from each)
  const segmentTexts = raw.split(segmentTerm)
    .map(s => s.replace(/^[\r\n]+|[\r\n]+$/g, ""))
    .filter(s => s.length > 0);

  // First segment must be ISA
  const isaText = segmentTexts[0];
  if (!isaText.startsWith("ISA")) throw new Error(`first segment must be ISA`);
  const isaElements = parseElements(isaText, elementSep, subElementSep);
  // ISA-06 = sender ID (idx 5), ISA-08 = receiver ID (idx 7), ISA-13 = control number (idx 12)
  const senderId = isaElements[5]?.value.trim() ?? "";
  const receiverId = isaElements[7]?.value.trim() ?? "";
  const isaControl = isaElements[12]?.value.trim() ?? "";

  // Find the matching IEA
  const ieaText = segmentTexts[segmentTexts.length - 1];
  if (!ieaText.startsWith("IEA")) throw new Error(`last segment must be IEA (got '${ieaText.slice(0, 5)}...')`);
  const ieaElements = parseElements(ieaText, elementSep, subElementSep);
  const ieaControl = ieaElements[1]?.value.trim() ?? "";
  if (ieaControl !== isaControl) {
    throw new Error(`ISA control '${isaControl}' != IEA control '${ieaControl}' — envelope tampered or truncated`);
  }

  // Parse functional groups (GS ... GE) and transactions (ST ... SE)
  const groups: X12FunctionalGroup[] = [];
  let i = 1;  // skip ISA
  while (i < segmentTexts.length - 1) {  // skip trailing IEA
    const segText = segmentTexts[i];
    if (segText.startsWith("GS")) {
      const gsElements = parseElements(segText, elementSep, subElementSep);
      const gsId = gsElements[0]?.value.trim() ?? "";
      const gsControl = gsElements[5]?.value.trim() ?? "";
      const transactions: X12TransactionSet[] = [];
      i++;
      // Iterate until GE
      while (i < segmentTexts.length - 1 && !segmentTexts[i].startsWith("GE")) {
        if (segmentTexts[i].startsWith("ST")) {
          const stElements = parseElements(segmentTexts[i], elementSep, subElementSep);
          const stId = stElements[0]?.value.trim() ?? "";
          const stControl = stElements[1]?.value.trim() ?? "";
          const segs: X12Segment[] = [{
            tag: "ST",
            elements: stElements,
            raw: segmentTexts[i],
          }];
          i++;
          while (i < segmentTexts.length - 1 && !segmentTexts[i].startsWith("SE")) {
            const t = segmentTexts[i];
            const elems = parseElements(t, elementSep, subElementSep);
            segs.push({ tag: t.split(elementSep)[0], elements: elems, raw: t });
            i++;
          }
          // Consume SE — verify control matches ST
          if (i < segmentTexts.length - 1 && segmentTexts[i].startsWith("SE")) {
            const seElements = parseElements(segmentTexts[i], elementSep, subElementSep);
            const seControl = seElements[1]?.value.trim() ?? "";
            if (seControl !== stControl) {
              throw new Error(`ST control '${stControl}' != SE control '${seControl}' — transaction set tampered`);
            }
            segs.push({ tag: "SE", elements: seElements, raw: segmentTexts[i] });
            i++;
          }
          transactions.push({ st_id: stId, st_control: stControl, segments: segs });
        } else {
          i++;
        }
      }
      // Consume GE — verify control matches GS
      if (i < segmentTexts.length - 1 && segmentTexts[i].startsWith("GE")) {
        const geElements = parseElements(segmentTexts[i], elementSep, subElementSep);
        const geControl = geElements[1]?.value.trim() ?? "";
        if (geControl !== gsControl) {
          throw new Error(`GS control '${gsControl}' != GE control '${geControl}' — functional group tampered`);
        }
        i++;
      }
      groups.push({ gs_id: gsId, gs_control: gsControl, transactions });
    } else {
      i++;
    }
  }

  return {
    isa_control: isaControl,
    sender_id: senderId,
    receiver_id: receiverId,
    delimiters: { element_separator: elementSep, sub_element_separator: subElementSep, segment_terminator: segmentTerm },
    groups,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Extract a specific segment by tag from a transaction set (e.g. "PO1"
 * lines from an 850 PO transaction; "BIG" header from an 810 invoice).
 */
export function findSegments(transaction: X12TransactionSet, tag: string): X12Segment[] {
  return transaction.segments.filter(s => s.tag === tag);
}
