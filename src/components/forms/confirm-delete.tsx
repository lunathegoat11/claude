"use client";
import { BusyContent } from "@/components/shared/delayed-loader";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { useT } from "@/i18n/client";

export function ConfirmDelete({
  action,
  title,
  description,
  confirmLabel,
  redirectTo,
  triggerLabel: triggerLabelProp,
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
  const t = useT();
  const triggerLabel = triggerLabelProp ?? t("files.delete.confirm");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function confirm() {
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMessage ?? res.message ?? t("files.delete.done"));
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        toast.error(res.error ?? t("files.delete.failed"));
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
          <AlertDialogCancel disabled={pending}>{t("files.common.cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            <BusyContent active={pending} kind="delete">
              {confirmLabel ?? t("files.delete.confirm")}
            </BusyContent>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
