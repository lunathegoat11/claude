import type { Readable } from "node:stream";

export interface StoredObject {
  key: string;
  size: number;
}

/**
 * Storage driver abstraction. Implementations must treat keys as opaque and
 * must never expose files publicly — all reads go through authenticated
 * route handlers that check ownership first.
 */
export interface StorageDriver {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ body: Readable; size?: number }>;
  getBuffer(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
