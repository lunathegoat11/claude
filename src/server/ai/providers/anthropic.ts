import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import type { AIProvider, ExtractedReport, GenerateInput, KeyCheck, ReportInput } from "../types";
import { EXTRACT_REPORT_PROMPT, VISION_TRANSCRIBE_PROMPT } from "../prompts";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

const DEFAULT_MODEL = "claude-opus-5-5";

/** If a request is declined by a safety classifier, the API retries it on a suitable model. */
const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

const ReportSchema = z.object({
  readable: z.boolean(),
  problem: z.enum(["BLURRY", "NOT_A_REPORT"]).nullable(),
  reportName: z.string().nullable(),
  labName: z.string().nullable(),
  collectedAt: z.string().nullable(),
  results: z.array(
    z.object({
      testName: z.string(),
      value: z.string(),
      unit: z.string().nullable(),
      refText: z.string().nullable(),
      flag: z.enum(["LOW", "HIGH", "NORMAL"]).nullable(),
    }),
  ),
  transcript: z.string().nullable(),
});

type ImageMedia = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
function imageMedia(mimeType: string): ImageMedia {
  return (
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)
      ? mimeType
      : "image/jpeg"
  ) as ImageMedia;
}

function textOf(content: Anthropic.Beta.BetaContentBlock[]) {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Claude via the official Anthropic SDK. */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  readonly supportsVision = true;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 180_000 });
    this.model = model || DEFAULT_MODEL;
  }

  async generate(input: GenerateInput): Promise<string> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...input.history.map(
        (t) => ({ role: t.role, content: t.content }) as Anthropic.Beta.BetaMessageParam,
      ),
      {
        role: "user",
        content: `<records>\n${input.context}\n</records>\n\nQuestion: ${input.question}`,
      },
    ];
    const response = await this.client.beta.messages.create({
      ...FALLBACK,
      model: this.model,
      max_tokens: 4000,
      system: input.system,
      messages,
      // Short, grounded summaries do not need deep reasoning.
      output_config: { effort: "low" },
    });
    if (response.stop_reason === "refusal") {
      throw new AppError("AI_UNAVAILABLE", "The AI service declined to answer this question.");
    }
    const text = textOf(response.content);
    if (!text) throw new AppError("AI_UNAVAILABLE", "The AI service returned an empty answer.");
    return text;
  }

  async transcribeImage(image: Buffer, mimeType: string): Promise<string> {
    const response = await this.client.beta.messages.create({
      ...FALLBACK,
      model: this.model,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMedia(mimeType),
                data: image.toString("base64"),
              },
            },
            { type: "text", text: VISION_TRANSCRIBE_PROMPT },
          ],
        },
      ],
      output_config: { effort: "low" },
    });
    return textOf(response.content);
  }

  /**
   * Read every result from a report. PDFs and photos are sent as-is so the model sees the
   * table layout; the answer comes back as schema-validated JSON (structured outputs).
   */
  async extractReport(input: ReportInput): Promise<ExtractedReport> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (input.kind === "pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: input.data.toString("base64"),
        },
      });
    } else if (input.kind === "image") {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageMedia(input.mimeType),
          data: input.data.toString("base64"),
        },
      });
    } else {
      content.push({ type: "text", text: `<report_text>\n${input.text}\n</report_text>` });
    }
    content.push({ type: "text", text: EXTRACT_REPORT_PROMPT });

    const response = await this.client.beta.messages.parse({
      ...FALLBACK,
      model: this.model,
      max_tokens: 16000,
      messages: [{ role: "user", content }],
      // Reading numbers off a table must be accurate; medium effort is enough for that.
      output_config: { effort: "medium", format: betaZodOutputFormat(ReportSchema) },
    });
    if (response.stop_reason === "refusal")
      throw new AppError("AI_UNAVAILABLE", "The AI service declined to read this document.");
    if (response.stop_reason === "max_tokens")
      logger.warn("ai.extract_truncated", { model: this.model });
    const out = response.parsed_output;
    if (!out) throw new AppError("AI_UNAVAILABLE", "The AI service returned an unreadable answer.");
    return out;
  }

  async verifyKey(): Promise<KeyCheck> {
    try {
      await this.client.models.retrieve(this.model, {}, { maxRetries: 0, timeout: 15_000 });
      // A valid key can still have no credit: a one-token request finds out.
      await this.client.messages.create(
        { model: this.model, max_tokens: 1, messages: [{ role: "user", content: "OK" }] },
        { maxRetries: 0, timeout: 20_000 },
      );
      return "ok";
    } catch (err) {
      if (
        err instanceof Anthropic.AuthenticationError ||
        err instanceof Anthropic.PermissionDeniedError
      )
        return "invalid";
      if (err instanceof Anthropic.NotFoundError) return "unknown_model";
      if (err instanceof Anthropic.APIError && /credit|billing/i.test(err.message))
        return "no_credit";
      return "unreachable";
    }
  }
}
