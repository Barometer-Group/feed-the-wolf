"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Props {
  client: { id: string; full_name: string; avatar_url: string | null };
}

export function TrainerBanner({ client }: Props) {
  const router = useRouter();

  async function endSession() {
    await fetch("/api/trainer/session", { method: "DELETE" });
    router.push("/trainer");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-blue-950/60 border-b border-blue-900/40 px-4 py-2">
      <div className="flex items-center gap-3">
        {client.avatar_url ? (
          <img src={client.avatar_url} alt={client.full_name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-200">
            {client.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-blue-200">
          Training: <span className="text-white">{client.full_name}</span>
        </span>
      </div>
      <button
        onClick={endSession}
        className="text-blue-400 hover:text-white transition-colors p-1 rounded"
        title="End session"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
