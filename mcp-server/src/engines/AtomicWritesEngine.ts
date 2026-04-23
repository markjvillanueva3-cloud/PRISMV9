// WIRE-EXEMPT: used as library by other engines/hooks (e.g. state persistence); dispatcher wiring tracked separately under reliability ops
/**
 * AtomicWritesEngine — U-FORE-17 (Reliability Substrate)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export interface AtomicWriteOptions {
  mode?: number;
  fsync?: boolean;
}

const DEFAULT_MODE = 0o644;

function tempPathFor(target: string): string {
  const dir = path.dirname(target);
  const base = path.basename(target);
  const suffix = crypto.randomBytes(6).toString("hex");
  return path.join(dir, `.${base}.${suffix}.tmp`);
}

export class AtomicWritesEngine {
  readonly name = "AtomicWritesEngine";

  async writeAtomic(target: string, content: string | Uint8Array, opts: AtomicWriteOptions = {}): Promise<void> {
    this.validateTarget(target);
    if (content === null || content === undefined) {
      throw new Error("AtomicWritesEngine.writeAtomic: content required");
    }
    const temp = tempPathFor(target);
    const mode = opts.mode ?? DEFAULT_MODE;
    try {
      const handle = await fs.promises.open(temp, "w", mode);
      try {
        await handle.writeFile(content);
        if (opts.fsync !== false) await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.promises.rename(temp, target);
    } catch (err) {
      try { await fs.promises.unlink(temp); } catch { /* ignore */ }
      throw err;
    }
  }

  writeAtomicSync(target: string, content: string | Uint8Array, opts: AtomicWriteOptions = {}): void {
    this.validateTarget(target);
    if (content === null || content === undefined) {
      throw new Error("AtomicWritesEngine.writeAtomicSync: content required");
    }
    const temp = tempPathFor(target);
    const mode = opts.mode ?? DEFAULT_MODE;
    try {
      const fd = fs.openSync(temp, "w", mode);
      try {
        fs.writeFileSync(fd, content);
        if (opts.fsync !== false) fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(temp, target);
    } catch (err) {
      try { fs.unlinkSync(temp); } catch { /* ignore */ }
      throw err;
    }
  }

  async writeJSONAtomic(target: string, data: unknown, indent: number = 2): Promise<void> {
    await this.writeAtomic(target, JSON.stringify(data, null, indent));
  }

  async readJSONAtomic<T = unknown>(target: string): Promise<T> {
    if (typeof target !== "string" || target.length === 0) {
      throw new Error("AtomicWritesEngine: target path required");
    }
    const buf = await fs.promises.readFile(target, "utf8");
    return JSON.parse(buf) as T;
  }

  async exists(target: string): Promise<boolean> {
    try {
      await fs.promises.access(target);
      return true;
    } catch {
      return false;
    }
  }

  private validateTarget(target: string): void {
    if (typeof target !== "string" || target.length === 0) {
      throw new Error("AtomicWritesEngine: target path required");
    }
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      throw new Error(`AtomicWritesEngine: parent directory does not exist '${dir}'`);
    }
  }
}

export const atomicWritesEngine = new AtomicWritesEngine();
