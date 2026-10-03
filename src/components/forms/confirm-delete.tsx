"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ClientActionState } from "./use-action-form";

export function ConfirmDelete({
  action,
  title,
  description,
  confirmLabel = "Delete",
  redirectTo,
  triggerLabel = "Delete",
  triggerVariant = "outline",
  triggerSize = "default",
  iconOnly,
  successMessage,
}: {
  action: () => Promise<ClientActionState>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  redirectTo?: string;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  iconOnly?: boolean;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function confirm() {
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMessage ?? res.message ?? "Deleted");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        toast.error(res.error ?? "Could not delete. Please try again.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={iconOnly ? (triggerSize === "sm" ? "icon-sm" : "icon") : triggerSize}
          aria-label={iconOnly ? triggerLabel : undefined}
          className={
            triggerVariant === "outline" ? "text-destructive hover:text-destructive" : undefined
          }
        >
          <Trash2 />
          {!iconOnly && triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
