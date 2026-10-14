import {
  Activity,
  Bot,
  CalendarClock,
  FileText,
  FlaskConical,
  FolderHeart,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/i18n/messages";

export interface NavItem {
  href: string;
  /** Message keys (see src/i18n/messages/common.ts). */
  label: MessageKey;
  short?: MessageKey;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "nav.home", icon: LayoutDashboard },
  { href: "/labs", label: "nav.labs", short: "nav.labs.short", icon: FlaskConical },
  { href: "/documents", label: "nav.documents", short: "nav.documents.short", icon: FileText },
  { href: "/tracking", label: "nav.tracking", icon: Activity },
  { href: "/records", label: "nav.records", short: "nav.records.short", icon: FolderHeart },
  { href: "/timeline", label: "nav.timeline", icon: CalendarClock },
  { href: "/assistant", label: "nav.assistant", short: "nav.assistant.short", icon: Bot },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

/** Items in the mobile bottom bar; the rest live behind "More". */
export const MOBILE_PRIMARY = ["/dashboard", "/labs", "/documents", "/assistant"];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
