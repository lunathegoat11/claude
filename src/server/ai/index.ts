import "server-only";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import type { AIProvider } from "./types";
import { DemoProvider } from "./providers/demo";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openai";

export type AiProviderId = "anthropic" | "openai";

let serverProvider: AIProvider | undefined;
let override: AIProvider | undefined;

/** Build a provider for a specific key (a user's own key, or the server's). */
export function createProvider(id: AiProviderId, apiKey: string): AIProvider {
  const e = env();
  // AI_MODEL applies to the provider it was configured for.
  const model = e.AI_PROVIDER === id ? e.AI_MODEL : undefined;
  return id === "anthropic"
    ? new AnthropicProvider(apiKey, model)
    : // Users' keys always go to the official endpoint; only the server key may use a custom base URL.
      new OpenAICompatibleProvider(apiKey, "https://api.openai.com/v1", model);
}

/**
 * The server-wide AI provider configured through environment variables. Falls back to the
 * grounded demo provider (no external calls) when no credentials are configured, so the
 * assistant is always usable.
 */
export function aiProvider(): AIProvider {
  if (override) return override;
  if (serverProvider) return serverProvider;
  const e = env();
  if (e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY)
    serverProvider = new AnthropicProvider(e.ANTHROPIC_API_KEY, e.AI_MODEL);
  else if (e.AI_PROVIDER === "openai" && e.OPENAI_API_KEY)
    serverProvider = new OpenAICompatibleProvider(e.OPENAI_API_KEY, e.OPENAI_BASE_URL, e.AI_MODEL);
  else {
    if (e.AI_PROVIDER !== "demo")
      logger.warn("ai.provider_missing_credentials", { provider: e.AI_PROVIDER });
    serverProvider = new DemoProvider();
  }
  return serverProvider;
}

export const demoProvider = new DemoProvider();

/** Tests only: force a provider for every request. */
export function setAIProvider(p: AIProvider | undefined) {
  override = p;
}
export function providerOverride() {
  return override;
}
