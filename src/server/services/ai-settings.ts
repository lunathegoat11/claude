import "server-only";
import { isPlus } from "./billing";
import { z } from "zod";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { openSecret, sealSecret } from "@/server/crypto";
import {
  aiProvider,
  createProvider,
  demoProvider,
  providerOverride,
  type AiProviderId,
} from "@/server/ai";
import type { AIProvider } from "@/server/ai/types";
import { AI_SERVICES, AI_SERVICE_IDS, MODEL_NAME, isAiServiceId } from "@/lib/ai-services";

export const AI_PROVIDER_LABELS = Object.fromEntries(
  AI_SERVICE_IDS.map((id) => [id, AI_SERVICES[id].label]),
) as Record<AiProviderId, string>;

/**
 * Who receives data when the AI service set up for this server is used, in words a
 * person can check, or null when no such service is set up.
 */
export function serverAiLabel(): string | null {
  const e = env();
  if (aiProvider().name === demoProvider.name) return null;
  if (e.AI_PROVIDER === "anthropic") return AI_PROVIDER_LABELS.anthropic;
  const host = new URL(e.OPENAI_BASE_URL).host;
  return host === "api.openai.com" ? AI_PROVIDER_LABELS.openai : `the AI service at ${host}`;
}

/** Turn the user's consent to use the server's AI service on or off. */
export async function setAiConsent(userId: string, on: boolean) {
  await db.user.update({ where: { id: userId }, data: { aiConsentAt: on ? new Date() : null } });
}

const saveSchema = z.object({
  provider: z.string().refine(isAiServiceId, "Choose which AI service the key is for"),
  apiKey: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: "Paste your API key" })
      .min(20, "That doesn't look like a full API key")
      .max(300, "That doesn't look like an API key")
      .regex(/^[A-Za-z0-9_\-.]+$/, "API keys don't contain spaces or symbols like that"),
  ),
  model: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().regex(MODEL_NAME, "That doesn't look like a model name").optional(),
  ),
  readDocuments: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

/** Context string binding each encrypted key to its owner (see crypto.ts). */
const context = (userId: string) => `ai-key:${userId}`;

/** What the settings page may show. The key itself never leaves the server. */
export async function getAiSettings(userId: string) {
  const c = await db.aiCredential.findUnique({ where: { userId } });
  if (!c) return null;
  return {
    provider: c.provider as AiProviderId,
    model: c.model ?? AI_SERVICES[c.provider as AiProviderId]?.defaultModel ?? null,
    keyHint: c.keyHint,
    readDocuments: c.readDocuments,
    updatedAt: c.updatedAt,
    // False if APP_SECRET changed since the key was saved; the user must paste it again.
    usable: openSecret(c.encryptedKey, context(userId)) !== null,
  };
}

export async function saveAiKey(userId: string, raw: unknown) {
  const input = saveSchema.parse(raw);
  const provider = input.provider as AiProviderId;
  const svc = AI_SERVICES[provider];
  if (svc.keyPrefix && !input.apiKey.startsWith(svc.keyPrefix))
    throw new AppError("VALIDATION", `${svc.label} API keys start with “${svc.keyPrefix}”.`, {
      apiKey: [`${svc.label} API keys start with “${svc.keyPrefix}”`],
    });
  // OpenAI keys must not be mistaken for the other "sk-" services.
  if (provider === "openai" && /^sk-(ant|or)-/.test(input.apiKey))
    throw new AppError("VALIDATION", "That looks like a key for a different AI service.", {
      apiKey: ["That looks like a key for a different AI service"],
    });

  const model = input.model && input.model !== svc.defaultModel ? input.model : null;
  const check =
    (await createProvider(provider, input.apiKey, model).verifyKey?.()) ?? "unreachable";
  if (check === "invalid")
    throw new AppError(
      "VALIDATION",
      `${svc.label} didn't accept this key. Check you copied all of it.`,
      { apiKey: ["This key was not accepted"] },
    );
  if (check === "no_credit")
    throw new AppError(
      "VALIDATION",
      `This key works, but your ${svc.label} account has no credit, so it can't answer yet. Add credit on ${svc.keysSite}, then save the key again.`,
      { apiKey: ["The account for this key has no credit"] },
    );
  if (check === "unknown_model")
    throw new AppError(
      "VALIDATION",
      `${svc.label} doesn't offer a model called “${input.model ?? svc.defaultModel}”. Check the name on ${svc.keysSite}, or leave it empty for the usual one.`,
      { model: ["This model isn't available"] },
    );

  const data = {
    provider,
    model,
    encryptedKey: sealSecret(input.apiKey, context(userId)),
    keyHint: input.apiKey.slice(-4),
    readDocuments: input.readDocuments,
  };
  await db.aiCredential.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { verified: check === "ok", provider };
}

export async function setDocumentReading(userId: string, on: boolean) {
  const res = await db.aiCredential.updateMany({ where: { userId }, data: { readDocuments: on } });
  if (!res.count) throw new AppError("NOT_FOUND", "Add an API key first.");
}

export async function removeAiKey(userId: string) {
  await db.aiCredential.deleteMany({ where: { userId } });
}

export interface ResolvedAI {
  provider: AIProvider;
  /** Whether uploaded documents may be sent to this provider to be read. */
  readDocuments: boolean;
  source: "user" | "server" | "demo";
}

/**
 * The AI a user's requests should use: their own key first; then the server's AI service,
 * but only if they have agreed to it; otherwise the built-in helper, which sends nothing
 * anywhere.
 */
export async function aiForUser(userId: string): Promise<ResolvedAI> {
  const forced = providerOverride();
  // The AI helper is part of Kosha Plus; on the free plan reports are read on this server.
  if (!forced && !(await isPlus(userId)))
    return { provider: demoProvider, readDocuments: false, source: "demo" };
  if (forced) return { provider: forced, readDocuments: forced.supportsVision, source: "server" };
  const c = await db.aiCredential.findUnique({ where: { userId } });
  if (c) {
    const key = openSecret(c.encryptedKey, context(userId));
    if (key)
      return {
        provider: createProvider(c.provider as AiProviderId, key, c.model),
        readDocuments: c.readDocuments,
        source: "user",
      };
  }
  const server = aiProvider();
  if (server.name === demoProvider.name)
    return { provider: server, readDocuments: false, source: "demo" };
  const user = await db.user.findUnique({ where: { id: userId }, select: { aiConsentAt: true } });
  if (!user?.aiConsentAt) return { provider: demoProvider, readDocuments: false, source: "demo" };
  return { provider: server, readDocuments: env().AI_VISION_EXTRACTION, source: "server" };
}

/** Who will read a report this user uploads, in plain words, for the upload screen. */
export async function documentReaderLabel(userId: string): Promise<string> {
  const ai = await aiForUser(userId);
  if (!ai.readDocuments || ai.source === "demo") return "on this server (no AI)";
  if (ai.source === "server") return `by ${serverAiLabel() ?? "an AI service"} (AI)`;
  const label = AI_PROVIDER_LABELS[ai.provider.name as AiProviderId] ?? "your AI service";
  return `by ${label} (AI), using your key`;
}
