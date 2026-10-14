"use client";
import { Pencil } from "lucide-react";
import { deleteMeasurementAction } from "@/actions/tracking";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Button } from "@/components/ui/button";
import {
  MeasurementDialog,
  type MeasurementInitial,
  type MetricOption,
} from "./measurement-dialog";
import { useT } from "@/i18n/client";

export function ReadingActions({
  metric,
  initial,
  now,
  label,
}: {
  metric: MetricOption;
  initial: MeasurementInitial;
  now: string;
  label: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-end gap-0.5">
      <MeasurementDialog
        metrics={[metric]}
        now={now}
        preferredUnits={{}}
        initial={initial}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("app.reading.editLabel", { label })}>
            <Pencil className="text-muted-foreground" />
          </Button>
        }
      />
      <ConfirmDelete
        action={deleteMeasurementAction.bind(null, initial.id)}
        title={t("app.reading.deleteTitle")}
        description={t("app.reading.deleteBody", { name: metric.name, label })}
        iconOnly
        triggerVariant="ghost"
        triggerSize="sm"
        triggerLabel={t("app.reading.deleteLabel", { label })}
      />
    </div>
  );
}
