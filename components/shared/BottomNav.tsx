"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Calendar, TrendingUp, Video, User, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const athleteItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/plans", label: "Plans", icon: Calendar },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/media", label: "Media", icon: Video },
  { href: "/profile", label: "Profile", icon: User },
];

const trainerItems = [
  { href: "/trainer", label: "Clients", icon: UserCog },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav({ isTrainerMode }: { isTrainerMode: boolean }) {
  const pathname = usePathname();
  const items = isTrainerMode ? trainerItems : athleteItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div
        className="grid h-14 items-center justify-items-center px-0.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[44px] w-full max-w-[72px] flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-tight transition-colors sm:text-xs",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              <span className="line-clamp-1 text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
