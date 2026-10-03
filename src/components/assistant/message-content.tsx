import Link from "next/link";
import { Fragment } from "react";
import type { Citation } from "@/server/ai/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Renders the assistant's restricted markdown subset (paragraphs, bullet
 * lists, **bold**, *italic*, > notes) as React elements — never as raw HTML —
 * and turns [L3]-style references into links to the cited record.
 */
function inline(text: string, cites: Map<string, Citation>, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[A-Z]\d{1,3}\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**"))
      out.push(
        <strong key={k} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    else if (tok.startsWith("[")) {
      const c = cites.get(tok.slice(1, -1));
      if (c) {
        out.push(
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <Link
                href={c.href}
                className="bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground mx-0.5 inline-flex h-[18px] -translate-y-px items-center rounded-md px-1.5 align-middle text-[11px] font-semibold no-underline"
                aria-label={`Source: ${c.label}`}
              >
                {c.ref}
              </Link>
            </TooltipTrigger>
            <TooltipContent>{c.label}</TooltipContent>
          </Tooltip>,
        );
      }
    } else
      out.push(
        <em key={k} className="text-muted-foreground">
          {tok.slice(1, -1)}
        </em>,
      );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MessageContent({ content, citations }: { content: string; citations: Citation[] }) {
  const cites = new Map(citations.map((c) => [c.ref, c]));
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let list: string[] = [];
  const flush = (k: number) => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${k}`} className="my-2 space-y-1.5 pl-1">
        {list.map((l, j) => (
          <li
            key={j}
            className="before:bg-muted-foreground/50 relative pl-4 before:absolute before:top-[0.6em] before:left-0 before:size-1.5 before:rounded-full"
          >
            {l.split("\n").map((part, pi) => (
              <Fragment key={pi}>
                {pi > 0 && <br />}
                {inline(part, cites, `li-${k}-${j}-${pi}`)}
              </Fragment>
            ))}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, k) => {
    const t = line.trimEnd();
    if (/^\s*[-•]\s+/.test(t)) list.push(t.replace(/^\s*[-•]\s+/, ""));
    else if (/^\s{2,}\S/.test(line) && list.length) list[list.length - 1] += `\n${t.trim()}`;
    else {
      flush(k);
      if (!t.trim()) return;
      if (t.startsWith(">"))
        blocks.push(
          <p
            key={k}
            className="border-warning bg-warning/8 my-2 rounded-xl border-l-2 px-3 py-2 text-[14px]"
          >
            {inline(t.replace(/^>\s?/, ""), cites, `q-${k}`)}
          </p>,
        );
      else if (/^#{1,3}\s/.test(t))
        blocks.push(
          <p key={k} className="mt-3 mb-1 font-semibold">
            {inline(t.replace(/^#+\s/, ""), cites, `h-${k}`)}
          </p>,
        );
      else
        blocks.push(
          <p key={k} className="my-1.5">
            {inline(t, cites, `p-${k}`)}
          </p>,
        );
    }
  });
  flush(lines.length);
  return <div className="text-[15px] leading-relaxed [&>*:first-child]:mt-0">{blocks}</div>;
}
