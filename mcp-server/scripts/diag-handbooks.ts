/** Throwaway diagnostic (U-MACH02): aggregate every schema mismatch across the
 *  handbook corpus AFTER null-strip, so the schema fix can be made in one pass. */
import * as fs from "fs";
import * as path from "path";
import { MachineHandbookSchema, stripNullLeaves } from "../src/engines/MachineHandbookRegistryEngine.js";

const dir = path.join(process.cwd(), "data", "machine-handbooks");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const issues = new Map<string, { count: number; example: string; files: Set<string> }>();

for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  const res = MachineHandbookSchema.safeParse(stripNullLeaves(raw));
  if (res.success) {
    console.log(`OK   ${f}`);
    continue;
  }
  console.log(`FAIL ${f}  (${res.error.issues.length} issues)`);
  for (const iss of res.error.issues) {
    // key = code + path with array indices collapsed to [*]
    const p = iss.path.map((x) => (typeof x === "number" ? "[*]" : x)).join(".");
    const key = `${iss.code} @ ${p}`;
    const e = issues.get(key) ?? { count: 0, example: iss.message, files: new Set<string>() };
    e.count++;
    e.files.add(f);
    issues.set(key, e);
  }
}

console.log("\n=== DISTINCT ISSUE TYPES ===");
for (const [key, e] of [...issues.entries()].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`[${e.count}x | ${e.files.size} files] ${key}\n     e.g. ${e.example}`);
}

// Dump the actual values the corpus uses at the enum-failing fields, to decide
// enum-vs-string-vs-expand per field.
const driveTypes = new Set<string>();
const partsCats = new Set<string>();
const safetyUnits = new Set<string>();
for (const f of files) {
  const raw: any = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  if (raw.spindle_specs?.drive_type) driveTypes.add(raw.spindle_specs.drive_type);
  for (const p of raw.parts_book ?? []) if (p?.category) partsCats.add(p.category);
  for (const s of raw.safety_limits ?? []) if (s?.unit) safetyUnits.add(s.unit);
}
console.log("\n=== ACTUAL VALUES IN CORPUS ===");
console.log("drive_type:", [...driveTypes].join(" | "));
console.log("parts_book.category:", [...partsCats].join(" | "));
console.log("safety_limits.unit:", [...safetyUnits].join(" | "));
