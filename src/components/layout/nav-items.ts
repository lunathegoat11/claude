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

export interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/labs", label: "Lab results", short: "Results", icon: FlaskConical },
  { href: "/documents", label: "Reports & files", short: "Files", icon: FileText },
  { href: "/tracking", label: "Readings", icon: Activity },
  { href: "/records", label: "Visits & history", short: "History", icon: FolderHeart },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/assistant", label: "Ask Kosha", short: "Ask", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Items in the mobile bottom bar; the rest live behind "More". */
export const MOBILE_PRIMARY = ["/dashboard", "/labs", "/documents", "/assistant"];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
