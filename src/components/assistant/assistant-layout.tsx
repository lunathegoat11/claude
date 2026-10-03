import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AssistantLayout({
  conversations,
  activeId,
  tz,
  children,
  actions,
}: {
  conversations: { id: string; title: string; updatedAt: Date }[];
  activeId?: string;
  tz: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr] [&>*]:min-w-0">
      <aside className="hidden lg:block">
        <Button asChild variant="outline" className="mb-4 w-full justify-start">
          <Link href="/assistant">
            <MessageSquarePlus /> New conversation
          </Link>
        </Button>
        <h2 className="text-muted-foreground mb-2 px-2 text-xs font-medium tracking-wide uppercase">
          Recent
        </h2>
        <nav className="space-y-0.5" aria-label="Conversations">
          {conversations.length === 0 && (
            <p className="text-muted-foreground px-2 text-sm">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/assistant/${c.id}`}
              aria-current={c.id === activeId ? "page" : undefined}
              className={cn(
                "hover:bg-muted block rounded-lg px-2.5 py-2 text-sm",
                c.id === activeId && "bg-accent text-accent-foreground",
              )}
            >
              <div className="truncate">{c.title}</div>
              <div className="text-muted-foreground text-xs">
                {formatRelativeDate(c.updatedAt, new Date(), tz)}
              </div>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              AI Health Assistant
            </h1>
            <p className="text-muted-foreground text-sm">
              Grounded in your own records. Explains — never diagnoses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button asChild variant="outline" size="sm" className="lg:hidden">
              <Link href="/assistant">
                <MessageSquarePlus /> New
              </Link>
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
