"use client";
import { ArrowDown, ArrowUp, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";

/** Status shown with icon + text (never colour alone), against the result's range. */
export function FlagBadge({ flag, compact }: { flag: string; compact?: boolean }) {
  const t = useT();
  switch (flag) {
    case "HIGH":
      return (
        <Badge variant="danger">
          <ArrowUp /> {t(compact ? "flag.HIGH" : "flag.HIGH.long")}
        </Badge>
      );
    case "LOW":
      return (
        <Badge variant="danger">
          <ArrowDown /> {t(compact ? "flag.LOW" : "flag.LOW.long")}
        </Badge>
      );
    case "ABNORMAL":
      return (
        <Badge variant="warning">
          <AlertCircle /> {t("flag.ABNORMAL")}
        </Badge>
      );
    case "NORMAL":
      return (
        <Badge variant="success">
          <Check /> {t(compact ? "flag.NORMAL" : "flag.NORMAL.long")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{t("flag.UNKNOWN")}</Badge>;
  }
}
