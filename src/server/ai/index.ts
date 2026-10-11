import "server-only";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import type { AIProvider } from "./types";
import { DemoProvider } from "./providers/demo";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openai";

import { AI_SERVICES, type AiServiceId } from "@/lib/ai-services";

export type AiProviderId = AiServiceId;

let serverProvider: AIProvider | undefined;
let override: AIProvider | undefined;

/**
 * Build a provider for a user's own key. Keys always go to the service's official
 * address from lib/ai-services.ts; only the server's own key may use a custom address.
 */
export function createProvider(
  id: AiProviderId,
  apiKey: string,
  model?: string | null,
): AIProvider {
  const e = env();
  if (id === "anthropic")
    return new AnthropicProvider(apiKey, model || (e.AI_PROVIDER === id ? e.AI_MODEL : undefined));
  const svc = AI_SERVICES[id];
  return new OpenAICompatibleProvider(apiKey, svc.baseUrl, model || svc.defaultModel, {
    name: id,
    verifyPath: svc.verifyPath,
    listsModels: svc.listsModels,
    label: svc.label,
    keysSite: svc.keysSite,
  });
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
