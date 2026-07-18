/**
 * PluginUpgradePathEngine — HMPI11 semver upgrade-path classifier.
 *
 * Pure-core: classify `from → to` version transitions per semver as
 * patch / minor / major / prerelease-promotion / downgrade.  Reports
 * whether the upgrade is "safe" (patch only) or "needs-review" (minor/
 * prerelease) or "breaking" (major).
 *
 * @module engines/PluginUpgradePathEngine
 */

import { z } from "zod";

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(-([0-9A-Za-z-.]+))?$/;

export const UpgradeClassSchema = z.enum(["same", "patch", "minor", "major", "prerelease-promotion", "downgrade", "invalid"]);
export type UpgradeClass = z.infer<typeof UpgradeClassSchema>;

export interface UpgradeVerdict {
  from: string;
  to: string;
  class: UpgradeClass;
  safety: "safe" | "needs-review" | "breaking" | "rejected";
  reason: string;
}

function parseSemver(v: string): { major: number; minor: number; patch: number; pre: string } | null {
  const m = v.match(SEMVER_RE);
  if (!m) return null;
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10), pre: m[5] ?? "" };
}

export class PluginUpgradePathEngine {
  static classify(from: string, to: string): UpgradeVerdict {
    if (typeof from !== "string" || typeof to !== "string") {
      throw new Error("PluginUpgradePath.classify: from/to must be strings");
    }
    const a = parseSemver(from);
    const b = parseSemver(to);
    if (!a || !b) {
      return { from, to, class: "invalid", safety: "rejected", reason: "invalid semver" };
    }
    if (from === to) {
      return { from, to, class: "same", safety: "safe", reason: "no-op" };
    }
    // Downgrade
    if (a.major > b.major) return { from, to, class: "downgrade", safety: "rejected", reason: "major downgrade" };
    if (a.major === b.major && a.minor > b.minor) return { from, to, class: "downgrade", safety: "rejected", reason: "minor downgrade" };
    if (a.major === b.major && a.minor === b.minor && a.patch > b.patch) {
      return { from, to, class: "downgrade", safety: "rejected", reason: "patch downgrade" };
    }
    if (a.major !== b.major) {
      return { from, to, class: "major", safety: "breaking", reason: `${a.major} → ${b.major} major bump` };
    }
    if (a.minor !== b.minor) {
      return { from, to, class: "minor", safety: "needs-review", reason: `${a.minor} → ${b.minor} minor bump` };
    }
    if (a.patch !== b.patch) {
      return { from, to, class: "patch", safety: "safe", reason: `${a.patch} → ${b.patch} patch` };
    }
    if (a.pre !== "" && b.pre === "") {
      return { from, to, class: "prerelease-promotion", safety: "needs-review", reason: `prerelease ${a.pre} → stable` };
    }
    return { from, to, class: "invalid", safety: "rejected", reason: "unclassified" };
  }

  static renderVerdict(v: UpgradeVerdict): string {
    return `[UPGRADE ${v.safety.toUpperCase()}] ${v.from} → ${v.to} [${v.class}] ${v.reason}`;
  }
}

export const pluginUpgradePathEngine = PluginUpgradePathEngine;
