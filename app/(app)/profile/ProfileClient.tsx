"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, UserPlus, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Person {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Relationship {
  id: string;
  status: "pending" | "accepted";
  invited_by: string | null;
  trainer?: Person | null;
  athlete?: Person | null;
}

interface Props {
  profile: { id: string; full_name: string; avatar_url: string | null; is_athlete: boolean; is_trainer: boolean };
  initialMode: "athlete" | "trainer";
  trainers: Relationship[];
  clients: Relationship[];
}

function Avatar({ person }: { person: Person }) {
  if (person.avatar_url) {
    return <img src={person.avatar_url} alt={person.full_name} className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
      {person.full_name.charAt(0).toUpperCase()}
    </div>
  );
}

function InviteInput({ label, placeholder, apiUrl, onSuccess }: {
  label: string;
  placeholder: string;
  apiUrl: string;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setInviteUrl(data.inviteUrl);
      setEmail("");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="bg-zinc-900 border-zinc-700 text-zinc-100"
        />
        <Button size="sm" onClick={send} disabled={loading || !email.trim()}>
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      {inviteUrl && (
        <button
          onClick={copy}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy invite link to share"}
        </button>
      )}
    </div>
  );
}

export function ProfileClient({ profile, initialMode, trainers: initialTrainers, clients: initialClients }: Props) {
  const [mode, setMode] = useState<"athlete" | "trainer">(initialMode);
  const [saving, setSaving] = useState(false);
  const [trainers, setTrainers] = useState(initialTrainers);
  const [clients, setClients] = useState(initialClients);

  function writeModeCookies(mode: "athlete" | "trainer") {
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `active_mode=${mode}; path=/; max-age=${maxAge}; samesite=lax`;
    if (mode === "athlete") {
      document.cookie = "trainer_acting_as=; path=/; max-age=0; samesite=lax";
    }
  }

  async function saveMode(newMode: "athlete" | "trainer") {
    if (newMode === mode) return;
    const prevMode = mode;
    setSaving(true);
    setMode(newMode);
    writeModeCookies(newMode);
    try {
      // Only attempt profile capability update when opting into trainer mode
      // for the first time. Switching between modes should rely on mode cookie.
      if (newMode === "trainer" && !profile.is_trainer) {
        const profileRes = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_athlete: true,
            is_trainer: true,
          }),
          credentials: "include",
        });
        if (!profileRes.ok) {
          const data = await profileRes.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to enable trainer mode");
        }
      }

      const modeRes = await fetch("/api/trainer/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
        credentials: "include",
      });
      if (!modeRes.ok) {
        const data = await modeRes.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to switch mode");
      }
      window.location.reload();
    } catch (error) {
      setMode(prevMode);
      writeModeCookies(prevMode);
      toast.error(error instanceof Error ? error.message : "Failed to switch mode");
    } finally {
      setSaving(false);
    }
  }

  async function refreshTrainers() {
    const res = await fetch("/api/athlete/trainers");
    const data = await res.json();
    setTrainers(data.trainers ?? []);
  }

  async function refreshClients() {
    const res = await fetch("/api/trainer/clients");
    const data = await res.json();
    setClients(data.clients ?? []);
  }

  const accepted = (r: Relationship) => r.status === "accepted";
  const pending = (r: Relationship) => r.status === "pending";

  return (
    <div className="space-y-6 max-w-md mx-auto pb-8">

      {/* Profile header */}
      <div className="flex items-center gap-4 pt-2">
        <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-100">{profile.full_name}</p>
          <p className="text-xs text-zinc-500">
            {mode === "trainer" ? "Trainer mode" : "Athlete mode"}
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">I am currently</p>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {(["athlete", "trainer"] as const).map((m) => (
            <button
              key={m}
              disabled={saving}
              onClick={() => saveMode(m)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m === "athlete" ? "Working Out" : "Training a Client"}
            </button>
          ))}
        </div>
        {saving && <p className="text-xs text-zinc-500 text-center">Switching…</p>}
      </div>

      {/* My Trainers (athlete mode) */}
      {mode === "athlete" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">My Trainers</p>
          </div>

          {trainers.filter(accepted).map((r) => {
            const t = r.trainer!;
            return (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar person={t} />
                <span className="text-sm text-zinc-200">{t.full_name}</span>
              </div>
            );
          })}

          {trainers.filter(pending).map((r) => {
            const t = r.trainer;
            return (
              <div key={r.id} className="flex items-center gap-3 opacity-60">
                <Clock className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  {t?.full_name ?? "Invited"} — pending
                </span>
              </div>
            );
          })}

          {trainers.length === 0 && (
            <p className="text-xs text-zinc-600">No trainers yet.</p>
          )}

          <InviteInput
            label="Invite a Trainer"
            placeholder="trainer@email.com"
            apiUrl="/api/athlete/invite-trainer"
            onSuccess={refreshTrainers}
          />
        </div>
      )}

      {/* My Clients (trainer mode) */}
      {mode === "trainer" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">My Clients</p>
          </div>

          {clients.filter(accepted).map((r) => {
            const a = r.athlete!;
            return (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar person={a} />
                <span className="text-sm text-zinc-200">{a.full_name}</span>
              </div>
            );
          })}

          {clients.filter(pending).map((r) => {
            const a = r.athlete;
            return (
              <div key={r.id} className="flex items-center gap-3 opacity-60">
                <Clock className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  {a?.full_name ?? "Invite sent"} — pending
                </span>
              </div>
            );
          })}

          {clients.length === 0 && (
            <p className="text-xs text-zinc-600">No clients yet.</p>
          )}

          <InviteInput
            label="Invite a Client"
            placeholder="client@email.com"
            apiUrl="/api/trainer/invite"
            onSuccess={refreshClients}
          />
        </div>
      )}
    </div>
  );
}
