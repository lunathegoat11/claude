import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./types";
import { AppError } from "@/server/errors";

/** Local-disk driver for development and single-server deployments. */
export class LocalStorage implements StorageDriver {
  readonly name = "local";
  private root: string;

  constructor(dir: string) {
    this.root = path.resolve(dir);
  }

  private resolve(key: string) {
    if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes("..")) throw new AppError("STORAGE", "Invalid file reference.");
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new AppError("STORAGE", "Invalid file reference.");
    return p;
  }

  async put(key: string, body: Buffer) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true, mode: 0o700 });
    await writeFile(p, body, { mode: 0o600 });
    return { key, size: body.length };
  }

  async get(key: string) {
    const p = this.resolve(key);
    const s = await stat(p).catch(() => null);
    if (!s) throw new AppError("NOT_FOUND", "File not found.");
    return { body: createReadStream(p), size: s.size };
  }

  async getBuffer(key: string) {
    return readFile(this.resolve(key));
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string) {
    return !!(await stat(this.resolve(key)).catch(() => null));
  }
}
