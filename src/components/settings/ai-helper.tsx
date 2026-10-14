"use client";
import { BusyContent } from "@/components/shared/delayed-loader";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  removeAiKeyAction,
  saveAiKeyAction,
  setAiConsentAction,
  setDocumentReadingAction,
} from "@/actions/ai";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AI_SERVICES, AI_SERVICE_IDS, type AiServiceId } from "@/lib/ai-services";
import { useT } from "@/i18n/client";

export interface AiSettingsView {
  provider: AiServiceId;
  providerLabel: string;
  model: string | null;
  keyHint: string;
  readDocuments: boolean;
  savedOn: string;
  usable: boolean;
}

export function AiHelperSettings({
  saved,
  isDemo,
  serverAi,
  serverConsent,
}: {
  saved: AiSettingsView | null;
  isDemo: boolean;
  /** Who runs the AI service set up on this server, or null if there is none. */
  serverAi: string | null;
  /** Whether this user has agreed to use that service. */
  serverConsent: boolean;
}) {
  const t = useT();
  const [replacing, setReplacing] = useState(false);
  if (isDemo) return <p className="text-muted-foreground text-sm">{t("account.ai.demo")}</p>;
  return (
    <div className="space-y-6">
      {serverAi && !saved && <ServerAiConsent label={serverAi} initial={serverConsent} />}
      {saved && !replacing ? (
        <SavedKey saved={saved} onReplace={() => setReplacing(true)} />
      ) : (
        <KeyForm onDone={() => setReplacing(false)} canCancel={!!saved} />
      )}
      <div className="text-muted-foreground flex gap-2.5 border-t pt-4 text-[13px]">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <p>{t("account.ai.keyNote")}</p>
      </div>
    </div>
  );
}

function ServerAiConsent({ label, initial }: { label: string; initial: boolean }) {
  const t = useT();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start justify-between gap-4 rounded-md border p-4">
      <span className="text-sm">
        <span className="block font-medium">{t("account.ai.useAi")}</span>
        <span className="text-muted-foreground">
          {t("account.ai.useAi.desc", { service: label })}
        </span>
      </span>
      <Switch
        checked={on}
        disabled={pending}
        aria-label={t("account.ai.useAi")}
        onCheckedChange={(next) => {
          setOn(next);
          start(async () => {
            const res = await setAiConsentAction(next);
            if (res.ok) toast.success(res.message);
            else {
              setOn(!next);
              toast.error(res.error ?? t("account.changeFailed"));
            }
          });
        }}
      />
    </label>
  );
}

function SavedKey({ saved, onReplace }: { saved: AiSettingsView; onReplace: () => void }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reading, setReading] = useState(saved.readDocuments);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-md">
          <KeyRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{saved.providerLabel}</div>
          <div className="text-muted-foreground text-sm">
            {t("account.ai.keyEnding")} <span className="tabular font-mono">…{saved.keyHint}</span>,{" "}
            {t("account.ai.addedOn", { date: saved.savedOn })}
            {saved.model && (
              <>
                {" "}
                · {t("account.ai.model")} <span className="font-mono break-all">{saved.model}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {!saved.usable && (
        <p role="alert" className="border-warning/40 bg-warning/10 rounded-lg border p-3 text-sm">
          {t("account.ai.unusable")}
        </p>
      )}
      <label className="flex items-start justify-between gap-4 rounded-md border p-4">
        <span className="text-sm">
          <span className="block font-medium">{t("account.ai.readDocs")}</span>
          <span className="text-muted-foreground">
            {t("account.ai.readDocs.desc", { service: saved.providerLabel })}
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
                toast.error(res.error ?? t("account.changeFailed"));
              }
            });
          }}
          aria-label={t("account.ai.readDocs")}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onReplace}>
          {t("account.ai.replace")}
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
              } else toast.error(res.error ?? t("account.ai.removeFailed"));
            })
          }
        >
          <BusyContent active={pending} kind="save" icon={<Trash2 />}>
            {t("account.ai.remove")}
          </BusyContent>
        </Button>
      </div>
    </div>
  );
}

function KeyForm({ onDone, canCancel }: { onDone: () => void; canCancel: boolean }) {
  const t = useT();
  const [provider, setProvider] = useState<AiServiceId>("anthropic");
  const svc = AI_SERVICES[provider];
  const { onSubmit, pending, err } = useActionForm(saveAiKeyAction, { onSuccess: onDone });
  return (
    <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
      <div className="space-y-2 text-sm">
        <p>{t("account.ai.intro")}</p>
        <ol className="text-muted-foreground list-decimal space-y-1 pl-5">
          <li>
            {t("account.ai.step1.before") && `${t("account.ai.step1.before")} `}
            <a
              href={svc.keysUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline underline-offset-2"
            >
              {svc.keysSite}
            </a>{" "}
            {t("account.ai.step1.after")}
          </li>
          <li>{t("account.ai.step2")}</li>
          <li>{t("account.ai.step3")}</li>
        </ol>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <Field label={t("account.ai.service")} htmlFor="ai-provider" error={err("provider")}>
          <NativeSelect
            id="ai-provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiServiceId)}
          >
            {AI_SERVICE_IDS.map((id) => (
              <option key={id} value={id}>
                {AI_SERVICES[id].label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("account.ai.apiKey")} htmlFor="ai-key" error={err("apiKey")}>
          <Input
            id="ai-key"
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={svc.keyPrefix ? `${svc.keyPrefix}…` : t("account.ai.paste")}
            required
          />
        </Field>
      </div>
      <Field
        label={t("account.ai.modelLabel")}
        htmlFor="ai-model"
        error={err("model")}
        hint={
          svc.defaultModel
            ? t("account.ai.modelHint", { model: svc.defaultModel })
            : t("account.ai.modelHintDefault")
        }
      >
        <Input
          key={provider}
          id="ai-model"
          name="model"
          autoComplete="off"
          spellCheck={false}
          placeholder={svc.defaultModel ?? t("account.ai.modelDefault")}
        />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="readDocuments" className="accent-primary mt-0.5 size-4" />
        <span>
          {t("account.ai.alsoRead")}{" "}
          <span className="text-muted-foreground">
            {t("account.ai.alsoRead.desc", { service: svc.label })}
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingLabel={t("account.ai.checking")} loadingKind="aiKey">
          {t("account.ai.saveKey")}
        </SubmitButton>
        {canCancel && (
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("account.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
