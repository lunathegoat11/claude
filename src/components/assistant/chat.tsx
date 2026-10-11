"use client";
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

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[];
  safety: AssistantSafety | null;
  provider: string | null;
  pending?: boolean;
}

const SUGGESTIONS = [
  "What changed between my last two lab reports?",
  "Show me my HbA1c trend.",
  "What were my sugar readings over the last month?",
  "What questions could I ask my doctor at my next visit?",
  "What does TSH measure?",
];

/** The answer is on its way: a spinner after a second, then words that change. */
function AssistantWaiting() {
  const { spinner, message } = useLoadingPhase(true, "assistant");
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground surface flex min-h-11 items-center gap-2.5 px-4 py-3 text-[15px]"
    >
      {spinner ? <Spinner className="size-5" label="Writing an answer" /> : null}
      <span key={message ?? "start"} className={message ? "kosha-fade-in" : undefined}>
        {message ?? (spinner ? "" : "…")}
      </span>
    </div>
  );
}

function providerLabel(p: string | null) {
  if (p === "demo") return "Summary built from your records";
  if (p === "safety") return "Safety notice";
  if (p === "anthropic") return "Written by Claude from your records";
  if (p === "openai") return "Written by ChatGPT from your records";
  return "AI-generated";
}

function AssistantMeta({ m }: { m: ChatMessage }) {
  const s = m.safety ?? {};
  return (
    <div className="mt-3 space-y-2">
      {s.fallback && (
        <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" /> The AI service was unavailable, so this
          summary was built directly from your records.
        </p>
      )}
      {s.unverifiedNumbers?.length ? (
        <p className="bg-warning/10 flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
          <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" /> Some figures (
          {s.unverifiedNumbers.join(", ")}) couldn&apos;t be matched to your records. Please check
          them against the original reports.
        </p>
      ) : null}
      {m.citations.length > 0 && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer select-none">Sources ({m.citations.length})</summary>
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
        <p className="text-muted-foreground text-[11.5px]">
          This is not medical advice or a diagnosis. Please discuss your results with a qualified
          doctor.
        </p>
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
        toast.error(
          res?.error ??
            "The assistant couldn't answer right now. Check your connection and try again.",
        );
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
            <p className="text-muted-foreground">
              Answers come only from what you&apos;ve saved, with links to the reports they came
              from. Kosha explains and organises; it doesn&apos;t diagnose or give medical advice.
            </p>
            <h2 className="mt-6 text-lg font-semibold">Try asking</h2>
            <ul className="mt-2 divide-y border-y">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="hover:text-primary w-full py-3 text-left text-[15px] transition-colors"
                  >
                    {s}
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
                  {providerLabel(m.provider)}
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
          Ask about your records
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
            placeholder="Ask about your records…"
            className="placeholder:text-muted-foreground max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none"
          />
          <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
        <p className="text-muted-foreground px-3 pb-1 text-[11px]">
          Not for emergencies: call 112. Answers can be incomplete; always check the linked records.
        </p>
      </form>
    </div>
  );
}
