"use client";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";

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
  const [state, formAction, pending] = useActionState(action, {} as ClientActionState<T>);
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
