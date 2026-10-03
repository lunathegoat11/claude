import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import { aiProvider, demoProvider } from "@/server/ai";
import { analyseQuestion } from "@/server/ai/analyse";
import { buildContext, renderContext } from "@/server/ai/retrieval";
import {
  DIAGNOSIS_NOTE,
  DOSING_NOTE,
  classifyQuestion,
  emergencyResponse,
  sanitizeAnswer,
} from "@/server/ai/safety";
import { SYSTEM_PROMPT } from "@/server/ai/prompts";
import type { Citation, ChatTurn } from "@/server/ai/types";
import { assistantQuestionSchema } from "@/lib/validation/health";

export interface AssistantSafety {
  emergency?: boolean;
  dosingRequest?: boolean;
  diagnosisRequest?: boolean;
  removedAdvice?: boolean;
  unverifiedNumbers?: string[];
  fallback?: boolean;
  noData?: boolean;
}

export interface AssistantReply {
  conversationId: string;
  message: {
    id: string;
    content: string;
    citations: Citation[];
    safety: AssistantSafety;
    provider: string | null;
    createdAt: string;
  };
}

function titleFrom(q: string) {
  const t = q.replace(/\s+/g, " ").trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

export async function ask(userId: string, raw: unknown, timezone: string): Promise<AssistantReply> {
  const { conversationId, message } = assistantQuestionSchema.parse(raw);

  const conversation = conversationId
    ? await db.aIConversation.findFirst({ where: { id: conversationId, userId } })
    : await db.aIConversation.create({ data: { userId, title: titleFrom(message) } });
  if (!conversation) throw notFound("Conversation");

  const history = conversationId
    ? (
        await db.aIMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { role: true, content: true },
        })
      )
        .reverse()
        .map<ChatTurn>((m) => ({
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        }))
    : [];

  await db.aIMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  });

  const flags = classifyQuestion(message);
  let content: string;
  let citations: Citation[] = [];
  const safety: AssistantSafety = {};
  let providerName: string | null = null;
  let model: string | null = null;

  if (flags.emergency) {
    content = emergencyResponse(flags.selfHarm);
    safety.emergency = true;
    providerName = "safety";
  } else {
    const analysis = analyseQuestion(message);
    // Medication/dose questions: show only what's recorded, never an overview that could read as advice.
    if (flags.dosing) analysis.intents = ["HEALTH_SUMMARY"];
    const bundle = await buildContext(userId, analysis, timezone);
    const context = renderContext(bundle);
    const provider = aiProvider();
    let answer: string;
    try {
      answer = await provider.generate({
        system: SYSTEM_PROMPT,
        context,
        history,
        question: message,
        bundle,
      });
      providerName = provider.name;
      model = provider.model;
    } catch (err) {
      // Never leave the user without an answer: fall back to the grounded summary.
      logger.error("ai.generate_failed", { provider: provider.name, err });
      answer = await demoProvider.generate({
        system: SYSTEM_PROMPT,
        context,
        history,
        question: message,
        bundle,
      });
      providerName = demoProvider.name;
      model = demoProvider.model;
      safety.fallback = provider.name !== demoProvider.name;
    }

    const clean = sanitizeAnswer(answer, context, bundle.citations);
    citations = clean.citations;
    safety.removedAdvice = clean.removedAdvice || undefined;
    safety.unverifiedNumbers = clean.unverifiedNumbers.length ? clean.unverifiedNumbers : undefined;
    safety.noData = bundle.citations.length === 0 || undefined;

    const prefix: string[] = [];
    if (flags.dosing) {
      prefix.push(`> ${DOSING_NOTE}`);
      safety.dosingRequest = true;
    }
    if (flags.diagnosis) {
      prefix.push(`> ${DIAGNOSIS_NOTE}`);
      safety.diagnosisRequest = true;
    }
    content = [...prefix, prefix.length ? "" : null, clean.text]
      .filter((x) => x !== null)
      .join("\n");
    if (clean.removedAdvice) {
      content += `\n\n> Part of this answer was removed because it looked like medical or medication advice. ${DOSING_NOTE}`;
    }
  }

  const saved = await db.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content,
      citations: citations as unknown as Prisma.InputJsonValue,
      safety: safety as Prisma.InputJsonValue,
      provider: providerName,
      model,
    },
  });
  await db.aIConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    conversationId: conversation.id,
    message: {
      id: saved.id,
      content,
      citations,
      safety,
      provider: providerName,
      createdAt: saved.createdAt.toISOString(),
    },
  };
}

export async function listConversations(userId: string, take = 30) {
  return db.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take,
    select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
  });
}

export async function getConversation(userId: string, id: string) {
  const c = await db.aIConversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
  if (!c) throw notFound("Conversation");
  return c;
}

export async function deleteConversation(userId: string, id: string) {
  const res = await db.aIConversation.deleteMany({ where: { id, userId } });
  if (!res.count) throw notFound("Conversation");
}
