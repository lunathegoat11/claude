"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUp, Bot, Info, Loader2, ShieldAlert, Sparkles } from "lucide-react";
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
  "What were my glucose readings over the last month?",
  "Summarize my recent blood tests.",
  "What changed between my last two lab reports?",
  "Show me my HbA1c trend.",
  "What documents mention my blood pressure?",
  "Summarize my recent doctor visits.",
  "What questions could I ask my doctor at my next visit?",
  "What does TSH measure?",
];

function providerLabel(p: string | null) {
  if (p === "demo") return "Grounded summary · built directly from your records";
  if (p === "safety") return "Safety notice";
  if (p === "anthropic") return "AI-generated · Claude";
  if (p === "openai") return "AI-generated";
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
          <div className="mx-auto max-w-2xl py-6 text-center">
            <span className="bg-accent text-accent-foreground mx-auto flex size-12 items-center justify-center rounded-2xl">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">
              Ask about your health records
            </h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Answers are based only on what&apos;s in your records, with links to the source. The
              assistant explains and organises — it does not diagnose or give medical advice.
            </p>
            <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="bg-card hover:border-primary/40 hover:bg-accent/40 rounded-xl border px-3.5 py-3 text-sm transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "USER" ? (
            <div key={m.id} className="flex justify-end">
              <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3" data-role="assistant">
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
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
                  "bg-card min-w-0 flex-1 rounded-2xl rounded-tl-md border px-4 py-3",
                  m.safety?.emergency && "border-destructive/40",
                )}
              >
                <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
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
            <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-xl">
              <Bot className="size-4" />
            </span>
            <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm">
              <Loader2 className="size-4 animate-spin" /> Looking through your records…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="bg-card sticky bottom-20 rounded-2xl border p-2 shadow-lg shadow-black/[0.04] lg:bottom-4"
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
            placeholder="Ask about your readings, lab results, documents or visits…"
            className="placeholder:text-muted-foreground max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none"
          />
          <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
        <p className="text-muted-foreground px-3 pb-1 text-[11px]">
          Not for emergencies — call 112. Answers can be incomplete; always check the linked
          records.
        </p>
      </form>
    </div>
  );
}
