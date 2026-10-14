"use server";
import { runAction, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow } from "@/server/auth/session";
import { customerPortalUrl } from "@/server/services/billing";

/** A one-time link to Paddle's page for updating the card, invoices and cancelling. */
export async function billingPortalAction(): Promise<ActionState<{ url: string }>> {
  return runAction("billingPortal", async () => {
    const user = await requireUserOrThrow();
    return { ok: true, data: { url: await customerPortalUrl(user.id) } };
  });
}
