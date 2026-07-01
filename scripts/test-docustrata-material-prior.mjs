/**
 * Quick smoke test of DocuStrataMaterialPriorEngine against the REAL JM Die
 * manifest. Prints per-grade priors so iter54 can wire them into quoting.
 */
import { DocuStrataMaterialPriorEngine } from "../mcp-server/src/engines/DocuStrataMaterialPriorEngine.js";

const summary = await DocuStrataMaterialPriorEngine.getSummary("H:/prism/Docustrata/manifest.json");
console.log("MANIFEST SUMMARY:");
console.log(`  total line items: ${summary.total_line_items}`);
console.log(`  total spend:      $${summary.total_spend_usd}`);
console.log(`  distinct grades:  ${summary.distinct_grades}`);

const grades = await DocuStrataMaterialPriorEngine.listGrades();
console.log(`\nPER-GRADE PRIORS:`);
for (const g of grades) {
  const p = await DocuStrataMaterialPriorEngine.getUnitPrice(g);
  const b = await DocuStrataMaterialPriorEngine.getMaterialSpendBracket(g);
  const ev = await DocuStrataMaterialPriorEngine.getEvidence(g);
  const vendors = [...new Set(ev.map((e) => e.vendor))].join(", ");
  console.log(`  ${g.padEnd(6)} n=${String(ev.length).padStart(3)} unit \$${String(p.median).padStart(7)} band [\$${p.p25}-\$${p.p75}] per-job [\$${b.low}-\$${b.high}] mid \$${b.median} vendors: ${vendors.slice(0, 60)}`);
}
