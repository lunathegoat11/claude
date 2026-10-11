import "server-only";
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

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "OpenAI",
};

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
  provider: z.enum(["anthropic", "openai"], {
    errorMap: () => ({ message: "Choose which AI service the key is for" }),
  }),
  apiKey: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: "Paste your API key" })
      .min(20, "That doesn't look like a full API key")
      .max(300, "That doesn't look like an API key")
      .regex(/^[A-Za-z0-9_\-.]+$/, "API keys don't contain spaces or symbols like that"),
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
    keyHint: c.keyHint,
    readDocuments: c.readDocuments,
    updatedAt: c.updatedAt,
    // False if APP_SECRET changed since the key was saved; the user must paste it again.
    usable: openSecret(c.encryptedKey, context(userId)) !== null,
  };
}

export async function saveAiKey(userId: string, raw: unknown) {
  const input = saveSchema.parse(raw);
  if (input.provider === "anthropic" && !input.apiKey.startsWith("sk-ant-"))
    throw new AppError("VALIDATION", "Claude API keys start with “sk-ant-”.", {
      apiKey: ["Claude API keys start with “sk-ant-”"],
    });
  if (input.provider === "openai" && !input.apiKey.startsWith("sk-"))
    throw new AppError("VALIDATION", "OpenAI API keys start with “sk-”.", {
      apiKey: ["OpenAI API keys start with “sk-”"],
    });

  const check = (await createProvider(input.provider, input.apiKey).verifyKey?.()) ?? "unreachable";
  if (check === "invalid")
    throw new AppError(
      "VALIDATION",
      `${AI_PROVIDER_LABELS[input.provider]} didn't accept this key. Check you copied all of it.`,
      { apiKey: ["This key was not accepted"] },
    );

  const data = {
    provider: input.provider,
    encryptedKey: sealSecret(input.apiKey, context(userId)),
    keyHint: input.apiKey.slice(-4),
    readDocuments: input.readDocuments,
  };
  await db.aiCredential.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { verified: check === "ok", provider: input.provider };
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
  if (forced) return { provider: forced, readDocuments: forced.supportsVision, source: "server" };
  const c = await db.aiCredential.findUnique({ where: { userId } });
  if (c) {
    const key = openSecret(c.encryptedKey, context(userId));
    if (key)
      return {
        provider: createProvider(c.provider as AiProviderId, key),
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
  const name = ai.provider.name as AiProviderId;
  return `by ${AI_PROVIDER_LABELS[name] ?? "your AI service"} (AI), using your key`;
}
