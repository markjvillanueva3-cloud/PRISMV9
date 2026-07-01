/**
 * NamespaceMigrationEngine tests — HMEMV09. Asserts exact collision-policy
 * behavior and rename-suffix logic.
 */
import { describe, it, expect } from "vitest";
import {
  NamespaceMigrationEngine,
  type MigrationEntry,
} from "../engines/NamespaceMigrationEngine.js";

const entry = (id: string, key: string, ns = "source"): MigrationEntry => ({
  entry_id: id, key, namespace: ns, value: 1,
});

describe("NamespaceMigrationEngine.migrate — happy path (no collisions)", () => {
  it("migrates 3 entries with no conflicts → all migrated, 0 skipped/renamed", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a"), entry("e2", "b"), entry("e3", "c")],
      target_namespace: "target",
      target_existing_keys: [],
      policy: "fail-on-collision",
    });
    expect(r.migrated).toHaveLength(3);
    expect(r.skipped).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
    expect(r.migrated.every((e) => e.namespace === "target")).toBe(true);
  });

  it("preserves source_namespace when uniform", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a", "src")],
      target_namespace: "tgt",
      target_existing_keys: [],
      policy: "fail-on-collision",
    });
    expect(r.source_namespace).toBe("src");
  });

  it("reports '(multiple)' source_namespace when sources mixed", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a", "ns1"), entry("e2", "b", "ns2")],
      target_namespace: "tgt",
      target_existing_keys: [],
      policy: "fail-on-collision",
    });
    expect(r.source_namespace).toBe("(multiple)");
  });
});

describe("NamespaceMigrationEngine.migrate — collision policies", () => {
  it("fail-on-collision: collision → error[], not migrated", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a")],
      target_namespace: "tgt",
      target_existing_keys: ["a"],
      policy: "fail-on-collision",
    });
    expect(r.migrated).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].entry_id).toBe("e1");
    expect(r.errors[0].reason.includes("collision")).toBe(true);
  });

  it("skip-on-collision: collision → skipped[], not migrated", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a")],
      target_namespace: "tgt",
      target_existing_keys: ["a"],
      policy: "skip-on-collision",
    });
    expect(r.migrated).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
  });

  it("overwrite-on-collision: collision → migrated (overwriting)", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a")],
      target_namespace: "tgt",
      target_existing_keys: ["a"],
      policy: "overwrite-on-collision",
    });
    expect(r.migrated).toHaveLength(1);
    expect(r.migrated[0].key).toBe("a");
    expect(r.errors).toHaveLength(0);
  });

  it("rename-on-collision: appends '_1', '_2' until unique", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a"), entry("e2", "a")],
      target_namespace: "tgt",
      target_existing_keys: ["a"],
      policy: "rename-on-collision",
    });
    expect(r.migrated).toHaveLength(2);
    expect(r.migrated.map((e) => e.key).sort()).toEqual(["a_1", "a_2"]);
    expect(r.renamed).toHaveLength(2);
    expect(r.renamed[0]).toEqual({ from: "a", to: "a_1" });
    expect(r.renamed[1]).toEqual({ from: "a", to: "a_2" });
  });
});

describe("NamespaceMigrationEngine.migrate — failure modes", () => {
  it("throws on empty target_namespace", () => {
    expect(() => NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a")],
      target_namespace: "",
      target_existing_keys: [],
      policy: "fail-on-collision",
    })).toThrow();
  });

  it("throws on unknown policy (zod adversarial)", () => {
    expect(() => NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a")],
      target_namespace: "tgt",
      target_existing_keys: [],
      policy: "yolo" as never,
    })).toThrow();
  });

  it("renderResult emits source→target counts", () => {
    const r = NamespaceMigrationEngine.migrate({
      source: [entry("e1", "a"), entry("e2", "b")],
      target_namespace: "tgt",
      target_existing_keys: ["a"],
      policy: "rename-on-collision",
    });
    const md = NamespaceMigrationEngine.renderResult(r);
    expect(md.includes("→ tgt")).toBe(true);
    expect(md.includes("+2")).toBe(true);
    expect(md.includes("rename=1")).toBe(true);
  });
});
