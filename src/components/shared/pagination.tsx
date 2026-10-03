import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
  makeHref,
  total,
  label = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  makeHref: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="text-muted-foreground mt-6 flex items-center justify-between gap-3 text-sm"
    >
      <span className="tabular">
        Page {page} of {pageCount} · {total} {label}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page - 1)}>
              <ChevronLeft /> Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft /> Previous
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page + 1)}>
              Next <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
