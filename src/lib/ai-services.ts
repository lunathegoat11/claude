/**
 * The AI services people can connect with their own API key. Each one's address is fixed
 * here, so a saved key can only ever be sent to that company's official API.
 *
 * Everything except Claude speaks the OpenAI-compatible "chat completions" format.
 * Default models are a starting point; people can pick another model the service offers.
 */
export interface AiService {
  label: string;
  /** OpenAI-compatible API base URL (not used for Claude, which has its own SDK). */
  baseUrl: string | null;
  /** How the service's keys start, to catch a key pasted into the wrong service. */
  keyPrefix: string | null;
  keysUrl: string;
  keysSite: string;
  defaultModel: string | null;
  /** Path that only answers with a valid key (relative to baseUrl). */
  verifyPath: string;
  /** Whether the service's models list can be used to check a chosen model exists. */
  listsModels: boolean;
}

export const AI_SERVICES = {
  anthropic: {
    label: "Claude (Anthropic)",
    baseUrl: null,
    keyPrefix: "sk-ant-",
    keysUrl: "https://console.anthropic.com/settings/keys",
    keysSite: "console.anthropic.com",
    defaultModel: null,
    verifyPath: "/models",
    listsModels: false,
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyPrefix: "sk-",
    keysUrl: "https://platform.openai.com/api-keys",
    keysSite: "platform.openai.com",
    defaultModel: "gpt-4o-mini",
    verifyPath: "/models",
    listsModels: true,
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keyPrefix: "sk-or-",
    keysUrl: "https://openrouter.ai/settings/keys",
    keysSite: "openrouter.ai",
    defaultModel: "openrouter/auto",
    // OpenRouter's model list is public, so the key is checked on its own endpoint.
    verifyPath: "/key",
    listsModels: false,
  },
  nvidia: {
    label: "NVIDIA (build.nvidia.com)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyPrefix: "nvapi-",
    keysUrl: "https://build.nvidia.com/",
    keysSite: "build.nvidia.com",
    defaultModel: "meta/llama-3.3-70b-instruct",
    verifyPath: "/models",
    listsModels: false,
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyPrefix: "AIza",
    keysUrl: "https://aistudio.google.com/apikey",
    keysSite: "aistudio.google.com",
    defaultModel: "gemini-2.5-flash",
    verifyPath: "/models",
    listsModels: true,
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keyPrefix: "gsk_",
    keysUrl: "https://console.groq.com/keys",
    keysSite: "console.groq.com",
    defaultModel: "llama-3.3-70b-versatile",
    verifyPath: "/models",
    listsModels: true,
  },
  mistral: {
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    keyPrefix: null,
    keysUrl: "https://console.mistral.ai/api-keys",
    keysSite: "console.mistral.ai",
    defaultModel: "mistral-small-latest",
    verifyPath: "/models",
    listsModels: true,
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    keyPrefix: "sk-",
    keysUrl: "https://platform.deepseek.com/api_keys",
    keysSite: "platform.deepseek.com",
    defaultModel: "deepseek-chat",
    verifyPath: "/models",
    listsModels: true,
  },
  together: {
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    keyPrefix: null,
    keysUrl: "https://api.together.ai/settings/api-keys",
    keysSite: "api.together.ai",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    verifyPath: "/models",
    listsModels: true,
  },
  xai: {
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    keyPrefix: "xai-",
    keysUrl: "https://console.x.ai/",
    keysSite: "console.x.ai",
    defaultModel: "grok-3-mini",
    verifyPath: "/models",
    listsModels: true,
  },
} as const satisfies Record<string, AiService>;

export type AiServiceId = keyof typeof AI_SERVICES;
export const AI_SERVICE_IDS = Object.keys(AI_SERVICES) as AiServiceId[];

export function isAiServiceId(v: unknown): v is AiServiceId {
  return typeof v === "string" && v in AI_SERVICES;
}

/** Model names look like "gpt-4o-mini" or "meta/llama-3.3-70b-instruct". */
export const MODEL_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,119}$/;
