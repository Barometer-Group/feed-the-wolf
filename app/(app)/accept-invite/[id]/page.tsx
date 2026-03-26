import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AcceptInvitePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/accept-invite/${params.id}`);
  }

  const { data: invite, error } = await supabase
    .from("trainer_athletes")
    .select("id, status, trainer_id, athlete_id, trainer:profiles!trainer_athletes_trainer_id_fkey(full_name)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !invite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-zinc-400">This invite link is invalid or has expired.</p>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-zinc-300">This invite has already been accepted.</p>
      </div>
    );
  }

  // Accept: set athlete_id to current user if not already set, mark accepted
  const athleteId = invite.athlete_id ?? user.id;

  const { error: updateErr } = await supabase
    .from("trainer_athletes")
    .update({ athlete_id: athleteId, status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (updateErr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-red-400">Something went wrong: {updateErr.message}</p>
      </div>
    );
  }

  // Also ensure this user is marked as is_athlete
  await supabase.from("profiles").update({ is_athlete: true }).eq("id", user.id);

  const trainerName = (invite.trainer as unknown as { full_name: string } | null)?.full_name ?? "Your trainer";

  redirect(`/profile?invited=1&trainer=${encodeURIComponent(trainerName)}`);
}
