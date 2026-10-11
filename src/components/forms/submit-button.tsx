"use client";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { BusyContent } from "@/components/shared/delayed-loader";
import type { LoadingKind } from "@/lib/loading-messages";

/**
 * Disabled at once while submitting; a spinner appears after a second and the label
 * steps through messages for that kind of wait after ~2.5 s.
 */
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingProp,
  loadingKind = "save",
  ...props
}: ButtonProps & { pendingLabel?: string; pending?: boolean; loadingKind?: LoadingKind }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      <BusyContent active={pending} kind={loadingKind} busyLabel={pendingLabel}>
        {children}
      </BusyContent>
    </Button>
  );
}
