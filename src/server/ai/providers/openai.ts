import "server-only";
import type { AIProvider, GenerateInput } from "../types";
import { VISION_TRANSCRIBE_PROMPT } from "../prompts";
import { AppError } from "@/server/errors";

/**
 * Any OpenAI-compatible Chat Completions endpoint (OpenAI, Azure OpenAI,
 * self-hosted gateways, many Indian-hosted inference providers, etc.).
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;
  readonly supportsVision = true;

  constructor(
    private apiKey: string,
    private baseUrl: string,
    model?: string,
  ) {
    this.model = model || "gpt-4o-mini";
  }

  private async chat(messages: unknown[]): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.2, max_tokens: 2000 }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok)
      throw new AppError("AI_UNAVAILABLE", `The AI service returned an error (${res.status}).`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AppError("AI_UNAVAILABLE", "The AI service returned an empty answer.");
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
}
