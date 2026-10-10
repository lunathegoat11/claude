"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeAiKeyAction, saveAiKeyAction, setDocumentReadingAction } from "@/actions/ai";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface AiSettingsView {
  provider: "anthropic" | "openai";
  providerLabel: string;
  keyHint: string;
  readDocuments: boolean;
  savedOn: string;
  usable: boolean;
}

export function AiHelperSettings({
  saved,
  isDemo,
  serverAi,
}: {
  saved: AiSettingsView | null;
  isDemo: boolean;
  /** True when the server owner has set up an AI key for everyone. */
  serverAi: boolean;
}) {
  const [replacing, setReplacing] = useState(false);
  if (isDemo)
    return (
      <p className="text-muted-foreground text-sm">
        API keys can&apos;t be added to the shared demo account. Create your own account to connect
        an AI service.
      </p>
    );
  return (
    <div className="space-y-6">
      {saved && !replacing ? (
        <SavedKey saved={saved} onReplace={() => setReplacing(true)} />
      ) : (
        <KeyForm onDone={() => setReplacing(false)} canCancel={!!saved} />
      )}
      <div className="text-muted-foreground flex gap-2.5 border-t pt-4 text-[13px]">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <p>
          Your key is encrypted before it is stored, is only used for your own questions and
          documents, and is never shown again or sent back to your browser. Without a key,
          {serverAi
            ? " Kosha uses the AI service set up by whoever runs this app."
            : " the helper still answers from your records using simple built-in summaries, and documents are read on this server."}
        </p>
      </div>
    </div>
  );
}

function SavedKey({ saved, onReplace }: { saved: AiSettingsView; onReplace: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reading, setReading] = useState(saved.readDocuments);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-xl">
          <KeyRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{saved.providerLabel}</div>
          <div className="text-muted-foreground text-sm">
            Key ending <span className="tabular font-mono">…{saved.keyHint}</span>, added{" "}
            {saved.savedOn}
          </div>
        </div>
      </div>
      {!saved.usable && (
        <p role="alert" className="border-warning/40 bg-warning/10 rounded-lg border p-3 text-sm">
          This key can no longer be unlocked because the app&apos;s secret was changed. Paste it
          again to keep using the AI helper.
        </p>
      )}
      <label className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <span className="text-sm">
          <span className="block font-medium">Let the AI read documents I upload</span>
          <span className="text-muted-foreground">
            The PDF or photo is sent to {saved.providerLabel} to read the test results. Most
            accurate for photos. When off, documents are read on this server only.
          </span>
        </span>
        <Switch
          checked={reading}
          disabled={pending}
          onCheckedChange={(on) => {
            setReading(on);
            start(async () => {
              const res = await setDocumentReadingAction(on);
              if (res.ok) toast.success(res.message);
              else {
                setReading(!on);
                toast.error(res.error ?? "Couldn't change this setting");
              }
            });
          }}
          aria-label="Let the AI read documents I upload"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onReplace}>
          Replace key
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await removeAiKeyAction();
              if (res.ok) {
                toast.success(res.message);
                router.refresh();
              } else toast.error(res.error ?? "Couldn't remove the key");
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Remove key
        </Button>
      </div>
    </div>
  );
}

function KeyForm({ onDone, canCancel }: { onDone: () => void; canCancel: boolean }) {
  const [provider, setProvider] = useState<"anthropic" | "openai">("anthropic");
  const { onSubmit, pending, err } = useActionForm(saveAiKeyAction, { onSuccess: onDone });
  return (
    <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
      <div className="space-y-2 text-sm">
        <p>
          Connect your own AI account to give the helper a proper brain: better answers about your
          records, and much better reading of report photos.
        </p>
        <ol className="text-muted-foreground list-decimal space-y-1 pl-5">
          {provider === "anthropic" ? (
            <>
              <li>
                Go to{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline underline-offset-2"
                >
                  console.anthropic.com
                </a>{" "}
                and sign in (add a payment method if asked).
              </li>
              <li>Open API Keys and click Create Key.</li>
            </>
          ) : (
            <>
              <li>
                Go to{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline underline-offset-2"
                >
                  platform.openai.com
                </a>{" "}
                and sign in.
              </li>
              <li>Click Create new secret key.</li>
            </>
          )}
          <li>Copy the key and paste it below.</li>
        </ol>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <Field label="AI service" htmlFor="ai-provider" error={err("provider")}>
          <NativeSelect
            id="ai-provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "anthropic" | "openai")}
          >
            <option value="anthropic">Claude (recommended)</option>
            <option value="openai">ChatGPT</option>
          </NativeSelect>
        </Field>
        <Field label="API key" htmlFor="ai-key" error={err("apiKey")}>
          <Input
            id="ai-key"
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
            required
          />
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="readDocuments"
          defaultChecked
          className="accent-primary mt-0.5 size-4"
        />
        <span>
          Let the AI read documents I upload.{" "}
          <span className="text-muted-foreground">
            Photos and PDFs are sent to the AI service to read the results.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingLabel="Checking the key…">
          Save key
        </SubmitButton>
        {canCancel && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
