import { Readable } from "node:stream";
import type { StorageDriver } from "@/server/storage/types";

export class MemoryStorage implements StorageDriver {
  readonly name = "memory";
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer) {
    this.files.set(key, body);
    return { key, size: body.length };
  }
  async get(key: string) {
    const b = this.files.get(key);
    if (!b) throw new Error("missing");
    return { body: Readable.from(b), size: b.length };
  }
  async getBuffer(key: string) {
    return this.files.get(key)!;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
  async exists(key: string) {
    return this.files.has(key);
  }
}
