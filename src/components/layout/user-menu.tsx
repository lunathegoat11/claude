"use client";
import { useTransition } from "react";
import Link from "next/link";
import { Loader2, LogOut, Settings, User } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [signingOut, startSignOut] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="bg-accent text-accent-foreground ring-offset-background focus-visible:ring-ring flex size-9 items-center justify-center rounded-full text-[13px] font-semibold ring-offset-2 outline-none focus-visible:ring-2"
        aria-label="Account menu"
      >
        {initials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="text-foreground truncate text-sm font-medium">{name}</div>
          <div className="text-muted-foreground truncate text-xs">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=preferences">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Call the action directly: a <form> inside the menu is unmounted when the menu
            closes on select, so its submit never fires. */}
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={() => startSignOut(() => signOutAction())}
        >
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
