import { ArrowDown, ArrowUp, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Status shown with icon + text (never colour alone), relative to the report's own range. */
export function FlagBadge({ flag, compact }: { flag: string; compact?: boolean }) {
  switch (flag) {
    case "HIGH":
      return (
        <Badge variant="warning">
          <ArrowUp /> {compact ? "High" : "Above report range"}
        </Badge>
      );
    case "LOW":
      return (
        <Badge variant="warning">
          <ArrowDown /> {compact ? "Low" : "Below report range"}
        </Badge>
      );
    case "ABNORMAL":
      return (
        <Badge variant="warning">
          <AlertCircle /> Flagged by lab
        </Badge>
      );
    case "NORMAL":
      return (
        <Badge variant="success">
          <Check /> {compact ? "In range" : "Within report range"}
        </Badge>
      );
    default:
      return <Badge variant="outline">{compact ? "No range" : "No range on report"}</Badge>;
  }
}
