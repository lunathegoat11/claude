import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { purgeExpiredData } from "@/server/services/retention";
import { uploadDocument, deleteDocument } from "@/server/services/documents";
import { setStorageDriver } from "@/server/storage";
import { deviceLabel } from "@/lib/device";
import { MemoryStorage } from "./helpers/memory-storage";
import { TZ, cleanup, makeUser } from "./helpers/factory";

const store = new MemoryStorage();
let u: { id: string };
beforeAll(async () => {
  setStorageDriver(store);
  u = await makeUser("Min");
});
afterAll(() => cleanup(u.id));

const UA =
  "Mozilla/5.0 (Linux; Android 14; SM-A146B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.81 Mobile Safari/537.36";

describe("collecting as little as possible", () => {
  it("keeps only a coarse device label for sessions, not the full browser string", async () => {
    expect(deviceLabel(UA)).toBe("Chrome on Android");
    await createSession(u.id, UA);
    const s = await db.session.findFirstOrThrow({ where: { userId: u.id } });
    expect(s.device).toBe("Chrome on Android");
    expect(JSON.stringify(s)).not.toContain("SM-A146B");
  });

  it("does not record IP addresses or browser details in the activity log", async () => {
    await audit(u.id, "auth.sign_in", undefined, { ip: "203.0.113.7", userAgent: UA });
    const row = await db.auditLog.findFirstOrThrow({ where: { userId: u.id } });
    expect(JSON.stringify(row)).not.toMatch(/203\.0\.113|Android|Chrome/);
  });

  it("removes hidden photo details such as GPS location before storing", async () => {
    const withGps = await sharp(readFileSync("tests/fixtures/lab-report-photo.png"))
      .resize({ width: 1600 })
      .withExif({ IFD0: { Make: "PhoneMaker", Model: "Phone 12" }, IFD3: { GPSLatitudeRef: "N" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeTruthy();
    const res = await uploadDocument(
      u.id,
      { buffer: withGps, filename: "p.jpg", declaredMime: "image/jpeg" },
      { name: "Photo", type: "OTHER", tags: "" },
      TZ,
      { allowPoorQuality: true },
    );
    const stored = store.files.get(res.document.storageKey)!;
    const m = await sharp(stored).metadata();
    expect(m.exif).toBeUndefined();
    expect(m.width).toBe(1600);
    await deleteDocument(u.id, res.document.id);
  });

  it("deletes expired sessions, used email links and old activity automatically", async () => {
    const old = new Date(Date.now() - 400 * 86_400_000);
    await db.session.create({
      data: { userId: u.id, tokenHash: `expired-${Date.now()}`, expiresAt: old },
    });
    await db.authToken.create({
      data: { userId: u.id, type: "PASSWORD_RESET", tokenHash: `t-${Date.now()}`, expiresAt: old },
    });
    await db.auditLog.create({ data: { userId: u.id, action: "auth.sign_in", createdAt: old } });
    await purgeExpiredData(Date.now(), true);
    expect(await db.session.count({ where: { userId: u.id, expiresAt: { lt: new Date() } } })).toBe(
      0,
    );
    expect(await db.authToken.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { userId: u.id, createdAt: old } })).toBe(0);
    expect(await db.session.count({ where: { userId: u.id } })).toBe(1); // the live one stays
  });
});
