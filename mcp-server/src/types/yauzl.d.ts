/**
 * Minimal type declarations for yauzl (ZIP reader).
 * yauzl is available via node-opcua dependency chain (v3.2.1).
 * Full types not installed; this covers the API surface used by FCStdNativeParserEngine.
 */

declare module "yauzl" {
  import { Readable } from "node:stream";

  interface Options {
    /** If true, entries are returned one at a time (call zipfile.readEntry() to advance) */
    lazyEntries?: boolean;
    /** If true, yauzl will automatically call readEntry() on open */
    autoClose?: boolean;
    /** Use validateEntry to validate file names */
    validateEntrySizes?: boolean;
    /** Strict file name validation */
    strictFileNames?: boolean;
  }

  interface Entry {
    /** File name as stored in the ZIP */
    fileName: string;
    /** Compressed size in bytes */
    compressedSize: number;
    /** Uncompressed size in bytes */
    uncompressedSize: number;
    /** Last modification time */
    getLastModDate(): Date;
  }

  interface ZipFile {
    /** Total number of entries */
    entryCount: number;
    /** Read the next entry (fires 'entry' event) */
    readEntry(): void;
    /** Open a read stream for the given entry */
    openReadStream(
      entry: Entry,
      callback: (err: Error | null, stream: Readable | null) => void
    ): void;
    /** Close the ZIP file */
    close(): void;
    on(event: "entry", listener: (entry: Entry) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "close", listener: () => void): this;
  }

  /** Open a ZIP from a file path */
  function open(
    path: string,
    options: Options,
    callback: (err: Error | null, zipfile: ZipFile | null) => void
  ): void;

  /** Open a ZIP from an in-memory buffer */
  function fromBuffer(
    buffer: Buffer,
    options: Options,
    callback: (err: Error | null, zipfile: ZipFile | null) => void
  ): void;

  /** Open a ZIP from a file descriptor */
  function fromFd(
    fd: number,
    options: Options,
    callback: (err: Error | null, zipfile: ZipFile | null) => void
  ): void;
}
