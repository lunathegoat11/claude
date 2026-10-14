import type { NextRequest } from "next/server";
import { handlePaddleEvent, verifyPaddleSignature } from "@/server/services/billing";
import { logger } from "@/server/logger";

export const runtime = "nodejs";

/**
 * POST /api/billing/paddle — Paddle tells us about payments here (a "notification
 * destination" in Paddle). Only requests signed with the webhook secret are accepted.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 256 * 1024) return new Response("Too large", { status: 413 });
  if (!verifyPaddleSignature(body, req.headers.get("paddle-signature")))
    return new Response("Bad signature", { status: 401 });
  let event: Parameters<typeof handlePaddleEvent>[0];
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  try {
    const outcome = await handlePaddleEvent(event);
    logger.info("billing.webhook", { type: event.event_type, outcome });
    return new Response("OK");
  } catch (e) {
    logger.error("billing.webhook_failed", { type: event.event_type, error: String(e) });
    return new Response("Error", { status: 500 }); // Paddle retries
  }
}
