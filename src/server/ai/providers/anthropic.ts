import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateInput } from "../types";
import { VISION_TRANSCRIBE_PROMPT } from "../prompts";
import { AppError } from "@/server/errors";

const DEFAULT_MODEL = "claude-opus-5-5";

/** Claude via the official Anthropic SDK. */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  readonly supportsVision = true;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
    this.model = model || DEFAULT_MODEL;
  }

  async generate(input: GenerateInput): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...input.history.map((t) => ({ role: t.role, content: t.content }) as Anthropic.MessageParam),
      {
        role: "user",
        content: `<records>\n${input.context}\n</records>\n\nQuestion: ${input.question}`,
      },
    ];
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: input.system,
      messages,
      // Short, grounded summaries do not need deep reasoning.
      output_config: { effort: "low" },
    } as Anthropic.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") {
      throw new AppError("AI_UNAVAILABLE", "The AI service declined to answer this question.");
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new AppError("AI_UNAVAILABLE", "The AI service returned an empty answer.");
    return text;
  }

  async transcribeImage(image: Buffer, mimeType: string): Promise<string> {
    const media = (
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)
        ? mimeType
        : "image/jpeg"
    ) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: media, data: image.toString("base64") },
            },
            { type: "text", text: VISION_TRANSCRIBE_PROMPT },
          ],
        },
      ],
      output_config: { effort: "low" },
    } as Anthropic.MessageCreateParamsNonStreaming);
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
}
