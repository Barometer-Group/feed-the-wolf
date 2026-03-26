"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

interface Client {
  id: string;
  trainer_notes: string | null;
  client_info: string | null;
  athlete: { id: string; full_name: string; avatar_url: string | null };
}

export function TrainerClientList({ clients }: { clients: Client[] }) {
  const router = useRouter();

  async function selectClient(athleteId: string) {
    await fetch("/api/trainer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId }),
    });
    router.push("/dashboard");
    router.refresh();
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <Users className="h-10 w-10 text-zinc-600" />
        <p className="text-zinc-400">No clients yet.</p>
        <p className="text-xs text-zinc-600">Invite clients from your Profile page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-3 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 px-1">Select a Client</p>

      {clients.map((c) => (
        <button
          key={c.id}
          onClick={() => selectClient(c.athlete.id)}
          className="w-full flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left hover:border-zinc-600 hover:bg-zinc-800/60 transition-all active:scale-[0.98]"
        >
          {c.athlete.avatar_url ? (
            <img src={c.athlete.avatar_url} alt={c.athlete.full_name} className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center text-base font-bold text-zinc-300">
              {c.athlete.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100">{c.athlete.full_name}</p>
            {c.client_info && (
              <p className="text-xs text-zinc-500 truncate mt-0.5">{c.client_info}</p>
            )}
          </div>
          <span className="text-zinc-600 text-lg">›</span>
        </button>
      ))}
    </div>
  );
}
