"use client";
import { AI_SERVICES, isAiServiceId } from "@/lib/ai-services";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUp, Bot, Info, ShieldAlert } from "lucide-react";
import { Spinner, useLoadingPhase } from "@/components/shared/delayed-loader";
import { toast } from "sonner";
import { askAction } from "@/actions/assistant";
import type { Citation } from "@/server/ai/types";
import type { AssistantSafety } from "@/server/services/assistant";
import { MessageContent } from "./message-content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { T } from "@/i18n/translate";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[];
  safety: AssistantSafety | null;
  provider: string | null;
  pending?: boolean;
}

const SUGGESTIONS: MessageKey[] = [
  "app.chat.s1",
  "app.chat.s2",
  "app.chat.s3",
  "app.chat.s4",
  "app.chat.s5",
];

/** The answer is on its way: a spinner after a second, then words that change. */
function AssistantWaiting() {
  const t = useT();
  const { spinner, message } = useLoadingPhase(true, "assistant");
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground surface flex min-h-11 items-center gap-2.5 px-4 py-3 text-[15px]"
    >
      {spinner ? <Spinner className="size-5" label={t("app.chat.writing")} /> : null}
      <span key={message ?? "start"} className={message ? "kosha-fade-in" : undefined}>
        {message ?? (spinner ? "" : "…")}
      </span>
    </div>
  );
}

function providerLabel(t: T, p: string | null) {
  if (p === "demo") return t("app.chat.providerDemo");
  if (p === "safety") return t("app.chat.providerSafety");
  // "openai" also covers a gateway set up by the server, so it isn't named more precisely.
  if (p === "openai") return t("app.chat.providerOpenai");
  if (isAiServiceId(p)) return t("app.chat.providerBy", { service: AI_SERVICES[p].label });
  return t("app.chat.providerAi");
}

function AssistantMeta({ m }: { m: ChatMessage }) {
  const t = useT();
  const s = m.safety ?? {};
  return (
    <div className="mt-3 space-y-2">
      {s.fallback && (
        <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {s.fallbackReason ?? t("app.chat.fallbackDefault")} {t("app.chat.fallbackTail")}
          </span>
        </p>
      )}
      {s.unverifiedNumbers?.length ? (
        <p className="bg-warning/10 flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
          <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />{" "}
          {t("app.chat.unverified", { list: s.unverifiedNumbers.join(", ") })}
        </p>
      ) : null}
      {m.citations.length > 0 && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer select-none">
            {t("app.chat.sources", { n: m.citations.length })}
          </summary>
          <ul className="mt-2 space-y-1">
            {m.citations.map((c) => (
              <li key={c.ref}>
                <a href={c.href} className="hover:text-foreground hover:underline">
                  <span className="bg-accent text-accent-foreground mr-1.5 rounded px-1 font-semibold">
                    {c.ref}
                  </span>
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!s.emergency && (
        <p className="text-muted-foreground text-[11.5px]">{t("app.chat.notAdvice")}</p>
      )}
    </div>
  );
}

export function Chat({
  conversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState(conversationId);
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setInput("");
    const tempId = `tmp-${Date.now()}`;
    setMessages((ms) => [
      ...ms,
      { id: tempId, role: "USER", content: message, citations: [], safety: null, provider: null },
    ]);
    setPending(true);
    void (async () => {
      const res = await askAction({ conversationId: convId, message }).catch(() => null);
      setPending(false);
      if (!res?.ok || !res.data) {
        toast.error(res?.error ?? t("app.chat.error"));
        setMessages((ms) => ms.filter((m) => m.id !== tempId));
        setInput(message);
        return;
      }
      const { conversationId: newId, message: reply } = res.data;
      setMessages((ms) => [
        ...ms,
        {
          id: reply.id,
          role: "ASSISTANT",
          content: reply.content,
          citations: reply.citations,
          safety: reply.safety,
          provider: reply.provider,
        },
      ]);
      if (!convId) {
        setConvId(newId);
        window.history.replaceState(null, "", `/assistant/${newId}`);
      }
      router.refresh();
    })();
  }

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col lg:min-h-[calc(100dvh-12rem)]">
      <div className="flex-1 space-y-6 pb-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="max-w-2xl py-2">
            <p className="text-muted-foreground">{t("app.chat.intro")}</p>
            <h2 className="mt-6 text-lg font-semibold">{t("app.chat.tryAsking")}</h2>
            <ul className="mt-2 divide-y border-y">
              {SUGGESTIONS.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => send(t(k))}
                    className="hover:text-primary w-full py-3 text-left text-[15px] transition-colors"
                  >
                    {t(k)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((m) =>
          m.role === "USER" ? (
            <div key={m.id} className="flex justify-end">
              <div className="bg-primary text-primary-foreground max-w-[85%] rounded-[var(--radius)] rounded-br-md px-4 py-2.5 text-[15px] whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3" data-role="assistant">
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                  m.safety?.emergency
                    ? "bg-destructive/10 text-destructive"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {m.safety?.emergency ? (
                  <ShieldAlert className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </span>
              <div
                className={cn(
                  "bg-card min-w-0 flex-1 rounded-[var(--radius)] rounded-tl-md border px-4 py-3",
                  m.safety?.emergency && "border-destructive/40",
                )}
              >
                <div className="text-muted-foreground mb-2 text-[11px] font-medium">
                  {providerLabel(t, m.provider)}
                </div>
                <MessageContent content={m.content} citations={m.citations} />
                <AssistantMeta m={m} />
              </div>
            </div>
          ),
        )}
        {pending && (
          <div className="flex gap-3">
            <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-md">
              <Bot className="size-4" />
            </span>
            <AssistantWaiting />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="surface sticky bottom-20 p-2 shadow-lg shadow-black/[0.04] lg:bottom-4"
      >
        <label htmlFor="ask" className="sr-only">
          {t("app.dash.askTitle")}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            id="ask"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={t("app.chat.placeholder")}
            className="placeholder:text-muted-foreground max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || !input.trim()}
            aria-label={t("app.chat.send")}
          >
            <ArrowUp />
          </Button>
        </div>
        <p className="text-muted-foreground px-3 pb-1 text-[11px]">{t("app.chat.footer")}</p>
      </form>
    </div>
  );
}
