import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertSameOrigin } from "@/server/api";

const req = (headers: Record<string, string>) =>
  new NextRequest("http://0.0.0.0:3000/api/documents", { method: "POST", headers });

describe("same-origin check for uploads", () => {
  it("accepts requests from the site's own address, including behind a hosting proxy", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        req({
          origin: "https://kosha.up.railway.app",
          host: "10.0.0.5:8080",
          "x-forwarded-host": "kosha.up.railway.app",
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(req({ origin: "http://192.168.1.23:3000", host: "192.168.1.23:3000" })),
    ).not.toThrow();
  });
  it("rejects requests sent from other websites", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://evil.example", host: "kosha.up.railway.app" })),
    ).toThrow(/origin/);
    expect(() => assertSameOrigin(req({ origin: "null", host: "localhost:3000" }))).toThrow(
      /origin/,
    );
  });
});
