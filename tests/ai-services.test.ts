import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createProvider } from "@/server/ai";
import { aiForUser, getAiSettings, saveAiKey } from "@/server/services/ai-settings";
import { AI_SERVICES, AI_SERVICE_IDS } from "@/lib/ai-services";
import { toSafeError } from "@/server/errors";
import { cleanup, makeUser, givePlus } from "./helpers/factory";

let user: { id: string };
beforeAll(async () => {
  user = await makeUser("Keys");
  await givePlus(user.id);
});
afterAll(async () => cleanup(user.id));
afterEach(() => vi.unstubAllGlobals());

/** Stand in for the AI service's API and record where requests went. */
function fakeApi(handler: (url: string) => Response) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      return handler(url);
    }),
  );
  return calls;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("AI services people can connect", () => {
  it("includes OpenRouter, NVIDIA and others, each on its official https address", () => {
    expect(AI_SERVICE_IDS).toEqual(
      expect.arrayContaining(["openrouter", "nvidia", "gemini", "groq", "mistral", "deepseek"]),
    );
    for (const id of AI_SERVICE_IDS) {
      const base = AI_SERVICES[id].baseUrl;
      if (base) expect(base).toMatch(/^https:\/\//);
    }
  });

  it("sends a key only to its own service, with the chosen or default model", async () => {
    const calls = fakeApi(() =>
      json({ choices: [{ message: { content: "Your HbA1c went down." } }] }),
    );
    const p = createProvider("nvidia", "nvapi-test-key-1234567890");
    expect(p.model).toBe(AI_SERVICES.nvidia.defaultModel);
    await p.generate({ system: "s", history: [], context: "c", question: "q" } as never);
    expect(calls[0]).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(createProvider("openrouter", "sk-or-x", "anthropic/claude-sonnet-4").model).toBe(
      "anthropic/claude-sonnet-4",
    );
  });

  it("checks an OpenRouter key on its key endpoint (its model list is public)", async () => {
    const calls = fakeApi(() => json({ error: "No auth" }, 401));
    const check = await createProvider("openrouter", "sk-or-v1-bad").verifyKey!();
    expect(check).toBe("invalid");
    expect(calls[0]).toBe("https://openrouter.ai/api/v1/key");
  });

  it("saves a valid key with its model, and uses it for the user's questions", async () => {
    fakeApi(() => json({ data: [{ id: "llama-3.3-70b-versatile" }, { id: "qwen-qwq-32b" }] }));
    await saveAiKey(user.id, {
      provider: "groq",
      apiKey: "gsk_" + "a".repeat(40),
      model: "qwen-qwq-32b",
      readDocuments: "",
    });
    const saved = await getAiSettings(user.id);
    expect(saved).toMatchObject({ provider: "groq", model: "qwen-qwq-32b", keyHint: "aaaa" });
    expect(JSON.stringify(saved)).not.toContain("gsk_");
    const ai = await aiForUser(user.id);
    expect(ai).toMatchObject({ source: "user", readDocuments: false });
    expect(ai.provider.name).toBe("groq");
    expect(ai.provider.model).toBe("qwen-qwq-32b");
  });

  it("explains a key for the wrong service and a model the service doesn't offer", async () => {
    fakeApi(() => json({ data: [{ id: "llama-3.3-70b-versatile" }] }));
    const wrong = await saveAiKey(user.id, {
      provider: "nvidia",
      apiKey: "sk-" + "b".repeat(40),
      readDocuments: "",
    }).catch((e) => toSafeError(e));
    expect(wrong).toMatchObject({ code: "VALIDATION" });
    const model = await saveAiKey(user.id, {
      provider: "groq",
      apiKey: "gsk_" + "c".repeat(40),
      model: "not-a-real-model",
      readDocuments: "",
    }).catch((e) => toSafeError(e));
    expect(model).toMatchObject({ code: "VALIDATION" });
    expect(String((model as { message: string }).message)).toContain("not-a-real-model");
  });

  it("refuses unknown services and odd model names", async () => {
    for (const bad of [
      { provider: "evil", apiKey: "k".repeat(30) },
      { provider: "groq", apiKey: "gsk_" + "d".repeat(40), model: "../../etc" },
    ]) {
      const e = await saveAiKey(user.id, { ...bad, readDocuments: "" }).catch((x) =>
        toSafeError(x),
      );
      expect(e).toMatchObject({ code: "VALIDATION" });
    }
  });

  it("won't save a key whose account has no credit, and says why", async () => {
    fakeApi((url) =>
      url.endsWith("/models")
        ? json({ data: [{ id: "gpt-4o-mini" }] })
        : json(
            { error: { code: "insufficient_quota", message: "You exceeded your current quota" } },
            429,
          ),
    );
    const e = await saveAiKey(user.id, {
      provider: "openai",
      apiKey: "sk-proj-" + "e".repeat(40),
      readDocuments: "",
    }).catch((x) => toSafeError(x));
    expect(e).toMatchObject({ code: "VALIDATION" });
    expect((e as { message: string }).message).toMatch(/no credit/);
  });

  it("asks newer OpenAI models again in the form they need", async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        bodies.push(body);
        if ("max_tokens" in body)
          return json({ error: { message: "Unsupported parameter: 'max_tokens'" } }, 400);
        return json({ choices: [{ message: { content: "Done." } }] });
      }),
    );
    const p = createProvider("openai", "sk-proj-x", "o4-mini");
    expect(
      await p.generate({ system: "s", history: [], context: "c", question: "q" } as never),
    ).toBe("Done.");
    expect(bodies[1]).toHaveProperty("max_completion_tokens");
    expect(bodies[1]).not.toHaveProperty("temperature");
  });
});
