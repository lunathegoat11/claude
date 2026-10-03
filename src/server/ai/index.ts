import "server-only";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import type { AIProvider } from "./types";
import { DemoProvider } from "./providers/demo";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openai";

let provider: AIProvider | undefined;

/**
 * Resolve the configured AI provider. Falls back to the grounded demo provider
 * (no external calls) when no credentials are configured, so the assistant is
 * always usable.
 */
export function aiProvider(): AIProvider {
  if (provider) return provider;
  const e = env();
  if (e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY)
    provider = new AnthropicProvider(e.ANTHROPIC_API_KEY, e.AI_MODEL);
  else if (e.AI_PROVIDER === "openai" && e.OPENAI_API_KEY)
    provider = new OpenAICompatibleProvider(e.OPENAI_API_KEY, e.OPENAI_BASE_URL, e.AI_MODEL);
  else {
    if (e.AI_PROVIDER !== "demo")
      logger.warn("ai.provider_missing_credentials", { provider: e.AI_PROVIDER });
    provider = new DemoProvider();
  }
  return provider;
}

export const demoProvider = new DemoProvider();

export function setAIProvider(p: AIProvider | undefined) {
  provider = p;
}

export function visionExtractionEnabled() {
  const p = aiProvider();
  return env().AI_VISION_EXTRACTION && p.supportsVision && typeof p.transcribeImage === "function";
}
