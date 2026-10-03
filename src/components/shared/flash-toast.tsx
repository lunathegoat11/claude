"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a toast once when a query flag (e.g. ?saved=1) is present, then removes it from the URL. */
export function FlashToast({ param = "saved", message }: { param?: string; message: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  useEffect(() => {
    if (sp.get(param) && !shown.current) {
      shown.current = true;
      toast.success(message);
      const next = new URLSearchParams(sp);
      next.delete(param);
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }
  }, [sp, param, message, router, pathname]);
  return null;
}
