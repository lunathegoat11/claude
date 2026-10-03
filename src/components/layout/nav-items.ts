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
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/records", label: "Records", icon: FolderHeart },
  { href: "/labs", label: "Lab Results", short: "Labs", icon: FlaskConical },
  { href: "/tracking", label: "Health Tracking", short: "Tracking", icon: Activity },
  { href: "/assistant", label: "AI Health Assistant", short: "Assistant", icon: Bot },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Profile & Settings", short: "Settings", icon: Settings },
];

/** Items in the mobile bottom bar; the rest live behind "More". */
export const MOBILE_PRIMARY = ["/dashboard", "/records", "/tracking", "/assistant"];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
