"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = () => {
      void fetch("/api/notifications")
        .then((r) => r.json())
        .then((d: { unreadFeedbackCount?: number }) =>
          setCount(d.unreadFeedbackCount ?? 0)
        );
    };
    load();
    window.addEventListener("media-feedback-read", load);
    const t = setInterval(load, 60000);
    return () => {
      clearInterval(t);
      window.removeEventListener("media-feedback-read", load);
    };
  }, []);

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/media" aria-label="Form review and notifications">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
