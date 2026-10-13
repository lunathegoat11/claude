"use client";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { failureMessage } from "@/components/shared/app-messages";

export interface ClientActionState<T = unknown> {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
}

/**
 * useActionState wrapper that shows toasts and calls onSuccess once per result.
 */
export function useActionForm<T = unknown>(
  action: (prev: ClientActionState<T>, fd: FormData) => Promise<ClientActionState<T>>,
  opts: { onSuccess?: (s: ClientActionState<T>) => void; successToast?: boolean } = {},
) {
  // A failure before the server answers (no internet, server restarting) becomes a
  // message instead of a crash; page changes (redirects) pass through untouched.
  const safeAction = async (prev: ClientActionState<T>, fd: FormData) => {
    try {
      return await action(prev, fd);
    } catch (err) {
      const digest = (err as { digest?: string } | undefined)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
      return { ok: false, error: failureMessage() } as ClientActionState<T>;
    }
  };
  const [state, formAction, pending] = useActionState(safeAction, {} as ClientActionState<T>);
  const last = useRef<ClientActionState<T> | null>(null);
  const { onSuccess, successToast = true } = opts;
  useEffect(() => {
    if (state === last.current || (!state.ok && !state.error)) return;
    last.current = state;
    if (state.ok) {
      if (successToast && state.message) toast.success(state.message);
      onSuccess?.(state);
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    } else if (state.fieldErrors) {
      // On a phone the highlighted field may be off screen; say so up front too.
      toast.error(state.error ?? "Please check the highlighted fields.");
    }
  }, [state, onSuccess, successToast]);
  const err = (name: string) => state.fieldErrors?.[name];
  /**
   * Submit via onSubmit instead of <form action>. React 19 resets forms after an
   * `action` completes, which would wipe what the user typed when validation fails.
   */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  return { state, formAction, onSubmit, pending, err };
}
