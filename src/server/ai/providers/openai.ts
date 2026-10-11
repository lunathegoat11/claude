import "server-only";
import type { AIProvider, GenerateInput, KeyCheck } from "../types";
import { VISION_TRANSCRIBE_PROMPT } from "../prompts";
import { AppError } from "@/server/errors";

/**
 * Any OpenAI-compatible Chat Completions endpoint: OpenAI, OpenRouter, NVIDIA, Gemini,
 * Groq, Mistral, DeepSeek, Together, xAI (see lib/ai-services.ts), or a gateway set up
 * by whoever runs the server.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly model: string;
  /** Tried when asked; if the chosen model can't take images, reading falls back to OCR. */
  readonly supportsVision = true;
  private verifyPath: string;
  private listsModels: boolean;
  private label: string;
  private keysSite: string;

  constructor(
    private apiKey: string,
    private baseUrl: string,
    model?: string,
    opts: {
      name?: string;
      verifyPath?: string;
      listsModels?: boolean;
      label?: string;
      keysSite?: string;
    } = {},
  ) {
    this.model = model || "gpt-4o-mini";
    this.name = opts.name ?? "openai";
    this.verifyPath = opts.verifyPath ?? "/models";
    this.listsModels = opts.listsModels ?? false;
    this.label = opts.label ?? "The AI service";
    this.keysSite = opts.keysSite ?? "the AI service's website";
  }

  private post(body: Record<string, unknown>) {
    return fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, ...body }),
      signal: AbortSignal.timeout(90_000),
    });
  }

  /** A plain-language reason for a failed request; never includes the key. */
  private problem(status: number, body: string): AppError {
    const b = body.toLowerCase();
    const say = (m: string) => new AppError("AI_UNAVAILABLE", m);
    if (status === 401 || status === 403)
      return say(`${this.label} didn't accept the API key. Check it in Settings → AI helper.`);
    if (
      status === 402 ||
      /insufficient_quota|insufficient.{0,20}(credit|balance|funds)|credit balance|billing|exceeded your current quota|payment required/.test(
        b,
      )
    )
      return say(
        `Your ${this.label} account has no credit left. Add credit on ${this.keysSite}, then try again.`,
      );
    if (
      status === 404 ||
      /model_not_found|does not exist|not found|no endpoints found|invalid model|unknown model/.test(
        b,
      )
    )
      return say(
        `${this.label} doesn't offer the model “${this.model}” to this key. Choose another model in Settings → AI helper.`,
      );
    if (status === 429) return say(`${this.label} is busy right now. Try again in a minute.`);
    return say(`${this.label} returned an error (${status}). Try again later.`);
  }

  private async chat(messages: unknown[], maxTokens = 2000): Promise<string> {
    let res = await this.post({ messages, temperature: 0.2, max_tokens: maxTokens });
    if (res.status === 400) {
      // Newer models (e.g. OpenAI's reasoning models) refuse max_tokens and temperature
      // and want max_completion_tokens instead: ask again in that form.
      const body = await res.text();
      if (/max_tokens|max_completion_tokens|temperature|unsupported/i.test(body))
        res = await this.post({ messages, max_completion_tokens: Math.max(maxTokens, 512) });
      else throw this.problem(400, body);
    }
    if (!res.ok) throw this.problem(res.status, await res.text().catch(() => ""));
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AppError("AI_UNAVAILABLE", `${this.label} returned an empty answer.`);
    return text;
  }

  generate(input: GenerateInput): Promise<string> {
    return this.chat([
      { role: "system", content: input.system },
      ...input.history,
      {
        role: "user",
        content: `<records>\n${input.context}\n</records>\n\nQuestion: ${input.question}`,
      },
    ]);
  }

  transcribeImage(image: Buffer, mimeType: string): Promise<string> {
    return this.chat([
      {
        role: "user",
        content: [
          { type: "text", text: VISION_TRANSCRIBE_PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${image.toString("base64")}` },
          },
        ],
      },
    ]);
  }

  async verifyKey(): Promise<KeyCheck> {
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}${this.verifyPath}`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 400 || res.status === 401 || res.status === 403) return "invalid";
      if (!res.ok) return "unreachable";
      if (this.listsModels) {
        const json = (await res.json().catch(() => null)) as {
          data?: { id?: string }[];
          models?: { name?: string }[];
        } | null;
        const ids = [
          ...(json?.data ?? []).map((m) => m.id ?? ""),
          ...(json?.models ?? []).map((m) => m.name ?? ""),
        ].filter(Boolean);
        if (ids.length && !ids.some((id) => id === this.model || id.endsWith(`/${this.model}`)))
          return "unknown_model";
      }
      // A key can exist and still be unusable (no credit, model not allowed): try a tiny
      // real request, so a key that can't answer is never saved as working.
      try {
        await this.chat([{ role: "user", content: "Reply with OK." }], 16);
      } catch (err) {
        const m = err instanceof AppError ? err.message : "";
        if (/no credit/.test(m)) return "no_credit";
        if (/doesn't offer the model/.test(m)) return "unknown_model";
        if (/didn't accept the API key/.test(m)) return "invalid";
        if (/returned an empty answer/.test(m)) return "ok";
        return "unreachable";
      }
      return "ok";
    } catch {
      return "unreachable";
    }
  }
}
