// Tests the two BaseRegistry concurrency fixes, now landable since the Logger
// class was restored (BaseRegistry was non-constructable before -> new Logger()
// threw "Logger is not a constructor"):
//  (6) single-flight ensureInitialized() -> one initialize() under concurrent callers
//  (5) persistItem via atomicLockedWrite -> no torn write under concurrent same-id writers
// R9: pre-fix initCount would be 5 (not 1); a torn write would make JSON.parse throw.
import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { BaseRegistry, type RegistryItem } from "../registries/BaseRegistry.js";

class TestRegistry extends BaseRegistry<RegistryItem> {
  public initCount = 0;
  private releaseGate!: () => void;
  private gate: Promise<void> = new Promise<void>((r) => { this.releaseGate = r; });
  protected getCorePath(): string { return "core"; }
  protected getEnhancedPath(): string { return "enhanced"; }
  protected parseItem(data: any): RegistryItem { return data as RegistryItem; }
  protected validateItem(): { valid: boolean; errors: string[] } { return { valid: true, errors: [] }; }
  async handleTool(): Promise<any> { return null; }
  // Countable + gated initialize() so we can observe how many times it runs.
  override async initialize(): Promise<void> {
    this.initCount++;
    await this.gate;
    this.initialized = true;
    this.loadedAt = Date.now();
  }
  open(): void { this.releaseGate(); }
  ensure(): Promise<void> { return this.ensureInitialized(); }
  setCorePath(p: string): void { this.layerPaths.CORE = p; }
  persist(item: RegistryItem): Promise<void> { return this.persistItem(item); }
}

describe("BaseRegistry concurrency hardening", () => {
  it("constructs without throwing now that Logger is a class (regression anchor)", () => {
    const reg = new TestRegistry("ctor");
    expect(reg.initCount).toBe(0);
  });

  it("single-flights concurrent ensureInitialized() to ONE initialize() run", async () => {
    const reg = new TestRegistry("sf");
    const all = Promise.all([reg.ensure(), reg.ensure(), reg.ensure(), reg.ensure(), reg.ensure()]);
    reg.open(); // unblock the gated initialize()
    await all;
    expect(reg.initCount).toBe(1); // pre-fix: 5 (every caller ran initialize)
  });

  it("persistItem writes valid JSON under concurrent same-id writers (no torn write)", async () => {
    // 8 = a realistic worst-case cross-process contention for one item.id (the
    // lock exists for the 2-3 case; 20+ is pathological and exhausts
    // proper-lockfile's retry budget by design, not a corruption).
    const N = 8;
    const reg = new TestRegistry("persist");
    const dir = path.join(os.tmpdir(), `prism-baseregistry-${process.pid}-${Date.now()}`);
    reg.setCorePath(dir);
    await Promise.all(
      Array.from({ length: N }, (_, i) => reg.persist({ id: "same", layer: "CORE", payload: i })),
    );
    const raw = await fs.readFile(path.join(dir, "same.json"), "utf8");
    const parsed = JSON.parse(raw); // throws on a torn/interleaved write -> test fails
    expect(parsed.id).toBe("same");
    expect(Number.isInteger(parsed.payload)).toBe(true);
    expect(parsed.payload >= 0 && parsed.payload < N).toBe(true); // exactly one writer's payload landed
    await fs.rm(dir, { recursive: true, force: true });
  });
});
