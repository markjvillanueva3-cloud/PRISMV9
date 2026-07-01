import { readFileSync } from "node:fs";
const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return "(absent)"; } };
const lib = read("H:/prism/mcp-server/scripts/lib/tool-library-partition.ts");
const test = read("H:/prism/mcp-server/src/__tests__/ToolLibraryPartition.test.ts");
const diff = read("H:/prism/scripts/_tmp_tb_diff.txt");
const prompt = `You are a rigorous TypeScript reviewer. A new unit organizes JM tool libraries as MATERIAL -> tool TYPE -> BRAND, on top of an existing per-material-group Fusion CSV generator. It SHIPPED a pure helper (tool-library-partition.ts), its test (9/9 pass), and a generator integration (validated live: 218 tools -> 41 leaf CSV libraries, each a valid CSV_TOOLS_VERSION_1 file).

Find ONLY real P0 (breaks correctness/build/data) or P1 (wrong result / silent data drop / weak test) issues. Pay attention to: (a) can any tool row be DROPPED or DUPLICATED across leaves? (b) slug collisions filing two distinct types/brands into one file? (c) the leaf CSV header validity; (d) does the test actually fail if nesting/slug logic breaks? (e) path-traversal/filesystem-unsafe slug output. If none, say so. End with one line: VERDICT: PASS or VERDICT: FAIL.

=== HELPER (tool-library-partition.ts) ===
${lib}

=== TEST (ToolLibraryPartition.test.ts) ===
${test}

=== GENERATOR DIFF ===
${diff}`;
const res = await fetch("http://127.0.0.1:11434/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gpt-oss:120b", prompt, stream: false, keep_alive: "5m", options: { temperature: 0.1, num_ctx: 16384, num_predict: 3500 } }),
}).catch((e) => ({ json: async () => ({ response: "FETCH_ERR " + e.message }) }));
const j = await res.json();
const out = (j.response && j.response.trim()) ? j.response : ("[thinking-only]\n" + (j.thinking || "").slice(-2500));
process.stdout.write(out + "\n");
