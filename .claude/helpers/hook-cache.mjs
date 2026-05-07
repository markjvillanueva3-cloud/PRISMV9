import { promises as fs } from "node:fs";
import path from "node:path";

export const CACHE_DIR = "H:\\prism\\.claude\\cache";

export function cachePath(name) {
  return path.join(CACHE_DIR, name);
}

export async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function readLines(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function writeLines(filePath, lines) {
  await ensureCacheDir();
  const normalized = lines
    .map((line) => String(line).trim())
    .filter(Boolean);
  const content = normalized.length > 0 ? `${normalized.join("\n")}\n` : "";
  await fs.writeFile(filePath, content, "utf8");
}

export async function appendLine(filePath, line) {
  await ensureCacheDir();
  await fs.appendFile(filePath, `${String(line).trim()}\n`, "utf8");
}

export async function appendUniqueLine(filePath, line) {
  const value = String(line).trim();
  if (!value) {
    return;
  }
  const lines = await readLines(filePath);
  if (!lines.includes(value)) {
    lines.push(value);
    await writeLines(filePath, lines);
  }
}

export async function countLines(filePath) {
  const lines = await readLines(filePath);
  return lines.length;
}
