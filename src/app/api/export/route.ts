import { withApi } from "@/server/api";
import { exportUserData } from "@/server/services/profile";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

/** GET /api/export — download everything the user has stored, as JSON. */
export const GET = withApi(async (req, { user }) => {
  await rateLimit("export", user.id);
  const data = await exportUserData(user.id);
  await audit(user.id, "data.export", undefined, {
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kosha-export-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
});
