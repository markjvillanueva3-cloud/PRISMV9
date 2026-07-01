// scripts/lib/sfc-jm-stock-prior.mjs
//
// SFC-JM-ACCURACY -- derive JM Die's material ISO-group PRIOR from the shop's
// actual QuickBooks purchase record (jm-die-stock-material-catalog.json, built by
// juliett from Report_from_J.M._Tool__Die_LLC.pdf, 2014-2026). When a program's
// material can't be inferred from its comments/path, the right default is NOT a
// generic "P" carbon steel -- it is the shop's MODAL stock, which for a tool-and-
// die shop is hardened tool steel (ISO H). Defaulting unknowns to P falsely makes
// JM's tool-steel-appropriate lathe speeds look "conservative" vs carbide-steel
// Taylor; the H prior corrects that. This lib turns the purchase frequencies into
// a weighted ISO distribution + the modal group.
//
// PURE: takes the parsed catalog object.

// Explicit grade -> ISO map for JM's stock grades. These are CLEAN catalog tokens
// (not free text), so we map them directly and tool-steel-aware (the collision
// risk that gates sfc-material-infer's regex does not apply here). Tool steels and
// HSS -> H (hardened in service); carbon/alloy structural steels -> P; PH/austenitic
// stainless -> M; aluminum -> N.
export const STOCK_GRADE_ISO = Object.freeze({
  // tool steels + HSS + powder-metallurgy tool steels + bearing steel (H)
  H13: "H", M2: "H", D2: "H", S7: "H", M4: "H", A2: "H", O1: "H", "52100": "H",
  DC53: "H", M42: "H", L6: "H", "6F": "H", CPM1V: "H", CPM3V: "H", CPM10V: "H",
  CPM9V: "H", CPM15V: "H", D6: "H",
  CPM: "H", A6: "H", D3: "H", H11: "H", P20: "H", S5: "H", S1: "H", W1: "H", O6: "H",
  // carbon / alloy structural steels (P)
  "4140": "P", "4340": "P", "1045": "P", "1018": "P", "12L14": "P", "1215": "P",
  "1117": "P", "8620": "P", "1020": "P", "1144": "P", A36: "P",
  // stainless (M) -- 174 == 17-4 PH
  "174": "M", "17-4": "M", "303": "M", "304": "M", "316": "M", "410": "M",
  "420": "M", "440": "M", "440C": "M", "15-5": "M", "17-7": "M",
  // aluminum / non-ferrous (N)
  "6061": "N", "7075": "N", "2024": "N", BRASS: "N", BRONZE: "N",
});

/**
 * Compute the JM material ISO prior from the stock catalog.
 * @param {object} catalog  parsed jm-die-stock-material-catalog.json
 * @returns {{ byIso: Record<string,number>, modalIso: string, total: number,
 *             matched: number, unmapped: string[] }}
 */
export function computeStockPrior(catalog) {
  const gf = (catalog && catalog.gradesForms) || [];
  const byIso = {};
  const unmapped = [];
  let total = 0, matched = 0;
  for (const g of gf) {
    const occ = Number(g.occurrences) || 0;
    total += occ;
    const iso = STOCK_GRADE_ISO[g.grade] || STOCK_GRADE_ISO[String(g.grade).toUpperCase()];
    if (iso) {
      byIso[iso] = (byIso[iso] || 0) + occ;
      matched += occ;
    } else if (!unmapped.includes(g.grade)) {
      unmapped.push(g.grade);
    }
  }
  // modal ISO = the group with the most purchased stock lines.
  let modalIso = "P", best = -1;
  for (const [iso, n] of Object.entries(byIso)) {
    if (n > best) { best = n; modalIso = iso; }
  }
  return { byIso, modalIso, total, matched, unmapped };
}
