import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const VENDOR_PATTERNS = [
  { family: "fusion_360", label: "Fusion 360", tokens: ["fusion", "autodesk", "cam360", "hsm"] },
  { family: "mastercam", label: "Mastercam", tokens: ["mastercam", "mcam"] },
  { family: "hypermill", label: "hyperMILL", tokens: ["hypermill", "open mind", "openmind"] },
  { family: "nx_cam", label: "NX CAM", tokens: ["nx", "siemens"] },
  { family: "solidcam", label: "SolidCAM", tokens: ["solidcam"] },
  { family: "camworks", label: "CAMWorks", tokens: ["camworks"] },
  { family: "gibbscam", label: "GibbsCAM", tokens: ["gibbscam", "gibbs"] },
  { family: "esprit", label: "Esprit", tokens: ["esprit"] },
];

const FILE_HINTS = ["tool", "tooling", "holder", "library", "crib", "tooldb", "toollib"];
const EXTENSION_HINTS = [".json", ".xml", ".csv", ".db", ".sqlite", ".accdb", ".txt", ".mcam-tools", ".tools"];
const SKIP_DIR_NAMES = new Set(["node_modules", ".git", "cache", "tmp", "temp", "__pycache__"]);

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function guessSoftwareFamily(haystack) {
  for (const pattern of VENDOR_PATTERNS) {
    if (pattern.tokens.some((token) => haystack.includes(token))) {
      return {
        family: pattern.family,
        label: pattern.label,
      };
    }
  }
  return {
    family: "generic_cam",
    label: "Generic CAM",
  };
}

function scorePath(filePath) {
  const haystack = filePath.toLowerCase();
  const matchedBy = [];
  let score = 0;

  for (const pattern of VENDOR_PATTERNS) {
    if (pattern.tokens.some((token) => haystack.includes(token))) {
      matchedBy.push(pattern.label);
      score += 0.28;
      break;
    }
  }

  for (const hint of FILE_HINTS) {
    if (haystack.includes(hint)) {
      matchedBy.push(hint);
      score += 0.12;
      break;
    }
  }

  for (const ext of EXTENSION_HINTS) {
    if (haystack.endsWith(ext)) {
      matchedBy.push(ext);
      score += 0.18;
      break;
    }
  }

  if (haystack.includes("tool library") || haystack.includes("tooling")) {
    matchedBy.push("tool-library-path");
    score += 0.16;
  }

  return {
    confidence: Math.min(0.97, Math.max(0, Number(score.toFixed(2)))),
    matchedBy,
  };
}

async function listCandidateFiles(root, maxResults) {
  const findings = [];
  const visited = new Set();
  const queue = [{ dir: root, depth: 0, boosted: false }];

  while (queue.length > 0 && findings.length < maxResults) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const resolved = path.resolve(current.dir);
    if (visited.has(resolved)) {
      continue;
    }
    visited.add(resolved);

    let entries;
    try {
      entries = await fs.readdir(resolved, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries.slice(0, 400)) {
      if (findings.length >= maxResults) {
        break;
      }

      const fullPath = path.join(resolved, entry.name);
      const lowerName = entry.name.toLowerCase();
      const boosted = current.boosted || FILE_HINTS.some((hint) => lowerName.includes(hint))
        || VENDOR_PATTERNS.some((pattern) => pattern.tokens.some((token) => lowerName.includes(token)));

      if (entry.isDirectory()) {
        if (current.depth >= 5 || SKIP_DIR_NAMES.has(lowerName)) {
          continue;
        }
        if (current.depth < 2 || boosted) {
          queue.push({ dir: fullPath, depth: current.depth + 1, boosted });
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const { confidence, matchedBy } = scorePath(fullPath);
      if (confidence < 0.3) {
        continue;
      }

      const software = guessSoftwareFamily(fullPath.toLowerCase());
      findings.push({
        softwareFamily: software.family,
        softwareLabel: software.label,
        path: fullPath,
        confidence,
        matchedBy,
      });
    }
  }

  return findings;
}

async function main() {
  const stdin = await readStdin();
  const input = stdin ? JSON.parse(stdin) : {};
  const roots = Array.isArray(input.roots) && input.roots.length > 0
    ? input.roots
    : [
      path.join(os.homedir(), "Documents"),
      path.join(os.homedir(), "AppData", "Roaming"),
      path.join(os.homedir(), "AppData", "Local"),
      "C:\\ProgramData",
      "C:\\Users\\Public\\Documents",
    ];
  const maxResults = Math.max(8, Math.min(60, Number(input.maxResults) || 24));

  const deduped = new Map();
  for (const root of roots) {
    const findings = await listCandidateFiles(root, maxResults);
    for (const finding of findings) {
      if (!deduped.has(finding.path)) {
        deduped.set(finding.path, finding);
      }
      if (deduped.size >= maxResults) {
        break;
      }
    }
    if (deduped.size >= maxResults) {
      break;
    }
  }

  const payload = {
    ok: true,
    findings: [...deduped.values()].sort((left, right) => right.confidence - left.confidence),
  };

  process.stdout.write(JSON.stringify(payload));
}

main().catch((error) => {
  process.stderr.write(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
