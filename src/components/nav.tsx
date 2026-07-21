"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import { BarChart2, History, Dumbbell, Plus, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/log", label: "Log", icon: Plus },
  { href: "/progress", label: "Progress", icon: BarChart2 },
  { href: "/history", label: "History", icon: History },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
      <nav className="flex items-center justify-between px-6 md:px-12 h-14 max-w-5xl mx-auto w-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold tracking-widest uppercase text-foreground">
            Gym
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
              <Avatar className="h-7 w-7">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {session.user.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-muted-foreground cursor-pointer"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
      <Separator />

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "stroke-[oklch(0.87_0.22_130)]" : ""}`}
                  style={active ? { color: "oklch(0.87 0.22 130)" } : undefined}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
