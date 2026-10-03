import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { analyseQuestion, parseTimeRange } from "@/server/ai/analyse";
import { buildContext, renderContext } from "@/server/ai/retrieval";
import { classifyQuestion, sanitizeAnswer } from "@/server/ai/safety";
import { setAIProvider } from "@/server/ai";
import type { AIProvider, GenerateInput } from "@/server/ai/types";
import { ask } from "@/server/services/assistant";
import { createLabPanel } from "@/server/services/labs";
import { createMeasurement } from "@/server/services/measurements";
import { createRecord } from "@/server/services/records";
import { db } from "@/server/db";
import { TZ, cleanup, daysAgoInput, makeUser, metricId } from "./helpers/factory";

let alice: { id: string };
let bob: { id: string };
beforeAll(async () => {
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
  const g = await metricId("blood_glucose");
  for (let d = 1; d <= 40; d++) {
    await createMeasurement(
      alice.id,
      {
        metricId: g,
        value: String(95 + (d % 10)),
        unit: "mg/dL",
        measuredAt: daysAgoInput(d, "07:30"),
        context: "FASTING",
      },
      TZ,
    );
  }
  await createLabPanel(
    alice.id,
    {
      name: "Panel 1",
      collectedAt: "2026-03-04",
      results: [
        { testName: "HbA1c", value: "5.4", unit: "%", refLow: "4", refHigh: "5.6" },
        { testName: "LDL cholesterol", value: "138", unit: "mg/dL", refHigh: "100" },
      ],
    },
    TZ,
  );
  await createLabPanel(
    alice.id,
    {
      name: "Panel 2",
      collectedAt: "2026-09-12",
      results: [
        { testName: "HbA1c", value: "5.7", unit: "%", refLow: "4", refHigh: "5.6" },
        { testName: "LDL cholesterol", value: "116", unit: "mg/dL", refHigh: "100" },
      ],
    },
    TZ,
  );
  await createRecord(
    alice.id,
    {
      type: "DOCTOR_VISIT",
      title: "Cardiology review",
      date: "2026-08-01",
      doctorName: "Dr. Test",
      notes: "Blood pressure discussed.",
      tags: "",
    },
    TZ,
  );
  // Bob has data that must never leak into Alice's context.
  await createLabPanel(
    bob.id,
    {
      name: "Bob panel",
      collectedAt: "2026-09-01",
      results: [{ testName: "HbA1c", value: "9.9", unit: "%" }],
    },
    TZ,
  );
});
afterAll(() => cleanup(alice.id, bob.id));
afterEach(() => setAIProvider(undefined));

describe("question analysis", () => {
  const now = new Date("2026-10-03T06:00:00Z");
  it("detects intents, metrics and biomarkers", () => {
    const a = analyseQuestion("What were my glucose readings over the last month?", now);
    expect(a.intents).toContain("MEASUREMENT_TREND");
    expect(a.metricKeys).toEqual(["blood_glucose"]);
    expect(a.range.label).toBe("the last month");
    expect(analyseQuestion("What changed between these two lab reports?", now).intents).toContain(
      "LAB_COMPARE",
    );
    expect(analyseQuestion("Show me my HbA1c trend", now).biomarkerCodes).toContain("HBA1C");
    expect(analyseQuestion("What documents mention my blood pressure?", now).intents).toContain(
      "DOCUMENT_SEARCH",
    );
    expect(analyseQuestion("Summarize my recent doctor visits", now).intents).toContain(
      "VISIT_SUMMARY",
    );
    expect(analyseQuestion("Summarize my recent blood tests", now).intents).toContain(
      "LAB_SUMMARY",
    );
  });
  it("parses time ranges", () => {
    expect(parseTimeRange("last 7 days", now).from?.toISOString()).toBe("2026-09-26T06:00:00.000Z");
    expect(parseTimeRange("since March", now).label).toBe("since March 2026");
    expect(parseTimeRange("everything", now).from).toBeNull();
  });
});

describe("retrieval", () => {
  it("selects only relevant, bounded slices of the user's own data", async () => {
    const bundle = await buildContext(
      alice.id,
      analyseQuestion("What were my glucose readings over the last month?"),
      TZ,
    );
    expect(bundle.measurements).toHaveLength(1);
    const series = bundle.measurements[0];
    expect(series.totalInRange).toBeGreaterThanOrEqual(29);
    expect(series.totalInRange).toBeLessThanOrEqual(31);
    expect(series.points.length).toBeLessThanOrEqual(30); // capped
    expect(bundle.documents).toHaveLength(0);
    expect(bundle.records).toHaveLength(0);
    expect(bundle.citations.every((c) => c.ref.startsWith("M") || c.ref.startsWith("L"))).toBe(
      true,
    );
  });
  it("never includes another user's records", async () => {
    const bundle = await buildContext(alice.id, analyseQuestion("Show me my HbA1c trend"), TZ);
    const text = renderContext(bundle);
    expect(text).toContain("5.7");
    expect(text).not.toContain("9.9");
    expect(bundle.labs[0].points).toHaveLength(2);
  });
});

describe("safety layer", () => {
  it("classifies risky questions", () => {
    expect(classifyQuestion("I have crushing chest pain").emergency).toBe(true);
    expect(classifyQuestion("I want to kill myself").selfHarm).toBe(true);
    expect(classifyQuestion("Should I increase my metformin dose?").dosing).toBe(true);
    expect(classifyQuestion("Do I have diabetes?").diagnosis).toBe(true);
    expect(classifyQuestion("Show my HbA1c").emergency).toBe(false);
  });
  it("removes invented citations, dosing advice and diagnostic claims, and flags unverified numbers", () => {
    const ctx =
      "[L1] 12 Sep 2026 — 5.7 % (report reference range: 4 – 5.6)\n[L2] 4 Mar 2026 — 5.4 %";
    const answer = [
      "Your HbA1c was 5.7 % on 12 Sep 2026 [L1] and 5.4 % earlier [L2] [L9].",
      "You should increase metformin to 1000 mg daily.",
      "You have diabetes.",
      "Your average glucose was 180 mg/dL.",
      "The change is +0.3 %.",
    ].join("\n");
    const out = sanitizeAnswer(answer, ctx, [
      { ref: "L1", type: "lab", id: "a", label: "x", href: "/a", date: "" },
      { ref: "L2", type: "lab", id: "b", label: "y", href: "/b", date: "" },
    ]);
    expect(out.text).not.toContain("[L9]");
    expect(out.citations.map((c) => c.ref)).toEqual(["L1", "L2"]);
    expect(out.text).not.toMatch(/1000 mg/);
    expect(out.text).not.toMatch(/You have diabetes/);
    expect(out.removedAdvice).toBe(true);
    expect(out.unverifiedNumbers).toEqual(["180 mg/dL"]); // 0.3 is a derivable difference, so not flagged
  });
});

describe("assistant end-to-end", () => {
  it("answers from records with citations using the offline grounded provider", async () => {
    const r = await ask(alice.id, { message: "What changed between my last two lab reports?" }, TZ);
    expect(r.message.provider).toBe("demo");
    expect(r.message.content).toMatch(/5\.4 → 5\.7/);
    expect(r.message.content).toMatch(/138 → 116/);
    expect(r.message.citations.length).toBeGreaterThan(0);
    expect(r.message.content).not.toContain("9.9");
    const stored = await db.aIMessage.findMany({ where: { conversationId: r.conversationId } });
    expect(stored.map((m) => m.role).sort()).toEqual(["ASSISTANT", "USER"]);
  });

  it("returns an emergency notice without calling any AI provider", async () => {
    let called = false;
    setAIProvider({
      name: "spy",
      model: "x",
      supportsVision: false,
      generate: async () => {
        called = true;
        return "x";
      },
    });
    const r = await ask(alice.id, { message: "I can't breathe and have chest pain" }, TZ);
    expect(called).toBe(false);
    expect(r.message.safety.emergency).toBe(true);
    expect(r.message.content).toContain("112");
  });

  it("strips fabricated references and medication advice from a misbehaving provider", async () => {
    const bad: AIProvider = {
      name: "bad",
      model: "bad-1",
      supportsVision: false,
      generate: async (i: GenerateInput) => {
        expect(i.context).toContain("HbA1c");
        return "Your HbA1c was 5.7 % [L1] and 7.9 % [L77].\nYou should start taking metformin 500 mg twice daily.";
      },
    };
    setAIProvider(bad);
    const r = await ask(alice.id, { message: "Show me my HbA1c trend" }, TZ);
    expect(r.message.content).not.toContain("[L77]");
    expect(r.message.content).not.toMatch(/metformin 500 mg/);
    expect(r.message.safety.removedAdvice).toBe(true);
    expect(r.message.safety.unverifiedNumbers).toContain("7.9 %");
  });

  it("falls back to a grounded summary when the provider fails", async () => {
    setAIProvider({
      name: "down",
      model: "x",
      supportsVision: false,
      generate: async () => {
        throw new Error("upstream 500 with secret details");
      },
    });
    const r = await ask(alice.id, { message: "Show me my HbA1c trend" }, TZ);
    expect(r.message.safety.fallback).toBe(true);
    expect(r.message.provider).toBe("demo");
    expect(r.message.content).not.toContain("secret");
  });

  it("adds a dosing notice and does not give a broad overview for medication questions", async () => {
    const r = await ask(alice.id, { message: "Should I increase my metformin dose?" }, TZ);
    expect(r.message.safety.dosingRequest).toBe(true);
    expect(r.message.content).toContain(
      "can't advise on starting, stopping or changing any medicine",
    );
  });

  it("says when nothing relevant exists instead of inventing data", async () => {
    const empty = await makeUser("Empty");
    const r = await ask(empty.id, { message: "Show me my HbA1c trend" }, TZ);
    expect(r.message.content).toMatch(/couldn't find anything in your records/);
    expect(r.message.citations).toHaveLength(0);
    await cleanup(empty.id);
  });
});
