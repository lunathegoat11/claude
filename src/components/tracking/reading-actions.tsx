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
  return (
    <div className="flex items-center justify-end gap-0.5">
      <MeasurementDialog
        metrics={[metric]}
        now={now}
        preferredUnits={{}}
        initial={initial}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Edit reading ${label}`}>
            <Pencil className="text-muted-foreground" />
          </Button>
        }
      />
      <ConfirmDelete
        action={deleteMeasurementAction.bind(null, initial.id)}
        title="Delete this reading?"
        description={`${metric.name} reading ${label} will be removed.`}
        iconOnly
        triggerVariant="ghost"
        triggerSize="sm"
        triggerLabel={`Delete reading ${label}`}
      />
    </div>
  );
}
