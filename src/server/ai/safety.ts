import type { Citation } from "./types";
import { INDIA_EMERGENCY } from "@/lib/india";

/**
 * Deterministic safety layer that wraps every AI response regardless of the
 * provider. The model is *instructed* to be safe; this layer *enforces* the
 * rules that can be checked mechanically.
 */

export interface QuestionFlags {
  emergency: boolean;
  selfHarm: boolean;
  dosing: boolean;
  diagnosis: boolean;
}

export function classifyQuestion(q: string): QuestionFlags {
  const t = q.toLowerCase();
  const selfHarm =
    /\b(kill myself|suicid\w*|end my life|self[- ]harm|hurt myself|want to die)\b/.test(t);
  const emergency =
    selfHarm ||
    /\b(chest pain|crushing chest|can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath|unconscious|fainted|passed out|seizure|fits|stroke|face droop\w*|slurred speech|severe bleeding|bleeding heavily|overdose|poison\w*|anaphyla\w*|throat (is )?(closing|swelling))\b/.test(
      t,
    );
  const dosing =
    /\b(dose|dosage|how (much|many)|should i (take|stop|start|increase|decrease|skip|double|reduce|change)|can i (stop|skip|increase|decrease|double|reduce|take))\b/.test(
      t,
    ) &&
    /\b(mg|mcg|units?|tablets?|pills?|insulin|metformin|medicine|medication|medications|drug|dose|dosage|statin|thyroxine|eltroxin|thyronorm|amlodipine|telmisartan|glimepiride|atorvastatin|rosuvastatin|aspirin|paracetamol|dolo|crocin)\b/.test(
      t,
    );
  const diagnosis =
    /\b(do i have|am i (diabetic|pre-?diabetic|anaemic|anemic|hypertensive|sick)|is (it|this) (cancer|serious|dangerous|diabetes)|diagnos\w*|what disease|what condition do i)\b/.test(
      t,
    );
  return { emergency, selfHarm, dosing, diagnosis };
}

export function emergencyResponse(selfHarm: boolean): string {
  const lines = [
    "**This may need urgent help — please don't rely on this app right now.**",
    "",
    `- Call **${INDIA_EMERGENCY.unified}** (national emergency number) or **${INDIA_EMERGENCY.ambulance}** for an ambulance.`,
    "- If you can, ask someone nearby to stay with you, or go to the nearest hospital emergency department.",
  ];
  if (selfHarm) {
    lines.push(
      `- You can talk to a trained counsellor any time on **Tele-MANAS: ${INDIA_EMERGENCY.mentalHealth}** (free, 24×7, multiple Indian languages).`,
    );
    lines.push(
      "- You don't have to go through this alone. Reaching out to someone you trust right now can help.",
    );
  }
  lines.push(
    "",
    "This assistant only organises your health records. It cannot assess symptoms or emergencies.",
  );
  return lines.join("\n");
}

export const DOSING_NOTE =
  "I can't advise on starting, stopping or changing any medicine or its dose. Please discuss medication questions with your doctor or pharmacist.";

export const DIAGNOSIS_NOTE =
  "I can't tell you whether you have a condition — only a qualified doctor can make a diagnosis. Below is what your records show.";

const DOSING_ADVICE =
  /\b(take|taking|increase|decrease|reduce|raise|lower|double|halve|stop|start|skip|switch|adjust)\b[^.\n]{0,80}?\b\d+(?:\.\d+)?\s?(mg|mcg|µg|units?|iu|ml|tablets?|pills?|capsules?)\b/i;
const DIRECTIVE_ADVICE =
  /\byou should (start|stop|increase|decrease|reduce|double|skip|change) (taking |your )?(medicine|medication|insulin|dose|tablets?|pills?)/i;
const DIAGNOSTIC_CLAIM =
  /\b(you (have|are suffering from|definitely have|clearly have)|this (confirms|means you have)|you are diagnosed with)\b/i;

const UNIT_NUMBER =
  /(\d+(?:\.\d+)?)\s?(mg\/dl|mmol\/l|mmol\/mol|%|mmhg|bpm|g\/dl|u\/l|iu\/l|µiu\/ml|uiu\/ml|miu\/l|ng\/dl|ng\/ml|pg\/ml|µg\/dl|kg|lb|°f|°c|lakh\/µl|million\/µl|\/µl)/gi;

/**
 * Numbers that may legitimately appear in an answer: every number in the
 * context, plus differences between them (so "calculated change +0.3%" between
 * two recorded values is not flagged).
 */
function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  const add = (n: number) => {
    out.add(String(Number(n.toFixed(4))));
    out.add(n.toFixed(1));
    out.add(n.toFixed(2));
  };
  const nums = [...new Set([...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0])))];
  nums.forEach(add);
  const capped = nums.slice(0, 300);
  for (let i = 0; i < capped.length; i++)
    for (let j = i + 1; j < capped.length; j++) add(Math.abs(capped[i] - capped[j]));
  return out;
}

export interface SanitizedAnswer {
  text: string;
  citations: Citation[];
  removedAdvice: boolean;
  unverifiedNumbers: string[];
}

/**
 * - Removes citations that do not exist in the retrieved context (no invented references).
 * - Removes sentences that give medication / dose instructions or state a diagnosis.
 * - Flags numeric values with health units that do not appear in the context.
 */
export function sanitizeAnswer(
  answer: string,
  context: string,
  available: Citation[],
): SanitizedAnswer {
  const byRef = new Map(available.map((c) => [c.ref, c]));
  const used = new Map<string, Citation>();
  let text = answer.replace(/\[([A-Z]\d{1,3})\]/g, (whole, ref: string) => {
    const c = byRef.get(ref);
    if (!c) return "";
    used.set(ref, c);
    return whole;
  });

  let removedAdvice = false;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z*\-•])|\n/);
  const kept: string[] = [];
  for (const s of sentences) {
    if (DOSING_ADVICE.test(s) || DIRECTIVE_ADVICE.test(s) || DIAGNOSTIC_CLAIM.test(s)) {
      removedAdvice = true;
      continue;
    }
    kept.push(s);
  }
  if (removedAdvice) {
    // Re-join while keeping line structure where it existed.
    text = kept.join("\n").replace(/\n{3,}/g, "\n\n");
  }

  const known = numbersIn(context);
  const unverified: string[] = [];
  for (const m of text.matchAll(UNIT_NUMBER)) {
    const n = Number(m[1]);
    if (!known.has(String(n)) && !known.has(n.toFixed(1)) && !known.has(n.toFixed(2)))
      unverified.push(`${m[1]} ${m[2]}`);
  }

  return {
    text: text.trim(),
    citations: [...used.values()],
    removedAdvice,
    unverifiedNumbers: [...new Set(unverified)].slice(0, 10),
  };
}
